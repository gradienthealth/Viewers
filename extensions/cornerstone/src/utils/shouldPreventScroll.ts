import { useCachedSlicesPerDisplaysetStore } from '../stores';

export default function shouldPreventScroll(
  keyPressed: boolean,
  imageIdIndex: number,
  servicesManager
): boolean {
  const { cachedState } = useCachedSlicesPerDisplaysetStore.getState();
  const { viewportGridService } = servicesManager.services;
  const { activeViewportId, viewports } = viewportGridService.getState();
  const cachedSlices = cachedState[
    viewports.get(activeViewportId).displaySetInstanceUIDs[0]
  ] as number[];

  if (!cachedSlices) {
    return false;
  }

  return !keyPressed && !cachedSlices.includes(imageIdIndex);
}
