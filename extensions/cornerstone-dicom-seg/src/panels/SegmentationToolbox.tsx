import React, { useCallback, useEffect, useState, useReducer } from 'react';
import { AdvancedToolbox, InputDoubleRange, useViewportGrid } from '@ohif/ui';
import { Types } from '@ohif/extension-cornerstone';
import { utilities } from '@cornerstonejs/tools';
import { EVENTS, eventTarget } from '@cornerstonejs/core';

const { segmentation: segmentationUtils } = utilities;

const TOOL_TYPES = {
  CIRCULAR_BRUSH: 'CircularBrush',
  SPHERE_BRUSH: 'SphereBrush',
  CIRCULAR_ERASER: 'CircularEraser',
  SPHERE_ERASER: 'SphereEraser',
  CIRCLE_SHAPE: 'CircleScissor',
  RECTANGLE_SHAPE: 'RectangleScissor',
  SPHERE_SHAPE: 'SphereScissor',
  THRESHOLD_CIRCULAR_BRUSH: 'ThresholdCircularBrush',
  THRESHOLD_SPHERE_BRUSH: 'ThresholdSphereBrush',
};

const ACTIONS = {
  SET_TOOL_CONFIG: 'SET_TOOL_CONFIG',
  SET_ACTIVE_TOOL: 'SET_ACTIVE_TOOL',
};

const initialState = {
  Brush: {
    brushSize: 15,
    mode: 'CircularBrush', // Can be 'CircularBrush' or 'SphereBrush'
  },
  Eraser: {
    brushSize: 15,
    mode: 'CircularEraser', // Can be 'CircularEraser' or 'SphereEraser'
  },
  Shapes: {
    brushSize: 15,
    mode: 'CircleScissor', // E.g., 'CircleScissor', 'RectangleScissor', or 'SphereScissor'
  },
  ThresholdBrush: {
    brushSize: 15,
    thresholdRange: [-500, 500],
  },
  activeTool: null,
};

function toolboxReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_TOOL_CONFIG:
      const { tool, config } = action.payload;
      return {
        ...state,
        [tool]: {
          ...state[tool],
          ...config,
        },
      };
    case ACTIONS.SET_ACTIVE_TOOL:
      return { ...state, activeTool: action.payload };
    default:
      return state;
  }
}

