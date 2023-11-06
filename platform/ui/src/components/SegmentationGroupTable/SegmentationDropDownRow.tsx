import React from 'react';
import { Select, Icon, Dropdown, Tooltip } from '../../components';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

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
  addSegmentationClassName,
  onSegmentAdd,
  onToggleShowSegments,
  showSegments,
}) {
  const { t } = useTranslation('SegmentationTable');

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
    <div className="group mx-0.5 mt-[8px] flex items-center pb-[10px]">
      <div
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <Dropdown
          id="segmentation-dropdown"
          showDropdownIcon={false}
          alignment="left"
          itemsClassName={`text-primary-active ${addSegmentationClassName}`}
          showBorders={false}
          maxCharactersPerLine={30}
          list={[
            ...(!disableEditing && showAddSegment
              ? [
                  {
                    title: t('Add new segment'),
                    onClick: () => {
                      onSegmentAdd(segmentation.id);
                    },
                  },
                ]
              : []),
            ...(!disableEditing
              ? [
                  {
                    title: t('Rename'),
                    onClick: () => {
                      onSegmentationEdit(segmentation.id);
                    },
                  },
                ]
              : []),
            {
              title: t('Delete'),
              onClick: () => {
                onSegmentationDelete(segmentation.id);
              },
            },
            ...(!disableEditing
              ? [
                  {
                    title: t('Export DICOM SEG'),
                    onClick: () => {
                      storeSegmentation(segmentation.id);
                    },
                  },
                ]
              : []),
            ...[
              {
                title: t('Download DICOM SEG'),
                onClick: () => {
                  onSegmentationDownload(segmentation.id);
                },
              },
              {
                title: t('Download DICOM RTSTRUCT'),
                onClick: () => {
                  onSegmentationDownloadRTSS(segmentation.id);
                },
              },
            ],
          ]}
        >
          <div className="hover:bg-secondary-dark  grid h-[28px] w-[28px]  cursor-pointer place-items-center rounded-[4px]">
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
        <Tooltip
          position="bottom-right"
          content={
            <div className="flex flex-col">
              <div className="text-[13px] text-white">Series:</div>
              <div className="text-aqua-pale text-[13px]">{segmentation.description}</div>
            </div>
          }
        >
          <Icon
            name="info-action"
            className="text-primary-active"
          />
        </Tooltip>
        <div
          className="hover:bg-secondary-dark ml-3 grid h-[28px] w-[28px] cursor-pointer place-items-center rounded-[4px]"
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
