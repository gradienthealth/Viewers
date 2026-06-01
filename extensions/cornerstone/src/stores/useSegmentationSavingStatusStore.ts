import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Identifier for the Segmentation Saving Status store type.
 */
const PRESENTATION_TYPE_ID = 'segmentationSavingStatusId';

/**
 * Flag to enable or disable debug mode for the store.
 * Set to `true` to enable zustand devtools.
 */
const DEBUG_STORE = false;

/**
 * State shape for the Segmentation Saving Status store.
 */
type SegmentationSavingStatusState = {
  /**
   * Type identifier for the store.
   */
  type: string;

  /**
   * Stores saving status icon indexed to their segmentationUID.
   */
  segmentationSavingStatusMap: Record<string, { icon: string; className: string }>;

  /**
   * Sets the Segmentation Saving Status for a given key.
   *
   * @param key - The key.
   * @param value - The `displaySetInstanceUID` to associate with the key.
   */
  setSegmentationSavingStatus: (
    segmentationUID: string,
    status: { icon: string; className: string }
  ) => void;

  /**
   * Clears the entire Segmentation Saving Status map.
   */
  clearSegmentationSavingStatusMap: () => void;
};

/**
 * Creates the Segmentation Saving Status store.
 *
 * @param set - The zustand set function.
 * @returns The Segmentation Saving Status store state and actions.
 */
const createSegmentationSavingStatusStore: StateCreator<SegmentationSavingStatusState> = (
  set
): SegmentationSavingStatusState => ({
  type: PRESENTATION_TYPE_ID,
  segmentationSavingStatusMap: {},

  /**
   * Sets the Segmentation Saving Status for a given key.
   */
  setSegmentationSavingStatus: (
    segmentationUID: string,
    status: { icon: string; className: string }
  ) =>
    set(
      state => ({
        segmentationSavingStatusMap: {
          ...state.segmentationSavingStatusMap,
          [segmentationUID]: status,
        },
      }),
      false
    ),

  /**
   * Clears the entire Segmentation Saving Status map.
   */
  clearSegmentationSavingStatusMap: () => set({ segmentationSavingStatusMap: {} }, false),
});

/**
 * Zustand store for managing segmentation saving statuss.
 * Applies devtools middleware when DEBUG_STORE is enabled.
 */
export const useSegmentationSavingStatusStore = create<SegmentationSavingStatusState>()(
  (DEBUG_STORE
    ? devtools(createSegmentationSavingStatusStore, { name: 'SegmentationSavingStatusStore' })
    : createSegmentationSavingStatusStore) as StateCreator<SegmentationSavingStatusState, [], []>
);
