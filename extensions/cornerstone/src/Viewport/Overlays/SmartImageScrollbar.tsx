import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Enums, cache, eventTarget, utilities as csCoreUtils } from '@cornerstonejs/core';
import { ImageScrollbar } from '@ohif/ui-next';
import classNames from 'classnames';
import { useCachedSlicesPerDisplaysetStore } from '../../stores';
import { getFirstRenderedImageId } from './utils';

const KEYS = { Ctrl: 17 };

function SmartImageScrollbar({
  viewportData,
  viewportId,
  element,
  imageSliceData,
  setImageSliceData,
  scrollbarHeight,
  servicesManager,
}: withAppTypes<{
  element: HTMLElement;
}>) {
  const [cachedImages, setCachedImages] = useState([]);
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  const hasHandledFirstImage = useRef(false);

  const { cineService, cornerstoneViewportService, uiViewportDialogService } =
    servicesManager.services;
  const numOfSlices = imageSliceData.numberOfSlices;
  const scrollbarHeightValue = +scrollbarHeight.split('px')[0] + 2;
  const isStackViewport = viewportData?.viewportType === Enums.ViewportType.STACK;

  const onImageScrollbarChange = (imageIndex, viewportId) => {
    if (!isKeyPressed && !cachedImages.includes(imageIndex) && isStackViewport) {
      return;
    }

    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    const { isCineEnabled } = cineService.getState();

    if (isCineEnabled) {
      // on image scrollbar change, stop the CINE if it is playing
      cineService.stopClip(element, { viewportId });
      cineService.setCine({ id: viewportId, frameRate: 24, isPlaying: false });
    }

    csCoreUtils.jumpToSlice(viewport.element, {
      imageIndex,
      debounceLoading: true,
    });
  };

  useEffect(() => {
    if (!viewportData) {
      return;
    }

    const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);

    if (!viewport || !viewport.getActorUIDs().length) {
      return;
    }

    const imageIndex = viewport.getCurrentImageIdIndex();
    const numberOfSlices = viewport.getNumberOfSlices();

    setImageSliceData({
      imageIndex: imageIndex,
      numberOfSlices,
    });
  }, [viewportId, viewportData]);

  useEffect(() => {
    if (!viewportData) {
      return;
    }
    const { viewportType } = viewportData;
    const eventId =
      (viewportType === Enums.ViewportType.STACK && Enums.Events.STACK_VIEWPORT_SCROLL) ||
      (viewportType === Enums.ViewportType.ORTHOGRAPHIC && Enums.Events.VOLUME_NEW_IMAGE) ||
      Enums.Events.IMAGE_RENDERED;

    const updateIndex = event => {
      const viewport = cornerstoneViewportService.getCornerstoneViewport(viewportId);
      const { imageIndex, newImageIdIndex = imageIndex } = event.detail;
      const numberOfSlices = viewport.getNumberOfSlices();
      // find the index of imageId in the imageIds
      setImageSliceData({
        imageIndex: newImageIdIndex,
        numberOfSlices,
      });
    };

    element.addEventListener(eventId, updateIndex);

    return () => {
      element.removeEventListener(eventId, updateIndex);
    };
  }, [viewportData, element]);

  useEffect(() => {
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

  useEffect(() => {
    const handleVolumeModified = evt => {
      if (hasHandledFirstImage.current) {
        return;
      }

      const { volumeId } = evt.detail;

      const renderingEngine = cornerstoneViewportService.getRenderingEngine();
      if (!renderingEngine) {
        return;
      }

      const targetViewport = renderingEngine.getViewport(viewportId);
      if (
        !targetViewport ||
        (targetViewport.type !== Enums.ViewportType.ORTHOGRAPHIC &&
          targetViewport.type !== Enums.ViewportType.VOLUME_3D)
      ) {
        return;
      }

      const actors = targetViewport.getActors();
      const belongsToViewport = actors.some(actor => actor.referencedId === volumeId);
      if (!belongsToViewport) {
        return;
      }

      const volume = cache.getVolume(volumeId);
      if (!volume?.imageIds || !volume.isDynamicVolume()) {
        return;
      }

      const numTimePoints = volume.numTimePoints || 1;
      const slicesPerTimePoint = volume.imageIds.length / numTimePoints;

      const groupImageIds = (volume as any).getCurrentDimensionGroupImageIds();
      const firstRenderingImageId = getFirstRenderedImageId(groupImageIds);
      const firstRenderingImageIdIndex = volume.imageIds.indexOf(firstRenderingImageId);

      if (!firstRenderingImageId || !cache.isLoaded(firstRenderingImageId)) {
        return;
      }

      hasHandledFirstImage.current = true;
      eventTarget.removeEventListener(Enums.Events.IMAGE_VOLUME_MODIFIED, handleVolumeModified);

      uiViewportDialogService.show({
        id: 'jump-to-loaded-slice',
        viewportId,
        type: 'info',
        message: `A slice in the group has been rendered. Jump to it?`,
        actions: [
          { id: 'no', type: 'secondary', text: 'No', value: false },
          { id: 'yes', type: 'primary', text: 'Yes', value: true },
        ],
        onSubmit: (result: boolean) => {
          uiViewportDialogService.hide();
          if (result) {
            csCoreUtils.jumpToSlice(targetViewport.element, {
              imageIndex: firstRenderingImageIdIndex % slicesPerTimePoint,
              volumeId,
            });
            targetViewport.render();
          }
        },
        onOutsideClick: () => uiViewportDialogService.hide(),
        onKeyPress: () => {},
      });
    };

    eventTarget.addEventListener(Enums.Events.IMAGE_VOLUME_MODIFIED, handleVolumeModified);

    return () => {
      eventTarget.removeEventListener(Enums.Events.IMAGE_VOLUME_MODIFIED, handleVolumeModified);
    };
  }, [viewportId]);

  function updateCachedSlices() {
    if (!viewportData?.data) {
      return;
    }

    const { imageIds, displaySetInstanceUID } = viewportData.data[0];
    const { setCachedSlices } = useCachedSlicesPerDisplaysetStore.getState();

    const cachedImageIndices = [];
    imageIds.forEach((imageId, index) => {
      if (cache.isLoaded(imageId)) {
        cachedImageIndices.push(index);
      }
    });

    setCachedSlices(displaySetInstanceUID, cachedImageIndices);
    setCachedImages(cachedImageIndices);
  }

  return (
    <>
      {cachedImages.length && isStackViewport && (
        <span
          className="border-primary-light bg-secondary-active absolute right-[3px] top-[4px] w-3 overflow-hidden rounded-lg border"
          style={{ height: `${scrollbarHeightValue}px` }}
        >
          {[...Array(numOfSlices)].map((_, index) => (
            <div
              key={index}
              className={classNames(
                'w-full cursor-pointer',
                cachedImages.includes(index)
                  ? 'bg-secondary-light border-primary-light'
                  : 'border-transparent bg-transparent',
                index > 0 && 'border-t-[0.25px]',
                index < numOfSlices - 1 && 'border-b-[0.25px]'
              )}
              style={{ height: `${scrollbarHeightValue / numOfSlices}px` }}
              onClick={() => onImageScrollbarChange(index, viewportId)}
            ></div>
          ))}
        </span>
      )}
      <ImageScrollbar
        onChange={imageIndex => onImageScrollbarChange(imageIndex, viewportId)}
        max={numOfSlices ? numOfSlices - 1 : 0}
        height={scrollbarHeight}
        value={imageSliceData.imageIndex || 0}
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
