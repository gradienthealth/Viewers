import { DicomMetadataStore } from '@ohif/core';
import dcmjs from 'dcmjs';

const { datasetToBlob } = dcmjs.data;

/**
 *
 * @param {*} servicesManager
 */
async function createReportAsync({
  servicesManager,
  getReport,
  reportType = 'measurement',
  showLoadingModal = true,
  throwErrors = false,
}: withAppTypes) {
  const { displaySetService, uiNotificationService, uiDialogService, CacheAPIService } =
    servicesManager.services;

  try {
    const naturalizedReport = await getReport();

    const { SeriesInstanceUID, SOPInstanceUID } = naturalizedReport;
    let displaySet = displaySetService
      .getDisplaySetsForSeries(SeriesInstanceUID)
      ?.find(ds => ds.instances.some(instance => instance.SOPInstanceUID === SOPInstanceUID));

    const shouldOverWrite =
      displaySet?.StudyInstanceUID && displaySet.SeriesInstanceUID && displaySet.Modality === 'SEG';

    if (!naturalizedReport) {
      return;
    }

    // The "Mode" route listens for DicomMetadataStore changes
    // When a new instance is added, it listens and
    // automatically calls makeDisplaySets
    DicomMetadataStore.addInstances([naturalizedReport], true);

    if (!displaySet) {
      // If there is no displayset before adding instances, it is a new series.
      displaySet = displaySetService.getMostRecentDisplaySet();
    }

    const displaySetInstanceUID = displaySet.displaySetInstanceUID;

    showLoadingModal &&
      uiNotificationService.show({
        title: 'Create Report',
        message: `${reportType} saved successfully`,
        type: 'success',
      });

    if (shouldOverWrite) {
      CacheAPIService.updateCachedFile(datasetToBlob(naturalizedReport), displaySet);
      return;
    }

    return [displaySetInstanceUID];
  } catch (error) {
    showLoadingModal &&
      uiNotificationService.show({
        title: 'Create Report',
        message: error.message || `Failed to store ${reportType}`,
        type: 'error',
      });

    if (throwErrors) {
      throw new Error(`Failed to store ${reportType}. Error: ${error.message || 'Unknown error'}`);
    }
  } finally {
    showLoadingModal && uiDialogService.hide('loading-dialog');
  }
}

export default createReportAsync;
