import { Enums } from '@cornerstonejs/core';

import { useCachedSlicesPerDisplaysetStore } from '../stores';

export default function shouldPreventScroll(
  keyPressed: boolean,
  imageIdIndex: number,
  servicesManager
): boolean {
  const { cachedState } = useCachedSlicesPerDisplaysetStore.getState();
  const { viewportGridService } = servicesManager.services;
  const { activeViewportId, viewports } = viewportGridService.getState();
  const activeViewport = viewports.get(activeViewportId);
  const cachedSlices = cachedState[activeViewport.displaySetInstanceUIDs[0]] as number[];
  const isStackViewport = activeViewport.viewportOptions.viewportType === Enums.ViewportType.STACK;

  if (!cachedSlices) {
    return false;
  }

  return isStackViewport && !keyPressed && !cachedSlices.includes(imageIdIndex);
}
