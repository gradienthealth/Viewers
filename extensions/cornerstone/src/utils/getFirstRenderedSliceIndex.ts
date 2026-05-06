import { cache, metaData, utilities as csCoreUtils, VolumeViewport } from '@cornerstonejs/core';

/**
 * Finds the first loaded imageId in the dimension group (checking both ends, since
 * server-side WADO-RS frame delivery order is unpredictable) and returns its viewport
 * slice index via geometric projection. Returns undefined if neither end is cached yet
 * or if metadata/sliceRange is unavailable.
 *
 * @param imageIds - imageIds for a single dimension group
 * @param viewport - the volume viewport
 * @param volumeId - volumeId associated with the viewport
 */
export function getFirstRenderedSliceIndex(
  imageIds: string[],
  viewport: VolumeViewport,
  volumeId: string
): number | undefined {
  if (imageIds.length === 0) {
    return undefined;
  }

  let imageId: string | undefined;
  if (imageIds.length === 1) {
    imageId = cache.isLoaded(imageIds[0]) ? imageIds[0] : undefined;
  } else if (cache.isLoaded(imageIds[0])) {
    imageId = imageIds[0];
  } else if (cache.isLoaded(imageIds[imageIds.length - 1])) {
    imageId = imageIds[imageIds.length - 1];
  }

  if (!imageId) {
    return undefined;
  }

  const { imagePositionPatient } = metaData.get('imagePlaneModule', imageId) || {};
  const { viewPlaneNormal } = viewport.getCamera();
  const sliceRangeInfo = csCoreUtils.getVolumeSliceRangeInfo(viewport, volumeId);

  if (!imagePositionPatient || !viewPlaneNormal || !sliceRangeInfo) {
    return undefined;
  }

  const projected =
    imagePositionPatient[0] * viewPlaneNormal[0] +
    imagePositionPatient[1] * viewPlaneNormal[1] +
    imagePositionPatient[2] * viewPlaneNormal[2];

  return Math.round(
    (projected - sliceRangeInfo.sliceRange.min) / sliceRangeInfo.spacingInNormalDirection
  );
}
