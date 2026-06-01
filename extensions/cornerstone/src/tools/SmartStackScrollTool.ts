import {
  getEnabledElement,
  getEnabledElementByIds,
  Types as csCoreTypes,
} from '@cornerstonejs/core';
import { StackScrollTool, Types as csToolsTypes } from '@cornerstonejs/tools';

class SmartStackScrollTool extends StackScrollTool {
  static toolName = 'SmartStackScroll';

  parentDragCallback: (evt: csToolsTypes.EventTypes.InteractionEventType) => void;
  parentMouseWheelCallback: (evt: csToolsTypes.EventTypes.MouseWheelEventType) => void;

  constructor(toolProps: csToolsTypes.PublicToolProps, defaultToolProps: csToolsTypes.ToolProps) {
    super(toolProps, defaultToolProps);
    this.parentDragCallback = this.mouseDragCallback;
    this.parentMouseWheelCallback = this.mouseWheelCallback;
    this.mouseDragCallback = this.smartMouseDragCallback;
    this.mouseWheelCallback = this.smartMouseWheelCallback;
  }

  smartMouseDragCallback(evt: csToolsTypes.EventTypes.InteractionEventType) {
    const { deltaPoints, viewportId, renderingEngineId } = evt.detail;
    const { viewport } = getEnabledElementByIds(viewportId, renderingEngineId);
    const { invert, shouldPreventScroll } = this.configuration;
    const deltaPointY = deltaPoints.canvas[1];
    const pixelsPerImage = this._getPixelPerImage(viewport);
    const deltaY = deltaPointY + this.deltaY;
    const imageIdIndexOffset = Math.round(deltaY / pixelsPerImage);
    const delta = invert ? -imageIdIndexOffset : imageIdIndexOffset;

    if (shouldPreventScroll(evt.detail.event.ctrlKey, viewport.getCurrentImageIdIndex() + delta)) {
      return;
    }

    return this.parentDragCallback(evt);
  }

  smartMouseWheelCallback(evt: csToolsTypes.EventTypes.MouseWheelEventType): void {
    const { wheel, element } = evt.detail;
    const { direction } = wheel;
    const { invert, shouldPreventScroll } = this.configuration;
    const { viewport } = getEnabledElement(element) as csCoreTypes.IEnabledElement;
    const delta = direction * (invert ? -1 : 1);

    if (shouldPreventScroll(evt.detail.event.ctrlKey, viewport.getCurrentImageIdIndex() + delta)) {
      return;
    }

    this.parentMouseWheelCallback(evt);
  }
}

export default SmartStackScrollTool;
