import getWADORSImageId from './utils/getWADORSImageId';

/**
 * @param {Object} params
 * @param {Object} params.instance
 * @param {number} [params.frame]
 * @param {Object} params.config
 */
export default function getCodImageId({ instance, frame, config }) {
  if (!instance) {
    return;
  }

  let wadoRsImageId;

  if (instance.imageId && frame === undefined) {
    wadoRsImageId = instance.imageId;
  } else if (instance.url) {
    wadoRsImageId = instance.url;
  } else {
    wadoRsImageId = getWADORSImageId(instance, config, frame);
  }

  if (config.useURLParams && (!instance.imageId || frame) && instance.BucketPath) {
    wadoRsImageId = wadoRsImageId.replace(
      config.wadoRoot,
      `${config.wadoRoot}/${instance.BucketPath}`
    );
  }

  return wadoRsImageId.replace('wadors:', 'cod:');
}
