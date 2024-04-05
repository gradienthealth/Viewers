window.config = {
  routerBasename: "/",
  extensions: [],
  modes: [],
  customizationService: {},
  showStudyList: !0,
  maxNumberOfWebWorkers: 3,
  omitQuotationForMultipartRequest: !0,
  showLoadingIndicator: !0,
  maxNumRequests: {
    interaction: 100,
    thumbnail: 75,
    prefetch: 4
  },
  oidc: [{
    authority: "https://accounts.google.com",
    client_id: "503845864048-5h2i0kbtrq0sabl0ftq8hedgssgl2n97.apps.googleusercontent.com",
    redirect_uri: "/callback",
    response_type: "id_token token",
    scope: "email profile openid https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/cloudplatformprojects.readonly https://www.googleapis.com/auth/cloud-healthcare",
    post_logout_redirect_uri: "/logout-redirect.html",
    revoke_uri: "https://accounts.google.com/o/oauth2/revoke?token=",
    automaticSilentRenew: !0,
    revokeAccessTokenOnSignout: !0
  }],
  dataSources: [{
    friendlyName: "dcmjs DICOMWeb Server",
    namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
    sourceName: "dicomweb",
    configuration: {
      name: "GCP",
      wadoUriRoot: "https://healthcare.googleapis.com/v1/projects/icad-med/locations/us-central1/datasets/mammo/dicomStores/breast_density/dicomWeb",
      qidoRoot: "https://healthcare.googleapis.com/v1/projects/icad-med/locations/us-central1/datasets/mammo/dicomStores/breast_density/dicomWeb",
      wadoRoot: "https://healthcare.googleapis.com/v1/projects/icad-med/locations/us-central1/datasets/mammo/dicomStores/breast_density/dicomWeb",
      qidoSupportsIncludeField: !0,
      imageRendering: "wadors",
      thumbnailRendering: "wadors",
      enableStudyLazyLoad: !0,
      supportsFuzzyMatching: !0,
      supportsWildcard: !1
    }
  }, {
    friendlyName: "dicom json",
    namespace: "@ohif/extension-default.dataSourcesModule.dicomjson",
    sourceName: "dicomjson",
    configuration: {
      name: "json"
    }
  }, {
    friendlyName: "dicom local",
    namespace: "@ohif/extension-default.dataSourcesModule.dicomlocal",
    sourceName: "dicomlocal",
    configuration: {}
  }],
  httpErrorHandler: e => {
    console.warn(e.status),
      console.warn("test, navigate to https://ohif.org/")
  }
  ,
  whiteLabeling: {
    createLogoComponentFn: function (e) {
      return e.createElement("a", {
        target: "_self",
        rel: "noopener noreferrer",
        className: "text-purple-600 line-through",
        href: "/"
      }, e.createElement("img", {
        src: "./assets/gradient.svg"
      }))
    }
  },
  defaultDataSourceName: "dicomweb",
  hotkeys: [{
    commandName: "incrementActiveViewport",
    label: "Next Viewport",
    keys: ["right"]
  }, {
    commandName: "decrementActiveViewport",
    label: "Previous Viewport",
    keys: ["left"]
  }, {
    commandName: "rotateViewportCW",
    label: "Rotate Right",
    keys: ["r"]
  }, {
    commandName: "rotateViewportCCW",
    label: "Rotate Left",
    keys: ["l"]
  }, {
    commandName: "invertViewport",
    label: "Invert",
    keys: ["i"]
  }, {
    commandName: "flipViewportHorizontal",
    label: "Flip Horizontally",
    keys: ["h"]
  }, {
    commandName: "flipViewportVertical",
    label: "Flip Vertically",
    keys: ["v"]
  }, {
    commandName: "scaleUpViewport",
    label: "Zoom In",
    keys: ["+"]
  }, {
    commandName: "scaleDownViewport",
    label: "Zoom Out",
    keys: ["-"]
  }, {
    commandName: "fitViewportToWindow",
    label: "Zoom to Fit",
    keys: ["="]
  }, {
    commandName: "resetViewport",
    label: "Reset",
    keys: ["space"]
  }, {
    commandName: "nextImage",
    label: "Next Image",
    keys: ["down"]
  }, {
    commandName: "previousImage",
    label: "Previous Image",
    keys: ["up"]
  }, {
    commandName: "setToolActive",
    commandOptions: {
      toolName: "Zoom"
    },
    label: "Zoom",
    keys: ["z"]
  }, {
    commandName: "windowLevelPreset1",
    label: "W/L Preset 1",
    keys: ["1"]
  }, {
    commandName: "windowLevelPreset2",
    label: "W/L Preset 2",
    keys: ["2"]
  }, {
    commandName: "windowLevelPreset3",
    label: "W/L Preset 3",
    keys: ["3"]
  }, {
    commandName: "windowLevelPreset4",
    label: "W/L Preset 4",
    keys: ["4"]
  }, {
    commandName: "windowLevelPreset5",
    label: "W/L Preset 5",
    keys: ["5"]
  }, {
    commandName: "windowLevelPreset6",
    label: "W/L Preset 6",
    keys: ["6"]
  }, {
    commandName: "windowLevelPreset7",
    label: "W/L Preset 7",
    keys: ["7"]
  }, {
    commandName: "windowLevelPreset8",
    label: "W/L Preset 8",
    keys: ["8"]
  }, {
    commandName: "windowLevelPreset9",
    label: "W/L Preset 9",
    keys: ["9"]
  }]
};
