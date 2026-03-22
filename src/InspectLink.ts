/**
 * Encodes and decodes CS2 masked inspect links.
 *
 * Binary format:
 *   [key_byte] [proto_bytes XOR'd with key] [4-byte checksum XOR'd with key]
 *
 * For tool-generated links key_byte = 0x00 (no XOR needed).
 * For native CS2 links key_byte != 0x00 — every byte must be XOR'd before parsing.
 *
 * Checksum:
 *   buffer   = [0x00] + proto_bytes
 *   crc      = crc32(buffer)
 *   xored    = (crc & 0xffff) ^ (len(proto_bytes) * crc)  [unsigned 32-bit]
 *   checksum = big-endian uint32 of (xored & 0xFFFFFFFF)
 */

import { ItemPreviewData } from './ItemPreviewData.ts';
import { Sticker } from './Sticker.ts';
import { ProtoReader } from './proto/reader.ts';
import { ProtoWriter } from './proto/writer.ts';
import { crc32 } from './crc32.ts';

// ------------------------------------------------------------------
// Checksum helpers
// ------------------------------------------------------------------

/**
 * Compute checksum over [0x00] + proto_bytes.
 * Returns a 4-byte big-endian Uint8Array.
 */
function computeChecksum(buffer: Uint8Array, protoLen: number): Uint8Array {
  const crcVal = crc32(buffer);
  const val = BigInt(((crcVal & 0xFFFF) ^ (protoLen * crcVal)) >>> 0) & 0xFFFFFFFFn;
  const result = new Uint8Array(4);
  const dv = new DataView(result.buffer);
  dv.setUint32(0, Number(val), false); // big-endian
  return result;
}

// ------------------------------------------------------------------
// float32 <-> uint32 reinterpretation
// ------------------------------------------------------------------

function float32ToUint32(f: number): number {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setFloat32(0, f, true); // little-endian
  return dv.getUint32(0, true);
}

function uint32ToFloat32(u: number): number {
  const dv = new DataView(new ArrayBuffer(4));
  dv.setUint32(0, u >>> 0, true);
  return dv.getFloat32(0, true);
}

// ------------------------------------------------------------------
// Hex encoding / decoding helpers
// ------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ------------------------------------------------------------------
// URL extraction
// ------------------------------------------------------------------

const INSPECT_URL_RE = /(?:%20|\s|\+)A([0-9A-Fa-f]+)/i;
const HYBRID_URL_RE  = /S\d+A\d+D([0-9A-Fa-f]+)$/i;
const CLASSIC_URL_RE = /csgo_econ_action_preview(?:%20|\s)[SM]\d+A\d+D\d+$/i;
const MASKED_URL_RE  = /csgo_econ_action_preview(?:%20|\s)[0-9A-Fa-f]{10,}$/i;

function extractHex(input: string): string {
  const stripped = input.trim();

  // Hybrid format: S\d+A\d+D<hexproto>
  const mh = stripped.match(HYBRID_URL_RE);
  if (mh && /[A-Fa-f]/.test(mh[1]!)) return mh[1]!;

  // Classic/market URL: A<hex> preceded by %20, space, or + (A is a prefix marker, not hex).
  // If stripping A yields odd-length hex, A is actually the first byte of the payload —
  // fall through to the pure-masked check below which captures it with A included.
  const m = stripped.match(INSPECT_URL_RE);
  if (m && m[1]!.length % 2 === 0) return m[1]!;

  // Pure masked format: csgo_econ_action_preview%20<hexblob> (no S/A/M prefix).
  // Also handles payloads whose first hex character happens to be A.
  const mm = stripped.match(/csgo_econ_action_preview(?:%20|\s|\+)([0-9A-Fa-f]{10,})$/i);
  if (mm) return mm[1]!;

  // Bare hex — strip whitespace
  return stripped.replace(/\s+/g, '');
}

// ------------------------------------------------------------------
// Sticker encode / decode
// ------------------------------------------------------------------

