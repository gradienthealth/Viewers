import {
  Enums,
  eventTarget,
  cache,
  utilities as csCoreUtils,
  Types,
  StreamingDynamicImageVolume,
} from '@cornerstonejs/core';
import { useDynamicAutoScrollStore } from '../stores/useDynamicAutoScrollStore';

const DEFAULT_FRAME_RATE = 24;

interface DyanmicVolumeDimensionalGroupChangedEventDetail {
  volumeId: string;
  dimensionGroupNumber: number;
  numDimensionGroups: number;
  imageIdGroupIndex: number;
  numImageIdGroups: number;
  splittingTag: string;
}

type DyanmicVolumeDimensionalGroupChangedEvent =
  Types.CustomEventType<DyanmicVolumeDimensionalGroupChangedEventDetail>;

type ViewportAutoScrollState = {
  volumeId: string;
  lastDimensionGroup: number | null;
  numDimensionGroups: number;
  element: HTMLElement;
  onDimensionGroupChange: (evt: DyanmicVolumeDimensionalGroupChangedEvent) => void;
  onVolumeNewImage: (evt: Types.EventTypes.VolumeNewImageEvent) => void;
};

const viewportStates = new Map<string, ViewportAutoScrollState>();

/**
 * @param viewport Types.IVolumeViewport
 * @returns returns the first dynamic volume found in the viewport
 */
function getDynamicVolume(
  viewport: Types.IVolumeViewport
): StreamingDynamicImageVolume | undefined {
  const volumeIds = viewport.getAllVolumeIds?.() ?? [];
  const volumes = volumeIds.map(id => cache.getVolume(id));
  return volumes.find(v => v?.isDynamicVolume?.()) as StreamingDynamicImageVolume;
}

export function activateAutoScroll({
  servicesManager,
  viewportId,
}: {
  servicesManager: AppTypes.ServicesManager;
  viewportId: string;
}) {
  const store = useDynamicAutoScrollStore.getState();

  if (store.isPermanentlyDisabled(viewportId) || store.isAutoActive(viewportId)) {
    return;
  }

  const { cineService, cornerstoneViewportService } = servicesManager.services;
  const viewport = cornerstoneViewportService!.getCornerstoneViewport(
    viewportId
  ) as Types.IVolumeViewport;
  if (!viewport) {
    return;
  }

  const volume = getDynamicVolume(viewport);
  if (!volume) {
    return;
  }

  const onDimensionGroupChange = (evt: DyanmicVolumeDimensionalGroupChangedEvent) => {
    const state = viewportStates.get(viewportId);
    if (!state || evt.detail.volumeId !== state.volumeId) {
      return;
    }

    const prev = state.lastDimensionGroup;
    const current = evt.detail.dimensionGroupNumber;
    const numGroups = evt.detail.numDimensionGroups ?? state.numDimensionGroups;
    state.lastDimensionGroup = current;
    state.numDimensionGroups = numGroups;

    // Wrap: last → first means we've cycled all timepoints; advance one slice.
    const wrapped = prev !== null && prev === numGroups && current === 1;
    if (wrapped) {
      moveToNextSlice({ servicesManager, viewportId });
    }
  };

  const onVolumeNewImage = (evt: Types.EventTypes.VolumeNewImageEvent) => {
    const store = useDynamicAutoScrollStore.getState();
    if (store.isSelfScroll(viewportId)) {
      store.clearSelfScroll(viewportId);
      return;
    }
    deactivateAutoScroll({ servicesManager, viewportId, permanent: true });
  };

  const element = viewport.element;

  eventTarget.addEventListener(
    Enums.Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED,
    onDimensionGroupChange
  );
  element.addEventListener(Enums.Events.VOLUME_NEW_IMAGE, onVolumeNewImage as EventListener);

  viewportStates.set(viewportId, {
    volumeId: volume.volumeId,
    lastDimensionGroup: volume.dimensionGroupNumber ?? null,
    numDimensionGroups: volume.numDimensionGroups,
    element,
    onDimensionGroupChange,
    onVolumeNewImage,
  });

  store.markAutoActive(viewportId);

  cineService!.setIsCineEnabled(true);
  cineService!.setCine({ id: viewportId, isPlaying: true, frameRate: DEFAULT_FRAME_RATE });
}

function moveToNextSlice({
  servicesManager,
  viewportId,
}: {
  servicesManager: AppTypes.ServicesManager;
  viewportId: string;
}) {
  const { cornerstoneViewportService } = servicesManager.services;
  const viewport = cornerstoneViewportService!.getCornerstoneViewport(
    viewportId
  ) as Types.IVolumeViewport;
  if (!viewport) {
    return;
  }

  const numberOfSlices = viewport.getNumberOfSlices?.() ?? 0;
  const currentIndex = viewport.getCurrentImageIdIndex?.() ?? 0;

  const store = useDynamicAutoScrollStore.getState();
  store.markSelfScroll(viewportId);

  if (numberOfSlices > 1 && currentIndex >= numberOfSlices - 1) {
    // Wrap to the first slice and keep looping.
    csCoreUtils.jumpToSlice(viewport.element, { imageIndex: 0 });
  } else {
    csCoreUtils.scroll(viewport, { delta: 1 });
  }

  // If the slice didn't change, no event fires to clear the self-scroll flag,
  // so clear it here. Otherwise onVolumeNewImage handles it.
  const newIndex = viewport.getCurrentImageIdIndex?.();
  if (newIndex === currentIndex) {
    store.clearSelfScroll(viewportId);
  }
}

function deactivateAutoScroll({
  servicesManager,
  viewportId,
  permanent,
}: {
  servicesManager: AppTypes.ServicesManager;
  viewportId: string;
  permanent: boolean;
}) {
  const state = viewportStates.get(viewportId);
  if (state) {
    eventTarget.removeEventListener(
      Enums.Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED,
      state.onDimensionGroupChange
    );
    state.element.removeEventListener(
      Enums.Events.VOLUME_NEW_IMAGE,
      state.onVolumeNewImage as EventListener
    );
    viewportStates.delete(viewportId);
  }

  const store = useDynamicAutoScrollStore.getState();
  store.clearAutoActive(viewportId);
  if (permanent) {
    store.markPermanentlyDisabled(viewportId);
  }

  const { cineService } = servicesManager.services;
  cineService!.setCine({ id: viewportId, isPlaying: false, frameRate: DEFAULT_FRAME_RATE });
}

export function stopAutoScroll({
  servicesManager,
  viewportId,
}: {
  servicesManager: AppTypes.ServicesManager;
  viewportId: string;
}) {
  deactivateAutoScroll({ servicesManager, viewportId, permanent: false });
}

export function stopAllAutoScroll() {
  for (const state of viewportStates.values()) {
    eventTarget.removeEventListener(
      Enums.Events.DYNAMIC_VOLUME_DIMENSION_GROUP_CHANGED,
      state.onDimensionGroupChange
    );
    state.element.removeEventListener(
      Enums.Events.VOLUME_NEW_IMAGE,
      state.onVolumeNewImage as EventListener
    );
  }
  viewportStates.clear();
}
