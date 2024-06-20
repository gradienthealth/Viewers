export default function getImageIdsFromInstances(instances): string[] {
  const isMultiFrame = instance => instance.NumberOfFrames > 1;

  return instances.reduce((imageIds, instance) => {
    if (isMultiFrame(instance)) {
      const frameImageIds = [];
      for (let frame = 1; frame <= instance.NumberOfFrames; frame++) {
        frameImageIds.push(`${instance.imageId}&frame=${frame}`);
      }

      return [...imageIds, ...frameImageIds];
    }
    return [...imageIds, instance.imageId];
  }, []);
}
