import {
  buildRedactionPayload,
  RedactionOutOfBoundsError,
  PHIAnnotationInput,
} from './buildRedactionPayload';

jest.mock('@cornerstonejs/core', () => ({
  utilities: { worldToImageCoords: jest.fn() },
  metaData: { get: jest.fn() },
}));

import { utilities as csUtils, metaData } from '@cornerstonejs/core';

const worldToImageCoords = csUtils.worldToImageCoords as jest.Mock;
const metaDataGet = metaData.get as jest.Mock;

const STUDY = 'study-1';
const SERIES = 'series-1';

function setImageDims({ rows, columns }: { rows: number; columns: number }) {
  metaDataGet.mockImplementation((moduleId: string) => {
    if (moduleId === 'imagePixelModule') return { rows, columns };
    return {};
  });
}

/**
 * Per-corner mock: the i-th call to worldToImageCoords returns pixels[i].
 * Annotations have 4 corners (RectangleROI), so for N annotations, supply 4*N entries.
 */
function setCornerPixels(pixels: number[][]) {
  worldToImageCoords.mockReset();
  pixels.forEach(p => worldToImageCoords.mockReturnValueOnce(p));
}

function annotation(overrides: Partial<PHIAnnotationInput> = {}): PHIAnnotationInput {
  return {
    points: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    referencedImageId: 'image-1',
    SOPInstanceUID: 'sop-1',
    frameNumber: 1,
    ...overrides,
  };
}

