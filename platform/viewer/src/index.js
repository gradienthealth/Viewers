/**
 * Entry point for development and production PWA builds.
 */
import 'regenerator-runtime/runtime';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
/**
 * EXTENSIONS AND MODES
 * =================
 * pluginImports.js is dynamically generated from extension and mode
 * configuration at build time.
 *
 * pluginImports.js imports all of the modes and extensions and adds them
 * to the window for processing.
 */
import loadDynamicImports, { loadRuntimeImports } from './pluginImports.js';
import loadDynamicConfig from './loadDynamicConfig';

Promise.all([loadDynamicImports(), loadDynamicConfig()]).then(arr => {
  /**
   * Combine our appConfiguration with installed extensions and modes.
   * In the future appConfiguration may contain modes added at runtime.
   *  */
  const [_, config_json] = arr;
  if (config_json !== null) {
    /**
     * Whitelabeling is passed via app config because it is a react
     * component. It may be better to simply take in a uri path to an asset
     * instead to simplify the API
     */
    const whiteLabeling = window.config.whiteLabeling;
    window.config = config_json;
    window.config.whiteLabeling = whiteLabeling;
  }

  loadRuntimeImports(window.config).then(() => {
    /**
     * Combine our appConfiguration with installed extensions and modes.
     * In the future appConfiguration may contain modes added at runtime.
     *  */
    const appProps = {
      config: window ? window.config : {},
      defaultExtensions: window.extensions,
      defaultModes: window.modes,
    };

    /** Create App */
    const app = React.createElement(App, appProps, null);
    /** Render */
    ReactDOM.render(app, document.getElementById('root'));
  });
});
