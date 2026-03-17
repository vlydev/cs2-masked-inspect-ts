# @vlydev/cs2-masked-inspect-ts

TypeScript library for encoding and decoding CS2 masked inspect links — fully typed, no runtime dependencies.

## Installation

```bash
npm install @vlydev/cs2-masked-inspect-ts
```

## Usage

```typescript
import { InspectLink, ItemPreviewData, Sticker } from '@vlydev/cs2-masked-inspect-ts';

// Decode a masked inspect link payload or full URL
const item = InspectLink.deserialize('00183C20B803280538E9A3C5DD0340E102C246A0D1');
console.log(item.defIndex);   // 60
console.log(item.paintIndex); // 440
console.log(item.paintWear);  // 0.005411375779658556

// Also accepts full steam:// URLs
const item2 = InspectLink.deserialize(
  'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20A00183C20B803280538...'
);

// Encode an item back to a hex payload
const data = new ItemPreviewData({
  defIndex:   7,
  paintIndex: 422,
  paintSeed:  922,
  paintWear:  0.04121,
  rarity:     3,
  quality:    4,
  stickers: [
    new Sticker({ slot: 0, stickerId: 7436 }),
    new Sticker({ slot: 1, stickerId: 5144 }),
  ],
});
const hex = InspectLink.serialize(data);
console.log(hex); // uppercase hex string starting with '00'

// Check link type
InspectLink.isMasked('steam://...csgo_econ_action_preview%20A0011...');  // true — decodable offline
InspectLink.isClassic('steam://...csgo_econ_action_preview%20S123A456D789'); // true — classic S/A/D format
```

## Gen codes

Generate a Steam inspect URL from item parameters (defindex, paintindex, paintseed, paintwear):

```ts
import { generate, toGenCode, parseGenCode, ItemPreviewData } from '@vlydev/cs2-masked-inspect-ts';

// Generate a Steam inspect URL from item parameters
const url = generate(7, 474, 306, 0.22540508);
// steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20...

// Convert ItemPreviewData to a gen code string
const item = new ItemPreviewData({ defIndex: 7, paintIndex: 474, paintSeed: 306, paintWear: 0.22540508 });
toGenCode(item);        // "!gen 7 474 306 0.22540508"
toGenCode(item, '!g'); // "!g 7 474 306 0.22540508"

// Parse a gen code back to ItemPreviewData
parseGenCode('!gen 7 474 306 0.22540508');

// Convert an existing inspect link directly to a gen code
import { genCodeFromLink } from '@vlydev/cs2-masked-inspect-ts';
const code = genCodeFromLink('steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20001A...');
// "!gen 7 474 306 0.22540508"
```

## API

### `InspectLink`

#### `InspectLink.serialize(data: ItemPreviewData): string`

Encodes an `ItemPreviewData` to an uppercase hex payload (key_byte = 0x00, no XOR).

Throws:
- `RangeError` if `paintWear` is outside `[0.0, 1.0]`
- `RangeError` if `customName` exceeds 100 characters

#### `InspectLink.deserialize(input: string): ItemPreviewData`

Decodes a hex payload or full inspect URL into an `ItemPreviewData`.

Accepts:
- Raw hex strings (uppercase or lowercase)
- `steam://rungame/...` URLs
- `csgo://rungame/...` URLs
- Hybrid format: `S\d+A\d+D<hexproto>`

Handles the XOR obfuscation used in native CS2 links (key_byte != 0x00).

Throws:
- `RangeError` if payload exceeds 4096 hex chars
- `TypeError` if payload is too short (< 6 bytes) or invalid hex

#### `InspectLink.isMasked(link: string): boolean`

Returns `true` if the link contains a decodable protobuf payload (can be decoded offline without Steam API).

#### `InspectLink.isClassic(link: string): boolean`

Returns `true` if the link is a classic `S/A/D` inspect URL with decimal D value (requires Steam API to decode).

### `ItemPreviewData`

