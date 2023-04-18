import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router';

import PropTypes from 'prop-types';
// TODO: DicomMetadataStore should be injected?
import { DicomMetadataStore, ServicesManager } from '@ohif/core';
import { DragAndDropProvider, ImageViewerProvider } from '@ohif/ui';
import { useQuery, useSearchParams } from '@hooks';
import ViewportGrid from '@components/ViewportGrid';
import Compose from './Compose';
import getStudies from './studiesList';

/**
 * Initialize the route.
 *
 * @param props.servicesManager to read services from
 * @param props.studyInstanceUIDs for a list of studies to read
 * @param props.dataSource to read the data from
 * @param props.filters filters from query params to read the data from
 * @returns array of subscriptions to cancel
 */
function defaultRouteInit(
  {
    servicesManager,
    studyInstanceUIDs,
    dataSource,
    seriesInstanceUIDs,
    filters,
    sortCriteria,
    sortFunction,
  },
  hangingProtocolId
) {
  const {
    displaySetService,
    hangingProtocolService,
    ErrorHandlingService,
    toolbarService,
  } = servicesManager.services;

  const unsubscriptions = [];
  const {
    unsubscribe: instanceAddedUnsubscribe,
  } = DicomMetadataStore.subscribe(
    DicomMetadataStore.EVENTS.INSTANCES_ADDED,
    function({ StudyInstanceUID, SeriesInstanceUID, madeInClient = false }) {
      const seriesMetadata = DicomMetadataStore.getSeries(
        StudyInstanceUID,
        SeriesInstanceUID
      );

      displaySetService.makeDisplaySets(seriesMetadata.instances, madeInClient);
    }
  );

  unsubscriptions.push(instanceAddedUnsubscribe);

  let allRetrieves = studyInstanceUIDs.map(StudyInstanceUID => {
    DicomMetadataStore.removeStudy({ StudyInstanceUID: StudyInstanceUID });
    seriesInstanceUIDs = seriesInstanceUIDs || [];
    filters = filters || {};

    //let retrievedSeries;

    // if (seriesInstanceUIDs.length) {
    //   retrievedSeries = seriesInstanceUIDs.map(seriesInstanceUID => {
    //     filters.seriesInstanceUID = seriesInstanceUID;

    //     return dataSource.retrieve.series.metadata({
    //       StudyInstanceUID,
    //       filters,
    //       sortCriteria,
    //       sortFunction,
    //     });
    //   });
    // } else {
    //   retrievedSeries = dataSource.retrieve.series.metadata({
    //     StudyInstanceUID,
    //     filters,
    //     sortCriteria,
    //     sortFunction,
    //   });
    // }
    return dataSource.retrieve.series.metadata({
      StudyInstanceUID,
      filters,
      sortCriteria,
      sortFunction,
    });
  });

  allRetrieves = allRetrieves.flat();

  // The hanging protocol matching service is fairly expensive to run multiple
  // times, and doesn't allow partial matches to be made (it will simply fail
  // to display anything if a required match fails), so we wait here until all metadata
  // is retrieved (which will synchronously trigger the display set creation)
  // until we run the hanging protocol matching service.

  hangingProtocolService.addCustomAttribute(
    'seriesInstanceUidIsMatching', // attributeId
    'seriesInstanceUidIsMatching', // attributeName
    metaData => {
      const seriesInstanceUid =
        metaData['SeriesInstanceUID'] ??
        ((metaData.images || metaData.others || [])[0] || {})[
          'SeriesInstanceUID'
        ];
      return seriesInstanceUid === seriesInstanceUIDs[0];
    }
  );

  Promise.allSettled(allRetrieves).then(promiseStatus => {
    promiseStatus.forEach(prStatus => {
      // iterate over every promise and check status, if any promise is have error encounter then status will be rejected
      if (prStatus.status === 'rejected') {
        if (ErrorHandlingService) {
          ErrorHandlingService.broadcastStudyLoadError();
        }
        return;
      }
    });

    const displaySets = displaySetService.getActiveDisplaySets();

    if (!displaySets || !displaySets.length) {
      return;
    }

    // Gets the studies list to use
    const studies = getStudies(studyInstanceUIDs, displaySets);

    // study being displayed, and is thus the "active" study.
    const activeStudy = studies[0];

    // run the hanging protocol matching on the displaySets with the predefined
    // hanging protocol in the mode configuration
    hangingProtocolService.run(
      { studies, activeStudy, displaySets },
      hangingProtocolId
    );
  });

  return unsubscriptions;
}

