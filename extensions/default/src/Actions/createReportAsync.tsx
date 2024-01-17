import React from 'react';
import dcmjs from 'dcmjs';
import { DicomMetadataStore } from '@ohif/core';

const { datasetToBlob } = dcmjs.data;

/**
 *
 * @param {*} servicesManager
 */
async function createReportAsync({ servicesManager, getReport, reportType = 'measurement' }) {
  const { displaySetService, uiNotificationService, uiDialogService, CacheAPIService } =
    servicesManager.services;
  const loadingDialogId = uiDialogService.create({
    showOverlay: true,
    isDraggable: false,
    centralize: true,
    content: Loading,
  });

  try {
    const naturalizedReport = await getReport();

    const { SeriesInstanceUID, SOPInstanceUID } = naturalizedReport;
    let displaySet = displaySetService
      .getDisplaySetsForSeries(SeriesInstanceUID)
      ?.find(ds => ds.instances.some(instance => instance.SOPInstanceUID === SOPInstanceUID));

    const shouldOverWrite = displaySet && displaySet.Modality === 'SEG';

    // The "Mode" route listens for DicomMetadataStore changes
    // When a new instance is added, it listens and
    // automatically calls makeDisplaySets
    DicomMetadataStore.addInstances([naturalizedReport], true);

    if (!displaySet) {
      // If there is no displayset before adding instances, it is a new series.
      displaySet = displaySetService.getMostRecentDisplaySet();
    }

    const displaySetInstanceUID = displaySet.displaySetInstanceUID;

    uiNotificationService.show({
      title: 'Create Report',
      message: `${reportType} saved successfully`,
      type: 'success',
    });

    if (shouldOverWrite) {
      CacheAPIService?.updateCachedFile(datasetToBlob(naturalizedReport), displaySet);
      return;
    }

    return [displaySetInstanceUID];
  } catch (error) {
    uiNotificationService.show({
      title: 'Create Report',
      message: error.message || `Failed to store ${reportType}`,
      type: 'error',
    });
  } finally {
    uiDialogService.dismiss({ id: loadingDialogId });
  }
}

function Loading() {
  return <div className="text-primary-active">Loading...</div>;
}

export default createReportAsync;
