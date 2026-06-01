import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StateCreator } from 'zustand';

const PRESENTATION_TYPE_ID = 'dynamicAutoScrollStoreId';
const DEBUG_STORE = false;

type DynamicAutoScrollState = {
  type: string;

  /** Viewports with auto-scroll currently active, keyed by viewportId. */
  autoActive: Record<string, boolean>;

  /**
   * Viewports where auto-scroll has been permanently disabled (e.g. after a user scroll),
   * keyed by viewportId. Prevents re-activation for the rest of the mode session.
   */
  permanentlyDisabled: Record<string, boolean>;

  /**
   * Viewports with an in-flight programmatic scroll, keyed by viewportId. Used to
   * distinguish auto-scroll-driven VOLUME_NEW_IMAGE events from user-driven ones.
   */
  selfScroll: Record<string, boolean>;

  /** Marks auto-scroll as active for the given viewport. */
  markAutoActive: (viewportId: string) => void;

  /** Clears the active flag for the given viewport.*/
  clearAutoActive: (viewportId: string) => void;

  /** Returns whether auto-scroll is active for the given viewport. */
  isAutoActive: (viewportId: string) => boolean;

  /** Marks the given viewport as permanently opted out of auto-scroll. */
  markPermanentlyDisabled: (viewportId: string) => void;

  /** Returns whether the given viewport is permanently opted out of auto-scroll. */
  isPermanentlyDisabled: (viewportId: string) => boolean;

  /** Marks the next VOLUME_NEW_IMAGE on the given viewport as programmatic (self-driven). */
  markSelfScroll: (viewportId: string) => void;

  /** Clears the self-scroll flag for the given viewport. */
  clearSelfScroll: (viewportId: string) => void;

  /** Returns whether the given viewport currently has a pending self-scroll. */
  isSelfScroll: (viewportId: string) => boolean;

  /** Clears the entire Dynamic Auto Scroll store. */
  clearDynamicAutoScrollStore: () => void;
};

const createDynamicAutoScrollStore: StateCreator<DynamicAutoScrollState> = (
  set,
  get
): DynamicAutoScrollState => ({
  type: PRESENTATION_TYPE_ID,
  autoActive: {},
  permanentlyDisabled: {},
  selfScroll: {},

  markAutoActive: viewportId =>
    set(state => ({ autoActive: { ...state.autoActive, [viewportId]: true } }), false),

  clearAutoActive: viewportId =>
    set(state => {
      const next = { ...state.autoActive };
      delete next[viewportId];
      return { autoActive: next };
    }, false),

  isAutoActive: viewportId => !!get().autoActive[viewportId],

  markPermanentlyDisabled: viewportId =>
    set(
      state => ({
        permanentlyDisabled: { ...state.permanentlyDisabled, [viewportId]: true },
      }),
      false
    ),

  isPermanentlyDisabled: viewportId => !!get().permanentlyDisabled[viewportId],

  markSelfScroll: viewportId =>
    set(
      state => ({
        selfScroll: { ...state.selfScroll, [viewportId]: true },
      }),
      false
    ),

  clearSelfScroll: viewportId =>
    set(state => {
      const next = { ...state.selfScroll };
      delete next[viewportId];
      return { selfScroll: next };
    }, false),

  isSelfScroll: viewportId => !!get().selfScroll[viewportId],

  clearDynamicAutoScrollStore: () =>
    set({ autoActive: {}, permanentlyDisabled: {}, selfScroll: {} }, false),
});

export const useDynamicAutoScrollStore = create<DynamicAutoScrollState>()(
  (DEBUG_STORE
    ? devtools(createDynamicAutoScrollStore, { name: 'DynamicAutoScrollStore' })
    : createDynamicAutoScrollStore) as StateCreator<DynamicAutoScrollState, [], []>
);
