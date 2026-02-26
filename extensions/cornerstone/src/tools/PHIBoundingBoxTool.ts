import { RectangleROITool } from '@cornerstonejs/tools';

class PHIBoundingBoxTool extends RectangleROITool {
  constructor(
    toolProps = {},
    defaultToolProps = {
      configuration: { getTextLines: () => ['PHI Bounding Box'] },
    }
  ) {
    super(toolProps, defaultToolProps);
  }
}

PHIBoundingBoxTool.toolName = 'PHIBoundingBox';
export default PHIBoundingBoxTool;
