import React, { useState } from 'react';
import PropTypes from 'prop-types';

import SegmentationDropDownRow from './SegmentationDropDownRow';
import SegmentationGroupSegment from './SegmentationGroupSegment';

const SegmentationGroup = ({
  segmentation,
  savedStatusState,
  activeSegmentationId,
  disableEditing,
  showAddSegment,
  onSegmentationClick,
  onSegmentationDelete,
  onSegmentationEdit,
  onSegmentationDownload,
  onSegmentationDownloadRTSS,
  storeSegmentation,
  onSegmentAdd,
  onToggleSegmentationVisibility,
  onSegmentClick,
  onSegmentDelete,
  onSegmentEdit,
  onToggleSegmentVisibility,
  onToggleSegmentLock,
  onSegmentColorClick,
  showDeleteSegment,
  addSegmentationClassName,
  CropDisplayAreaService,
}) => {
  const [showSegments, toggleShowSegments] = useState(true);

  return (
    <div
      key={segmentation.id}
      className={`rounded p-1 ${segmentation.id === activeSegmentationId && 'bg-secondary-main'}`}
    >
      <div className="select-none">
        <SegmentationDropDownRow
          segmentation={segmentation}
          savedStatusState={savedStatusState}
          activeSegmentationId={activeSegmentationId}
          disableEditing={disableEditing}
          showAddSegment={showAddSegment}
          onSegmentationClick={onSegmentationClick}
          onSegmentationDelete={onSegmentationDelete}
          onSegmentationEdit={onSegmentationEdit}
          onSegmentationDownload={onSegmentationDownload}
          onSegmentationDownloadRTSS={onSegmentationDownloadRTSS}
          storeSegmentation={storeSegmentation}
          onSegmentAdd={onSegmentAdd}
          onToggleSegmentationVisibility={onToggleSegmentationVisibility}
          onToggleShowSegments={toggleShowSegments}
          showSegments={showSegments}
          addSegmentationClassName={addSegmentationClassName}
        />
      </div>
      {showSegments && (
        <div className="mt-1.5 flex min-h-0 flex-col">
          {segmentation?.segments?.map(segment => {
            if (!segment) {
              return null;
            }

            const { segmentIndex, color, label, isVisible, isLocked } = segment;
            return (
              <div
                className="mb-[1px]"
                key={segmentIndex}
              >
                <SegmentationGroupSegment
                  segmentationId={segmentation.id}
                  segmentIndex={segmentIndex}
                  label={label}
                  color={color}
                  isActive={
                    segmentation.activeSegmentIndex === segmentIndex &&
                    segmentation.id === activeSegmentationId
                  }
                  disableEditing={disableEditing}
                  isLocked={isLocked}
                  isVisible={isVisible}
                  onClick={onSegmentClick}
                  onEdit={onSegmentEdit}
                  onDelete={onSegmentDelete}
                  showDelete={showDeleteSegment}
                  onColor={onSegmentColorClick}
                  onToggleVisibility={onToggleSegmentVisibility}
                  onToggleLocked={onToggleSegmentLock}
                  CropDisplayAreaService={CropDisplayAreaService}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

SegmentationGroup.propTypes = {
  segmentation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    isActive: PropTypes.bool.isRequired,
    activeSegmentIndex: PropTypes.number.isRequired,
    segments: PropTypes.arrayOf(
      PropTypes.shape({
        segmentIndex: PropTypes.number.isRequired,
        color: PropTypes.array.isRequired,
        label: PropTypes.string.isRequired,
        isVisible: PropTypes.bool.isRequired,
        isLocked: PropTypes.bool.isRequired,
      })
    ),
  }),
  savedStatusState: PropTypes.string,
  activeSegmentationId: PropTypes.string,
  disableEditing: PropTypes.bool,
  showAddSegment: PropTypes.bool,
  showDeleteSegment: PropTypes.bool,
  addSegmentationClassName: PropTypes.bool,
  onSegmentationClick: PropTypes.func,
  onSegmentationEdit: PropTypes.func.isRequired,
  onSegmentationDelete: PropTypes.func.isRequired,
  onSegmentationDownload: PropTypes.func.isRequired,
  onSegmentationDownloadRTSS: PropTypes.func.isRequired,
  storeSegmentation: PropTypes.func.isRequired,
  onSegmentClick: PropTypes.func.isRequired,
  onSegmentAdd: PropTypes.func.isRequired,
  onSegmentDelete: PropTypes.func.isRequired,
  onSegmentEdit: PropTypes.func.isRequired,
  onToggleSegmentationVisibility: PropTypes.func.isRequired,
  onToggleSegmentVisibility: PropTypes.func.isRequired,
  onToggleSegmentLock: PropTypes.func.isRequired,
  onSegmentColorClick: PropTypes.func.isRequired,
  CropDisplayAreaService: PropTypes.any,
};

export default SegmentationGroup;