function encodeSticker(s: Sticker): Uint8Array {
  const w = new ProtoWriter();
  w.writeUint32(1, s.slot);
  w.writeUint32(2, s.stickerId);
  if (s.wear     !== null) w.writeFloat32Fixed(3, s.wear);
  if (s.scale    !== null) w.writeFloat32Fixed(4, s.scale);
  if (s.rotation !== null) w.writeFloat32Fixed(5, s.rotation);
  w.writeUint32(6, s.tintId);
  if (s.offsetX  !== null) w.writeFloat32Fixed(7, s.offsetX);
  if (s.offsetY  !== null) w.writeFloat32Fixed(8, s.offsetY);
  if (s.offsetZ  !== null) w.writeFloat32Fixed(9, s.offsetZ);
  w.writeUint32(10, s.pattern);
  if (s.highlightReel != null) w.writeUint32(11, s.highlightReel);
  if (s.paintKit !== null) w.writeUint32(12, s.paintKit);
  return w.toBytes();
}

function decodeSticker(data: Uint8Array): Sticker {
  const reader = new ProtoReader(data);
  const s = new Sticker();

  for (const f of reader.readAllFields()) {
    switch (f.field) {
      case 1:  s.slot      = Number(f.value as bigint); break;
      case 2:  s.stickerId = Number(f.value as bigint); break;
      case 3: {
        const bytes = f.value as Uint8Array;
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        s.wear = dv.getFloat32(0, true);
        break;
      }
      case 4: {
        const bytes = f.value as Uint8Array;
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        s.scale = dv.getFloat32(0, true);
        break;
      }
      case 5: {
        const bytes = f.value as Uint8Array;
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        s.rotation = dv.getFloat32(0, true);
        break;
      }
      case 6:  s.tintId    = Number(f.value as bigint); break;
      case 7: {
        const bytes = f.value as Uint8Array;
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        s.offsetX = dv.getFloat32(0, true);
        break;
      }
      case 8: {
        const bytes = f.value as Uint8Array;
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        s.offsetY = dv.getFloat32(0, true);
        break;
      }
      case 9: {
        const bytes = f.value as Uint8Array;
        const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        s.offsetZ = dv.getFloat32(0, true);
        break;
      }
      case 10: s.pattern      = Number(f.value as bigint); break;
      case 11: s.highlightReel = Number(f.value as bigint); break;
      case 12: s.paintKit = Number(f.value as bigint); break;
      default: break;
    }
  }

  return s;
}

// ------------------------------------------------------------------
// ItemPreviewData encode / decode
// ------------------------------------------------------------------

function encodeItem(item: ItemPreviewData): Uint8Array {
  const w = new ProtoWriter();
  w.writeUint32(1, item.accountId);
  w.writeUint64(2, item.itemId);
  w.writeUint32(3, item.defIndex);
  w.writeUint32(4, item.paintIndex);
  w.writeUint32(5, item.rarity);
  w.writeUint32(6, item.quality);

  // paintWear: float32 reinterpreted as uint32 varint
  if (item.paintWear != null) {
    w.writeUint32(7, float32ToUint32(item.paintWear));
  }

  w.writeUint32(8, item.paintSeed);
  w.writeUint32(9, item.killEaterScoreType);
  w.writeUint32(10, item.killEaterValue);
  w.writeString(11, item.customName);

  for (const sticker of item.stickers) {
    w.writeRawBytes(12, encodeSticker(sticker));
  }

  w.writeUint32(13, item.inventory);
  w.writeUint32(14, item.origin);
  w.writeUint32(15, item.questId);
  w.writeUint32(16, item.dropReason);
  w.writeUint32(17, item.musicIndex);
  w.writeInt32(18, item.entIndex);
  w.writeUint32(19, item.petIndex);

  for (const kc of item.keychains) {
    w.writeRawBytes(20, encodeSticker(kc));
  }

  return w.toBytes();
}

