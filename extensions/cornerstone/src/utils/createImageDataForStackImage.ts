import { vec3 } from 'gl-matrix';
import { metaData, Types as csCoreTypes, cache } from '@cornerstonejs/core';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import { ServicesManager } from '@ohif/core';

export default function createImageDataForStackImage(
  imageIds: string[],
  servicesManager: ServicesManager
): {
  dimensions: [number, number, number];
  direction: csCoreTypes.Mat3;
  spacing: [number, number, number];
  origin: [number, number, number];
  getScalarData: () => csCoreTypes.PixelDataTypedArray;
  imageData: vtkImageData;
} {
  const { cornerstoneViewportService, viewportGridService } = servicesManager.services;
  const activeViewportId = viewportGridService.getActiveViewportId();
  const viewport = cornerstoneViewportService.getCornerstoneViewport(activeViewportId);
  const activeImageIdIndex = viewport.getCurrentImageIdIndex();
  const image = cache.getImage(imageIds[activeImageIdIndex]);

  const {
    imageOrientationPatient,
    pixelSpacing,
    imagePositionPatient,
    columns,
    rows,
    sliceThickness,
  } = metaData.get('imagePlaneModule', image.imageId);

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

  const spacing = [pixelSpacing[1], pixelSpacing[0], sliceThickness] as csCoreTypes.Point3;
  const dimensions = [columns, rows, 1] as csCoreTypes.Point3;
  const direction = [
    ...Array.from(rowCosineVec),
    ...Array.from(colCosineVec),
    ...Array.from(scanAxisNormal),
  ] as csCoreTypes.Mat3;
  const origin = [...imagePositionPatient] as csCoreTypes.Point3;

  const scalarArray = vtkDataArray.newInstance({
    name: 'Pixels',
    numberOfComponents: 1,
    values: image.getPixelData(),
  });

  const imageData = vtkImageData.newInstance();

  imageData.setDimensions(dimensions);
  imageData.setSpacing(spacing);
  imageData.setDirection(direction);
  imageData.setOrigin(imagePositionPatient);
  imageData.getPointData().setScalars(scalarArray);

  return {
    dimensions,
    direction,
    spacing,
    origin,
    getScalarData: () => image.getPixelData(),
    imageData,
  };
}
