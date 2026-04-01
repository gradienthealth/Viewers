import { useEffect } from 'react';

/** Message sent by a parent frame to switch the displayed series without a full SPA reload. */
interface LoadSeriesMessage {
  type: 'loadSeries';
  studyUID: string;
  seriesUID: string;
  institution: string;
}

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
      if (!isLoadSeriesMessage(event.data)) {
        return;
      }

      const { studyUID, seriesUID, institution } = event.data;

      // Check if we already have display sets for this series (cache hit).
      let displaySets = displaySetService.getDisplaySetsForSeries(seriesUID);

      if (!displaySets?.length) {
        // Fetch metadata for the study from the correct GCS bucket.
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

        displaySets = displaySetService.getDisplaySetsForSeries(seriesUID);
      }

      if (!displaySets?.length) {
        console.warn(`[postMessage] No display sets found for series ${seriesUID}`);
        return;
      }

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
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [enabled, servicesManager, displaySetService, dataSource]);
}