function SegmentationToolbox({ servicesManager, extensionManager }) {
  const { toolbarService, segmentationService, toolGroupService } =
    servicesManager.services as Types.CornerstoneServices;

  const [viewportGrid] = useViewportGrid();
  const { viewports, activeViewportId } = viewportGrid;

  const [toolsEnabled, setToolsEnabled] = useState(false);
  const [state, dispatch] = useReducer(toolboxReducer, initialState);
  const [brushProperties, setBrushProperties] = useState({ min: 1, max: 100, step: 1 });

  const updateActiveTool = useCallback(() => {
    if (!viewports?.size || activeViewportId === undefined) {
      return;
    }
    const viewport = viewports.get(activeViewportId);

    if (!viewport) {
      return;
    }

    dispatch({
      type: ACTIONS.SET_ACTIVE_TOOL,
      payload: toolGroupService.getActiveToolForViewport(viewport.viewportId),
    });
  }, [activeViewportId, viewports, toolGroupService, dispatch]);

  const setToolActive = useCallback(
    toolName => {
      toolbarService.recordInteraction({
        interactionType: 'tool',
        commands: [
          {
            commandName: 'setToolActive',
            commandOptions: {
              toolName,
            },
          },
        ],
      });

      dispatch({ type: ACTIONS.SET_ACTIVE_TOOL, payload: toolName });
    },
    [toolbarService, dispatch]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolCategories = ['Brush', 'Eraser'];

    const elementEnabledHandler = evt => {
      const setDefaultBrushSize = () => {
        const defaultBrushSizeInMm = +params.get('defaultBrushSize') || 2;
        let minBrushSizeInMm = +params.get('minBrushSize') || 2;
        let maxBrushSizeInMm = +params.get('maxBrushSize') || 3;
        const highestPixelSpacing = getPixelToMmConversionFactor(servicesManager);
        const lowestBrushRadius = highestPixelSpacing / 2;

        if (minBrushSizeInMm < lowestBrushRadius) {
          minBrushSizeInMm = lowestBrushRadius;
        }
        if (maxBrushSizeInMm < lowestBrushRadius) {
          maxBrushSizeInMm = highestPixelSpacing;
        }

        setBrushProperties({
          min: +minBrushSizeInMm.toFixed(2),
          max: +maxBrushSizeInMm.toFixed(2),
          step: +((maxBrushSizeInMm - minBrushSizeInMm) / 100).toFixed(2),
        });
        toolCategories.forEach(toolCategory => {
          onBrushSizeChange(defaultBrushSizeInMm, toolCategory);
        });

        evt.detail.element.removeEventListener(
          EVENTS.VOLUME_VIEWPORT_NEW_VOLUME,
          setDefaultBrushSize
        );
        eventTarget.removeEventListener(EVENTS.STACK_VIEWPORT_NEW_STACK, setDefaultBrushSize);
      };

      evt.detail.element.addEventListener(EVENTS.VOLUME_VIEWPORT_NEW_VOLUME, setDefaultBrushSize);
      eventTarget.addEventListener(EVENTS.STACK_VIEWPORT_NEW_STACK, setDefaultBrushSize);
      eventTarget.removeEventListener(EVENTS.ELEMENT_ENABLED, elementEnabledHandler);
    };

    eventTarget.addEventListener(EVENTS.ELEMENT_ENABLED, elementEnabledHandler);
  }, []);

  /**
   * sets the tools enabled IF there are segmentations
   */
  useEffect(() => {
    const events = [
      segmentationService.EVENTS.SEGMENTATION_ADDED,
      segmentationService.EVENTS.SEGMENTATION_UPDATED,
      segmentationService.EVENTS.SEGMENTATION_REMOVED,
    ];

    const unsubscriptions = [];

    events.forEach(event => {
      const { unsubscribe } = segmentationService.subscribe(event, () => {
        const segmentations = segmentationService.getSegmentations();

        const activeSegmentation = segmentations?.find(seg => seg.isActive);

        setToolsEnabled(activeSegmentation?.segmentCount > 0);
      });

      unsubscriptions.push(unsubscribe);
    });

    updateActiveTool();

    return () => {
      unsubscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [activeViewportId, viewports, segmentationService, updateActiveTool]);

  /**
   * Update the active tool when the toolbar state changes
   */
  useEffect(() => {
    const { unsubscribe } = toolbarService.subscribe(
      toolbarService.EVENTS.TOOL_BAR_STATE_MODIFIED,
      () => {
        updateActiveTool();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [toolbarService, updateActiveTool]);

  useEffect(() => {
    // if the active tool is not a brush tool then do nothing
    if (!Object.values(TOOL_TYPES).includes(state.activeTool)) {
      return;
    }

    // if the tool is Segmentation and it is enabled then do nothing
    if (toolsEnabled) {
      return;
    }

    // if the tool is Segmentation and it is disabled, then switch
    // back to the window level tool to not confuse the user when no
    // segmentation is active or when there is no segment in the segmentation
    setToolActive('WindowLevel');
  }, [toolsEnabled, state.activeTool, setToolActive]);

  const updateBrushSize = useCallback(
    (toolName, brushSize) => {
      toolGroupService.getToolGroupIds()?.forEach(toolGroupId => {
        segmentationUtils.setBrushSizeForToolGroup(toolGroupId, brushSize, toolName);
      });
    },
    [toolGroupService]
  );

  const onBrushSizeChange = useCallback(
    (valueAsStringOrNumber, toolCategory) => {
      const value = Number(valueAsStringOrNumber);

      _getToolNamesFromCategory(toolCategory).forEach(toolName => {
        updateBrushSize(toolName, value);
      });

      dispatch({
        type: ACTIONS.SET_TOOL_CONFIG,
        payload: {
          tool: toolCategory,
          config: { brushSize: value },
        },
      });
    },
    [toolGroupService, dispatch]
  );

  const handleRangeChange = useCallback(
    newRange => {
      if (
        newRange[0] === state.ThresholdBrush.thresholdRange[0] &&
        newRange[1] === state.ThresholdBrush.thresholdRange[1]
      ) {
        return;
      }

      const toolNames = _getToolNamesFromCategory('ThresholdBrush');

      toolNames.forEach(toolName => {
        toolGroupService.getToolGroupIds()?.forEach(toolGroupId => {
          const toolGroup = toolGroupService.getToolGroup(toolGroupId);
          toolGroup.setToolConfiguration(toolName, {
            strategySpecificConfiguration: {
              THRESHOLD_INSIDE_CIRCLE: {
                threshold: newRange,
              },
            },
          });
        });
      });

      dispatch({
        type: ACTIONS.SET_TOOL_CONFIG,
        payload: {
          tool: 'ThresholdBrush',
          config: { thresholdRange: newRange },
        },
      });
    },
    [toolGroupService, dispatch, state.ThresholdBrush.thresholdRange]
  );

  return (
    <AdvancedToolbox
      title="Segmentation Tools"
      items={[
        {
          name: 'Brush',
          icon: 'icon-tool-brush',
          disabled: !toolsEnabled,
          active:
            state.activeTool === TOOL_TYPES.CIRCULAR_BRUSH ||
            state.activeTool === TOOL_TYPES.SPHERE_BRUSH,
          onClick: () => setToolActive(TOOL_TYPES.CIRCULAR_BRUSH),
          options: [
            {
              name: 'Radius (mm)',
              id: 'brush-radius',
              type: 'range',
              min: brushProperties.min,
              max: brushProperties.max,
              value: state.Brush.brushSize,
              step: brushProperties.step,
              onChange: value => onBrushSizeChange(value, 'Brush'),
            },
            {
              name: 'Mode',
              type: 'radio',
              id: 'brush-mode',
              value: state.Brush.mode,
              values: [
                { value: TOOL_TYPES.CIRCULAR_BRUSH, label: 'Circle' },
                { value: TOOL_TYPES.SPHERE_BRUSH, label: 'Sphere' },
              ],
              onChange: value => setToolActive(value),
            },
          ],
        },
        {
          name: 'Eraser',
          icon: 'icon-tool-eraser',
          disabled: !toolsEnabled,
          active:
            state.activeTool === TOOL_TYPES.CIRCULAR_ERASER ||
            state.activeTool === TOOL_TYPES.SPHERE_ERASER,
          onClick: () => setToolActive(TOOL_TYPES.CIRCULAR_ERASER),
          options: [
            {
              name: 'Radius (mm)',
              type: 'range',
              id: 'eraser-radius',
              min: brushProperties.min,
              max: brushProperties.max,
              value: state.Eraser.brushSize,
              step: brushProperties.step,
              onChange: value => onBrushSizeChange(value, 'Eraser'),
            },
            {
              name: 'Mode',
              type: 'radio',
              id: 'eraser-mode',
              value: state.Eraser.mode,
              values: [
                { value: TOOL_TYPES.CIRCULAR_ERASER, label: 'Circle' },
                { value: TOOL_TYPES.SPHERE_ERASER, label: 'Sphere' },
              ],
              onChange: value => setToolActive(value),
            },
          ],
        },
        {
          name: 'Shapes',
          icon: 'icon-tool-shape',
          disabled: !toolsEnabled,
          active:
            state.activeTool === TOOL_TYPES.CIRCLE_SHAPE ||
            state.activeTool === TOOL_TYPES.RECTANGLE_SHAPE ||
            state.activeTool === TOOL_TYPES.SPHERE_SHAPE,
          onClick: () => setToolActive(TOOL_TYPES.CIRCLE_SHAPE),
          options: [
            {
              name: 'Mode',
              type: 'radio',
              value: state.Shapes.mode,
              id: 'shape-mode',
              values: [
                { value: TOOL_TYPES.CIRCLE_SHAPE, label: 'Circle' },
                { value: TOOL_TYPES.RECTANGLE_SHAPE, label: 'Rectangle' },
                { value: TOOL_TYPES.SPHERE_SHAPE, label: 'Sphere' },
              ],
              onChange: value => setToolActive(value),
            },
          ],
        },
        {
          name: 'Threshold Tool',
          icon: 'icon-tool-threshold',
          disabled: !toolsEnabled,
          active:
            state.activeTool === TOOL_TYPES.THRESHOLD_CIRCULAR_BRUSH ||
            state.activeTool === TOOL_TYPES.THRESHOLD_SPHERE_BRUSH,
          onClick: () => setToolActive(TOOL_TYPES.THRESHOLD_CIRCULAR_BRUSH),
          options: [
            {
              name: 'Radius (mm)',
              id: 'threshold-radius',
              type: 'range',
              min: 0.5,
              max: 99.5,
              value: state.ThresholdBrush.brushSize,
              step: 0.5,
              onChange: value => onBrushSizeChange(value, 'ThresholdBrush'),
            },
            {
              name: 'Mode',
              type: 'radio',
              id: 'threshold-mode',
              value: state.activeTool,
              values: [
                { value: TOOL_TYPES.THRESHOLD_CIRCULAR_BRUSH, label: 'Circle' },
                { value: TOOL_TYPES.THRESHOLD_SPHERE_BRUSH, label: 'Sphere' },
              ],
              onChange: value => setToolActive(value),
            },
            {
              type: 'custom',
              id: 'segmentation-threshold-range',
              children: () => {
                return (
                  <div>
                    <div className="bg-secondary-light h-[1px]"></div>
                    <div className="mt-1 text-[13px] text-white">Threshold</div>
                    <InputDoubleRange
                      values={state.ThresholdBrush.thresholdRange}
                      onChange={handleRangeChange}
                      minValue={-1000}
                      maxValue={1000}
                      step={1}
                      showLabel={true}
                      allowNumberEdit={true}
                      showAdjustmentArrows={false}
                    />
                  </div>
                );
              },
            },
          ],
        },
      ]}
    />
  );
}

function _getToolNamesFromCategory(category) {
  let toolNames = [];
  switch (category) {
    case 'Brush':
      toolNames = ['CircularBrush', 'SphereBrush'];
      break;
    case 'Eraser':
      toolNames = ['CircularEraser', 'SphereEraser'];
      break;
    case 'ThresholdBrush':
      toolNames = ['ThresholdCircularBrush', 'ThresholdSphereBrush'];
      break;
    default:
      break;
  }

  return toolNames;
}

function getPixelToMmConversionFactor(servicesManager) {
  const { viewportGridService, cornerstoneViewportService } = servicesManager.services;
  const { activeViewportId } = viewportGridService.getState();
  const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
  const { spacing } = viewport.getImageData();
  return Math.max(spacing[0], spacing[1]);
}

export default SegmentationToolbox;
