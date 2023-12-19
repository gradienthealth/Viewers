import React from 'react';
import { Icon, Dropdown } from '../../components';
import PropTypes from 'prop-types';

function SegmentationDropDownRow({
  segmentation,
  activeSegmentationId,
  disableEditing,
  showAddSegment,
  onToggleSegmentationVisibility,
  onSegmentationClick,
  onSegmentationEdit,
  onSegmentationDownload,
  onSegmentationDownloadRTSS,
  storeSegmentation,
  onSegmentationDelete,
  onSegmentAdd,
  onToggleShowSegments,
  showSegments,
}) {
  if (!segmentation) {
    return null;
  }

  const segmentationClickHandler = () => {
    if (segmentation.id === activeSegmentationId) {
      onToggleShowSegments(!showSegments);
    } else {
      onSegmentationClick(segmentation.id);

      if (!showSegments) {
        onToggleShowSegments(true);
      }
    }
  };

  return (
    <div className="group mx-0.5 flex items-center">
      <div
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <Dropdown
          id="segmentation-dropdown"
          showDropdownIcon={false}
          alignment="left"
          itemsClassName="text-primary-active"
          showBorders={false}
          maxCharactersPerLine={30}
          list={[
            ...(!disableEditing && showAddSegment
              ? [
                  {
                    title: 'Add New Segment',
                    onClick: () => {
                      onSegmentAdd(segmentation.id);
                    },
                  },
                ]
              : []),
            ...(!disableEditing
              ? [
                  {
                    title: 'Rename',
                    onClick: () => {
                      onSegmentationEdit(segmentation.id);
                    },
                  },
                ]
              : []),
            {
              title: 'Delete',
              onClick: () => {
                onSegmentationDelete(segmentation.id);
              },
            },
            ...(!disableEditing
              ? [
                  {
                    title: 'Export DICOM SEG',
                    onClick: () => {
                      storeSegmentation(segmentation.id);
                    },
                  },
                ]
              : []),
            ...[
              {
                title: 'Download DICOM SEG',
                onClick: () => {
                  onSegmentationDownload(segmentation.id);
                },
              },
              {
                title: 'Download DICOM RTSTRUCT',
                onClick: () => {
                  onSegmentationDownloadRTSS(segmentation.id);
                },
              },
            ],
          ]}
        >
          <div className="hover:bg-secondary-dark mx-1 grid h-[28px] w-[28px]  cursor-pointer place-items-center rounded-[4px]">
            <Icon name="icon-more-menu"></Icon>
          </div>
        </Dropdown>
      </div>
      <div
        className="text-aqua-pale h-[26px] w-1/2 flex-grow cursor-pointer p-1 text-[13px]"
        onClick={segmentationClickHandler}
      >
        {segmentation.label}
      </div>
      <div className="flex items-center">
        <div
          className="hover:bg-secondary-dark ml-3 grid h-[28px]  w-[28px] cursor-pointer place-items-center rounded-[4px]"
          onClick={() => onToggleSegmentationVisibility(segmentation.id)}
        >
          {segmentation.isVisible ? (
            <Icon
              name="row-shown"
              className="text-primary-active"
            />
          ) : (
            <Icon
              name="row-hidden"
              className="text-primary-active"
            />
          )}
        </div>
        <div className="grid h-[28px]  w-[28px] place-items-center rounded-[4px]">
          {showSegments ? (
            <Icon
              name="chevron-down-new"
              className="text-primary-active"
            />
          ) : (
            <Icon
              name="chevron-left-new"
              className="text-primary-active"
            />
          )}
        </div>
      </div>
    </div>
  );
}

SegmentationDropDownRow.propTypes = {
  segmentation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    isVisible: PropTypes.bool.isRequired,
  }),
  activeSegmentationId: PropTypes.string,
  disableEditing: PropTypes.bool,
  showAddSegment: PropTypes.bool,
  onToggleSegmentationVisibility: PropTypes.func,
  onSegmentationClick: PropTypes.func,
  onSegmentationEdit: PropTypes.func,
  onSegmentationDownload: PropTypes.func,
  onSegmentationDownloadRTSS: PropTypes.func,
  storeSegmentation: PropTypes.func,
  onSegmentationDelete: PropTypes.func,
  onSegmentAdd: PropTypes.func,
  onToggleShowSegments: PropTypes.func,
  showSegments: PropTypes.bool,
};

SegmentationDropDownRow.defaultProps = {
  segmentations: [],
  disableEditing: false,
  onToggleShowSegments: () => {},
};

export default SegmentationDropDownRow;
