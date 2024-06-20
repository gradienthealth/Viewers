import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';

import { PanelSection } from '../../components';
import SegmentationConfig from './SegmentationConfig';
import NoSegmentationRow from './NoSegmentationRow';
import SegmentationGroup from './SegmentationGroup';

const SegmentationGroupTable = ({
  segmentations,
  savedStatusStates,
  // segmentation initial config
  segmentationConfig,
  // UI show/hide
  disableEditing,
  showAddSegmentation,
  showAddSegment,
  showDeleteSegment,
  // segmentation/segment handlers
  onSegmentationAdd,
  onSegmentationEdit,
  onSegmentationClick,
  onSegmentationDelete,
  onSegmentationDownload,
  onSegmentationDownloadRTSS,
  storeSegmentation,
  // segment handlers
  onSegmentFocusClick,
  onSegmentClick,
  onSegmentAdd,
  onSegmentDelete,
  onSegmentEdit,
  onToggleSegmentationVisibility,
  onToggleSegmentVisibility,
  onToggleSegmentLock,
  onSegmentColorClick,
  // segmentation config handlers
  setFillAlpha,
  setFillAlphaInactive,
  setOutlineWidthActive,
  setOutlineOpacityActive,
  setRenderFill,
  setRenderInactiveSegmentations,
  setRenderOutline,
  CropDisplayAreaService,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeSegmentationId, setActiveSegmentationId] = useState(null);

  useEffect(() => {
    // find the first active segmentation to set
    let activeSegmentationIdToSet = segmentations?.find(segmentation => segmentation.isActive)?.id;

    // If there is no active segmentation, set the first one to be active
    if (!activeSegmentationIdToSet && segmentations?.length > 0) {
      activeSegmentationIdToSet = segmentations[0].id;
    }

    // If there is no segmentation, set the active segmentation to null
    if (segmentations?.length === 0) {
      activeSegmentationIdToSet = null;
    }

    setActiveSegmentationId(activeSegmentationIdToSet);
  }, [segmentations]);

  const activeSegmentation = segmentations?.find(
    segmentation => segmentation.id === activeSegmentationId
  );
  const { t } = useTranslation('SegmentationTable');

  return (
    <div className="flex min-h-0 flex-col bg-black text-[13px] font-[300]">
      <PanelSection
        title={t('Segmentations')}
        actionIcons={
          activeSegmentation && [
            ...(showAddSegmentation && !disableEditing
              ? [
                  {
                    name: 'row-add',
                    onClick: () => onSegmentationAdd(),
                  },
                ]
              : []),
            {
              name: 'settings-bars',
              onClick: () => setIsConfigOpen(isOpen => !isOpen),
            },
          ]
        }
      >
        {isConfigOpen && (
          <SegmentationConfig
            setFillAlpha={setFillAlpha}
            setFillAlphaInactive={setFillAlphaInactive}
            setOutlineWidthActive={setOutlineWidthActive}
            setOutlineOpacityActive={setOutlineOpacityActive}
            setRenderFill={setRenderFill}
            setRenderInactiveSegmentations={setRenderInactiveSegmentations}
            setRenderOutline={setRenderOutline}
            segmentationConfig={segmentationConfig}
          />
        )}
        <div className="bg-primary-dark">
          {segmentations?.length === 0 ? (
            <div className="select-none rounded-[4px]">
              {showAddSegmentation && !disableEditing && (
                <NoSegmentationRow onSegmentationAdd={onSegmentationAdd} />
              )}
            </div>
          ) : (
            segmentations.map(segmentation => (
              <SegmentationGroup
                key={segmentation.id}
                activeSegmentationId={activeSegmentationId}
                segmentation={segmentation}
                savedStatusState={savedStatusStates[segmentation.id]}
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
                onSegmentFocusClick={onSegmentFocusClick}
                onSegmentClick={onSegmentClick}
                onSegmentDelete={onSegmentDelete}
                onSegmentEdit={onSegmentEdit}
                onToggleSegmentVisibility={onToggleSegmentVisibility}
                onToggleSegmentLock={onToggleSegmentLock}
                onSegmentColorClick={onSegmentColorClick}
                showDeleteSegment={showDeleteSegment}
                CropDisplayAreaService={CropDisplayAreaService}
              />
            ))
          )}
        </div>
      </PanelSection>
    </div>
  );
};

