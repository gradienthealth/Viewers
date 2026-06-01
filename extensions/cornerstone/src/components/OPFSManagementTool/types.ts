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

/**
 * Metadata format stored in the metadata.json
 */
export type JsonMetadata = {
  deid_study_uid: string;
  deid_series_uid: string;
  cod: {
    instances: Record<
      string,
      {
        metadata: InstanceMetadata;
        // The metadata will either have url or uri
        uri: string;
        url: string;
        headers: { start_byte: number; end_byte: number };
        offset_tables: {
          CustomOffsetTable?: number[];
          CustomOffsetTableLengths?: number[];
        };
        crc32c: string;
        size: number;
        original_path: string;
        dependencies: string[];
        diff_hash_dupe_paths: [string];
        version: string;
        modified_datetime: string;
      }
    >;
  };
  thumbnail: {
    version: string;
    uri: string;
    thumbnail_index_to_instance_frame: [string, number][];
    instances: Record<
      string,
      {
        frames: {
          thumbnail_index: number;
          anchors: {
            original_size: { width: number; height: number };
            thumbnail_upper_left: { row: number; col: number };
            thumbnail_bottom_right: { row: number; col: number };
          };
        }[];
      }
    >;
  };
};

export type InstanceMetadata = Record<
  string,
  { vr?: string; Value?: unknown[]; BulkDataURI?: string; InlineBinary?: string }
>;

export type FileDetails = {
  path: string;
  size: number;
  lastModified: number;
  data?: JsonMetadata;
};
