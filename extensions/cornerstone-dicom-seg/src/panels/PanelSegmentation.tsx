import { createReportAsync } from '@ohif/extension-default';
import React, { useEffect, useState, useCallback, useReducer } from 'react';
import PropTypes from 'prop-types';
import { SegmentationGroupTable, SegmentationGroupTableExpanded } from '@ohif/ui';
import { SegmentationPanelMode } from '../types/segmentation';
import callInputDialog from './callInputDialog';
import callColorPickerDialog from './colorPickerDialog';
import { useTranslation } from 'react-i18next';
import getSegmentLabel from '../utils/getSegmentLabel';
import { updateSegmentationLabels } from '../utils/updateSegmentationLabels';

const savedStatusReducer = (state, action) => {
  return {
    ...state,
    ...action.payload,
  };
};

const SAVED_STATUS_ICON = {
  SAVED: 'notifications-success',
  MODIFIED: 'notifications-warning',
  ERROR: 'notifications-error',
};

const components = {
  [SegmentationPanelMode.Expanded]: SegmentationGroupTableExpanded,
  [SegmentationPanelMode.Dropdown]: SegmentationGroupTable,
};

export default function PanelSegmentation({
  servicesManager,
  commandsManager,
  extensionManager,
  configuration,
}) {
  const {
    segmentationService,
    viewportGridService,
    uiDialogService,
    displaySetService,
    userAuthenticationService,
    CropDisplayAreaService,
  } = servicesManager.services;

  const { t } = useTranslation('PanelSegmentation');

  const [selectedSegmentationId, setSelectedSegmentationId] = useState(null);
  const [segmentationConfiguration, setSegmentationConfiguration] = useState(
    segmentationService.getConfiguration()
  );

  const [segmentations, setSegmentations] = useState(() =>
    updateSegmentationLabels(segmentationService.getSegmentations(), displaySetService)
  );
  const [savedStatusStates, dispatch] = useReducer(savedStatusReducer, {});

  useEffect(() => {
    // ~~ Subscription
    const added = segmentationService.EVENTS.SEGMENTATION_ADDED;
    const updated = segmentationService.EVENTS.SEGMENTATION_UPDATED;
    const removed = segmentationService.EVENTS.SEGMENTATION_REMOVED;
    const subscriptions = [];

    [added, updated, removed].forEach(evt => {
      const { unsubscribe } = segmentationService.subscribe(evt, () => {
        const segmentations = segmentationService.getSegmentations();
        const updatedSegmentations = updateSegmentationLabels(segmentations, displaySetService);
        setSegmentations(updatedSegmentations);
        setSegmentationConfiguration(segmentationService.getConfiguration());
      });
      subscriptions.push(unsubscribe);
    });

    return () => {
      subscriptions.forEach(unsub => {
        unsub();
      });
    };
  }, []);

  useEffect(() => {
    let changedSegmentations: any[] = [],
      timerId;
    const timoutInSeconds = 5;

    const { unsubscribe } = segmentationService.subscribe(
      segmentationService.EVENTS.SEGMENTATION_DATA_MODIFIED,
      ({ segmentation }) => {
        clearTimeout(timerId);
        dispatch({ payload: { [segmentation.id]: SAVED_STATUS_ICON.MODIFIED } });

        if (
          !changedSegmentations.find(
            changedSegmentation => changedSegmentation.id === segmentation.id
          )
        ) {
          changedSegmentations.push(segmentation);
        }

        timerId = setTimeout(() => {
          const datasources = extensionManager.getActiveDataSource();

          const promises = changedSegmentations.map(segmentation =>
            createReportAsync({
              servicesManager: servicesManager,
              getReport: () =>
                commandsManager.runCommand('storeSegmentation', {
                  segmentationId: segmentation.id,
                  dataSource: datasources[0],
                  skipLabelDialog: true,
                }),
              reportType: 'Segmentation',
              showLoadingModal: false,
              throwErrors: true,
            })
          );

          Promise.allSettled(promises).then(results => {
            const payload = results.reduce((acc, result, index) => {
              if (result.value) {
                changedSegmentations[index].displaySetInstanceUID = result.value[0];
                displaySetService.getDisplaySetByUID(result.value[0])?.getReferenceDisplaySet();
              }

              return {
                ...acc,
                [changedSegmentations[index].id]:
                  result.status === 'fulfilled' ? SAVED_STATUS_ICON.SAVED : SAVED_STATUS_ICON.ERROR,
              };
            }, {});

            dispatch({ payload });

            const savedSegmentations = Object.keys(payload).filter(
              id => payload[id] === SAVED_STATUS_ICON.SAVED
            );
            changedSegmentations = changedSegmentations.filter(
              cs => !savedSegmentations.includes(cs.id)
            );
          });
        }, timoutInSeconds * 1000);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const setSegmentationActive = segmentationId => {
    setReferencedDisplaySet(segmentationId);

    const isSegmentationActive = segmentations.find(seg => seg.id === segmentationId)?.isActive;

    if (isSegmentationActive) {
      return;
    }

    segmentationService.setActiveSegmentationForToolGroup(segmentationId);
  };

  // Set referenced displaySet of the segmentation to the viewport
  // if it is not displayed in any of the viewports.
  const setReferencedDisplaySet = segmentationId => {
    const segDisplayset = displaySetService.getDisplaySetByUID(segmentationId);
    if (!segDisplayset) {
      return;
    }

    const referencedDisplaySetInstanceUID = segDisplayset.referencedDisplaySetInstanceUID;
    const { viewports, activeViewportId } = viewportGridService.getState();
    let referencedImageLoaded = false;
    viewports.forEach(viewport => {
      if (viewport.displaySetInstanceUIDs.includes(referencedDisplaySetInstanceUID)) {
        referencedImageLoaded = true;
      }
    });

    if (!referencedImageLoaded) {
      viewportGridService.setDisplaySetsForViewport({
        viewportId: activeViewportId,
        displaySetInstanceUIDs: [referencedDisplaySetInstanceUID],
      });
    }
  };

  const getToolGroupIds = segmentationId => {
    const toolGroupIds = segmentationService.getToolGroupIdsWithSegmentation(segmentationId);

    return toolGroupIds;
  };

  const onSegmentationAdd = async () => {
    commandsManager.runCommand('createEmptySegmentationForViewport', {
      viewportId: viewportGridService.getActiveViewportId(),
    });
  };

  const onSegmentationClick = (segmentationId: string) => {
    setReferencedDisplaySet(segmentationId);
    segmentationService.setActiveSegmentationForToolGroup(segmentationId);
  };

  const onSegmentationDelete = (segmentationId: string) => {
    setSegmentationActive(segmentationId);
    segmentationService.remove(segmentationId);
  };

  const onSegmentAdd = segmentationId => {
    setSegmentationActive(segmentationId);
    const label = getSegmentLabel(segmentations.find(seg => seg.id === segmentationId));
    segmentationService.addSegment(segmentationId, { properties: { label } });
  };

  const onSegmentClick = (segmentationId, segmentIndex) => {
    setReferencedDisplaySet(segmentationId);
    segmentationService.setActiveSegment(segmentationId, segmentIndex);

    const toolGroupIds = getToolGroupIds(segmentationId);

    toolGroupIds.forEach(toolGroupId => {
      segmentationService.setActiveSegmentationForToolGroup(segmentationId, toolGroupId);
      segmentationService.jumpToSegmentCenter(segmentationId, segmentIndex, toolGroupId);
    });
  };

  const onSegmentEdit = (segmentationId, segmentIndex) => {
    setSegmentationActive(segmentationId);
    const segmentation = segmentationService.getSegmentation(segmentationId);

    const segment = segmentation.segments[segmentIndex];
    const { label } = segment;

    callInputDialog(uiDialogService, label, (label, actionId) => {
      if (label === '') {
        return;
      }

      segmentationService.setSegmentLabel(segmentationId, segmentIndex, label);
    });
  };

  const onSegmentationEdit = segmentationId => {
    setSegmentationActive(segmentationId);
    const segmentation = segmentationService.getSegmentation(segmentationId);
    const { label } = segmentation;

    callInputDialog(uiDialogService, label, (label, actionId) => {
      if (label === '') {
        return;
      }

      segmentationService.addOrUpdateSegmentation(
        {
          id: segmentationId,
          label,
        },
        false, // suppress event
        true // notYetUpdatedAtSource
      );
    });
  };

  const onSegmentColorClick = (segmentationId, segmentIndex) => {
    setSegmentationActive(segmentationId);
    const segmentation = segmentationService.getSegmentation(segmentationId);

    const segment = segmentation.segments[segmentIndex];
    const { color, opacity } = segment;

    const rgbaColor = {
      r: color[0],
      g: color[1],
      b: color[2],
      a: opacity / 255.0,
    };

    callColorPickerDialog(uiDialogService, rgbaColor, (newRgbaColor, actionId) => {
      if (actionId === 'cancel') {
        return;
      }

      segmentationService.setSegmentRGBAColor(segmentationId, segmentIndex, [
        newRgbaColor.r,
        newRgbaColor.g,
        newRgbaColor.b,
        newRgbaColor.a * 255.0,
      ]);
    });
  };

  const onSegmentDelete = (segmentationId, segmentIndex) => {
    setSegmentationActive(segmentationId);
    segmentationService.removeSegment(segmentationId, segmentIndex);
  };

  // segment hide
  const onToggleSegmentVisibility = (segmentationId, segmentIndex) => {
    setSegmentationActive(segmentationId);
    const segmentation = segmentationService.getSegmentation(segmentationId);
    const segmentInfo = segmentation.segments[segmentIndex];
    const isVisible = !segmentInfo.isVisible;
    const toolGroupIds = getToolGroupIds(segmentationId);

    // Todo: right now we apply the visibility to all tool groups
    toolGroupIds.forEach(toolGroupId => {
      segmentationService.setSegmentVisibility(
        segmentationId,
        segmentIndex,
        isVisible,
        toolGroupId
      );
    });
  };

  const onToggleSegmentLock = (segmentationId, segmentIndex) => {
    setSegmentationActive(segmentationId);
    segmentationService.toggleSegmentLocked(segmentationId, segmentIndex);
  };

  const onToggleSegmentationVisibility = segmentationId => {
    setSegmentationActive(segmentationId);
    segmentationService.toggleSegmentationVisibility(segmentationId);
    const segmentation = segmentationService.getSegmentation(segmentationId);
    const isVisible = segmentation.isVisible;
    const segments = segmentation.segments;

    const toolGroupIds = getToolGroupIds(segmentationId);

    toolGroupIds.forEach(toolGroupId => {
      segments.forEach((segment, segmentIndex) => {
        segmentationService.setSegmentVisibility(
          segmentationId,
          segmentIndex,
          isVisible,
          toolGroupId
        );
      });
    });
  };

  const _setSegmentationConfiguration = useCallback(
    (segmentationId, key, value) => {
      segmentationService.setConfiguration({
        segmentationId,
        [key]: value,
      });
    },
    [segmentationService]
  );

  const onSegmentationDownload = segmentationId => {
    setSegmentationActive(segmentationId);
    commandsManager.runCommand('downloadSegmentation', {
      segmentationId,
    });
  };

  const storeSegmentation = async segmentationId => {
    setSegmentationActive(segmentationId);
    const datasources = extensionManager.getActiveDataSource();
    let displaySetInstanceUIDs;

    try {
      displaySetInstanceUIDs = await createReportAsync({
        servicesManager,
        getReport: () =>
          commandsManager.runCommand('storeSegmentation', {
            segmentationId,
            dataSource: datasources[0],
          }),
        reportType: 'Segmentation',
        throwErrors: true,
      });

      dispatch({ payload: { [segmentationId]: SAVED_STATUS_ICON.SAVED } });
    } catch (error) {
      console.warn(error.message);
      dispatch({ payload: { [segmentationId]: SAVED_STATUS_ICON.ERROR } });
    }

    // Show the exported report in the active viewport as read only (similar to SR)
    if (displaySetInstanceUIDs) {
      // clear the segmentation that we exported, similar to the storeMeasurement
      // where we remove the measurements and prompt again the user if they would like
      // to re-read the measurements in a SR read only viewport
      segmentationService.remove(segmentationId);

      viewportGridService.setDisplaySetsForViewport({
        viewportId: viewportGridService.getActiveViewportId(),
        displaySetInstanceUIDs,
      });
    }
  };

  const onSegmentationDownloadRTSS = segmentationId => {
    setSegmentationActive(segmentationId);
    commandsManager.runCommand('downloadRTSS', {
      segmentationId,
    });
  };

  const SegmentationGroupTableComponent =
    components[configuration?.segmentationPanelMode] || SegmentationGroupTable;
  const allowAddSegment = configuration?.addSegment;
  const onSegmentationAddWrapper =
    configuration?.onSegmentationAdd && typeof configuration?.onSegmentationAdd === 'function'
      ? configuration?.onSegmentationAdd
      : onSegmentationAdd;

  return (
    <SegmentationGroupTableComponent
      title={t('Segmentations')}
      segmentations={segmentations}
      savedStatusStates={savedStatusStates}
      disableEditing={configuration.disableEditing}
      activeSegmentationId={selectedSegmentationId || ''}
      onSegmentationAdd={onSegmentationAddWrapper}
      showAddSegment={allowAddSegment}
      onSegmentationClick={onSegmentationClick}
      onSegmentationDelete={onSegmentationDelete}
      onSegmentationDownload={onSegmentationDownload}
      onSegmentationDownloadRTSS={onSegmentationDownloadRTSS}
      storeSegmentation={storeSegmentation}
      onSegmentationEdit={onSegmentationEdit}
      onSegmentClick={onSegmentClick}
      onSegmentEdit={onSegmentEdit}
      onSegmentAdd={onSegmentAdd}
      onSegmentColorClick={onSegmentColorClick}
      onSegmentDelete={onSegmentDelete}
      onToggleSegmentVisibility={onToggleSegmentVisibility}
      onToggleSegmentLock={onToggleSegmentLock}
      onToggleSegmentationVisibility={onToggleSegmentationVisibility}
      showDeleteSegment={true}
      segmentationConfig={{ initialConfig: segmentationConfiguration }}
      setRenderOutline={value =>
        _setSegmentationConfiguration(selectedSegmentationId, 'renderOutline', value)
      }
      setOutlineOpacityActive={value =>
        _setSegmentationConfiguration(selectedSegmentationId, 'outlineOpacity', value)
      }
      setRenderFill={value =>
        _setSegmentationConfiguration(selectedSegmentationId, 'renderFill', value)
      }
      setRenderInactiveSegmentations={value =>
        _setSegmentationConfiguration(selectedSegmentationId, 'renderInactiveSegmentations', value)
      }
      setOutlineWidthActive={value =>
        _setSegmentationConfiguration(selectedSegmentationId, 'outlineWidthActive', value)
      }
      setFillAlpha={value =>
        _setSegmentationConfiguration(selectedSegmentationId, 'fillAlpha', value)
      }
      setFillAlphaInactive={value =>
        _setSegmentationConfiguration(selectedSegmentationId, 'fillAlphaInactive', value)
      }
      CropDisplayAreaService={CropDisplayAreaService}
    />
  );
}

PanelSegmentation.propTypes = {
  commandsManager: PropTypes.shape({
    runCommand: PropTypes.func.isRequired,
  }),
  servicesManager: PropTypes.shape({
    services: PropTypes.shape({
      segmentationService: PropTypes.shape({
        getSegmentation: PropTypes.func.isRequired,
        getSegmentations: PropTypes.func.isRequired,
        toggleSegmentationVisibility: PropTypes.func.isRequired,
        subscribe: PropTypes.func.isRequired,
        EVENTS: PropTypes.object.isRequired,
      }).isRequired,
    }).isRequired,
  }).isRequired,
};
