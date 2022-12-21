import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router';

import PropTypes from 'prop-types';
// TODO: DicomMetadataStore should be injected?
import { DicomMetadataStore } from '@ohif/core';
import { DragAndDropProvider, ImageViewerProvider } from '@ohif/ui';
import { useQuery } from '@hooks';
import ViewportGrid from '@components/ViewportGrid';
import Compose from './Compose';

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
  hangingProtocol
) {
  const {
    DisplaySetService,
    HangingProtocolService,
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

      DisplaySetService.makeDisplaySets(seriesMetadata.instances, madeInClient);
    }
  );

  unsubscriptions.push(instanceAddedUnsubscribe);

  let allRetrieves = studyInstanceUIDs.map(StudyInstanceUID => {
    seriesInstanceUIDs = seriesInstanceUIDs || [];
    filters = filters || {};

    let retrievedSeries;

    if (seriesInstanceUIDs.length) {
      retrievedSeries = seriesInstanceUIDs.map(seriesInstanceUID => {
        filters.seriesInstanceUID = seriesInstanceUID;

        return dataSource.retrieve.series.metadata({
          StudyInstanceUID,
          filters,
          sortCriteria,
          sortFunction,
        });
      });
    } else {
      retrievedSeries = dataSource.retrieve.series.metadata({
        StudyInstanceUID,
        filters,
        sortCriteria,
        sortFunction,
      });
    }

    return retrievedSeries;
  });

  allRetrieves = allRetrieves.flat();

  // The hanging protocol matching service is fairly expensive to run multiple
  // times, and doesn't allow partial matches to be made (it will simply fail
  // to display anything if a required match fails), so we wait here until all metadata
  // is retrieved (which will synchronously trigger the display set creation)
  // until we run the hanging protocol matching service.

  Promise.allSettled(allRetrieves).then(() => {
    const displaySets = DisplaySetService.getActiveDisplaySets();

    if (!displaySets || !displaySets.length) {
      return;
    }

    const studyMap = {};

    // Prior studies don't quite work properly yet, but the studies list
    // is at least being generated and passed in.
    const studies = displaySets.reduce((prev, curr) => {
      const { StudyInstanceUID } = curr;
      if (!studyMap[StudyInstanceUID]) {
        const study = DicomMetadataStore.getStudy(StudyInstanceUID);
        studyMap[StudyInstanceUID] = study;
        prev.push(study);
      }
      return prev;
    }, []);

    // The assumption is that the display set at position 0 is the first
    // study being displayed, and is thus the "active" study.
    const activeStudy = studies[0];

    // run the hanging protocol matching on the displaySets with the predefined
    // hanging protocol in the mode configuration
    HangingProtocolService.run(
      { studies, activeStudy, displaySets },
      hangingProtocol
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
    DisplaySetService,
    HangingProtocolService: hangingProtocolService,
  } = servicesManager.services;

  const { extensions, sopClassHandlers, hotkeys, hangingProtocol } = mode;

  if (dataSourceName === undefined) {
    dataSourceName = extensionManager.defaultDataSourceName;
  }

  extensionManager.setActiveDataSource(dataSourceName);

  const dataSources = extensionManager.getActiveDataSource();

  // Only handling one instance of the datasource type (E.g. one DICOMWeb server)
  const dataSource = dataSources[0];
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
    if (dataSource.onNewStudy) {
      dataSource.onNewStudy(({ studyInstanceUIDs }) => {
        setStudyInstanceUIDs(studyInstanceUIDs);
      });
    }
  }, [location]);

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

    const userPreferredHotkeys = JSON.parse(
      localStorage.getItem('hotkey-definitions')
    );

    if (userPreferredHotkeys?.length) {
      hotkeysManager.setHotkeys(userPreferredHotkeys);
    } else {
      hotkeysManager.setHotkeys(hotkeys);
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
    DisplaySetService.init(extensionManager, sopClassHandlers);

    extensionManager.onModeEnter({
      servicesManager,
      extensionManager,
      commandsManager,
    });
    // Sets the active hanging protocols - if hangingProtocol is undefined,
    // resets to default.  Done before the onModeEnter to allow the onModeEnter
    // to perform custom hanging protocol actions
    hangingProtocolService.setActiveProtocols(hangingProtocol);
    mode?.onModeEnter({ servicesManager, extensionManager, commandsManager });

    const setupRouteInit = async () => {
      /**
       * The next line should get all the query parameters provided by the URL
       * - except the StudyInstaceUIDs - and create an object called filters
       * used to filtering the study as the user wants otherwise it will return
       * a empty object.
       *
       * Example:
       * const filters = {
       *   seriesInstaceUID: 1.2.276.0.7230010.3.1.3.1791068887.5412.1620253993.114611
       * }
       */
      // const filters =
      //   Array.from(query.keys()).reduce(
      //     (acc: Record<string, string>, val: string) => {
      //       if (val !== 'StudyInstanceUIDs') {
      //         if (['seriesInstanceUID', 'SeriesInstanceUID'].includes(val)) {
      //           return { ...acc, seriesInstanceUID: query.get(val) };
      //         }

      //         return { ...acc, [val]: query.get(val) };
      //       }
      //     },
      //     {}
      //   ) ?? {};

      if (route.init) {
        return await route.init(
          {
            servicesManager,
            extensionManager,
            hotkeysManager,
            dataSource,
          },
          hangingProtocol
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
        hangingProtocol
      );
    };

    let unsubscriptions;
    setupRouteInit().then(unsubs => {
      unsubscriptions = unsubs;
    });

    return () => {
      extensionManager.onModeExit();
      mode?.onModeExit({ servicesManager, extensionManager });
      unsubscriptions.forEach(unsub => {
        unsub();
      });
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
