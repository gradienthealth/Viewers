import i18n from 'i18next';
import { id } from './id';
import {
  initToolGroups,
  toolbarButtons,
  cornerstone,
  ohif,
  dicomsr,
  dicomvideo,
  basicLayout,
  basicRoute,
  extensionDependencies as basicDependencies,
  mode as basicMode,
  modeInstance as basicModeInstance,
  onModeEnter as basicOnModeEnter,
  onModeExit as basicOnModeExit,
} from '@ohif/mode-basic';

export const tracked = {
  measurements: '@ohif/extension-measurement-tracking.panelModule.trackedMeasurements',
  thumbnailList: '@ohif/extension-measurement-tracking.panelModule.seriesList',
  viewport: '@ohif/extension-measurement-tracking.viewportModule.cornerstone-tracked',
};

const gradienthealth = {
  form: '@gradienthealth/ohif-gradienthealth-extension.panelModule.form',
};

export const extensionDependencies = {
  // Can derive the versions at least process.env.from npm_package_version
  ...basicDependencies,
  '@ohif/extension-measurement-tracking': '^3.0.0',
};

export function onModeEnter({
  servicesManager,
  extensionManager,
  commandsManager,
  panelService,
  segmentationService,
}: withAppTypes) {
  const { CacheAPIService, GoogleSheetsService } = servicesManager.services;

  basicOnModeEnter.bind(this)({
    servicesManager,
    extensionManager,
    commandsManager,
    panelService,
    segmentationService,
  });

  /*measurementService.clearMeasurements();

  // Init Default and SR ToolGroups
  initToolGroups(extensionManager, toolGroupService, commandsManager);

  toolbarService.addButtons(toolbarButtons);
  toolbarService.createButtonSection('primary', [
    'MeasurementTools',
    'Zoom',
    'Pan',
    'TrackballRotate',
    'WindowLevel',
    'Capture',
    'Layout',
    'Crosshairs',
    'MoreTools',
  ]);

  toolbarService.createButtonSection('measurementSection', [
    'Length',
    'Bidirectional',
    'ArrowAnnotate',
    'EllipticalROI',
    'RectangleROI',
    'CircleROI',
    'PlanarFreehandROI',
    'SplineROI',
    'LivewireContour',
  ]);

  toolbarService.createButtonSection('moreToolsSection', [
    'Reset',
    'rotate-right',
    'flipHorizontal',
    'ImageSliceSync',
    'ReferenceLines',
    'ImageOverlayViewer',
    'SmartStackScroll',
    'invert',
    'Probe',
    'Cine',
    'Angle',
    'CobbAngle',
    'Magnify',
    'CalibrationLine',
    'TagBrowser',
    'AdvancedMagnify',
    'UltrasoundDirectionalTool',
    'WindowLevelRegion',
    'OPFSTool',
  ]);

  customizationService.setCustomizations({
    'panelSegmentation.disableEditing': {
      $set: true,
    },
  });

  // // ActivatePanel event trigger for when a segmentation or measurement is added.
  // // Do not force activation so as to respect the state the user may have left the UI in.
  // _activatePanelTriggersSubscriptions = [
  //   ...panelService.addActivatePanelTriggers(
  //     cornerstone.segmentation,
  //     [
  //       {
  //         sourcePubSubService: segmentationService,
  //         sourceEvents: [segmentationService.EVENTS.SEGMENTATION_ADDED],
  //       },
  //     ],
  //     true
  //   ),
  //   ...panelService.addActivatePanelTriggers(
  //     tracked.measurements,
  //     [
  //       {
  //         sourcePubSubService: measurementService,
  //         sourceEvents: [
  //           measurementService.EVENTS.MEASUREMENT_ADDED,
  //           measurementService.EVENTS.RAW_MEASUREMENT_ADDED,
  //         ],
  //       },
  //     ],
  //     true
  //   ),
  //   true,
  // ];*/
  CacheAPIService.init();
  GoogleSheetsService.init();
}
export function onModeExit({ servicesManager }: withAppTypes) {
  const { CacheAPIService, GoogleSheetsService } = servicesManager.services;

  /*_activatePanelTriggersSubscriptions.forEach(sub => sub.unsubscribe());
  _activatePanelTriggersSubscriptions = [];

  uiDialogService.hideAll();
  uiModalService.hide();
  toolGroupService.destroy();
  syncGroupService.destroy();
  segmentationService.destroy();
  cornerstoneViewportService.destroy();*/
  basicOnModeExit.bind(this)();
  CacheAPIService.destroy();
  GoogleSheetsService.destroy();
}

const rightPanels = [cornerstone.segmentation, tracked.measurements];
const params = new URLSearchParams(window.location.search);
if (params.get('sheetId') && params.get('sheetName')) {
  rightPanels.unshift(gradienthealth.form);
}

export const longitudinalInstance = {
  ...basicLayout,
  id: ohif.layout,
  props: {
    ...basicLayout.props,
    leftPanels: [tracked.thumbnailList],
    rightPanels: rightPanels,
    rightPanelClosed: false,
    viewports: [
      {
        namespace: tracked.viewport,
        // Re-use the display sets from basic
        displaySetsToDisplay: basicLayout.props.viewports[0].displaySetsToDisplay,
      },
      ...basicLayout.props.viewports,
    ],
  },
};

export const longitudinalRoute = {
  ...basicRoute,
  path: 'longitudinal',
  /*init: ({ servicesManager, extensionManager }) => {
          //defaultViewerRouteInit
        },*/
  layoutInstance: longitudinalInstance,
};

export const modeInstance = {
  ...basicModeInstance,
  // TODO: We're using this as a route segment
  // We should not be.
  id,
  routeName: 'viewer',
  displayName: i18n.t('Modes:Basic Viewer'),
  /**
   * Lifecycle hooks
  //  */
  onModeEnter,
  onModeExit,
  routes: [longitudinalRoute],
  extensions: extensionDependencies,
};

const mode = {
  ...basicMode,
  id,
  modeInstance,
  extensionDependencies,
};

export default mode;
export { initToolGroups, toolbarButtons };
