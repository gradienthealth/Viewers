import { cache } from '@cornerstonejs/core';

const generateLabelmaps2DFromImageIdMap = (imageIdReferenceMap: Map<string, string>) => {
  const labelmaps2D = [],
    referencedImages = [],
    segmentsOnLabelmap3D = new Set();
  Array.from(imageIdReferenceMap.values()).forEach((segImageId, index) => {
    const segmentationImage = cache.getImage(segImageId);
    referencedImages.push(segmentationImage);
    const { rows, columns } = segmentationImage;
    const pixelData = segmentationImage.getPixelData();
    const segmentsOnLabelmap = [];

    for (let i = 0; i < pixelData.length; i++) {
      const segment = pixelData[i];
      if (!segmentsOnLabelmap.includes(segment) && segment !== 0) {
        segmentsOnLabelmap.push(segment);
      }
    }

    if (segmentsOnLabelmap.length) {
      labelmaps2D[index] = {
        segmentsOnLabelmap,
        pixelData,
        rows,
        columns,
      };

      segmentsOnLabelmap.forEach(segmentIndex => {
        segmentsOnLabelmap3D.add(segmentIndex);
      });
    }
  });

  const labelmapObj = {
    segmentsOnLabelmap: Array.from(segmentsOnLabelmap3D),
    labelmaps2D,
  };

  return { referencedImages, labelmapObj };
};

export default generateLabelmaps2DFromImageIdMap;
