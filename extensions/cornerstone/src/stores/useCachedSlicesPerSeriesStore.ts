import { create, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Identifier for the Cached slices per Displayset store type.
 */
const PRESENTATION_TYPE_ID = 'cachedSlicesPerDisplaysetStoreId';

/**
 * Flag to enable or disable debug mode for the store.
 * Set to `true` to enable zustand devtools.
 */
const DEBUG_STORE = false;

/**
 * State shape for the Cached slices per Displayset store.
 */
type CachedSlicesPerDisplaysetState = {
  /**
   * Type identifier for the store.
   */
  type: string;

  /**
   * Stores cached ImageIdIndices indexed by displaySetInstanceUID key.
   */
  cachedState: {
    [displaySetInstanceUID: string]: number[];
  };

  /**
   * Sets the cached imageIdIndices for a specific displaySet.
   *
   * @param displaySetInstanceUID - The displaySetInstanceUID of the displaySet.
   * @param imageIds - The list of imageIds of the loaded images in the displaySet.
   */
  setCachedSlices: (displaySetInstanceUID: string, imageIdIndices: number[]) => void;

  /**
   * Clears all cached imageIdIndices by displaySet.
   */
  clearCachedSlicesPerDisplaysetStore: () => void;
};

/**
 * Creates the CachedSlicesPerDisplayset store.
 *
 * @param set - The zustand set function.
 * @returns The Cached slices per Displayset store state and actions.
 */
const createCachedSlicesPerDisplaysetStore: StateCreator<CachedSlicesPerDisplaysetState> = (
  set
): CachedSlicesPerDisplaysetState => ({
  type: PRESENTATION_TYPE_ID,
  cachedState: {},

  setCachedSlices: (displaySetInstanceUID: string, imageIdIndices: number[]) =>
    set(
      state => ({
        cachedState: {
          ...state.cachedState,
          [displaySetInstanceUID]: imageIdIndices,
        },
      }),
      false
    ),
  clearCachedSlicesPerDisplaysetStore: () => set({ cachedState: {} }, false),
});

/**
 * Zustand store for managing cached slices.
 * Applies devtools middleware when DEBUG_STORE is enabled.
 */
export const useCachedSlicesPerDisplaysetStore = create<CachedSlicesPerDisplaysetState>()(
  (DEBUG_STORE
    ? devtools(createCachedSlicesPerDisplaysetStore, { name: 'CachedSlicesPerDisplaysetStore' })
    : createCachedSlicesPerDisplaysetStore) as StateCreator<CachedSlicesPerDisplaysetState, [], []>
);
