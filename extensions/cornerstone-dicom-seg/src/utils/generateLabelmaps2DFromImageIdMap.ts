import { cache } from '@cornerstonejs/core';

const generateLabelmaps2DFromImageIdMap = imageIdReferenceMap => {
  const labelmaps2D = [],
    referencedImages = [],
    segmentsOnLabelmap3D = new Set();
  Array.from(imageIdReferenceMap.entries()).forEach((entry, index) => {
    referencedImages.push(cache.getImage(entry[0]));

    const segmentationImage = cache.getImage(entry[1]);
    const { rows, columns } = segmentationImage;
    const pixelData = segmentationImage.getPixelData();
    const segmentsOnLabelmap = [];

    for (let i = 0; i < pixelData.length; i++) {
      const segment = pixelData[i];
      if (!segmentsOnLabelmap.includes(segment) && segment !== 0) {
        segmentsOnLabelmap.push(segment);
      }
    }

    if (!segmentsOnLabelmap.length) {
      segmentsOnLabelmap.push(1);
    }

    labelmaps2D[index] = {
      segmentsOnLabelmap,
      pixelData,
      rows,
      columns,
    };

    segmentsOnLabelmap.forEach(segmentIndex => {
      segmentsOnLabelmap3D.add(segmentIndex);
    });
  });

  const labelmapObj = {
    segmentsOnLabelmap: Array.from(segmentsOnLabelmap3D),
    labelmaps2D,
  };

  return { referencedImages, labelmapObj };
};

export default generateLabelmaps2DFromImageIdMap;
