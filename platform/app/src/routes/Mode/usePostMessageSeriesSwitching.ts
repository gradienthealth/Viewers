import { useEffect } from 'react';

/** Message sent by a parent frame to switch the displayed series without a full SPA reload. */
interface LoadSeriesMessage {
  type: 'loadSeries';
  studyUID: string;
  seriesUID: string;
  institution: string;
}

/** Response posted back to the parent frame after a series switch attempt. */
type SeriesLoadResponse =
  | { type: 'seriesLoaded'; seriesUID: string }
  | { type: 'seriesLoadError'; seriesUID: string; error: SeriesLoadErrorCode; detail?: string };

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

      const { studyUID, seriesUID, institution } = event.data;

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
            type: 'seriesLoadError',
            seriesUID,
            error: 'METADATA_FETCH_FAILED',
            detail: err instanceof Error ? err.message : String(err),
          });
          return;
        }

        displaySets = displaySetService.getDisplaySetsForSeries(seriesUID);
      }

      if (!displaySets?.length) {
        reply({ type: 'seriesLoadError', seriesUID, error: 'SERIES_NOT_FOUND' });
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
          type: 'seriesLoadError',
          seriesUID,
          error: 'VIEWPORT_UPDATE_FAILED',
          detail: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      reply({ type: 'seriesLoaded', seriesUID });
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [enabled, servicesManager, displaySetService, dataSource]);
}
