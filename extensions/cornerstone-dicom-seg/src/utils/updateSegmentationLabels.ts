export function updateSegmentationLabels(segmentations, displaySetService) {
  return segmentations.map(segmentation => {
    const displaySet = displaySetService.getDisplaySetByUID(segmentation.displaySetInstanceUID);

    let referencedDisplaySet;
    if (displaySet.Modality === 'SEG') {
      referencedDisplaySet = displaySetService.getDisplaySetByUID(
        displaySet.referencedDisplaySetInstanceUID
      );
    } else {
      // In case of newly created segmentations, displaySetInstanceUID in the segmentation is of the referenced displaySet.
      referencedDisplaySet = displaySet;
    }

    const { ViewPosition, ImageLaterality } = referencedDisplaySet.instance;

    return {
      ...segmentation,
      ...(ImageLaterality &&
        ViewPosition && {
          label: segmentation.label.replace(
            /^.* - Vessel/,
            `${ImageLaterality} ${ViewPosition} - Vessel`
          ),
        }),
    };
  });
}
