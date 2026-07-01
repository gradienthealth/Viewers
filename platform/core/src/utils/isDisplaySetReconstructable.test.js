import isDisplaySetReconstructable, { isNMReconstructable } from './isDisplaySetReconstructable';

// A minimal multiframe NM instance that satisfies the pixel-measures,
// orientation, and position checks, so the NM gated/non-gated branch is what
// decides reconstructability. Gated SPECT packs one volume per gate into a
// single instance (NumberOfFrames = NumberOfSlices * NumberOfTimeSlots), so it
// must render as a stack, not a single volume (PROC-2396).
function nmMultiframe(overrides = {}) {
  return {
    NumberOfFrames: 400,
    Rows: 64,
    Columns: 64,
    Modality: 'NM',
    ImageType: ['ORIGINAL', 'PRIMARY', 'RECON TOMO', 'EMISSION'],
    PixelSpacing: [4.92, 4.92],
    SliceThickness: 4.92,
    ImageOrientationPatient: [1, 0, 0, 0, 1, 0],
    ImagePositionPatient: [0, 0, 0],
    ...overrides,
  };
}

describe('isDisplaySetReconstructable — NM tomographic', () => {
  test('non-gated RECON TOMO is reconstructable (renders as a volume)', () => {
    expect(isDisplaySetReconstructable([nmMultiframe()]).value).toBe(true);
  });

  test('RECON GATED TOMO is not reconstructable (falls back to a stack)', () => {
    const instance = nmMultiframe({
      ImageType: ['ORIGINAL', 'PRIMARY', 'RECON GATED TOMO', 'EMISSION'],
      NumberOfTimeSlots: 8,
    });
    expect(isDisplaySetReconstructable([instance]).value).toBe(false);
  });

  test('gating detected via NumberOfTimeSlots > 1 even if ImageType says RECON TOMO', () => {
    expect(isDisplaySetReconstructable([nmMultiframe({ NumberOfTimeSlots: 8 })]).value).toBe(false);
  });
});

describe('isNMReconstructable', () => {
  test('true for non-gated RECON TOMO', () => {
    expect(isNMReconstructable({ ImageType: ['ORIGINAL', 'PRIMARY', 'RECON TOMO'] })).toBe(true);
  });

  test('false for RECON GATED TOMO', () => {
    expect(isNMReconstructable({ ImageType: ['ORIGINAL', 'PRIMARY', 'RECON GATED TOMO'] })).toBe(
      false
    );
  });

  test('false for RECON TOMO with more than one time slot (gated)', () => {
    expect(
      isNMReconstructable({
        ImageType: ['ORIGINAL', 'PRIMARY', 'RECON TOMO'],
        NumberOfTimeSlots: 8,
      })
    ).toBe(false);
  });

  test('false for non-tomographic NM (e.g. planar/static)', () => {
    expect(isNMReconstructable({ ImageType: ['ORIGINAL', 'PRIMARY'] })).toBe(false);
  });
});
