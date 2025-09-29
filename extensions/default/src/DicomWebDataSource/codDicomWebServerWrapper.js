import { internal } from '@cornerstonejs/dicom-image-loader';

const Properties = {
  StudyUID: '0020000D',
  SeriesUID: '0020000E',
};

const DEFAULT_USER_PROJECT = 'laplace-viewer';

class CodDicomWebServerClient {
  /**
   * @param {Object} config
   * @param {URLSearchParams} [query]
   */
  constructor(config, query) {
    this.baseURL = config.url;
    this.qidoURL = this.baseURL;
    this.wadoURL = this.baseURL;
    this.config = config;
    this.headers = config.headers;
    this.errorInterceptor = config.errorInterceptor;

    this._codServer = internal.getWadoRsWebServer();
    this.deidStudyInstanceUIDMap = new Map(); // Map of study instance UIDs to deid study instance UIDs
    this._studiesMetadata = [];

    internal.setCodHeaders({
      'X-Goog-User-Project': query?.get('userProject') || DEFAULT_USER_PROJECT,
    });
  }

  /**
   * @param {URLSearchParams} queryParams
   */
  async fetchStudiesMetadata(queryParams) {
    const bucketNames = queryParams.getAll('bucket');
    const bucketPrefix = queryParams.get('bucket-prefix');

    this.buckets = bucketNames.map(bucketName => ({
      bucketName,
      bucketPrefix: bucketPrefix,
    }));

    const studiesMetadata = await Promise.all(
      (this.buckets.length ? this.buckets : [{}]).flatMap(async ({ bucketName, bucketPrefix }) => {
        return await this.filesFromStudyInstanceUID({
      wadoURL: this.wadoURL,
          bucketName: bucketName,
          prefix: bucketPrefix,
      studyuids: queryParams.getAll('StudyInstanceUIDs'),
      headers: this.headers,
    })
      .then(studies => {
        return studies.filter(study => {
          study.series = study.series.filter(aSeries => {
            if (aSeries.instances.length) {
              return true;
            }

            console.warn('No instance found in series ' + aSeries.deidSeriesInstanceUID);
            return false;
          });

          if (study.series.length) {
            const studyUID = study.series[0].instances[0]['0020000D'].Value[0];
            this.deidStudyInstanceUIDMap.set(study.deidStudyInstanceUID, studyUID);
            return true;
          }

          return false;
        });
      })
      .catch(error => {
        this.errorInterceptor(error);
        return [];
      });
      })
    );

    const filteredStudies = studiesMetadata.flat().filter(Boolean);

    if (filteredStudies.length) {
      this._studiesMetadata.push({
        deidStudyInstanceUID: filteredStudies[0].deidStudyInstanceUID,
        series: filteredStudies.flatMap(({ series }) => series),
      });
    }
  }

  /**
   * @param {{ bucketName: string, bucketPrefix: string }[]} buckets
   */
  setBuckets(buckets) {
    this.buckets = buckets;
  }

  /**
   * @param {string} deidStudyInstanceUID
   */
  getStudyUIDForDeidStudyUID(deidStudyInstanceUID) {
    const studyWithDeidStudyUID = this._studiesMetadata.find(
      study => study.deidStudyInstanceUID === deidStudyInstanceUID
    );

    return this._getProperty(studyWithDeidStudyUID, Properties.StudyUID);
  }

  /**
   * @param {Object} data
   * @param {string} property
   */
  _getProperty(data, property) {
    if (!data) {
      return;
    }

    return (
      data[property]?.Value[0] ||
      data.instances?.[0][property]?.Value[0] ||
      data.series?.[0].instances[0][property]?.Value[0]
    );
  }

  /**
   * @param {Object[]} studies
   * @param {{ 'StudyInstanceUID':string, [s: string]: any; }} queryParams
   */
  _findStudy(studies = [], queryParams) {
    return studies.find(study => {
      if (this._getProperty(study, Properties.StudyUID) === queryParams.StudyInstanceUID) {
        return true;
      }

      return !!Object.entries(queryParams).find(
        ([tag, value]) => this._getProperty(study, tag) === value
      );
    });
  }

  /**
   * @param {Object[]} series
   * @param {string} seriesInstanceUID
   */
  _findSeries(series = [], seriesInstanceUID) {
    return series.find(
      series => this._getProperty(series, Properties.SeriesUID) === seriesInstanceUID
    );
  }

  /**
   * @param {Object} options
   * @param {string} options.studyInstanceUID
   * @param {string} options.seriesInstanceUID
   */
  async retrieveSeriesMetadata({ studyInstanceUID, seriesInstanceUID }) {
    let studyFound = this._findStudy(this._studiesMetadata, { StudyInstanceUID: studyInstanceUID });

    if (!studyFound) {
      await this._fetchStudyMetadataByUID(studyInstanceUID);
      studyFound = this._findStudy(this._studiesMetadata, { StudyInstanceUID: studyInstanceUID });
    }

    const seriesFound = this._findSeries(studyFound?.series, seriesInstanceUID);

    return new Promise((resolve, reject) => {
      if (seriesFound) {
        resolve(seriesFound.instances);
      } else {
        reject();
      }
    });
  }