```typescript
new ItemPreviewData({
  accountId?: number | bigint;   // Steam account ID
  itemId?: number | bigint;      // Item asset ID (may exceed 2^32)
  defIndex?: number;             // Weapon/item definition index
  paintIndex?: number;           // Skin paint index
  rarity?: number;               // Item rarity
  quality?: number;              // Item quality
  paintWear?: number | null;     // Float value [0.0, 1.0], null if not applicable
  paintSeed?: number;            // Pattern seed [0, 1000]
  killEaterScoreType?: number;   // StatTrak type
  killEaterValue?: number;       // StatTrak value
  customName?: string;           // Custom name tag (max 100 chars)
  stickers?: Sticker[];          // Applied stickers (fields 1-4)
  inventory?: number;
  origin?: number;
  questId?: number;
  dropReason?: number;
  musicIndex?: number;
  entIndex?: number;
  petIndex?: number;
  keychains?: Sticker[];         // Applied keychains (field 5 slot)
})
```

### `Sticker`

Used for both stickers and keychains.

```typescript
new Sticker({
  slot?: number;               // Slot position on the item
  stickerId?: number;          // Sticker/keychain definition ID
  wear?: number | null;        // Sticker wear (float32, wire type 5)
  scale?: number | null;       // Sticker scale (float32, wire type 5)
  rotation?: number | null;    // Sticker rotation (float32, wire type 5)
  tintId?: number;             // Tint/color ID
  offsetX?: number | null;     // X offset (float32, wire type 5)
  offsetY?: number | null;     // Y offset (float32, wire type 5)
  offsetZ?: number | null;     // Z offset (float32, wire type 5)
  pattern?: number;            // Pattern index
  highlightReel?: number | null; // Highlight reel frame (keychains)
})
```

## Binary Format

```
[key_byte] [proto_bytes XOR'd with key] [4-byte checksum XOR'd with key]
```

- `key_byte = 0x00` — tool-generated links (no XOR)
- `key_byte != 0x00` — native CS2 links (every byte XOR'd with key_byte)

### Checksum Algorithm

```
buffer   = [0x00] + proto_bytes
crc      = crc32(buffer)           // polynomial 0xEDB88320
xored    = (crc & 0xffff) ^ (len(proto_bytes) * crc)  [unsigned 32-bit]
checksum = big-endian uint32
```

### PaintWear Encoding

`paintWear` is stored on the wire as a `uint32` varint whose bit pattern is the IEEE 754 float32 representation of the float value. This library handles the conversion transparently using `DataView`.

## Protobuf Schema Reference

`CEconItemPreviewDataBlock` fields:

| Field | Name | Type |
|-------|------|------|
| 1 | accountId | varint |
| 2 | itemId | varint (uint64) |
| 3 | defIndex | varint |
| 4 | paintIndex | varint |
| 5 | rarity | varint |
| 6 | quality | varint |
| 7 | paintWear | varint (float32 bits) |
| 8 | paintSeed | varint |
| 9 | killEaterScoreType | varint |
| 10 | killEaterValue | varint |
| 11 | customName | length-delimited (string) |
| 12 | stickers | length-delimited (repeated) |
| 13 | inventory | varint |
| 14 | origin | varint |
| 15 | questId | varint |
| 16 | dropReason | varint |
| 17 | musicIndex | varint |
| 18 | entIndex | varint |
| 19 | petIndex | varint |
| 20 | keychains | length-delimited (repeated) |

`Sticker` fields:

| Field | Name | Type |
|-------|------|------|
| 1 | slot | varint |
| 2 | stickerId | varint |
| 3 | wear | fixed32 LE (float32) |
| 4 | scale | fixed32 LE (float32) |
| 5 | rotation | fixed32 LE (float32) |
| 6 | tintId | varint |
| 7 | offsetX | fixed32 LE (float32) |
| 8 | offsetY | fixed32 LE (float32) |
| 9 | offsetZ | fixed32 LE (float32) |
| 10 | pattern | varint |
| 11 | highlightReel | varint (omit if null) |

## Test Vectors

```typescript
// Tool-generated (key 0x00): DefIndex=60, PaintIndex=440, PaintSeed=353, PaintWear≈0.00541, Rarity=5
'00183C20B803280538E9A3C5DD0340E102C246A0D1'

// Native CS2 (key 0xE3): ItemId=46876117973, DefIndex=7, PaintIndex=422, PaintSeed=922, PaintWear≈0.04121
// Stickers: [7436, 5144, 6970, 8069, 5592]
'E3F3367440334DE2FBE4C345E0CBE0D3...'
```

## Running Tests

```bash
npm test
```

Tests use Node.js built-in test runner (`node:test`) with `--experimental-strip-types` (Node 22+) to run TypeScript directly without compilation.

## Contributing

Pull requests welcome. Please ensure `npm test` passes before submitting.

## License

MIT — see [LICENSE](LICENSE)
