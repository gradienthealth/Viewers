const getSegmentLabel = (segmentation): string => {
  const segmentationName = segmentation.label.includes('Vessel') ? 'Vessel' : 'Segment';
  const segmentCount = segmentation.segments.filter(segment => segment).length;

  return segmentationName + ' ' + (segmentCount + 1);
};

export default getSegmentLabel;
