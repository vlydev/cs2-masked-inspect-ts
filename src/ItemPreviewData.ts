import { Sticker } from './Sticker.ts';

/**
 * Represents a CS2 item as encoded in an inspect link.
 *
 * Fields map directly to the CEconItemPreviewDataBlock protobuf message
 * used by the CS2 game coordinator.
 *
 * paintWear is stored as a float32 (IEEE 754). On the wire it is reinterpreted
 * as a uint32 — this class always exposes it as a JavaScript number for convenience.
 *
 * accountId and itemId may be large integers; they are stored as number but
 * can also accept bigint for construction (values > 2^53 should use bigint).
 */
export interface ItemPreviewDataInit {
  accountId?: number | bigint;
  itemId?: number | bigint;
  defIndex?: number;
  paintIndex?: number;
  rarity?: number;
  quality?: number;
  paintWear?: number | null;
  paintSeed?: number;
  killEaterScoreType?: number;
  killEaterValue?: number;
  customName?: string;
  stickers?: Sticker[];
  inventory?: number;
  origin?: number;
  questId?: number;
  dropReason?: number;
  musicIndex?: number;
  entIndex?: number;
  petIndex?: number;
  keychains?: Sticker[];
}

export class ItemPreviewData {
  accountId: number | bigint;
  itemId: number | bigint;
  defIndex: number;
  paintIndex: number;
  rarity: number;
  quality: number;
  paintWear: number | null;
  paintSeed: number;
  killEaterScoreType: number;
  killEaterValue: number;
  customName: string;
  stickers: Sticker[];
  inventory: number;
  origin: number;
  questId: number;
  dropReason: number;
  musicIndex: number;
  entIndex: number;
  petIndex: number;
  keychains: Sticker[];

  constructor({
    accountId = 0,
    itemId = 0,
    defIndex = 0,
    paintIndex = 0,
    rarity = 0,
    quality = 0,
    paintWear = null,
    paintSeed = 0,
    killEaterScoreType = 0,
    killEaterValue = 0,
    customName = '',
    stickers = [],
    inventory = 0,
    origin = 0,
    questId = 0,
    dropReason = 0,
    musicIndex = 0,
    entIndex = 0,
    petIndex = 0,
    keychains = [],
  }: ItemPreviewDataInit = {}) {
    this.accountId = accountId;
    this.itemId = itemId;
    this.defIndex = defIndex;
    this.paintIndex = paintIndex;
    this.rarity = rarity;
    this.quality = quality;
    this.paintWear = paintWear;
    this.paintSeed = paintSeed;
    this.killEaterScoreType = killEaterScoreType;
    this.killEaterValue = killEaterValue;
    this.customName = customName;
    this.stickers = stickers;
    this.inventory = inventory;
    this.origin = origin;
    this.questId = questId;
    this.dropReason = dropReason;
    this.musicIndex = musicIndex;
    this.entIndex = entIndex;
    this.petIndex = petIndex;
    this.keychains = keychains;
  }
}
