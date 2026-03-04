import { getEnabledElement, getEnabledElementByIds } from '@cornerstonejs/core';
import { StackScrollTool, Types } from '@cornerstonejs/tools';

class SmartStackScrollTool extends StackScrollTool {
  static toolName = 'SmartStackScroll';

  parentDragCallback: (evt: Types.EventTypes.InteractionEventType) => void;
  parentMouseWheelCallback: (evt: Types.EventTypes.MouseWheelEventType) => void;

  constructor(toolProps, defaultToolProps) {
    super(toolProps, defaultToolProps);
    this.parentDragCallback = this.mouseDragCallback;
    this.parentMouseWheelCallback = this.mouseWheelCallback;
    this.mouseDragCallback = this.smartMouseDragCallback;
    this.mouseWheelCallback = this.smartMouseWheelCallback;
  }

  smartMouseDragCallback(evt: Types.EventTypes.InteractionEventType) {
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

  smartMouseWheelCallback(evt: Types.EventTypes.MouseWheelEventType): void {
    const { wheel, element } = evt.detail;
    const { direction } = wheel;
    const { invert, shouldPreventScroll } = this.configuration;
    const { viewport } = getEnabledElement(element);
    const delta = direction * (invert ? -1 : 1);

    if (shouldPreventScroll(evt.detail.event.ctrlKey, viewport.getCurrentImageIdIndex() + delta)) {
      return;
    }

    this.parentMouseWheelCallback(evt);
  }
}

export default SmartStackScrollTool;
