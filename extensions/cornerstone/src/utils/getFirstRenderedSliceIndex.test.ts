import { getFirstRenderedSliceIndex } from './getFirstRenderedSliceIndex';
import type { VolumeViewport } from '@cornerstonejs/core';

const mockIsLoaded = jest.fn();
const mockMetaDataGet = jest.fn();
const mockGetVolumeSliceRangeInfo = jest.fn();

jest.mock('@cornerstonejs/core', () => ({
  cache: {
    isLoaded: (...args: any[]) => mockIsLoaded(...args),
  },
  metaData: {
    get: (...args: any[]) => mockMetaDataGet(...args),
  },
  utilities: {
    getVolumeSliceRangeInfo: (...args: any[]) => mockGetVolumeSliceRangeInfo(...args),
  },
  VolumeViewport: class {},
}));

const makeViewport = (viewPlaneNormal: number[]) =>
  ({ getCamera: () => ({ viewPlaneNormal }) }) as VolumeViewport;

const VOLUME_ID = 'volume-1';

describe('getFirstRenderedSliceIndex', () => {
  afterEach(() => {
    mockIsLoaded.mockReset();
    mockMetaDataGet.mockReset();
    mockGetVolumeSliceRangeInfo.mockReset();
  });

  it('returns undefined for an empty imageIds array', () => {
    const result = getFirstRenderedSliceIndex([], makeViewport([0, 0, -1]), VOLUME_ID);
    expect(result).toBeUndefined();
    expect(mockIsLoaded).not.toHaveBeenCalled();
  });

  it('returns undefined when the single imageId is not loaded', () => {
    mockIsLoaded.mockReturnValue(false);
    const result = getFirstRenderedSliceIndex(['img1'], makeViewport([0, 0, -1]), VOLUME_ID);
    expect(result).toBeUndefined();
    expect(mockMetaDataGet).not.toHaveBeenCalled();
  });

  it('returns undefined when neither first nor last imageId is loaded', () => {
    mockIsLoaded.mockReturnValue(false);
    const result = getFirstRenderedSliceIndex(
      ['img1', 'img2', 'img3'],
      makeViewport([0, 0, -1]),
      VOLUME_ID
    );
    expect(result).toBeUndefined();
    expect(mockIsLoaded).toHaveBeenCalledWith('img1');
    expect(mockIsLoaded).toHaveBeenCalledWith('img3');
    expect(mockMetaDataGet).not.toHaveBeenCalled();
  });

  it('returns undefined when metadata is unavailable for the loaded imageId', () => {
    mockIsLoaded.mockReturnValue(true);
    mockMetaDataGet.mockReturnValue(null);
    mockGetVolumeSliceRangeInfo.mockReturnValue({
      sliceRange: { min: 0, max: 10 },
      spacingInNormalDirection: 1,
    });
    const result = getFirstRenderedSliceIndex(['img1'], makeViewport([0, 0, -1]), VOLUME_ID);
    expect(result).toBeUndefined();
  });

  it('returns undefined when sliceRangeInfo is unavailable', () => {
    mockIsLoaded.mockReturnValue(true);
    mockMetaDataGet.mockReturnValue({ imagePositionPatient: [0, 0, 5] });
    mockGetVolumeSliceRangeInfo.mockReturnValue(null);
    const result = getFirstRenderedSliceIndex(['img1'], makeViewport([0, 0, -1]), VOLUME_ID);
    expect(result).toBeUndefined();
  });

  it('uses the first imageId when it is loaded', () => {
    mockIsLoaded.mockImplementation(imageId => imageId === 'img1');
    mockMetaDataGet.mockReturnValue({ imagePositionPatient: [0, 0, 10] });
    mockGetVolumeSliceRangeInfo.mockReturnValue({
      sliceRange: { min: -10, max: 10 },
      spacingInNormalDirection: 1,
    });
    // viewPlaneNormal = [0,0,-1], IPP = [0,0,10]
    // projected = 10 * -1 = -10
    // index = round((-10 - (-10)) / 1) = 0
    const viewport = makeViewport([0, 0, -1]);
    const result = getFirstRenderedSliceIndex(['img1', 'img2'], viewport, VOLUME_ID);
    expect(mockIsLoaded).toHaveBeenCalledWith('img1');
    expect(mockMetaDataGet).toHaveBeenCalledWith('imagePlaneModule', 'img1');
    expect(result).toBe(0);
  });

  it('uses the last imageId when only the last is loaded', () => {
    mockIsLoaded.mockImplementation(imageId => imageId === 'img3');
    mockMetaDataGet.mockReturnValue({ imagePositionPatient: [0, 0, -10] });
    mockGetVolumeSliceRangeInfo.mockReturnValue({
      sliceRange: { min: -10, max: 10 },
      spacingInNormalDirection: 1,
    });
    // viewPlaneNormal = [0,0,-1], IPP = [0,0,-10]
    // projected = -10 * -1 = 10
    // index = round((10 - (-10)) / 1) = 20
    const viewport = makeViewport([0, 0, -1]);
    const result = getFirstRenderedSliceIndex(['img1', 'img2', 'img3'], viewport, VOLUME_ID);
    expect(mockIsLoaded).toHaveBeenCalledWith('img1');
    expect(mockIsLoaded).toHaveBeenCalledWith('img3');
    expect(mockMetaDataGet).toHaveBeenCalledWith('imagePlaneModule', 'img3');
    expect(result).toBe(20);
  });

  it('prefers the first imageId when both ends are loaded', () => {
    mockIsLoaded.mockReturnValue(true);
    mockMetaDataGet.mockReturnValue({ imagePositionPatient: [0, 0, 5] });
    mockGetVolumeSliceRangeInfo.mockReturnValue({
      sliceRange: { min: 0, max: 10 },
      spacingInNormalDirection: 1,
    });
    getFirstRenderedSliceIndex(['img1', 'img2', 'img3'], makeViewport([0, 0, 1]), VOLUME_ID);
    expect(mockIsLoaded).toHaveBeenCalledTimes(1);
    expect(mockIsLoaded).toHaveBeenCalledWith('img1');
    expect(mockMetaDataGet).toHaveBeenCalledWith('imagePlaneModule', 'img1');
  });

  it('calculates the correct slice index via geometric projection', () => {
    mockIsLoaded.mockReturnValue(true);
    // Axial: viewPlaneNormal = [0,0,-1], IPP z = -5
    // projected = -5 * -1 = 5
    // index = round((5 - 0) / 2.5) = 2
    mockMetaDataGet.mockReturnValue({ imagePositionPatient: [0, 0, -5] });
    mockGetVolumeSliceRangeInfo.mockReturnValue({
      sliceRange: { min: 0, max: 10 },
      spacingInNormalDirection: 2.5,
    });
    const result = getFirstRenderedSliceIndex(['img1'], makeViewport([0, 0, -1]), VOLUME_ID);
    expect(result).toBe(2);
  });
});
