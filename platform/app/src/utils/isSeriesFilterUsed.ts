/**
 * This function is used to check if the filter is used. Its intend is to
 * warn the user in case of link with a SeriesInstanceUID was called
 * @param instances
 * @returns
 */
export default function isSeriesFilterUsed(instances, filters) {
  const seriesInstanceUIDs = filters?.seriesInstanceUID;
  if (!seriesInstanceUIDs) {
    return true;
  }
  if (!instances.length) {
    return false;
  }
  // In COD format, the DeidSeriesInstanceUID is used to identify series instead of SeriesInstanceUID.
  if (seriesInstanceUIDs.includes(instances[0].DeidSeriesInstanceUID)) {
    return true;
  }
  return seriesInstanceUIDs.includes(instances[0].SeriesInstanceUID);
}