describe('buildRedactionPayload', () => {
  beforeEach(() => {
    worldToImageCoords.mockReset();
    metaDataGet.mockReset();
    setImageDims({ rows: 512, columns: 512 });
  });

  it('emits one redaction with 0-based frame for a single in-bounds annotation', () => {
    setCornerPixels([
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
    ]);

    const payload = buildRedactionPayload({
      studyUid: STUDY,
      seriesUid: SERIES,
      annotations: [annotation({ SOPInstanceUID: 'sop-A', frameNumber: 1 })],
    });

    expect(payload).toEqual({
      study_uid: STUDY,
      series_uid: SERIES,
      redactions: [
        {
          box: { x: 10, y: 20, width: 30, height: 40 },
          applies_to: ['sop-A'],
          frames: [0],
        },
      ],
    });
  });

  it('rounds float pixel coords to nearest integer before computing width/height', () => {
    // (10.4, 20.6) and (40.5, 60.4) → rounded (10, 21) and (41, 60)
    // width = 41 - 10 = 31; height = 60 - 21 = 39
    setCornerPixels([
      [10.4, 20.6],
      [40.5, 20.6],
      [40.5, 60.4],
      [10.4, 60.4],
    ]);

    const payload = buildRedactionPayload({
      studyUid: STUDY,
      seriesUid: SERIES,
      annotations: [annotation()],
    });

    expect(payload.redactions[0].box).toEqual({ x: 10, y: 21, width: 31, height: 39 });
  });

  it('rejects a box that rounds to zero width', () => {
    // Both x corners round to 10 → width = 0
    setCornerPixels([
      [10.1, 20],
      [10.4, 20],
      [10.4, 60],
      [10.1, 60],
    ]);

    expect(() =>
      buildRedactionPayload({
        studyUid: STUDY,
        seriesUid: SERIES,
        annotations: [annotation()],
      })
    ).toThrow(RedactionOutOfBoundsError);
  });

  it('rejects a box that exceeds image columns', () => {
    setImageDims({ rows: 512, columns: 100 });
    setCornerPixels([
      [50, 20],
      [120, 20], // 120 > columns (100)
      [120, 60],
      [50, 60],
    ]);

    expect(() =>
      buildRedactionPayload({
        studyUid: STUDY,
        seriesUid: SERIES,
        annotations: [annotation()],
      })
    ).toThrow(/100x512/);
  });

  it('rejects when rows/columns metadata is missing', () => {
    metaDataGet.mockImplementation(() => ({}));
    setCornerPixels([
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
    ]);

    expect(() =>
      buildRedactionPayload({
        studyUid: STUDY,
        seriesUid: SERIES,
        annotations: [annotation()],
      })
    ).toThrow(/Missing rows\/columns/);
  });

  it('groups same-geometry annotations on one UID into a single redaction with sorted frames', () => {
    // Two annotations on sop-A, same box, frames 5 and 1 (1-based).
    setCornerPixels([
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
    ]);

    const payload = buildRedactionPayload({
      studyUid: STUDY,
      seriesUid: SERIES,
      annotations: [
        annotation({ SOPInstanceUID: 'sop-A', frameNumber: 5 }),
        annotation({ SOPInstanceUID: 'sop-A', frameNumber: 1 }),
      ],
    });

    expect(payload.redactions).toEqual([
      {
        box: { x: 10, y: 20, width: 30, height: 40 },
        applies_to: ['sop-A'],
        frames: [0, 4],
      },
    ]);
  });

  it('groups same-geometry single-frame annotations across UIDs into one redaction', () => {
    // Three slices, identical PHI burned into each at the same location.
    setCornerPixels([
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
    ]);

    const payload = buildRedactionPayload({
      studyUid: STUDY,
      seriesUid: SERIES,
      annotations: [
        annotation({ SOPInstanceUID: 'sop-C', frameNumber: 1 }),
        annotation({ SOPInstanceUID: 'sop-A', frameNumber: 1 }),
        annotation({ SOPInstanceUID: 'sop-B', frameNumber: 1 }),
      ],
    });

    expect(payload.redactions).toHaveLength(1);
    expect(payload.redactions[0]).toEqual({
      box: { x: 10, y: 20, width: 30, height: 40 },
      applies_to: ['sop-A', 'sop-B', 'sop-C'],
      frames: [0],
    });
  });

  it('splits same-geometry UIDs whose frame sets differ into separate redactions', () => {
    // sop-A on frame 0; sop-B on frames 0 and 5. Same box.
    setCornerPixels([
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
    ]);

    const payload = buildRedactionPayload({
      studyUid: STUDY,
      seriesUid: SERIES,
      annotations: [
        annotation({ SOPInstanceUID: 'sop-A', frameNumber: 1 }),
        annotation({ SOPInstanceUID: 'sop-B', frameNumber: 1 }),
        annotation({ SOPInstanceUID: 'sop-B', frameNumber: 6 }),
      ],
    });

    expect(payload.redactions).toHaveLength(2);
    const byUid = new Map(payload.redactions.map(r => [r.applies_to.join(','), r]));
    expect(byUid.get('sop-A')).toEqual({
      box: { x: 10, y: 20, width: 30, height: 40 },
      applies_to: ['sop-A'],
      frames: [0],
    });
    expect(byUid.get('sop-B')).toEqual({
      box: { x: 10, y: 20, width: 30, height: 40 },
      applies_to: ['sop-B'],
      frames: [0, 5],
    });
  });

  it('keeps annotations with different geometry as separate redactions', () => {
    setCornerPixels([
      [10, 20],
      [40, 20],
      [40, 60],
      [10, 60],
      [100, 100],
      [120, 100],
      [120, 130],
      [100, 130],
    ]);

    const payload = buildRedactionPayload({
      studyUid: STUDY,
      seriesUid: SERIES,
      annotations: [
        annotation({ SOPInstanceUID: 'sop-A', frameNumber: 1 }),
        annotation({ SOPInstanceUID: 'sop-A', frameNumber: 1 }),
      ],
    });

    expect(payload.redactions).toHaveLength(2);
    expect(payload.redactions.map(r => r.box)).toEqual([
      { x: 10, y: 20, width: 30, height: 40 },
      { x: 100, y: 100, width: 20, height: 30 },
    ]);
  });
});
