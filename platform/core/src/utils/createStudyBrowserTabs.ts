import { useSystem } from '../contextProviders/SystemProvider';

/**
 *
 * @param {string[]} primaryStudyInstanceUIDs
 * @param {object[]} studyDisplayList
 * @param {string} studyDisplayList.studyInstanceUid
 * @param {string} studyDisplayList.date
 * @param {string} studyDisplayList.description
 * @param {string} studyDisplayList.modalities
 * @param {number} studyDisplayList.numInstances
 * @param {object[]} displaySets
 * @param {number} recentTimeframe - The number of milliseconds to consider a study recent
 * @returns tabs - The prop object expected by the StudyBrowser component
 */

export function createStudyBrowserTabs(
  primaryStudyInstanceUIDs,
  studyDisplayList,
  displaySets,
  recentTimeframeMS = 31536000000
) {
  const { servicesManager, extensionManager } = useSystem();
  const { displaySetService } = servicesManager.services;
  const dataSource = extensionManager.getActiveDataSource()[0];
  const dicomWebClient = dataSource.retrieve.getWadoDicomWebClient?.();
  const omittedSeries = dicomWebClient?.getOmittedSeries?.() || [];
  const queryParams = new URLSearchParams(window.location.search);
  const seriesUIdsToFilter = queryParams.getAll('SeriesInstanceUIDs');

  const shouldSortBySeriesUID = process.env.TEST_ENV === 'true';
  const primaryStudies = [];
  const allStudies = [];

  studyDisplayList.forEach(study => {
    const displaySetsForStudy = displaySets.filter(
      ds => ds.StudyInstanceUID === study.studyInstanceUid
    );

    // sort them by seriesInstanceUID
    let sortedDisplaySets;
    if (shouldSortBySeriesUID) {
      sortedDisplaySets = displaySetsForStudy.sort((a, b) => {
        const displaySetA = displaySetService.getDisplaySetByUID(a.displaySetInstanceUID);
        const displaySetB = displaySetService.getDisplaySetByUID(b.displaySetInstanceUID);

        return displaySetA.SeriesInstanceUID.localeCompare(displaySetB.SeriesInstanceUID);
      });
    } else {
      sortedDisplaySets = displaySetsForStudy;
    }

    omittedSeries.forEach(aOmittedSeries => {
      if (
        aOmittedSeries.studyInstanceUID === study.studyInstanceUid &&
        (!seriesUIdsToFilter.length ||
          seriesUIdsToFilter.includes(aOmittedSeries.seriesInstanceUID))
      ) {
        sortedDisplaySets.push({
          StudyInstanceUID: study.studyInstanceUid,
          SeriesInstanceUID: aOmittedSeries.seriesInstanceUID,
          componentType: 'thumbnailNoImage',
          description: aOmittedSeries.seriesInstanceUID,
          messages: { size: () => 1, messages: [{ text: aOmittedSeries.error }] },
        });
      }
    });

    const tabStudy = Object.assign({}, study, {
      displaySets: sortedDisplaySets,
    });

    if (primaryStudyInstanceUIDs.includes(study.studyInstanceUid)) {
      primaryStudies.push(tabStudy);
    }
    allStudies.push(tabStudy);
  });

  const primaryStudiesTimestamps = primaryStudies
    .filter(study => study.date)
    .map(study => new Date(study.date).getTime());

  const recentStudies =
    primaryStudiesTimestamps.length > 0
      ? allStudies.filter(study => {
          const oldestPrimaryTimeStamp = Math.min(...primaryStudiesTimestamps);

          if (!study.date) {
            return false;
          }
          const studyTimeStamp = new Date(study.date).getTime();
          return oldestPrimaryTimeStamp - studyTimeStamp < recentTimeframeMS;
        })
      : [];

  // Newest first
  const _byDate = (a, b) => {
    const dateA = Date.parse(a);
    const dateB = Date.parse(b);

    return dateB - dateA;
  };

  const tabs = [
    {
      name: 'primary',
      label: 'Primary',
      studies: primaryStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'recent',
      label: 'Recent',
      studies: recentStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
    {
      name: 'all',
      label: 'All',
      studies: allStudies.sort((studyA, studyB) => _byDate(studyA.date, studyB.date)),
    },
  ];

  return tabs;
}
