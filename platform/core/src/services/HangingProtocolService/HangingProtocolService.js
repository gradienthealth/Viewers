import pubSubServiceInterface from '../_shared/pubSubServiceInterface';
import sortBy from '../../utils/sortBy.js';
import ProtocolEngine from './ProtocolEngine';
import { utilities as csToolsUtils } from '@cornerstonejs/tools';

const EVENTS = {
  STAGE_CHANGE: 'event::hanging_protocol_stage_change',
  NEW_LAYOUT: 'event::hanging_protocol_new_layout',
  CUSTOM_IMAGE_LOAD_PERFORMED:
    'event::hanging_protocol_custom_image_load_performed',
};

class HangingProtocolService {
  constructor(commandsManager, servicesManager) {
    this._commandsManager = commandsManager;
    this.servicesManager = servicesManager;
    this.protocols = [];
    this.ProtocolEngine = undefined;
    this.protocol = undefined;
    this.stage = undefined;
    /**
     * An array that contains for each viewport (viewportIndex) specified in the
     * hanging protocol, an object of the form
     *
     * {
     *   viewportOptions,
     *   displaySetsInfo, // contains array of  [ { SeriesInstanceUID, displaySetOPtions}, ... ]
     * }
     */
    this.matchDetails = [];
    /**
     * displaySetMatchDetails = <displaySetId, match>
     * DisplaySetId is the id defined in the hangingProtocol
     * match is an object that contains information about
     *
     * {
     *   SeriesInstanceUID,
     *   StudyInstanceUID,
     *   matchDetails,
     *   matchingScore,
     *   sortingInfo
     * }
     */
    this.displaySetMatchDetails = new Map();
    this.hpAlreadyApplied = [];
    this.studies = [];
    this.customViewportSettings = [];
    this.customAttributeRetrievalCallbacks = {};
    this.listeners = {};
    this.registeredImageLoadStrategies = {};
    this.activeImageLoadStrategyName = null;
    this.customImageLoadPerformed = false;
    Object.defineProperty(this, 'EVENTS', {
      value: EVENTS,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    Object.assign(this, pubSubServiceInterface);
  }

  reset() {
    this.studies = [];
    this.protocols = [];
    this.hpAlreadyApplied = [];
    this.matchDetails = [];
    // this.ProtocolEngine.reset()
  }

  getDisplaySetsMatchDetails() {
    return this.displaySetMatchDetails;
  }

  getState() {
    return [this.matchDetails, this.hpAlreadyApplied];
  }

  getProtocols() {
    return this.protocols;
  }

  addProtocols(protocols) {
    protocols.forEach(protocol => {
      if (this.protocols.indexOf(protocol) === -1) {
        this.protocols.push(this._validateProtocol(protocol));
      }
    });
  }

  run(studyMetaData, protocol) {
    if (!this.studies.includes(studyMetaData)) {
      this.studies.push(studyMetaData);
    }
    // copy here so we don't mutate it
    const metaData = Object.assign({}, studyMetaData);

    this.ProtocolEngine = new ProtocolEngine(
      this.protocols,
      this.customAttributeRetrievalCallbacks
    );

    // if there is no pre-defined protocol
    if (!protocol || protocol.id === undefined) {
      const matchedProtocol = this.ProtocolEngine.run(metaData);
      this._setProtocol(matchedProtocol);
      return;
    }

    this._setProtocol(protocol);
  }

  /**
   * Returns true, if the hangingProtocol has a custom loading strategy for the images
   * and its callback has been added to the HangingProtocolService
   * @returns {boolean} true
   */
  hasCustomImageLoadStrategy() {
    return (
      this.activeImageLoadStrategyName !== null &&
      this.registeredImageLoadStrategies[
        this.activeImageLoadStrategyName
      ] instanceof Function
    );
  }

  getCustomImageLoadPerformed() {
    return this.customImageLoadPerformed;
  }

  /**
   * Set the strategy callback for loading images to the HangingProtocolService
   * @param {string} name strategy name
   * @param {Function} callback image loader callback
   */
  registerImageLoadStrategy(name, callback) {
    if (callback instanceof Function && name) {
      this.registeredImageLoadStrategies[name] = callback;
    }
  }

  setHangingProtocolAppliedForViewport(i) {
    this.hpAlreadyApplied[i] = true;
  }

  /**
   * Adds a custom attribute to be used in the HangingProtocol UI and matching rules, including a
   * callback that will be used to calculate the attribute value.
   *
   * @param attributeId The ID used to refer to the attribute (e.g. 'timepointType')
   * @param attributeName The name of the attribute to be displayed (e.g. 'Timepoint Type')
   * @param callback The function used to calculate the attribute value from the other attributes at its level (e.g. study/series/image)
   */
  addCustomAttribute(attributeId, attributeName, callback) {
    this.customAttributeRetrievalCallbacks[attributeId] = {
      name: attributeName,
      callback: callback,
    };
  }

  /**
   * Switches to the next protocol stage in the display set sequence
   */
  nextProtocolStage() {
    console.log('ProtocolEngine::nextProtocolStage');

    if (!this._setCurrentProtocolStage(1)) {
      console.log('ProtocolEngine::nextProtocolStage failed');
    }
  }

  /**
   * Switches to the previous protocol stage in the display set sequence
   */
  previousProtocolStage() {
    console.log('ProtocolEngine::previousProtocolStage');

    if (!this._setCurrentProtocolStage(-1)) {
      console.log('ProtocolEngine::previousProtocolStage failed');
    }
  }

  /**
   * Executes the callback function for the custom loading strategy for the images
   * if no strategy is set, the default strategy is used
   */
  runImageLoadStrategy(data) {
    const loader = this.registeredImageLoadStrategies[
      this.activeImageLoadStrategyName
    ];
    const loadedData = loader({
      data,
      displaySetsMatchDetails: this.getDisplaySetsMatchDetails(),
      matchDetails: this.matchDetails,
    });

    // if loader successfully re-arranged the data with the custom strategy
    // and returned the new props, then broadcast them
    if (!loadedData) {
      return;
    }

    this.customImageLoadPerformed = true;
    this._broadcastChange(this.EVENTS.CUSTOM_IMAGE_LOAD_PERFORMED, loadedData);
  }

  _validateProtocol(protocol) {
    protocol.id = protocol.id || protocol.name;
    // Automatically compute some number of attributes if they
    // aren't present.  Makes defining new HPs easier.
    protocol.name = protocol.name || protocol.id;
    const { stages } = protocol;

    // Generate viewports automatically as required.
    stages.forEach(stage => {
      if (!stage.viewports) {
        stage.viewports = [];
        const { rows, columns } = stage.viewportStructure.properties;

        for (let i = 0; i < rows * columns; i++) {
          stage.viewports.push({
            viewportOptions: {},
            displaySets: [],
          });
        }
      } else {
        stage.viewports.forEach(viewport => {
          viewport.viewportOptions = viewport.viewportOptions || {};
          if (!viewport.displaySets) {
            viewport.displaySets = [];
          } else {
            viewport.displaySets.forEach(displaySet => {
              displaySet.options = displaySet.options || {};
            });
          }
        });
      }
    });

    return protocol;
  }

  _setProtocol(protocol) {
    // TODO: Add proper Protocol class to validate the protocols
    // which are entered manually
    this.stage = 0;
    this.protocol = protocol;
    const { imageLoadStrategy } = protocol;
    if (imageLoadStrategy) {
      // check if the imageLoadStrategy is a valid strategy
      if (
        this.registeredImageLoadStrategies[imageLoadStrategy] instanceof
        Function
      ) {
        this.activeImageLoadStrategyName = imageLoadStrategy;
      }
    }
    this._updateViewports();
  }

  /**
   * Retrieves the number of Stages in the current Protocol or
   * undefined if no protocol or stages are set
   */
  _getNumProtocolStages() {
    if (
      !this.protocol ||
      !this.protocol.stages ||
      !this.protocol.stages.length
    ) {
      return;
    }

    return this.protocol.stages.length;
  }

  /**
   * Retrieves the current Stage from the current Protocol and stage index
   *
   * @returns {*} The Stage model for the currently displayed Stage
   */
  _getCurrentStageModel() {
    return this.protocol.stages[this.stage];
  }

  _updateViewports() {
    if(!this.cornerstoneViewportReady) {
      this.cornerstoneViewportReady = new Promise((resolve,reject)=>{
        const { CornerstoneViewportService } = this.servicesManager.services;
        CornerstoneViewportService.subscribe(
          CornerstoneViewportService.EVENTS.VIEWPORT_INFO_CREATED,
          viewportInfo => resolve(viewportInfo)
        );
      })
    }

    // Make sure we have an active protocol with a non-empty array of display sets
    if (!this._getNumProtocolStages()) {
      return;
    }

    // reset displaySetMatchDetails
    this.displaySetMatchDetails = new Map();

    // Retrieve the current stage
    const stageModel = this._getCurrentStageModel();

    // If the current stage does not fulfill the requirements to be displayed,
    // stop here.
    if (
      !stageModel ||
      !stageModel.viewportStructure ||
      !stageModel.viewports ||
      !stageModel.displaySets ||
      !stageModel.viewports.length
    ) {
      return;
    }

    this.customImageLoadPerformed = false;
    const { type: layoutType } = stageModel.viewportStructure;

    // Retrieve the properties associated with the current display set's viewport structure template
    // If no such layout properties exist, stop here.
    const layoutProps = stageModel.viewportStructure.properties;
    if (!layoutProps) {
      return;
    }

    const { columns: numCols, rows: numRows, layoutOptions = [] } = layoutProps;

    this._broadcastChange(this.EVENTS.NEW_LAYOUT, {
      layoutType,
      numRows,
      numCols,
      layoutOptions,
    });

    // Matching the displaySets
    // Note: this is happening before displaySets are created. Here, displaySet
    // only contains the information of the id of the displaySet to be matched
    // based on some rules
    stageModel.displaySets.forEach(displaySet => {
      const { bestMatch } = this._matchImages(displaySet);
      this.displaySetMatchDetails.set(displaySet.id, bestMatch);
    });

    // Loop through each viewport
    stageModel.viewports.forEach((viewport, viewportIndex) => {
      const { viewportOptions } = viewport;
      this.hpAlreadyApplied.push(false);
      const { CornerstoneViewportService } = this.servicesManager.services;

      // DisplaySets for the viewport, Note: this is not the actual displaySet,
      // but it is a info to locate the displaySet from the displaySetService
      let displaySetsInfo = [];
      viewport.displaySets.forEach(({ id, options: displaySetOptions }) => {
        const viewportDisplaySet = this.displaySetMatchDetails.get(id);
        if (viewportDisplaySet) {
          const { SeriesInstanceUID } = viewportDisplaySet;

          const displaySetInfo = {
            SeriesInstanceUID,
            displaySetOptions,
          };

          displaySetsInfo.push(displaySetInfo);
        } else {
          console.warn(
            `
             The hanging protocol viewport is requesting to display ${id} displaySet that is not
             matched based on the provided criteria (e.g. matching rules).
            `
          );
        }

        this.cornerstoneViewportReady.then(()=>{
          const viewportElement = CornerstoneViewportService.viewportsInfo.get(viewportIndex).element
          csToolsUtils.jumpToSlice(viewportElement, {
            imageIndex: viewportDisplaySet.InstanceNumber,
            debounceLoading: true,
          })
        })
      });

      this.matchDetails[viewportIndex] = {
        viewportOptions,
        displaySetsInfo,
      };
    });
  }

  // Match images given a list of Studies and a Viewport's image matching reqs
  _matchImages(displaySet) {
    console.log('ProtocolEngine::matchImages');

    // TODO: matching is applied on study and series level, instance
    // level matching needs to be added in future

    // Todo: handle fusion viewports by not taking the first displaySet rule for the viewport
    const { studyMatchingRules, seriesMatchingRules, imageMatchingRules } = displaySet;

    const matchingScores = [];
    let highestStudyMatchingScore = 0;
    let highestSeriesMatchingScore = 0;

    this.studies.forEach(study => {
      const studyMatchDetails = this.ProtocolEngine.findMatch(
        study,
        studyMatchingRules
      );

      // Prevent bestMatch from being updated if the matchDetails' required attribute check has failed
      if (
        studyMatchDetails.requiredFailed === true ||
        studyMatchDetails.score < highestStudyMatchingScore
      ) {
        return;
      }

      highestStudyMatchingScore = studyMatchDetails.score;

      study.series.forEach(aSeries => {
        const seriesMatchDetails = this.ProtocolEngine.findMatch(
          aSeries,
          seriesMatchingRules
        );

        // Prevent bestMatch from being updated if the matchDetails' required attribute check has failed
        if (
          seriesMatchDetails.requiredFailed === true ||
          seriesMatchDetails.score < highestSeriesMatchingScore
        ) {
          return;
        }

        highestSeriesMatchingScore = seriesMatchDetails.score;

        // We cannot use the actual validation / matching engine here
        // Only works for "contains"
        let imageMatches = []
        aSeries.instances.forEach((instance, instanceIndex) => {

          let score = 0

          imageMatchingRules.forEach((rule) => {
            if(instance[rule.attribute] == rule.constraint.contains.value) {
              score = score + rule.weight;
            }
            const match = JSON.stringify(instance[rule.attribute]).indexOf(rule.constraint.contains.value) > -1
            if(match) {
              score = score + rule.weight;
            }
          });

          imageMatches.push({ score: score, instance: instance, instanceIndex: instanceIndex })
        });

        // Zero if no matches, otherwise the index of the best match
        let bestMatchIndex = 0;
        if(imageMatches.length){
          const bestImageMatches = imageMatches.sort((a,b) => b.score - a.score);
          bestMatchIndex = bestImageMatches[0].instanceIndex;
        }
        

        const matchDetails = {
          passed: [],
          failed: [],
        };

        matchDetails.passed = matchDetails.passed.concat(
          seriesMatchDetails.details.passed
        );
        matchDetails.passed = matchDetails.passed.concat(
          studyMatchDetails.details.passed
        );

        matchDetails.failed = matchDetails.failed.concat(
          seriesMatchDetails.details.failed
        );
        matchDetails.failed = matchDetails.failed.concat(
          studyMatchDetails.details.failed
        );

        const totalMatchScore =
          seriesMatchDetails.score + studyMatchDetails.score;

        const imageDetails = {
          StudyInstanceUID: study.StudyInstanceUID,
          SeriesInstanceUID: aSeries.SeriesInstanceUID,
          InstanceNumber: bestMatchIndex,
          matchingScore: totalMatchScore,
          matchDetails: matchDetails,
          sortingInfo: {
            score: totalMatchScore,
            study: study.StudyInstanceUID,
            series: parseInt(aSeries.SeriesNumber),
          },
        };

        matchingScores.push(imageDetails);
      });
    });

    // Sort the matchingScores
    const sortingFunction = sortBy(
      {
        name: 'score',
        reverse: true,
      },
      {
        name: 'study',
        reverse: true,
      },
      {
        name: 'series',
      }
    );
    matchingScores.sort((a, b) =>
      sortingFunction(a.sortingInfo, b.sortingInfo)
    );

    const bestMatch = matchingScores[0];

    console.log('ProtocolEngine::matchImages bestMatch', bestMatch);

    return {
      bestMatch,
      matchingScores,
    };
  }

  /**
   * Check if the next stage is available
   * @return {Boolean} True if next stage is available or false otherwise
   */
  _isNextStageAvailable() {
    const numberOfStages = this._getNumProtocolStages();

    return this.stage + 1 < numberOfStages;
  }

  /**
   * Check if the previous stage is available
   * @return {Boolean} True if previous stage is available or false otherwise
   */
  _isPreviousStageAvailable() {
    return this.stage - 1 >= 0;
  }

  /**
   * Changes the current stage to a new stage index in the display set sequence.
   * It checks if the next stage exists.
   *
   * @param {Integer} stageAction An integer value specifying wheater next (1) or previous (-1) stage
   * @return {Boolean} True if new stage has set or false, otherwise
   */
  _setCurrentProtocolStage(stageAction) {
    //reseting the applied protocols
    this.hpAlreadyApplied = [];
    // Check if previous or next stage is available
    if (stageAction === -1 && !this._isPreviousStageAvailable()) {
      return false;
    } else if (stageAction === 1 && !this._isNextStageAvailable()) {
      return false;
    }

    // Sets the new stage
    this.stage += stageAction;

    // Log the new stage
    console.log(
      `ProtocolEngine::setCurrentProtocolStage stage = ${this.stage}`
    );

    // Since stage has changed, we need to update the viewports
    // and redo matchings
    this._updateViewports();

    // Everything went well
    this._broadcastChange(this.EVENTS.STAGE_CHANGE, {
      matchDetails: this.matchDetails,
      hpAlreadyApplied: this.hpAlreadyApplied,
    });
    return true;
  }
  /**
   * Broadcasts hanging protocols changes.
   *
   * @param {string} eventName The event name.add
   * @param {object} eventData.source The measurement source.
   * @param {object} eventData.measurement The measurement.
   * @param {boolean} eventData.notYetUpdatedAtSource True if the measurement was edited
   *      within the measurement service and the source needs to update.
   * @return void
   */
  // Todo: why do we have a separate broadcastChange function here?
  _broadcastChange(eventName, eventData) {
    const hasListeners = Object.keys(this.listeners).length > 0;
    const hasCallbacks = Array.isArray(this.listeners[eventName]);

    if (hasListeners && hasCallbacks) {
      this.listeners[eventName].forEach(listener => {
        listener.callback(eventData);
      });
    }
  }
}

export default HangingProtocolService;
export { EVENTS };
