import React, { useEffect, useRef } from 'react';
import { useToolbar } from '@ohif/core';
import { ToolboxUI } from './';
import { useToolbox } from '../../contextProviders';
import { EVENTS, eventTarget } from '@cornerstonejs/core';

/**
 * A toolbox is a collection of buttons and commands that they invoke, used to provide
 * custom control panels to users. This component is a generic UI component that
 * interacts with services and commands in a generic fashion. While it might
 * seem unconventional to import it from the UI and integrate it into the JSX,
 * it belongs in the UI components as there isn't anything in this component that
 * couldn't be used for a completely different type of app. It plays a crucial
 * role in enhancing the app with a toolbox by providing a way to integrate
 * and display various tools and their corresponding options
 */
function Toolbox({ servicesManager, buttonSectionId, commandsManager, title, ...props }) {
  const { state: toolboxState, api } = useToolbox(buttonSectionId);
  const { onInteraction, toolbarButtons } = useToolbar({
    servicesManager,
    buttonSection: buttonSectionId,
  });

  const prevButtonIdsRef = useRef();
  const prevToolboxStateRef = useRef();

  useEffect(() => {
    const currentButtonIdsStr = JSON.stringify(
      toolbarButtons.map(button => {
        const { id, componentProps } = button;
        if (componentProps.items?.length) {
          return componentProps.items.map(item => `${item.id}-${item.disabled}`);
        }
        return `${id}-${componentProps.disabled}`;
      })
    );

    const currentToolBoxStateStr = JSON.stringify(
      Object.keys(toolboxState.toolOptions).map(tool => {
        const options = toolboxState.toolOptions[tool];
        if (Array.isArray(options)) {
          return options?.map(option => `${option.id}-${option.value}`);
        }
      })
    );

    if (
      prevButtonIdsRef.current === currentButtonIdsStr &&
      prevToolboxStateRef.current === currentToolBoxStateStr
    ) {
      return;
    }

    prevButtonIdsRef.current = currentButtonIdsStr;
    prevToolboxStateRef.current = currentToolBoxStateStr;

    const initializeOptionsWithEnhancements = toolbarButtons.reduce(
      (accumulator, toolbarButton) => {
        const { id: buttonId, componentProps } = toolbarButton;

        const createEnhancedOptions = (options, parentId) => {
          const optionsToUse = Array.isArray(options) ? options : [options];

          return optionsToUse.map(option => {
            if (typeof option.optionComponent === 'function') {
              return option;
            }

            const { value, min, max, step } =
              toolboxState.toolOptions?.[parentId]?.find(prop => prop.id === option.id) ?? option;

            const updatedOptions = toolboxState.toolOptions?.[parentId];

            return {
              ...option,
              value,
              ...(min && { min }),
              ...(max && { max }),
              ...(step && { step }),
              commands: value => {
                api.handleToolOptionChange(parentId, option.id, value);

                const { isArray } = Array;
                const cmds = isArray(option.commands) ? option.commands : [option.commands];

                cmds.forEach(command => {
                  const isString = typeof command === 'string';
                  const isObject = typeof command === 'object';
                  const isFunction = typeof command === 'function';

                  if (isString) {
                    commandsManager.run(command, { value });
                  } else if (isObject) {
                    commandsManager.run({
                      ...command,
                      commandOptions: {
                        ...command.commandOptions,
                        ...option,
                        value,
                        options: updatedOptions,
                      },
                    });
                  } else if (isFunction) {
                    command({ value, commandsManager, servicesManager, options: updatedOptions });
                  }
                });
              },
            };
          });
        };

        const { items, options } = componentProps;

        if (items?.length) {
          items.forEach(({ options, id }) => {
            accumulator[id] = createEnhancedOptions(options, id);
          });
        } else if (options?.length) {
          accumulator[buttonId] = createEnhancedOptions(options, buttonId);
        } else if (options?.optionComponent) {
          accumulator[buttonId] = options.optionComponent;
        }

        return accumulator;
      },
      {}
    );

    api.initializeToolOptions(initializeOptionsWithEnhancements);
  }, [toolbarButtons, api, toolboxState]);

  const handleToolOptionChange = (toolName, optionName, newValue) => {
    api.handleToolOptionChange(toolName, optionName, newValue);
  };

  useEffect(() => {
    return () => {
      api.handleToolSelect(null);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolAndOptionNames = [
      { toolName: 'Brush', optionName: 'brush-radius' },
      { toolName: 'Eraser', optionName: 'eraser-radius' },
    ];
    let highestPixelSpacing = getPixelToMmConversionFactor(servicesManager);

    const setDefaultBrushSize = (evt = null) => {
      const defaultBrushSizeInMm = +params.get('defaultBrushSize') || 2;
      let minBrushSizeInMm = +params.get('minBrushSize') || 2;
      let maxBrushSizeInMm = +params.get('maxBrushSize') || 3;

      highestPixelSpacing = highestPixelSpacing ?? getPixelToMmConversionFactor(servicesManager);
      const lowestBrushRadius = highestPixelSpacing / 2;

      if (minBrushSizeInMm < lowestBrushRadius) {
        minBrushSizeInMm = lowestBrushRadius;
      }
      if (maxBrushSizeInMm < lowestBrushRadius) {
        maxBrushSizeInMm = highestPixelSpacing;
      }

      toolAndOptionNames.forEach(({ toolName, optionName }) => {
        handleToolOptionChange(toolName, optionName, +defaultBrushSizeInMm.toFixed(2));
        api.handleOptionPropertiesModify(toolName, optionName, {
          min: +minBrushSizeInMm.toFixed(2),
          max: +maxBrushSizeInMm.toFixed(2),
          step: +((maxBrushSizeInMm - minBrushSizeInMm) / 100).toFixed(2),
        });
      });
      evt?.detail.element.removeEventListener(
        EVENTS.VOLUME_VIEWPORT_NEW_VOLUME,
        setDefaultBrushSize
      );
      evt && eventTarget.removeEventListener(EVENTS.STACK_VIEWPORT_NEW_STACK, setDefaultBrushSize);
    };

    if (highestPixelSpacing) {
      setDefaultBrushSize();
      return;
    }

    const elementEnabledHandler = evt => {
      evt.detail.element.addEventListener(EVENTS.VOLUME_VIEWPORT_NEW_VOLUME, setDefaultBrushSize);
      eventTarget.addEventListener(EVENTS.STACK_VIEWPORT_NEW_STACK, setDefaultBrushSize);
      eventTarget.removeEventListener(EVENTS.ELEMENT_ENABLED, elementEnabledHandler);
    };

    eventTarget.addEventListener(EVENTS.ELEMENT_ENABLED, elementEnabledHandler);
  }, []);

  return (
    <ToolboxUI
      {...props}
      title={title}
      toolbarButtons={toolbarButtons}
      activeToolOptions={toolboxState.toolOptions?.[toolboxState.activeTool]}
      handleToolSelect={id => api.handleToolSelect(id)}
      handleToolOptionChange={handleToolOptionChange}
      onInteraction={onInteraction}
    />
  );
}

function getPixelToMmConversionFactor(servicesManager) {
  const { viewportGridService, cornerstoneViewportService } = servicesManager.services;
  const { activeViewportId } = viewportGridService.getState();
  const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
  const imageData = viewport?.getImageData();

  if (!imageData) {
    return;
  }

  const { spacing } = imageData;
  return Math.max(spacing[0], spacing[1]);
}

export default Toolbox;
