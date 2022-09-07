/**
 * Entry point for development and production PWA builds.
 */
import 'regenerator-runtime/runtime';
import App from './App.tsx';
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
import loadDynamicImports from './pluginImports.js';

const loadDynamicConfigPromise = async ()=>{
  let query = new URLSearchParams(window.location.search)
  let config_url = query.get('config_url')

  if(!config_url){
    const obj = JSON.parse(
      sessionStorage.getItem('ohif-redirect-to')
    );
    if(obj){
      const query = new URLSearchParams(obj.search)
      config_url = query.get('config_url')
    }
  }

  if(config_url){
    const response = await fetch(config_url)
    return response.json()
  }

  return null
}

Promise.all([loadDynamicImports(), loadDynamicConfigPromise()]).then((arr)=>{
  const [a, config_json] = arr
  if(config_json !== null){
    window.config = config_json
    window.config.whiteLabeling = {
      createLogoComponentFn: function (React) {
        return React.createElement(
          'a',
          {
            target: '_self',
            rel: 'noopener noreferrer',
            className: 'text-purple-600 line-through',
            href: '/',
          },
          React.createElement('img',
            {
              src: './assets/gradient.svg',
            }
          ))
      },
    }
  }

  const appProps = {
    config: window ? window.config : {},
    defaultExtensions: window.extensions,
    defaultModes: window.modes,
  };

  const app = React.createElement(App, appProps, null);
  ReactDOM.render(app, document.getElementById('root'));
});
