/**
 * Gen code utilities for CS2 inspect links.
 *
 * Gen codes are space-separated command strings used on community servers:
 *   !gen {defindex} {paintindex} {paintseed} {paintwear}
 *   !gen ... {s0_id} {s0_wear} {s1_id} {s1_wear} {s2_id} {s2_wear} {s3_id} {s3_wear} {s4_id} {s4_wear} [{kc_id} {kc_wear} ...]
 *
 * Stickers are always padded to 5 slot pairs. Keychains follow without padding.
 */

import { ItemPreviewData } from './ItemPreviewData.ts';
import { Sticker } from './Sticker.ts';
import { InspectLink } from './InspectLink.ts';

export const INSPECT_BASE = 'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20';

/** Format a float, stripping trailing zeros (max 8 decimal places). */
function formatFloat(value: number): string {
  let s = value.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  return s || '0';
}

function serializeStickerPairs(stickers: Sticker[], padTo?: number): string[] {
  const result: string[] = [];
  const filtered = stickers.filter(s => s.stickerId !== 0);

  if (padTo !== undefined) {
    const slotMap = new Map(filtered.map(s => [s.slot, s]));
    for (let slot = 0; slot < padTo; slot++) {
      const s = slotMap.get(slot);
      if (s) {
        result.push(String(s.stickerId));
        result.push(formatFloat(s.wear !== null ? s.wear! : 0));
      } else {
        result.push('0', '0');
      }
    }
  } else {
    const sorted = [...filtered].sort((a, b) => a.slot - b.slot);
    for (const s of sorted) {
      result.push(String(s.stickerId));
      result.push(formatFloat(s.wear !== null ? s.wear! : 0));
      if (s.paintKit != null) {
        result.push(String(s.paintKit));
      }
    }
  }

  return result;
}

/**
 * Convert an ItemPreviewData to a gen code string.
 * @param item - The item to convert.
 * @param prefix - The command prefix, defaults to `"!gen"`.
 * @returns A gen code like `"!gen 7 474 306 0.22540508"`.
 */
export function toGenCode(item: ItemPreviewData, prefix: string = '!gen'): string {
  const wearStr = item.paintWear !== null ? formatFloat(item.paintWear!) : '0';
  const parts = [
    String(item.defIndex),
    String(item.paintIndex),
    String(item.paintSeed),
    wearStr,
  ];

  const hasStickers = item.stickers.some(s => s.stickerId !== 0);
  const hasKeychains = item.keychains.some(s => s.stickerId !== 0);

  if (hasStickers || hasKeychains) {
    parts.push(...serializeStickerPairs(item.stickers, 5));
    parts.push(...serializeStickerPairs(item.keychains));
  }

  const payload = parts.join(' ');
  return prefix ? `${prefix} ${payload}` : payload;
}

export interface GenerateOptions {
  rarity?: number;
  quality?: number;
  stickers?: Sticker[];
  keychains?: Sticker[];
}

/**
 * Generate a full Steam inspect URL from item parameters.
 * @param defIndex - Weapon definition ID (e.g. 7 = AK-47)
 * @param paintIndex - Skin/paint ID
 * @param paintSeed - Pattern index (0-1000)
 * @param paintWear - Float value (0.0-1.0)
 * @param opts - Optional item properties
 * @returns Full `steam://rungame/...` inspect URL
 */
export function generate(
  defIndex: number,
  paintIndex: number,
  paintSeed: number,
  paintWear: number,
  opts: GenerateOptions = {},
): string {
  const { rarity = 0, quality = 0, stickers = [], keychains = [] } = opts;
  const data = new ItemPreviewData({
    defIndex, paintIndex, paintSeed, paintWear,
    rarity, quality, stickers, keychains,
  });
  const hex = InspectLink.serialize(data);
  return `${INSPECT_BASE}${hex}`;
}

/**
 * Parse a gen code string into an ItemPreviewData.
 * @param genCode - A gen code string like `"!gen 7 474 306 0.22540508"`
 * @returns Parsed ItemPreviewData
 * @throws {Error} If the code has fewer than 4 tokens.
 */
/**
 * Generate a gen code string from an existing CS2 inspect link.
 * @param hexOrUrl - A hex payload or full steam:// inspect URL.
 * @param prefix - The command prefix (default "!gen").
 */
export function genCodeFromLink(hexOrUrl: string, prefix: string = '!gen'): string {
  const item = InspectLink.deserialize(hexOrUrl);
  return toGenCode(item, prefix);
}

export function parseGenCode(genCode: string): ItemPreviewData {
  let tokens = genCode.trim().split(/\s+/);
  if (tokens[0] && tokens[0].startsWith('!')) {
    tokens = tokens.slice(1);
  }

  if (tokens.length < 4) {
    throw new Error(`Gen code must have at least 4 tokens, got: "${genCode}"`);
  }

  const defIndex   = parseInt(tokens[0]!, 10);
  const paintIndex = parseInt(tokens[1]!, 10);
  const paintSeed  = parseInt(tokens[2]!, 10);
  const paintWear  = parseFloat(tokens[3]!);
  let rest = tokens.slice(4);

  const stickers: Sticker[] = [];
  const keychains: Sticker[] = [];

  if (rest.length >= 10) {
    const stickerTokens = rest.slice(0, 10);
    for (let slot = 0; slot < 5; slot++) {
      const sid  = parseInt(stickerTokens[slot * 2]!, 10);
      const wear = parseFloat(stickerTokens[slot * 2 + 1]!);
      if (sid !== 0) {
        stickers.push(new Sticker({ slot, stickerId: sid, wear }));
      }
    }
    rest = rest.slice(10);
  }

  for (let i = 0; i + 1 < rest.length; i += 2) {
    const sid  = parseInt(rest[i]!, 10);
    const wear = parseFloat(rest[i + 1]!);
    if (sid !== 0) {
      keychains.push(new Sticker({ slot: i / 2, stickerId: sid, wear }));
    }
  }

  return new ItemPreviewData({ defIndex, paintIndex, paintSeed, paintWear, stickers, keychains });
}
