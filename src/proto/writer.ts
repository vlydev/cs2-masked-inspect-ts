/**
 * Pure TypeScript protobuf binary writer.
 *
 * Writes to an in-memory buffer; call toBytes() to retrieve the result.
 * Fields with default/zero values are omitted (proto3 semantics).
 */

const WIRE_VARINT = 0;
const WIRE_LEN    = 2;
const WIRE_32BIT  = 5;

export class ProtoWriter {
  private _buf: Uint8Array[];

  constructor() {
    this._buf = [];
  }

  toBytes(): Uint8Array {
    const totalLength = this._buf.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of this._buf) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  // ------------------------------------------------------------------
  // Low-level primitives
  // ------------------------------------------------------------------

  private _writeVarint(value: bigint | number): void {
    let v = BigInt(value);
    // Handle negative: treat as unsigned 64-bit two's complement
    if (v < 0n) {
      v = BigInt.asUintN(64, v);
    }

    const parts: number[] = [];
    do {
      let b = Number(v & 0x7Fn);
      v >>= 7n;
      if (v !== 0n) b |= 0x80;
      parts.push(b);
    } while (v !== 0n);

    this._buf.push(new Uint8Array(parts));
  }

  private _writeTag(fieldNum: number, wireType: number): void {
    this._writeVarint((fieldNum << 3) | wireType);
  }

  // ------------------------------------------------------------------
  // Public field writers
  // ------------------------------------------------------------------

  writeUint32(fieldNum: number, value: number | bigint): void {
    if (value === 0 || value === 0n) return;
    this._writeTag(fieldNum, WIRE_VARINT);
    this._writeVarint(value);
  }

  writeUint64(fieldNum: number, value: number | bigint): void {
    if (value === 0 || value === 0n) return;
    this._writeTag(fieldNum, WIRE_VARINT);
    this._writeVarint(value);
  }

  writeInt32(fieldNum: number, value: number | bigint): void {
    if (value === 0 || value === 0n) return;
    this._writeTag(fieldNum, WIRE_VARINT);
    this._writeVarint(value);
  }

  writeString(fieldNum: number, value: string): void {
    if (!value) return;
    const encoded = new TextEncoder().encode(value);
    this._writeTag(fieldNum, WIRE_LEN);
    this._writeVarint(encoded.length);
    this._buf.push(encoded);
  }

  /**
   * Write a float32 as wire type 5 (fixed 32-bit, little-endian).
   * Used for sticker float fields (wear, scale, rotation, etc.).
   */
  writeFloat32Fixed(fieldNum: number, value: number): void {
    this._writeTag(fieldNum, WIRE_32BIT);
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, value, true); // little-endian
    this._buf.push(new Uint8Array(dv.buffer));
  }

  /**
   * Write raw bytes as a length-delimited field (wire type 2).
   */
  writeRawBytes(fieldNum: number, data: Uint8Array): void {
    if (!data || data.length === 0) return;
    this._writeTag(fieldNum, WIRE_LEN);
    this._writeVarint(data.length);
    this._buf.push(data);
  }

  /**
   * Write a nested message (another ProtoWriter's output) as a length-delimited field.
   */
  writeEmbedded(fieldNum: number, nested: ProtoWriter): void {
    this.writeRawBytes(fieldNum, nested.toBytes());
  }
}