SegmentationGroupTable.propTypes = {
  segmentations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      isActive: PropTypes.bool.isRequired,
      segments: PropTypes.arrayOf(
        PropTypes.shape({
          segmentIndex: PropTypes.number.isRequired,
          color: PropTypes.array.isRequired,
          label: PropTypes.string.isRequired,
          isVisible: PropTypes.bool.isRequired,
          isLocked: PropTypes.bool.isRequired,
        })
      ),
    })
  ),
  savedStatusStates: PropTypes.object,
  segmentationConfig: PropTypes.object.isRequired,
  disableEditing: PropTypes.bool,
  showAddSegmentation: PropTypes.bool,
  showAddSegment: PropTypes.bool,
  showDeleteSegment: PropTypes.bool,
  onSegmentationAdd: PropTypes.func.isRequired,
  onSegmentationEdit: PropTypes.func.isRequired,
  onSegmentationClick: PropTypes.func.isRequired,
  onSegmentationDelete: PropTypes.func.isRequired,
  onSegmentationDownload: PropTypes.func.isRequired,
  onSegmentationDownloadRTSS: PropTypes.func.isRequired,
  storeSegmentation: PropTypes.func.isRequired,
  onSegmentFocusClick: PropTypes.func,
  onSegmentClick: PropTypes.func.isRequired,
  onSegmentAdd: PropTypes.func.isRequired,
  onSegmentDelete: PropTypes.func.isRequired,
  onSegmentEdit: PropTypes.func.isRequired,
  onToggleSegmentationVisibility: PropTypes.func.isRequired,
  onToggleSegmentVisibility: PropTypes.func.isRequired,
  onToggleSegmentLock: PropTypes.func.isRequired,
  onSegmentColorClick: PropTypes.func.isRequired,
  setFillAlpha: PropTypes.func.isRequired,
  setFillAlphaInactive: PropTypes.func.isRequired,
  setOutlineWidthActive: PropTypes.func.isRequired,
  setOutlineOpacityActive: PropTypes.func.isRequired,
  setRenderFill: PropTypes.func.isRequired,
  setRenderInactiveSegmentations: PropTypes.func.isRequired,
  setRenderOutline: PropTypes.func.isRequired,
  CropDisplayAreaService: PropTypes.any,
};

SegmentationGroupTable.defaultProps = {
  segmentations: [],
  disableEditing: false,
  showAddSegmentation: true,
  showAddSegment: true,
  showDeleteSegment: true,
  onSegmentationAdd: () => {},
  onSegmentationEdit: () => {},
  onSegmentationClick: () => {},
  onSegmentationDelete: () => {},
  onSegmentationDownload: () => {},
  onSemgnetationDownloadRTSS: () => {},
  storeSegmentation: () => {},
  onSegmentClick: () => {},
  onSegmentAdd: () => {},
  onSegmentDelete: () => {},
  onSegmentEdit: () => {},
  onToggleSegmentationVisibility: () => {},
  onToggleSegmentVisibility: () => {},
  onToggleSegmentLock: () => {},
  onSegmentColorClick: () => {},
  setFillAlpha: () => {},
  setFillAlphaInactive: () => {},
  setOutlineWidthActive: () => {},
  setOutlineOpacityActive: () => {},
  setRenderFill: () => {},
  setRenderInactiveSegmentations: () => {},
  setRenderOutline: () => {},
};
export default SegmentationGroupTable;
