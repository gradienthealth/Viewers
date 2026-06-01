export const OPFS_VERSION_STORAGE_KEY = 'gh-opfs-path-version';
export const CURRENT_OPFS_VERSION = 1;

export const OPFS_PURGE_METADATA = [
  {
    label: 'All',
    time: undefined,
  },
  {
    label: '1 Hour',
    time: 1000 * 60 * 60,
  },
  {
    label: '4 Hours',
    time: 1000 * 60 * 60 * 4,
  },
  {
    label: '12 Hours',
    time: 1000 * 60 * 60 * 12,
  },
  {
    label: '1 Day',
    time: 1000 * 60 * 60 * 24,
  },
  {
    label: '1 Week',
    time: 1000 * 60 * 60 * 24 * 7,
  },
];