  /**
   * @param {Object} options
   * @param {string} options.studyInstanceUID
   */
  async retrieveStudyMetadata({ studyInstanceUID }) {
    let studyFound = this._findStudy(this._studiesMetadata, { StudyInstanceUID: studyInstanceUID });

    if (!studyFound) {
      await this._fetchStudyMetadataByUID(studyInstanceUID);
      studyFound = this._findStudy(this._studiesMetadata, { StudyInstanceUID: studyInstanceUID });
    }

    return new Promise((resolve, reject) => {
      if (studyFound) {
        resolve(studyFound.series.flatMap(aSeries => aSeries.instances));
      } else {
        reject();
      }
    });
  }

  /**
   * @param {Object} options
   * @param {string} options.studyInstanceUID
   * @param {Object} options.queryParams
   * @param {string} options.queryParams.SeriesInstanceUID
   */
  async searchForSeries({ studyInstanceUID, queryParams }) {
    let studyFound = this._findStudy(this._studiesMetadata, { StudyInstanceUID: studyInstanceUID });

    if (!studyFound) {
      await this._fetchStudyMetadataByUID(studyInstanceUID);
      studyFound = this._findStudy(this._studiesMetadata, { StudyInstanceUID: studyInstanceUID });
    }

    const seriesFound = this._findSeries(studyFound?.series, queryParams?.SeriesInstanceUID);

    return new Promise(resolve => {
      if (studyFound) {
        resolve(
          seriesFound
            ? [seriesFound.instances[0]]
            : studyFound.series.map(aSeries => aSeries.instances[0])
        );
      } else {
        resolve([]);
      }
    });
  }

  /**
   * @param {Object} options
   * @param {Object} options.queryParams
   * @param {string} options.queryParams.StudyInstanceUID
   */
  async searchForStudies({ queryParams }) {
    let studyFound = this._studiesMetadata.find(study => {
      if (this._getProperty(study, Properties.StudyUID) === queryParams.StudyInstanceUID) {
        return true;
      }

      const tagFound = Object.entries(queryParams).find(
        ([tag, value]) => this._getProperty(study, tag) === value
      );
      if (tagFound) {
        return true;
      }

      return false;
    });

    if (!studyFound && queryParams.StudyInstanceUID) {
      await this._fetchStudyMetadataByUID(queryParams.StudyInstanceUID);
      studyFound = this._findStudy(this._studiesMetadata, queryParams);
    }

    return new Promise(resolve => {
      if (studyFound) {
        resolve([studyFound.series[0].instances[0]]);
      } else {
        resolve([]);
      }
    });
  }

  /**
   * @param {string} studyInstanceUID
   */
  async _fetchStudyMetadataByUID(studyInstanceUID) {
    const search = new URLSearchParams({
      StudyInstanceUIDs: studyInstanceUID,
    });
    if (this.buckets) {
      this.buckets.forEach(({ bucketName, bucketPrefix }) => {
        search.append('bucket', bucketName);
        if (search.get('bucket-prefix') !== bucketPrefix) {
          search.append('bucket-prefix', bucketPrefix);
        }
      });
    }

    await this.fetchStudiesMetadata(search);
  }

  /**
   * @param {Object} params
   * @param {string} params.wadoURL
   * @param {string} params.bucketName
   * @param {string[]} params.studyuids
   * @param {string} params.prefix
   * @param {Object} params.headers
   */
  async filesFromStudyInstanceUID({ wadoURL, bucketName, prefix, studyuids, headers }) {
    const delimiter = '/';
    const domain = parseDomainFromBaseURL(wadoURL);
    const bucketComponents = wadoURL.split(domain + delimiter)[1]?.split(delimiter) || [];
    const bucket = bucketName || bucketComponents[0];
    const bucketPrefix = prefix || bucketComponents.slice(1).join(delimiter) || 'dicomweb';
    const urlRoot = `${domain}/${bucket}/${bucketPrefix}`;

    const studyMetadata = studyuids.map(async (/** @type {string} */ deidStudyInstanceuid) => {
      const folderPath = `${bucketPrefix}/studies/${deidStudyInstanceuid}/series/`;
      const apiUrl = `${domain}/storage/v1/b/${bucket}/o?prefix=${folderPath}&delimiter=${delimiter}`;
      const response = await fetch(apiUrl, { headers });
      const res = await response.json();
      const folders = res.prefixes || [];
      const series = folders.map(async (/** @type {string} */ folderPath) => {
        const deidSeriesInstanceUID = folderPath.split('/series/')[1].split(delimiter)[0];
        const wadoUrl = `${urlRoot}/studies/${deidStudyInstanceuid}/series/${deidSeriesInstanceUID}/metadata`;
        return this._codServer
          .fetchCod(wadoUrl, headers)
          .then(instances => ({
            deidSeriesInstanceUID,
            instances: instances.map(instance => ({
              ...instance,
              BucketPath: { Value: [`${bucket}/${bucketPrefix}`] },
            })),
          }))
          .catch(() => null);
      });
      return Promise.all(series).then(result => ({
        deidStudyInstanceUID: deidStudyInstanceuid,
        series: result.filter(Boolean),
      }));
    });
    return await Promise.all(studyMetadata);
  }
}

/**
 * @param {string} baseRoot
 */
function parseDomainFromBaseURL(baseRoot) {
  const [firstPart, secondPart] = baseRoot.split('://');
  return `${firstPart}://${secondPart.split('/')[0]}`;
}

export default CodDicomWebServerClient;
