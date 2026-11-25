import combineFrameInstance from './combineFrameInstance';

describe('combineFrameInstance', () => {
  it('returns the instance for an NM multiframe whose DetectorInformationSequence has no items', () => {
    const instance = {
      NumberOfFrames: 84,
      ImageType: ['ORIGINAL', 'PRIMARY', 'TOMO', 'EMISSION'],
      DetectorInformationSequence: [],
    };

    expect(combineFrameInstance(3, instance)).toBe(instance);
  });

  it('takes position and orientation for each frame from the first DetectorInformationSequence item', () => {
    const instance = {
      NumberOfFrames: 3,
      ImageType: ['ORIGINAL', 'PRIMARY', 'RECON TOMO', 'EMISSION'],
      SpacingBetweenSlices: 2,
      DetectorInformationSequence: [
        { ImagePositionPatient: [0, 0, 10], ImageOrientationPatient: [1, 0, 0, 0, 1, 0] },
      ],
    };

    const frame = combineFrameInstance(3, instance);

    expect(frame.ImageOrientationPatient).toEqual([1, 0, 0, 0, 1, 0]);
    expect(frame.ImagePositionPatient).toEqual([0, 0, 14]);
  });
});
