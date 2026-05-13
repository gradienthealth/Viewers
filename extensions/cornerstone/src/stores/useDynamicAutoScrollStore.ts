import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Identifier for the Dynamic Auto Scroll store type.
 */
const PRESENTATION_TYPE_ID = 'dynamicAutoScrollStoreId';

/**
 * Flag to enable or disable debug mode for the store.
 * Set to `true` to enable zustand devtools.
 */
const DEBUG_STORE = false;

/**
 * State shape for the Dynamic Auto Scroll store.
 */
type DynamicAutoScrollState = {
  /**
   * Type identifier for the store.
   */
  type: string;

  /**
   * Viewports with auto-scroll currently active, keyed by viewportId.
   */
  autoActive: Record<string, boolean>;

  /**
   * Viewports where auto-scroll has been permanently disabled (e.g. after a user scroll),
   * keyed by viewportId. Prevents re-activation for the rest of the session.
   */
  permanentlyDisabled: Record<string, boolean>;

  /**
   * Viewports with an in-flight programmatic scroll, keyed by viewportId. Used to
   * distinguish auto-scroll-driven VOLUME_NEW_IMAGE events from user-driven ones.
   */
  selfScroll: Record<string, boolean>;

  /**
   * Marks auto-scroll as active for the given viewport.
   */
  markAutoActive: (viewportId: string) => void;

  /**
   * Clears the active flag for the given viewport.
   */
  clearAutoActive: (viewportId: string) => void;

  /**
   * Returns whether auto-scroll is active for the given viewport.
   */
  isAutoActive: (viewportId: string) => boolean;

  /**
   * Marks the given viewport as permanently opted out of auto-scroll.
   */
  markPermanentlyDisabled: (viewportId: string) => void;

  /**
   * Returns whether the given viewport is permanently opted out of auto-scroll.
   */
  isPermanentlyDisabled: (viewportId: string) => boolean;

  /**
   * Marks the next VOLUME_NEW_IMAGE on the given viewport as programmatic (self-driven).
   */
  markSelfScroll: (viewportId: string) => void;

  /**
   * Clears the self-scroll flag for the given viewport.
   */
  clearSelfScroll: (viewportId: string) => void;

  /**
   * Returns whether the given viewport currently has a pending self-scroll.
   */
  isSelfScroll: (viewportId: string) => boolean;

  /**
   * Clears the entire Dynamic Auto Scroll store.
   */
  clearDynamicAutoScrollStore: () => void;
};

/**
 * Creates the Dynamic Auto Scroll store.
 *
 * @param set - The zustand set function.
 * @param get - The zustand get function.
 * @returns The Dynamic Auto Scroll store state and actions.
 */
const createDynamicAutoScrollStore = (set, get): DynamicAutoScrollState => ({
  type: PRESENTATION_TYPE_ID,
  autoActive: {},
  permanentlyDisabled: {},
  selfScroll: {},

  /**
   * Marks auto-scroll as active for the given viewport.
   */
  markAutoActive: viewportId =>
    set(
      state => ({ autoActive: { ...state.autoActive, [viewportId]: true } }),
      false,
      'markAutoActive'
    ),

  /**
   * Clears the active flag for the given viewport.
   */
  clearAutoActive: viewportId =>
    set(
      state => {
        const next = { ...state.autoActive };
        delete next[viewportId];
        return { autoActive: next };
      },
      false,
      'clearAutoActive'
    ),

  /**
   * Returns whether auto-scroll is active for the given viewport.
   */
  isAutoActive: viewportId => !!get().autoActive[viewportId],

  /**
   * Marks the given viewport as permanently opted out of auto-scroll.
   */
  markPermanentlyDisabled: viewportId =>
    set(
      state => ({
        permanentlyDisabled: { ...state.permanentlyDisabled, [viewportId]: true },
      }),
      false,
      'markPermanentlyDisabled'
    ),

  /**
   * Returns whether the given viewport is permanently opted out of auto-scroll.
   */
  isPermanentlyDisabled: viewportId => !!get().permanentlyDisabled[viewportId],

  /**
   * Marks the next VOLUME_NEW_IMAGE on the given viewport as programmatic (self-driven).
   */
  markSelfScroll: viewportId =>
    set(
      state => ({
        selfScroll: { ...state.selfScroll, [viewportId]: true },
      }),
      false,
      'markSelfScroll'
    ),

  /**
   * Clears the self-scroll flag for the given viewport.
   */
  clearSelfScroll: viewportId =>
    set(
      state => {
        const next = { ...state.selfScroll };
        delete next[viewportId];
        return { selfScroll: next };
      },
      false,
      'clearSelfScroll'
    ),

  /**
   * Returns whether the given viewport currently has a pending self-scroll.
   */
  isSelfScroll: viewportId => !!get().selfScroll[viewportId],

  /**
   * Clears the entire Dynamic Auto Scroll store.
   */
  clearDynamicAutoScrollStore: () =>
    set(
      { autoActive: {}, permanentlyDisabled: {}, selfScroll: {} },
      false,
      'clearDynamicAutoScrollStore'
    ),
});

/**
 * Zustand store for managing dynamic-volume auto-scroll state across viewports.
 * Applies devtools middleware when DEBUG_STORE is enabled.
 */
export const useDynamicAutoScrollStore = create<DynamicAutoScrollState>()(
  DEBUG_STORE
    ? devtools(createDynamicAutoScrollStore, { name: 'DynamicAutoScrollStore' })
    : createDynamicAutoScrollStore
);
