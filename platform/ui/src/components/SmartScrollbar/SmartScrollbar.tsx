import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { Enums, Types, utilities, eventTarget, cache } from '@cornerstonejs/core';
import { utilities as csToolsUtils } from '@cornerstonejs/tools';
import { ImageScrollbar } from '@ohif/ui';
import { ServicesManger } from '@ohif/core';

const KEYS = { Ctrl: 17 };

function SmartImageScrollbar({
  viewportData,
  viewportId,
  element,
  imageSliceData,
  setImageSliceData,
  scrollbarHeight,
  servicesManager,
}) {
  const [cachedSlices, setCachedSlices] = useState([]);
  const [isKeyPressed, setIsKeyPressed] = useState(false);

  const { cineService, cornerstoneViewportService, stateSyncService } = (
    servicesManager as ServicesManger
  ).services;
  const numOfSlices = imageSliceData.numberOfSlices;
  const scrollbarHeightValue = scrollbarHeight.split('px')[0];

  const onImageScrollbarChange = (imageIndex, viewportId) => {
    if (!isKeyPressed && !cachedSlices.includes(imageIndex)) {
      return;
    }

    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    const { isCineEnabled } = cineService.getState();

    if (isCineEnabled) {
      // on image scrollbar change, stop the CINE if it is playing
      cineService.stopClip(element);
      cineService.setCine({ id: viewportId, isPlaying: false });
    }

    csToolsUtils.jumpToSlice(viewport.element, {
      imageIndex,
      debounceLoading: true,
    });
  };

  useEffect(() => {
    if (!viewportData) {
      return;
    }

    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport) {
      return;
    }

    if (viewportData.viewportType === Enums.ViewportType.STACK) {
      const imageIndex = viewport.getCurrentImageIdIndex();

      setImageSliceData({
        imageIndex: imageIndex,
        numberOfSlices: viewportData.data.imageIds.length,
      });

      return;
    }

    if (viewportData.viewportType === Enums.ViewportType.ORTHOGRAPHIC) {
      const sliceData = utilities.getImageSliceDataForVolumeViewport(
        viewport as Types.IVolumeViewport
      );

      if (!sliceData) {
        return;
      }

      const { imageIndex, numberOfSlices } = sliceData;
      setImageSliceData({ imageIndex, numberOfSlices });
    }
  }, [viewportId, viewportData]);

  useEffect(() => {
    if (viewportData?.viewportType !== Enums.ViewportType.STACK) {
      return;
    }

    const updateStackIndex = event => {
      const { newImageIdIndex } = event.detail;
      // find the index of imageId in the imageIds
      setImageSliceData({
        imageIndex: newImageIdIndex,
        numberOfSlices: viewportData.data.imageIds.length,
      });
    };

    element.addEventListener(Enums.Events.STACK_VIEWPORT_SCROLL, updateStackIndex);

    return () => {
      element.removeEventListener(Enums.Events.STACK_VIEWPORT_SCROLL, updateStackIndex);
    };
  }, [viewportData, element]);

  useEffect(() => {
    if (viewportData?.viewportType !== Enums.ViewportType.ORTHOGRAPHIC) {
      return;
    }

    const updateVolumeIndex = event => {
      const { imageIndex, numberOfSlices } = event.detail;
      // find the index of imageId in the imageIds
      setImageSliceData({ imageIndex, numberOfSlices });
    };

    element.addEventListener(Enums.Events.VOLUME_NEW_IMAGE, updateVolumeIndex);

    return () => {
      element.removeEventListener(Enums.Events.VOLUME_NEW_IMAGE, updateVolumeIndex);
    };
  }, [viewportData, element]);

  useEffect(() => {
    if (viewportData?.viewportType !== Enums.ViewportType.STACK) {
      return;
    }

    updateCachedSlices();

    eventTarget.addEventListener(Enums.Events.IMAGE_CACHE_IMAGE_ADDED, updateCachedSlices);
    eventTarget.addEventListener(Enums.Events.VOLUME_CACHE_VOLUME_ADDED, updateCachedSlices);
    eventTarget.addEventListener(Enums.Events.IMAGE_CACHE_IMAGE_REMOVED, updateCachedSlices);
    eventTarget.addEventListener(Enums.Events.VOLUME_CACHE_VOLUME_REMOVED, updateCachedSlices);

    return () => {
      eventTarget.removeEventListener(Enums.Events.IMAGE_CACHE_IMAGE_ADDED, updateCachedSlices);
      eventTarget.removeEventListener(Enums.Events.VOLUME_CACHE_VOLUME_ADDED, updateCachedSlices);
      eventTarget.removeEventListener(Enums.Events.IMAGE_CACHE_IMAGE_REMOVED, updateCachedSlices);
      eventTarget.removeEventListener(Enums.Events.VOLUME_CACHE_VOLUME_REMOVED, updateCachedSlices);
    };
  }, [viewportData, numOfSlices]);

  useEffect(() => {
    const onKeyDown = evt => {
      //  Checking the pressed key is Ctrl key
      evt.keyCode === KEYS.Ctrl && setIsKeyPressed(true);
    };

    const onKeyUp = evt => {
      //  Checking the pressed key is Ctrl key
      evt.keyCode === KEYS.Ctrl && setIsKeyPressed(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  function updateCachedSlices() {
    if (!viewportData?.data) {
      return;
    }

    const { cachedSlicesPerSeries } = stateSyncService.getState();
    const { imageIds, displaySetInstanceUID } = viewportData.data;

    const cachedImages = [];
    imageIds.forEach((imageId, index) => {
      if (cache.isLoaded(imageId)) {
        cachedImages.push(index);
      }
    });

    stateSyncService.store({
      cachedSlicesPerSeries: { ...cachedSlicesPerSeries, [displaySetInstanceUID]: cachedImages },
    });
    setCachedSlices(cachedImages);
  }

  return (
    <>
      {numOfSlices && (
        <span
          className="border-primary-light bg-secondary-active absolute right-[3px] top-[8px] w-5 overflow-hidden rounded-lg border-2"
          style={{ height: `${+scrollbarHeightValue + 4}px` }}
        >
          {[...Array(numOfSlices)].map((_, index) => (
            <div
              key={index}
              className={classNames(
                'w-full cursor-pointer',
                cachedSlices.includes(index)
                  ? 'bg-secondary-light border-primary-light'
                  : 'border-transparent bg-transparent',
                index > 0 && 'border-t-[0.5px]',
                index < numOfSlices - 1 && 'border-b-[0.5px]'
              )}
              style={{ height: `${(+scrollbarHeightValue + 2) / numOfSlices}px` }}
              onClick={() => onImageScrollbarChange(index, viewportId)}
            ></div>
          ))}
        </span>
      )}
      <ImageScrollbar
        onChange={imageIndex => onImageScrollbarChange(imageIndex, viewportId)}
        max={numOfSlices ? numOfSlices - 1 : 0}
        height={scrollbarHeight}
        value={imageSliceData.imageIndex}
      />
    </>
  );
}

SmartImageScrollbar.propTypes = {
  viewportData: PropTypes.object,
  viewportId: PropTypes.string.isRequired,
  element: PropTypes.instanceOf(Element),
  scrollbarHeight: PropTypes.string,
  imageSliceData: PropTypes.object.isRequired,
  setImageSliceData: PropTypes.func.isRequired,
  servicesManager: PropTypes.object.isRequired,
};

export default SmartImageScrollbar;
