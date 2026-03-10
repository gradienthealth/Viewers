import { RectangleROITool } from '@cornerstonejs/tools';

class PHIBoundingBoxTool extends RectangleROITool {
  static toolName = 'PHIBoundingBox';

  constructor(
    toolProps = {},
    defaultToolProps = {
      configuration: { getTextLines: () => ['PHI Bounding Box'] },
    }
  ) {
    super(toolProps, defaultToolProps);
  }
}

export default PHIBoundingBoxTool;
