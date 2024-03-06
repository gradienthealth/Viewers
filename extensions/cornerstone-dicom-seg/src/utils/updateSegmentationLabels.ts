export function updateSegmentationLabels(segmentations, displaySetService) {
  return segmentations.map(segmentation => {
    const segDisplaySet = displaySetService.getDisplaySetByUID(segmentation.displaySetInstanceUID);
    const referencedDisplaySet = displaySetService.getDisplaySetByUID(
      segDisplaySet.referencedDisplaySetInstanceUID
    );
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
