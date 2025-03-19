import { CodDicomWebServer } from 'cod-dicomweb-server';

const Properties = {
  StudyUID: '0020000D',
  SeriesUID: '0020000E',
};

class CodDicomWebServerClient {
  /**
   * @param {Object} config
   */
  constructor(config) {
    this.baseURL = config.url;
    this.qidoURL = this.baseURL;
    this.wadoURL = this.baseURL;
    this.config = config;
    this.headers = config.headers;
    this.errorInterceptor = config.errorInterceptor;

    this._codServer = new CodDicomWebServer({ domain: parseDomainFromBaseURL(this.baseURL) });
    this.deidStudyInstanceUIDMap = new Map(); // Map of study instance UIDs to deid study instance UIDs
  }

  /**
   * @param {URLSearchParams} queryParams
   */
  async fetchStudiesMetadata(queryParams) {
    this._studiesMetadata = await this.filesFromStudyInstanceUID({
      wadoURL: this.wadoURL,
      bucketName: queryParams.get('bucket'),
      prefix: queryParams.get('bucket-prefix') || 'dicomweb',
      studyuids: queryParams.getAll('StudyInstanceUIDs'),
      headers: this.headers,
    })
      .then(studies => {
        studies.forEach(study => {
          const studyUID = study.series[0].instances[0]['0020000D'].Value[0];
          this.deidStudyInstanceUIDMap.set(study.deidStudyInstanceUID, studyUID);
        });
        return studies;
      })
      .catch(error => {
        this.errorInterceptor(error);
        return [];
      });
  }

  /**
   * @param {string} deidStudyInstanceUID
   */
  getStudyUIDForDeidStudyUID(deidStudyInstanceUID) {
    const studyWithDeidStudyUID = this._studiesMetadata.find(
      study => (study.deidStudyInstanceUID = deidStudyInstanceUID)
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
      data.instances?.[0][property].Value[0] ||
      data.series?.[0].instances[0][property].Value[0]
    );
  }

  /**
   * @param {Object[]} studies
   * @param {string} studyInstanceUID
   */
  _findStudy(studies = [], studyInstanceUID) {
    return studies.find(
      study => this._getProperty(study, Properties.StudyUID) === studyInstanceUID
    );
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
  retrieveSeriesMetadata({ studyInstanceUID, seriesInstanceUID }) {
    const studyFound = this._findStudy(this._studiesMetadata, studyInstanceUID);
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
  retrieveStudyMetadata({ studyInstanceUID }) {
    const studyFound = this._findStudy(this._studiesMetadata, studyInstanceUID);

    if (studyFound) {
      return studyFound.series.flatMap(aSeries => aSeries.instances);
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
   */
  searchForSeries({ studyInstanceUID }) {
    const studyFound = this._findStudy(this._studiesMetadata, studyInstanceUID);

    if (studyFound) {
      return [studyFound.series[0].instances[0]];
    }

    return new Promise(resolve => {
      if (studyFound) {
        resolve(studyFound.series.flatMap(aSeries => aSeries.instances));
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
  searchForStudies({ queryParams }) {
    const studyFound = this._studiesMetadata.find(study => {
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

    return new Promise(resolve => {
      if (studyFound) {
        resolve([studyFound.series[0].instances[0]]);
      } else {
        resolve([]);
      }
    });
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
    const studyMetadata = studyuids.map(async (/** @type {any} */ studyuid) => {
      const folderPath = `${prefix}/studies/${studyuid}/series/`;
      const delimiter = '/';
      const apiUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o?prefix=${folderPath}&delimiter=${delimiter}`;
      const response = await fetch(apiUrl, { headers });
      const res = await response.json();
      const folders = res.prefixes || [];
      const series = folders.map(async (/** @type {string} */ folderPath) => {
        const deidSeriesInstanceUID = folderPath.split('/series/')[1].split('/')[0];
        const wadoUrl = `${wadoURL}/studies/${studyuid}/series/${deidSeriesInstanceUID}/metadata`;
        return {
          deidSeriesInstanceUID,
          instances: await this._codServer.fetchCod(wadoUrl, headers),
        };
      });
      return Promise.all(series).then(result => ({
        deidStudyInstanceUID: studyuid,
        series: result,
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
