import React from 'react';
import { Select, Icon, Dropdown, Tooltip } from '../../components';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

function SegmentationDropDownRow({
  segmentation,
  savedStatusState,
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

  return (
    <div className="group mx-0.5 mt-[8px] flex items-center pb-[10px] h-5">
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
                    title: t('Save'),
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
              /*{
                title: t('Download DICOM RTSTRUCT'),
                onClick: () => {
                  onSegmentationDownloadRTSS(segmentation.id);
                },
              },*/
            ],
          ]}
        >
          <div className="hover:bg-secondary-dark  grid h-[28px] w-[28px]  cursor-pointer place-items-center rounded-[4px]">
            <Icon name="icon-more-menu"></Icon>
          </div>
        </Dropdown>
      </div>
      <div
        className="text-aqua-pale flex h-[26px] flex-grow cursor-pointer items-center overflow-x-auto overflow-y-hidden p-1 text-[13px]"
        onClick={() => onSegmentationClick(segmentation.id)}
      >
        <div
          className="truncate"
          title={segmentation.label}
        >
          {segmentation.label}
        </div>
        <Icon
          name={`${savedStatusState || 'notifications-success'}`}
          className="ml-1 h-3.5 w-3.5 shrink-0 self-center fill-current"
        />
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
          className="hover:bg-secondary-dark grid h-[28px] w-[28px] cursor-pointer place-items-center rounded-[4px]"
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
        <div
          className="hover:bg-secondary-dark grid h-[28px]  w-[28px] cursor-pointer place-items-center rounded-[4px]"
          onClick={() => onToggleShowSegments(showSegments => !showSegments)}
        >
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
  savedStatusState: PropTypes.string,
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
