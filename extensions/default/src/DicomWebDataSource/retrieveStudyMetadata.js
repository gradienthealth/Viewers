import deepEqual from './utils/deepEqual.js';
import RetrieveMetadata from './wado/retrieveMetadata.js';

const moduleName = 'RetrieveStudyMetadata';
// Cache for promises. Prevents unnecessary subsequent calls to the server
const StudyMetaDataPromises = new Map();

/**
 * Retrieves study metadata
 *
 * @param {Object} server Object with server configuration parameters
 * @param {string} StudyInstanceUID The UID of the Study to be retrieved
 * @param {boolean} enabledStudyLazyLoad Whether the study metadata should be loaded asynchronusly.
 * @param {function} storeInstancesCallback A callback used to store the retrieved instance metadata.
 * @param {Object} [filters] - Object containing filters to be applied on retrieve metadata process
 * @param {string} [filter.seriesInstanceUID] - series instance uid to filter results against
 * @returns {Promise} that will be resolved with the metadata or rejected with the error
 */
export function retrieveStudyMetadata(
  dicomWebClient,
  StudyInstanceUID,
  enableStudyLazyLoad,
  filters,
  sortCriteria,
  sortFunction,
  withCredentials
) {
  // @TODO: Whenever a study metadata request has failed, its related promise will be rejected once and for all
  // and further requests for that metadata will always fail. On failure, we probably need to remove the
  // corresponding promise from the "StudyMetaDataPromises" map...

  if (!dicomWebClient) {
    throw new Error(
      `${moduleName}: Required 'dicomWebClient' parameter not provided.`
    );
  }
  if (!StudyInstanceUID) {
    throw new Error(
      `${moduleName}: Required 'StudyInstanceUID' parameter not provided.`
    );
  }

  // Already waiting on result? Return cached promise
  if (StudyMetaDataPromises.has(StudyInstanceUID)) {
    const filtersArray = StudyMetaDataPromises.get(StudyInstanceUID);

    const foundFilter = filtersArray.find((item, index, obj) => {
      return deepEqual(item.filters, filters);
    });

    if (foundFilter) {
      return foundFilter.promise;
    }
  }

  // Create a promise to handle the data retrieval
  const promise = new Promise((resolve, reject) => {
    RetrieveMetadata(
      dicomWebClient,
      StudyInstanceUID,
      enableStudyLazyLoad,
      filters,
      sortCriteria,
      sortFunction,
      withCredentials
    ).then(function(data) {
      resolve(data);
    }, reject);
  });

  let filtersArray;

  // Store the promise in cache
  if (StudyMetaDataPromises.has(StudyInstanceUID)) {
    filtersArray = StudyMetaDataPromises.get(StudyInstanceUID);
  } else {
    filtersArray = [];

    StudyMetaDataPromises.set(filtersArray);
  }

  filtersArray.push({ promise, filters });

  return promise;
}

/**
 * Delete the cached study metadata retrieval promise to ensure that the browser will
 * re-retrieve the study metadata when it is next requested
 *
 * @param {String} StudyInstanceUID The UID of the Study to be removed from cache
 *
 */
export function deleteStudyMetadataPromise(StudyInstanceUID) {
  if (StudyMetaDataPromises.has(StudyInstanceUID)) {
    StudyMetaDataPromises.delete(StudyInstanceUID);
  }
}
