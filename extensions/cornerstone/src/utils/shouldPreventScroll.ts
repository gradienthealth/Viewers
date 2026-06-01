import { Enums } from '@cornerstonejs/core';

import { useCachedSlicesPerDisplaysetStore } from '../stores';
import { GridViewport } from '@ohif/core/src/types/ViewportGridType';

export default function shouldPreventScroll(
  keyPressed: boolean,
  imageIdIndex: number,
  servicesManager: AppTypes.ServicesManager
): boolean {
  const { cachedState } = useCachedSlicesPerDisplaysetStore.getState();
  const { viewportGridService } = servicesManager.services;
  const { activeViewportId, viewports } = viewportGridService!.getState();
  const activeViewport = viewports.get(activeViewportId as string) as GridViewport;
  const cachedSlices = cachedState[activeViewport.displaySetInstanceUIDs[0]] as number[];
  const isStackViewport = activeViewport.viewportOptions.viewportType === Enums.ViewportType.STACK;

  if (!cachedSlices) {
    return false;
  }

  return isStackViewport && !keyPressed && !cachedSlices.includes(imageIdIndex);
}
