import { useEffect } from 'react';
import { EVENTS, getEnabledElement } from '@cornerstonejs/core';

/** Message posted to the parent frame when the viewer has rendered a series' first image. */
interface SeriesReadyMessage {
  type: 'seriesReady';
  seriesUID: string;
}

/** Message sent by a parent frame to switch the displayed series without a full SPA reload. */
interface LoadSeriesMessage {
  type: 'loadSeries';
  studyUID: string;
  seriesUID: string;
  institution: string;
  clearCache?: boolean;
}

/** Response posted back to the parent frame after a series switch attempt. */
interface SeriesLoadResponse {
  type: 'seriesLoadResponse';
  success: boolean;
  seriesUID: string;
  error?: SeriesLoadErrorCode;
  detail?: string;
}

type SeriesLoadErrorCode = 'METADATA_FETCH_FAILED' | 'SERIES_NOT_FOUND' | 'VIEWPORT_UPDATE_FAILED';

function isLoadSeriesMessage(data: unknown): data is LoadSeriesMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as LoadSeriesMessage).type === 'loadSeries' &&
    typeof (data as LoadSeriesMessage).studyUID === 'string' &&
    typeof (data as LoadSeriesMessage).seriesUID === 'string' &&
    typeof (data as LoadSeriesMessage).institution === 'string'
  );
}

/**
 * Listens for postMessage events from a parent frame to switch the displayed
 * series without a full SPA reload. When display sets are already cached, swaps
 * the viewport instantly. Otherwise fetches metadata from the correct GCS bucket
 * before swapping.
 */
export function usePostMessageSeriesSwitching({
  enabled,
  servicesManager,
  displaySetService,
  dataSource,
}: {
  enabled: boolean;
  servicesManager: AppTypes.ServicesManager;
  displaySetService: AppTypes.DisplaySetService;
  dataSource: any;
}) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const { viewportGridService, cineService } = servicesManager.services;

    async function handleMessage(event: MessageEvent) {
      function reply(response: SeriesLoadResponse) {
        event.source?.postMessage(response, { targetOrigin: event.origin });
      }

      if (!isLoadSeriesMessage(event.data)) {
        return;
      }

      const { studyUID, seriesUID, institution, clearCache = true } = event.data;

      // Default true to avoid unbounded memory growth when the viewer is embedded
      // via iframe and switched repeatedly via postMessage — without purging,
      // Cornerstone retains decoded pixel data from every previously loaded series.
      if (clearCache) {
        (window as any).cornerstone?.cache?.purgeCache();
      }

      // Check if we already have display sets for this series (cache hit).
      let displaySets = displaySetService.getDisplaySetsForSeries(seriesUID);

      if (!displaySets?.length) {
        // Fetch metadata for the study from the correct GCS bucket.
        try {
          const bucketName = `${institution}-pacs-deid`;
          const bucketPrefix = 'v1.0/dicomweb';
          await dataSource.retrieve.series.metadata({
            StudyInstanceUID: studyUID,
            returnPromises: false,
            bucketDetails: {
              buckets: [bucketName],
              bucketPrefix,
            },
          });
        } catch (err) {
          reply({
            type: 'seriesLoadResponse',
            success: false,
            seriesUID,
            error: 'METADATA_FETCH_FAILED',
            detail: err instanceof Error ? err.message : String(err),
          });
          return;
        }

        displaySets = displaySetService.getDisplaySetsForSeries(seriesUID);
      }

      if (!displaySets?.length) {
        reply({ type: 'seriesLoadResponse', success: false, seriesUID, error: 'SERIES_NOT_FOUND' });
        return;
      }

      try {
        const { activeViewportId } = viewportGridService.getState();

        // Stop cine before swapping to avoid inconsistent state.
        const cineState = cineService.getState();
        const currentCine = cineState.cines?.[activeViewportId];
        if (currentCine?.isPlaying) {
          cineService.setCine({
            id: activeViewportId,
            frameRate: currentCine.frameRate ?? cineState.default?.frameRate ?? 24,
            isPlaying: false,
          });
        }

        viewportGridService.setDisplaySetsForViewports([
          {
            viewportId: activeViewportId,
            displaySetInstanceUIDs: [displaySets[0].displaySetInstanceUID],
          },
        ]);
      } catch (err) {
        reply({
          type: 'seriesLoadResponse',
          success: false,
          seriesUID,
          error: 'VIEWPORT_UPDATE_FAILED',
          detail: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      reply({ type: 'seriesLoadResponse', success: true, seriesUID });
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [enabled, servicesManager, displaySetService, dataSource]);

  // Post seriesReady to parent when the viewer renders its first image for any series.
  // Fires on both initial iframe.src loads and postMessage-based series switches.
  useEffect(() => {
    if (!enabled || !window.parent || window.parent === window) return;

    const { viewportGridService } = servicesManager.services;
    const notifiedSeries = new Set<string>();

    function handleImageRendered(evt: Event) {
      const detail = (evt as CustomEvent).detail;
      if (detail?.viewportStatus === 'preRender') return;

      const element = detail?.element;
      if (!element) return;

      const enabledElement = getEnabledElement(element);
      if (!enabledElement) return;

      // Resolve series UID through the canonical OHIF path:
      // viewport element → viewportId → displaySetInstanceUIDs → display set → SeriesInstanceUID
      const viewportState = viewportGridService.getState().viewports.get(enabledElement.viewportId);
      const displaySetUID = viewportState?.displaySetInstanceUIDs?.[0];
      if (!displaySetUID) return;

      const displaySet = displaySetService.getDisplaySetByUID(displaySetUID);
      const seriesUID = displaySet?.SeriesInstanceUID;
      if (!seriesUID || notifiedSeries.has(seriesUID)) return;

      notifiedSeries.add(seriesUID);
      const message: SeriesReadyMessage = { type: 'seriesReady', seriesUID };
      window.parent.postMessage(message, '*');
    }

    // IMAGE_RENDERED fires on viewport DOM elements; capture at document level
    // to avoid tracking individual element lifecycles.
    document.addEventListener(EVENTS.IMAGE_RENDERED, handleImageRendered, true);
    return () => document.removeEventListener(EVENTS.IMAGE_RENDERED, handleImageRendered, true);
  }, [enabled, servicesManager, displaySetService]);
}
