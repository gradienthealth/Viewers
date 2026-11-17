import metadataProvider from './MetadataProvider';

jest.mock(
  '@cornerstonejs/core',
  () => ({
    utilities: {
      calibratedPixelSpacingMetadataProvider: { get: jest.fn(), add: jest.fn() },
      getPixelSpacingInformation: () => ({}),
    },
  }),
  { virtual: true }
);

const imagePlaneModule = (instance: Record<string, unknown>) =>
  metadataProvider._getCornerstoneDICOMImageLoaderTag('imagePlaneModule', {
    imageId: 'wadors:https://example.test/frames/1',
    Rows: 1365,
    Columns: 1017,
    ...instance,
  });

describe('MetadataProvider imagePlaneModule orientation', () => {
  it('keeps a valid ImageOrientationPatient', () => {
    const plane = imagePlaneModule({ ImageOrientationPatient: [0, 1, 0, 0, 0, -1] });

    expect(plane.rowCosines).toEqual([0, 1, 0]);
    expect(plane.columnCosines).toEqual([0, 0, -1]);
    expect(plane.isDefaultValueSetForRowCosine).toBe(false);
  });

  it.each([
    ['all zeros', [0, 0, 0, 0, 0, 0]],
    ['parallel row and column', [1, 0, 0, 1, 0, 0]],
    ['non-numeric', ['', '', '', '', '', '']],
    ['too short', [1, 0, 0]],
    ['missing', undefined],
  ])('falls back to the axial default when the orientation is %s', (_, orientation) => {
    const plane = imagePlaneModule({ ImageOrientationPatient: orientation });

    expect(plane.rowCosines).toEqual([1, 0, 0]);
    expect(plane.columnCosines).toEqual([0, 1, 0]);
    expect(plane.imageOrientationPatient).toEqual([1, 0, 0, 0, 1, 0]);
    expect(plane.isDefaultValueSetForRowCosine).toBe(true);
    expect(plane.isDefaultValueSetForColumnCosine).toBe(true);
    expect(plane.usingDefaultValues).toBe(true);
  });
});
