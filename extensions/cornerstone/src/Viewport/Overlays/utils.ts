import moment from 'moment';
import i18n from 'i18next';
import { vec3 } from 'gl-matrix';
import { metaData } from '@cornerstonejs/core';
import { formatDICOMDate } from '@ohif/ui-next';

/**
 * Checks if value is valid.
 *
 * @param {number} value
 * @returns {boolean} is valid.
 */
export function isValidNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Formats number precision.
 *
 * @param {number} number
 * @param {number} precision
 * @returns {number} formatted number.
 */
export function formatNumberPrecision(number, precision = 0) {
  if (number !== null) {
    return parseFloat(number).toFixed(precision);
  }
}

/**
 *    DICOM Time is stored as HHmmss.SSS, where:
 *      HH 24 hour time:
 *        m mm        0..59   Minutes
 *        s ss        0..59   Seconds
 *        S SS SSS    0..999  Fractional seconds
 *
 *        Goal: '24:12:12'
 *
 * @param {*} time
 * @param {string} strFormat
 * @returns {string} formatted name.
 */
export function formatDICOMTime(time, strFormat = 'HH:mm:ss') {
  return moment(time, 'HH:mm:ss').format(strFormat);
}

/**
 * Gets compression type
 *
 * @param {number} imageId
 * @returns {string} compression type.
 */
export function getCompression(imageId) {
  const generalImageModule = metaData.get('generalImageModule', imageId) || {};
  const { lossyImageCompression, lossyImageCompressionRatio, lossyImageCompressionMethod } =
    generalImageModule;

  if (lossyImageCompression === '01' && lossyImageCompressionRatio !== '') {
    const compressionMethod = lossyImageCompressionMethod || 'Lossy: ';
    const compressionRatio = formatNumberPrecision(lossyImageCompressionRatio, 2);
    return compressionMethod + compressionRatio + ' : 1';
  }

  return 'Lossless / Uncompressed';
}

/**
 * Returns the imageId that will render first during streaming for a dimension group.
 * The first-rendered slice is determined by which end of the group sortImageIdsAndGetSpacing
 * places at the front of its descending sort — whichever imageId ends up with the
 * largest projection distance from the reference (imageIds[0]).
 *
 * @param imageIds - imageIds for a single dimension group
 * @returns The imageId that will be requested and rendered first
 */
export function getFirstRenderedImageId(imageIds: string[]): string {
  if (imageIds.length === 1) {
    return imageIds[0];
  }

  const metadata0 = metaData.get('imagePlaneModule', imageIds[0]);
  const metadata1 = metaData.get('imagePlaneModule', imageIds[1]);

  if (
    !metadata0?.imagePositionPatient ||
    !metadata0?.imageOrientationPatient ||
    !metadata1?.imagePositionPatient
  ) {
    console.warn('Missing image plane metadata. Defaulting to first imageId.');
    return imageIds[0];
  }

  const { imagePositionPatient: pos0, imageOrientationPatient } = metadata0;
  const { imagePositionPatient: pos1 } = metadata1;

  const rowCosine = vec3.fromValues(...imageOrientationPatient.slice(0, 3));
  const colCosine = vec3.fromValues(...imageOrientationPatient.slice(3, 6));
  const scanAxisNormal = vec3.create();
  vec3.cross(scanAxisNormal, rowCosine, colCosine);

  // Vector from first instance to second instance
  const step = vec3.sub(vec3.create(), pos1, pos0);

  // dot > 0 → imageIds go in the scan direction → imageIds[0] is last physical slice → last imageId renders first
  // dot < 0 → imageIds go against the scan direction → imageIds[0] is first physical slice → first imageId renders first
  return vec3.dot(step, scanAxisNormal) > 0 ? imageIds[imageIds.length - 1] : imageIds[0];
}

export { formatDICOMDate };