export default function ModeRoute({
  mode,
  dataSourceName,
  extensionManager,
  servicesManager,
  commandsManager,
  hotkeysManager,
}) {
  // Parse route params/querystring
  const location = useLocation();
  const query = useQuery();
  const params = useParams();
  const searchParams = useSearchParams();

  const runTimeHangingProtocolId = searchParams.get('hangingprotocolid');
  const [
    {
      studyInstanceUIDs,
      seriesInstanceUIDs,
      filters,
      sortCriteria,
      sortFunction,
    },
    setStudyInstanceUIDs,
  ] = useState({});

  const [refresh, setRefresh] = useState(false);
  const layoutTemplateData = useRef(false);
  const locationRef = useRef(null);
  const isMounted = useRef(false);

  if (location !== locationRef.current) {
    layoutTemplateData.current = null;
    locationRef.current = location;
  }

  const {
    displaySetService,
    hangingProtocolService,
  } = (servicesManager as ServicesManager).services;

  const {
    extensions,
    sopClassHandlers,
    hotkeys: hotkeyObj,
    hangingProtocol,
  } = mode;
  // Preserve the old array interface for hotkeys
  const hotkeys = Array.isArray(hotkeyObj) ? hotkeyObj : hotkeyObj?.hotkeys;
  const hotkeyName = hotkeyObj?.name || 'hotkey-definitions-v2';

  if (dataSourceName === undefined) {
    dataSourceName = extensionManager.defaultDataSourceName;
  }

  extensionManager.setActiveDataSource(dataSourceName);

  const dataSource = extensionManager.getActiveDataSource()[0];

  // Only handling one route per mode for now
  const route = mode.routes[0];

  // For each extension, look up their context modules
  // TODO: move to extension manager.
  let contextModules = [];

  Object.keys(extensions).forEach(extensionId => {
    const allRegisteredModuleIds = Object.keys(extensionManager.modulesMap);
    const moduleIds = allRegisteredModuleIds.filter(id =>
      id.includes(`${extensionId}.contextModule.`)
    );

    if (!moduleIds || !moduleIds.length) {
      return;
    }

    const modules = moduleIds.map(extensionManager.getModuleEntry);
    contextModules = contextModules.concat(modules);
  });

  const contextModuleProviders = contextModules.map(a => a.provider);
  const CombinedContextProvider = ({ children }) =>
    Compose({ components: contextModuleProviders, children });

  function ViewportGridWithDataSourceFactory(customViewportGridProps) {
    return props =>
      ViewportGrid({ ...props, dataSource, ...customViewportGridProps });
  }

  useEffect(() => {
    // Preventing state update for unmounted component
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Todo: this should not be here, data source should not care about params
    const initializeDataSource = async (params, query) => {
      const {
        studyInstanceUIDs,
        seriesInstanceUIDs,
        filters,
        sortCriteria,
        sortFunction,
      } = await dataSource.initialize({
        params,
        query,
      });
      setStudyInstanceUIDs({
        studyInstanceUIDs,
        seriesInstanceUIDs,
        filters,
        sortCriteria,
        sortFunction,
      });
    };

    initializeDataSource(params, query);
    return () => {
      layoutTemplateData.current = null;
    };
  }, [location]);

  useEffect(() => {
    if (dataSource.onReloadStudy) {
//       dataSource.onReloadStudy(({ studyInstanceUIDs, seriesInstanceUIDs }) => {
//         const {
//           StateManagementService,
//           HangingProtocolService,
//           SlabThicknessService,
//         } = servicesManager.services;
//         if (StateManagementService && HangingProtocolService) {
//           StateManagementService.clearViewportState();
//           HangingProtocolService.reset();
//           SlabThicknessService.clearSlabThickness();
//         }
//         defaultRouteInit(
//           {
//             servicesManager,
//             studyInstanceUIDs,
//             dataSource,
//             seriesInstanceUIDs,
//             filters,
//             sortCriteria,
//             sortFunction,
//           },
//           hangingProtocol
//         );
//       });
    }
  }, [location]);

  useEffect(() => {
    if (dataSource.onNewStudy) {
      dataSource.onNewStudy(({ studyInstanceUIDs, seriesInstanceUIDs }) => {
        setStudyInstanceUIDs({
          studyInstanceUIDs,
          seriesInstanceUIDs,
          filters,
          sortCriteria,
          sortFunction,
        });
      });
    }
  }, [location]);

  useEffect(() => {
    const {
      ExternalInterfaceService,
      PerformanceEventTrackingService,
    } = servicesManager.services;
    ExternalInterfaceService.sendViewerReady();
    PerformanceEventTrackingService.startAxialFIDTime();
    PerformanceEventTrackingService.startVolumeFSLTime();
  }, []);

  useEffect(() => {
    const retrieveLayoutData = async () => {
      const layoutData = await route.layoutTemplate({
        location,
        servicesManager,
        studyInstanceUIDs,
      });
      if (isMounted.current) {
        layoutTemplateData.current = layoutData;
        setRefresh(!refresh);
      }
    };
    if (studyInstanceUIDs?.length && studyInstanceUIDs[0] !== undefined) {
      retrieveLayoutData();
    }
    return () => {
      layoutTemplateData.current = null;
    };
  }, [studyInstanceUIDs]);

  useEffect(() => {
    if (!hotkeys) {
      return;
    }

    hotkeysManager.setDefaultHotKeys(hotkeys);

    const userPreferredHotkeys = JSON.parse(localStorage.getItem(hotkeyName));

    if (userPreferredHotkeys?.length) {
      hotkeysManager.setHotkeys(userPreferredHotkeys, hotkeyName);
    } else {
      hotkeysManager.setHotkeys(hotkeys, hotkeyName);
    }

    return () => {
      hotkeysManager.destroy();
    };
  }, []);

  useEffect(() => {
    if (!layoutTemplateData.current) {
      return;
    }

    // TODO: For some reason this is running before the Providers
    // are calling setServiceImplementation
    // TODO -> iterate through services.

    // Extension

    // Add SOPClassHandlers to a new SOPClassManager.
    displaySetService.init(extensionManager, sopClassHandlers);

    extensionManager.onModeEnter({
      servicesManager,
      extensionManager,
      commandsManager,
    });

    // use the URL hangingProtocolId if it exists, otherwise use the one
    // defined in the mode configuration
    const hangingProtocolIdToUse = hangingProtocolService.getProtocolById(
      runTimeHangingProtocolId
    )
      ? runTimeHangingProtocolId
      : hangingProtocol;

    // Sets the active hanging protocols - if hangingProtocol is undefined,
    // resets to default.  Done before the onModeEnter to allow the onModeEnter
    // to perform custom hanging protocol actions
    hangingProtocolService.setActiveProtocolIds(hangingProtocolIdToUse);

    mode?.onModeEnter({
      servicesManager,
      extensionManager,
      commandsManager,
    });

    const setupRouteInit = async () => {
      /**
       * The next line should get all the query parameters provided by the URL
       * - except the StudyInstanceUIDs - and create an object called filters
       * used to filtering the study as the user wants otherwise it will return
       * a empty object.
       *
       * Example:
       * const filters = {
       *   seriesInstanceUID: 1.2.276.0.7230010.3.1.3.1791068887.5412.1620253993.114611
       * }
       */
      const filters =
        Array.from(query.keys()).reduce(
          (acc: Record<string, string>, val: string) => {
            if (val !== 'StudyInstanceUIDs') {
              if (['seriesInstanceUID', 'SeriesInstanceUID'].includes(val)) {
                return {
                  ...acc,
                  seriesInstanceUID: query.get(val),
                };
              }

              return { ...acc, [val]: query.get(val) };
            }
          },
          {}
        ) ?? {};

      if (route.init) {
        return await route.init(
          {
            servicesManager,
            extensionManager,
            hotkeysManager,
            dataSource,
          },
          hangingProtocolIdToUse
        );
      }

      return defaultRouteInit(
        {
          servicesManager,
          studyInstanceUIDs,
          dataSource,
          seriesInstanceUIDs,
          filters,
          sortCriteria,
          sortFunction,
        },
        hangingProtocolIdToUse
      );
    };

    let unsubscriptions;
    setupRouteInit().then(unsubs => {
      unsubscriptions = unsubs;
    });

    return () => {
      // The mode.onModeExit must be done first to allow it to store
      // information, and must be in a try/catch to ensure subscriptions
      // are unsubscribed.
      try {
        mode?.onModeExit?.({
          servicesManager,
          extensionManager,
        });
      } catch (e) {
        console.warn('mode exit failure', e);
      }
      // The unsubscriptions must occur before the extension onModeExit
      // in order to prevent exceptions during cleanup caused by spurious events
      unsubscriptions.forEach(unsub => {
        unsub();
      });
      // The extension manager must be called after the mode, this is
      // expected to cleanup the state to a standard setup.
      extensionManager.onModeExit();
    };
  }, [
    mode,
    dataSourceName,
    location,
    route,
    servicesManager,
    extensionManager,
    hotkeysManager,
    studyInstanceUIDs,
    refresh,
  ]);

  const renderLayoutData = props => {
    const layoutTemplateModuleEntry = extensionManager.getModuleEntry(
      layoutTemplateData.current.id
    );
    const LayoutComponent = layoutTemplateModuleEntry.component;

    return <LayoutComponent {...props} />;
  };

  return (
    <ImageViewerProvider
      // initialState={{ StudyInstanceUIDs: StudyInstanceUIDs }}
      StudyInstanceUIDs={studyInstanceUIDs}
      // reducer={reducer}
    >
      <CombinedContextProvider>
        <DragAndDropProvider>
          {layoutTemplateData.current &&
            studyInstanceUIDs?.length &&
            studyInstanceUIDs[0] !== undefined &&
            renderLayoutData({
              ...layoutTemplateData.current.props,
              ViewportGridComp: ViewportGridWithDataSourceFactory(
                layoutTemplateData.current?.props?.viewportGridProps
              ),
            })}
        </DragAndDropProvider>
      </CombinedContextProvider>
    </ImageViewerProvider>
  );
}

ModeRoute.propTypes = {
  mode: PropTypes.object.isRequired,
  dataSourceName: PropTypes.string,
  extensionManager: PropTypes.object,
  servicesManager: PropTypes.object,
  hotkeysManager: PropTypes.object,
};
