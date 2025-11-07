export type Study = {
  id: string;
  'study-uid': string;
  'study-description'?: string;
  'study-modalities': string[];
  'study-size': number;
  'study-last-modified': number;
  series: Series[];
  'viewer-link': string;
  'opfs-paths': string[];
};

export type Series = {
  'series-uid': string;
  'series-description': string;
  'series-modality': string;
  'series-size': number;
  'series-last-modified': number;
  'series-gs-path': string;
  'series-storage-path': string;
};

export type FileDetails = {
  path: string;
  size: number;
  lastModified: number;
  data?: Record<string, unknown>;
};
