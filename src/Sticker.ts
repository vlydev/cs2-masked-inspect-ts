/**
 * Represents a sticker or keychain applied to a CS2 item.
 *
 * Maps to the Sticker protobuf message nested inside CEconItemPreviewDataBlock.
 * The same message is used for both stickers (field 12) and keychains (field 20).
 */
export interface StickerInit {
  slot?: number;
  stickerId?: number;
  wear?: number | null;
  scale?: number | null;
  rotation?: number | null;
  tintId?: number;
  offsetX?: number | null;
  offsetY?: number | null;
  offsetZ?: number | null;
  pattern?: number;
  highlightReel?: number | null;
  paintKit?: number | null;
}

export class Sticker {
  slot: number;
  stickerId: number;
  wear: number | null;
  scale: number | null;
  rotation: number | null;
  tintId: number;
  offsetX: number | null;
  offsetY: number | null;
  offsetZ: number | null;
  pattern: number;
  highlightReel: number | null;
  paintKit: number | null;

  constructor({
    slot = 0,
    stickerId = 0,
    wear = null,
    scale = null,
    rotation = null,
    tintId = 0,
    offsetX = null,
    offsetY = null,
    offsetZ = null,
    pattern = 0,
    highlightReel = null,
    paintKit = null,
  }: StickerInit = {}) {
    this.slot = slot;
    this.stickerId = stickerId;
    this.wear = wear;
    this.scale = scale;
    this.rotation = rotation;
    this.tintId = tintId;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.offsetZ = offsetZ;
    this.pattern = pattern;
    this.highlightReel = highlightReel;
    this.paintKit = paintKit;
  }
}
