import { vec3 } from 'gl-matrix';
import { metaData, Types as csCoreTypes, cache } from '@cornerstonejs/core';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';

export default function createImageDataForStackImage(imageIdReferenceMap: Map<string, string>): {
  dimensions: [number, number, number];
  direction: csCoreTypes.Mat3;
  spacing: [number, number, number];
  origin: [number, number, number];
  getScalarData: () => csCoreTypes.PixelDataTypedArray;
  imageData: vtkImageData;
  metadata: Record<string, unknown>;
} {
  const image = cache.getImage(imageIdReferenceMap.values().next().value);
  const imageMetaData = metaData.get('imagePlaneModule', image.imageId);
  const {
    imageOrientationPatient,
    pixelSpacing,
    imagePositionPatient,
    columns,
    rows,
    sliceThickness,
  } = imageMetaData;

  const scalarArray = vtkDataArray.newInstance({
    name: 'Pixels',
    numberOfComponents: 1,
    values: image.getPixelData(),
  });

  const imageData = vtkImageData.newInstance();

  let direction, origin;

  if (imageOrientationPatient?.length) {
    const rowCosineVec = vec3.fromValues(
      imageOrientationPatient[0],
      imageOrientationPatient[1],
      imageOrientationPatient[2]
    );

    const colCosineVec = vec3.fromValues(
      imageOrientationPatient[3],
      imageOrientationPatient[4],
      imageOrientationPatient[5]
    );

    const scanAxisNormal = vec3.create();
    vec3.cross(scanAxisNormal, rowCosineVec, colCosineVec);

    direction = [
      ...Array.from(rowCosineVec),
      ...Array.from(colCosineVec),
      ...Array.from(scanAxisNormal),
    ] as csCoreTypes.Mat3;

    imageData.setDirection(direction);
  }

  if (imagePositionPatient?.length) {
    origin = [...imagePositionPatient] as csCoreTypes.Point3;
    imageData.setOrigin(imagePositionPatient);
  }

  const spacing = [pixelSpacing[1], pixelSpacing[0], sliceThickness] as csCoreTypes.Point3;
  const dimensions = [columns, rows, 1] as csCoreTypes.Point3;

  imageData.setDimensions(dimensions);
  imageData.setSpacing(spacing);
  imageData.getPointData().setScalars(scalarArray);

  return {
    dimensions,
    direction,
    spacing,
    origin,
    getScalarData: () => image.getPixelData(),
    imageData,
    metadata: imageMetaData,
  };
}