function decodeItem(data: Uint8Array): ItemPreviewData {
  const reader = new ProtoReader(data);
  const item   = new ItemPreviewData();

  for (const f of reader.readAllFields()) {
    switch (f.field) {
      case 1:  item.accountId          = Number(f.value as bigint); break;
      case 2:  item.itemId             = Number(f.value as bigint); break;
      case 3:  item.defIndex           = Number(f.value as bigint); break;
      case 4:  item.paintIndex         = Number(f.value as bigint); break;
      case 5:  item.rarity             = Number(f.value as bigint); break;
      case 6:  item.quality            = Number(f.value as bigint); break;
      case 7:  item.paintWear          = uint32ToFloat32(Number(f.value as bigint)); break;
      case 8:  item.paintSeed          = Number(f.value as bigint); break;
      case 9:  item.killEaterScoreType = Number(f.value as bigint); break;
      case 10: item.killEaterValue     = Number(f.value as bigint); break;
      case 11: item.customName         = new TextDecoder().decode(f.value as Uint8Array); break;
      case 12: item.stickers.push(decodeSticker(f.value as Uint8Array)); break;
      case 13: item.inventory          = Number(f.value as bigint); break;
      case 14: item.origin             = Number(f.value as bigint); break;
      case 15: item.questId            = Number(f.value as bigint); break;
      case 16: item.dropReason         = Number(f.value as bigint); break;
      case 17: item.musicIndex         = Number(f.value as bigint); break;
      case 18: item.entIndex           = Number(f.value as bigint); break;
      case 19: item.petIndex           = Number(f.value as bigint); break;
      case 20: item.keychains.push(decodeSticker(f.value as Uint8Array)); break;
      default: break;
    }
  }

  return item;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export class InspectLink {
  /**
   * Encode an ItemPreviewData to an uppercase hex inspect-link payload.
   *
   * The returned string can be appended to a steam:// inspect URL or used
   * standalone. The key_byte is always 0x00 (no XOR applied).
   */
  static serialize(data: ItemPreviewData): string {
    if (data.paintWear != null && (data.paintWear < 0.0 || data.paintWear > 1.0)) {
      throw new RangeError(
        `paintwear must be in [0.0, 1.0], got ${data.paintWear}`,
      );
    }
    if (data.customName != null && data.customName.length > 100) {
      throw new RangeError(
        `customname must not exceed 100 characters, got ${data.customName.length}`,
      );
    }
    const protoBytes = encodeItem(data);
    const buffer     = concatBytes(new Uint8Array([0x00]), protoBytes);
    const checksum   = computeChecksum(buffer, protoBytes.length);
    return bytesToHex(concatBytes(buffer, checksum));
  }

  /**
   * Returns true if the link contains a decodable protobuf payload (can be decoded offline).
   */
  static isMasked(link: string): boolean {
    const s = link.trim();
    if (MASKED_URL_RE.test(s)) return true;
    const m = s.match(HYBRID_URL_RE);
    return !!(m && /[A-Fa-f]/.test(m[1]!));
  }

  /**
   * Returns true if the link is a classic S/A/D inspect URL with decimal did.
   */
  static isClassic(link: string): boolean {
    return CLASSIC_URL_RE.test(link.trim());
  }

  /**
   * Decode an inspect-link hex payload (or full URL) into an ItemPreviewData.
   *
   * Accepts:
   *   - A raw uppercase or lowercase hex string
   *   - A full steam://rungame/... inspect URL
   *   - A CS2-style csgo://rungame/... URL
   *
   * Handles the XOR obfuscation used in native CS2 links.
   */
  static deserialize(input: string): ItemPreviewData {
    const hex = extractHex(input);
    if (hex.length > 4096) {
      throw new RangeError(
        `Payload too long (max 4096 hex chars): "${input.slice(0, 64)}..."`,
      );
    }
    const raw = hexToBytes(hex);

    if (raw.length < 6) {
      throw new TypeError(
        `Payload too short or invalid hex: "${input}"`,
      );
    }

    const key = raw[0]!;
    let decrypted: Uint8Array;

    if (key === 0) {
      decrypted = raw;
    } else {
      decrypted = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        decrypted[i] = raw[i]! ^ key;
      }
    }

    // Layout: [key_byte] [proto_bytes] [4-byte checksum]
    const protoBytes = decrypted.slice(1, decrypted.length - 4);
    return decodeItem(protoBytes);
  }
}
