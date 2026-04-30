import { utilities as csUtils, metaData } from '@cornerstonejs/core';

export interface RedactionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Redaction {
  box: RedactionBox;
  applies_to: string[];
  frames: number[] | null;
}

export interface RedactionPayload {
  study_uid: string;
  series_uid: string;
  reviewer?: string;
  redactions: Redaction[];
}

export interface PHIAnnotationInput {
  points: number[][];
  referencedImageId: string;
  SOPInstanceUID: string;
  frameNumber: number;
}

export class RedactionOutOfBoundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedactionOutOfBoundsError';
  }
}

interface TransformedAnnotation extends RedactionBox {
  sopUid: string;
  frameIdx: number;
}

export function buildRedactionPayload({
  studyUid,
  seriesUid,
  reviewer,
  annotations,
}: {
  studyUid: string;
  seriesUid: string;
  reviewer?: string;
  annotations: PHIAnnotationInput[];
}): RedactionPayload {
  const transformed = annotations.map(transformAnnotation);
  const redactions = groupRedactions(transformed);

  return {
    study_uid: studyUid,
    series_uid: seriesUid,
    ...(reviewer ? { reviewer } : {}),
    redactions,
  };
}

function transformAnnotation(a: PHIAnnotationInput): TransformedAnnotation {
  if (!a.points || a.points.length < 2) {
    throw new RedactionOutOfBoundsError(
      `PHI box for ${a.SOPInstanceUID} has fewer than 2 corner points`
    );
  }

  const pixels = a.points.map(p => {
    const ij = csUtils.worldToImageCoords(a.referencedImageId, p as [number, number, number]);
    if (!ij) {
      throw new RedactionOutOfBoundsError(
        `Could not transform world coords to pixel coords for image ${a.referencedImageId}`
      );
    }
    return ij;
  });

  const xs = pixels.map(p => p[0]);
  const ys = pixels.map(p => p[1]);
  const minX = Math.round(Math.min(...xs));
  const minY = Math.round(Math.min(...ys));
  const maxX = Math.round(Math.max(...xs));
  const maxY = Math.round(Math.max(...ys));
  const width = maxX - minX;
  const height = maxY - minY;

  const pixelModule = metaData.get('imagePixelModule', a.referencedImageId) ?? {};
  const planeModule = metaData.get('imagePlaneModule', a.referencedImageId) ?? {};
  const rows: number | undefined = pixelModule.rows ?? planeModule.rows;
  const columns: number | undefined = pixelModule.columns ?? planeModule.columns;

  if (rows == null || columns == null) {
    throw new RedactionOutOfBoundsError(
      `Missing rows/columns metadata for image ${a.referencedImageId}`
    );
  }

  if (
    width <= 0 ||
    height <= 0 ||
    minX < 0 ||
    minY < 0 ||
    minX + width > columns ||
    minY + height > rows
  ) {
    throw new RedactionOutOfBoundsError(
      `PHI box for ${a.SOPInstanceUID} frame ${a.frameNumber} ` +
        `is outside image bounds (${columns}x${rows}): ` +
        `(x=${minX}, y=${minY}, w=${width}, h=${height})`
    );
  }

  return {
    x: minX,
    y: minY,
    width,
    height,
    sopUid: a.SOPInstanceUID,
    frameIdx: a.frameNumber - 1,
  };
}

function groupRedactions(items: TransformedAnnotation[]): Redaction[] {
  const byGeom = new Map<string, TransformedAnnotation[]>();
  for (const item of items) {
    const key = `${item.x},${item.y},${item.width},${item.height}`;
    let bucket = byGeom.get(key);
    if (!bucket) {
      bucket = [];
      byGeom.set(key, bucket);
    }
    bucket.push(item);
  }

  const redactions: Redaction[] = [];
  for (const bucket of byGeom.values()) {
    const uidToFrames = new Map<string, Set<number>>();
    for (const item of bucket) {
      let frames = uidToFrames.get(item.sopUid);
      if (!frames) {
        frames = new Set<number>();
        uidToFrames.set(item.sopUid, frames);
      }
      frames.add(item.frameIdx);
    }

    const byFrameSet = new Map<string, { frames: number[]; uids: string[] }>();
    for (const [uid, frameSet] of uidToFrames) {
      const sortedFrames = [...frameSet].sort((a, b) => a - b);
      const key = sortedFrames.join(',');
      let group = byFrameSet.get(key);
      if (!group) {
        group = { frames: sortedFrames, uids: [] };
        byFrameSet.set(key, group);
      }
      group.uids.push(uid);
    }

    const { x, y, width, height } = bucket[0];
    for (const { frames, uids } of byFrameSet.values()) {
      uids.sort();
      redactions.push({
        box: { x, y, width, height },
        applies_to: uids,
        frames,
      });
    }
  }

  return redactions;
}
