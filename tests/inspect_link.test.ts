import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { InspectLink } from '../src/InspectLink.ts';
import { ItemPreviewData } from '../src/ItemPreviewData.ts';
import { Sticker } from '../src/Sticker.ts';
import { MalformedInspectLinkError } from '../src/MalformedInspectLinkError.ts';

// ---------------------------------------------------------------------------
// Known test vectors
// ---------------------------------------------------------------------------

// A real CS2 item encoded with XOR key 0xE3
const NATIVE_HEX = (
  'E3F3367440334DE2FBE4C345E0CBE0D3E7DB6943400AE0A379E481ECEBE2F36F' +
  'D9DE2BDB515EA6E30D74D981ECEBE3F37BCBDE640D475DA6E35EFCD881ECEBE3' +
  'F359D5DE37E9D75DA6436DD3DD81ECEBE3F366DCDE3F8F9BDDA69B43B6DE81EC' +
  'EBE3F33BC8DEBB1CA3DFA623F7DDDF8B71E293EBFD43382B'
);

// A tool-generated link with key 0x00
const TOOL_HEX = '00183C20B803280538E9A3C5DD0340E102C246A0D1';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function roundtrip(data: ItemPreviewData): ItemPreviewData {
  return InspectLink.deserialize(InspectLink.serialize(data));
}

// ---------------------------------------------------------------------------
// Deserialize tests — native XOR key 0xE3
// ---------------------------------------------------------------------------

describe('deserialize — native XOR link (key 0xE3)', () => {
  test('itemid', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.itemId, 46876117973);
  });

  test('defindex (AK-47)', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.defIndex, 7);
  });

  test('paintindex', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.paintIndex, 422);
  });

  test('paintseed', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.paintSeed, 922);
  });

  test('paintwear approximately 0.04121', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.ok(Math.abs((item.paintWear ?? 0) - 0.04121) < 0.0001, `Expected ~0.04121, got ${item.paintWear}`);
  });

  test('rarity', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.rarity, 3);
  });

  test('quality', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.quality, 4);
  });

  test('sticker count = 5', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    assert.equal(item.stickers.length, 5);
  });

  test('sticker IDs [7436, 5144, 6970, 8069, 5592]', () => {
    const item = InspectLink.deserialize(NATIVE_HEX);
    const ids = item.stickers.map(s => s.stickerId);
    assert.deepEqual(ids, [7436, 5144, 6970, 8069, 5592]);
  });
});

// ---------------------------------------------------------------------------
// Deserialize tests — tool hex (key 0x00)
// ---------------------------------------------------------------------------

describe('deserialize — tool-generated link (key 0x00)', () => {
  test('defindex', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.defIndex, 60);
  });

  test('paintindex', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.paintIndex, 440);
  });

  test('paintseed', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.paintSeed, 353);
  });

  test('paintwear', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.ok(
      Math.abs((item.paintWear ?? 0) - 0.005411375779658556) < 1e-7,
      `Expected ~0.005411375779658556, got ${item.paintWear}`,
    );
  });

  test('rarity', () => {
    const item = InspectLink.deserialize(TOOL_HEX);
    assert.equal(item.rarity, 5);
  });

  test('lowercase hex accepted', () => {
    const item = InspectLink.deserialize(TOOL_HEX.toLowerCase());
    assert.equal(item.defIndex, 60);
  });

  test('full steam:// URL accepted', () => {
    const url = `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20A${TOOL_HEX}`;
    const item = InspectLink.deserialize(url);
    assert.equal(item.defIndex, 60);
  });

  test('csgo:// style URL with literal space accepted', () => {
    const url = `csgo://rungame/730/76561202255233023/+csgo_econ_action_preview A${TOOL_HEX}`;
    const item = InspectLink.deserialize(url);
    assert.equal(item.defIndex, 60);
  });

  test('payload too short throws MalformedInspectLinkError', () => {
    assert.throws(() => InspectLink.deserialize('0000'), MalformedInspectLinkError);
  });
});

// ---------------------------------------------------------------------------
// Serialize tests
// ---------------------------------------------------------------------------

describe('serialize', () => {
  test('known hex output matches TOOL_HEX', () => {
    const data = new ItemPreviewData({
      defIndex:  60,
      paintIndex: 440,
      paintSeed:  353,
      paintWear:  0.005411375779658556,
      rarity:     5,
    });
    assert.equal(InspectLink.serialize(data), TOOL_HEX);
  });

  test('returns uppercase hex', () => {
    const data = new ItemPreviewData({ defIndex: 1 });
    const result = InspectLink.serialize(data);
    assert.equal(result, result.toUpperCase());
  });

  test('starts with "00" (key_byte = 0x00)', () => {
    const data = new ItemPreviewData({ defIndex: 1 });
    assert.ok(InspectLink.serialize(data).startsWith('00'));
  });

  test('minimum length >= 12 hex chars (6 bytes)', () => {
    const data = new ItemPreviewData({ defIndex: 1 });
    assert.ok(InspectLink.serialize(data).length >= 12);
  });
});

// ---------------------------------------------------------------------------
// Round-trip tests
// ---------------------------------------------------------------------------

describe('round-trip', () => {
  test('defindex', () => {
    assert.equal(roundtrip(new ItemPreviewData({ defIndex: 7 })).defIndex, 7);
  });

  test('paintindex', () => {
    assert.equal(roundtrip(new ItemPreviewData({ paintIndex: 422 })).paintIndex, 422);
  });

  test('paintseed', () => {
    assert.equal(roundtrip(new ItemPreviewData({ paintSeed: 999 })).paintSeed, 999);
  });

  test('paintwear float32 precision', () => {
    const original = 0.123456789;
    // Compute expected float32 round-trip value
    const dv = new DataView(new ArrayBuffer(4));
    dv.setFloat32(0, original, true);
    const expected = dv.getFloat32(0, true);
    const result = roundtrip(new ItemPreviewData({ paintWear: original }));
    assert.ok(Math.abs((result.paintWear ?? 0) - expected) < 1e-7);
  });

  test('large itemid (46876117973)', () => {
    const result = roundtrip(new ItemPreviewData({ itemId: 46876117973 }));
    assert.equal(result.itemId, 46876117973);
  });

  test('stickers — count and ids', () => {
    const data = new ItemPreviewData({
      defIndex: 7,
      stickers: [
        new Sticker({ slot: 0, stickerId: 7436 }),
        new Sticker({ slot: 1, stickerId: 5144 }),
      ],
    });
    const result = roundtrip(data);
    assert.equal(result.stickers.length, 2);
    assert.equal(result.stickers[0]!.stickerId, 7436);
    assert.equal(result.stickers[1]!.stickerId, 5144);
  });

  test('sticker slot', () => {
    const data = new ItemPreviewData({
      stickers: [new Sticker({ slot: 3, stickerId: 123 })],
    });
    assert.equal(roundtrip(data).stickers[0]!.slot, 3);
  });

  test('sticker wear (fixed32 float)', () => {
    const data = new ItemPreviewData({
      stickers: [new Sticker({ stickerId: 1, wear: 0.5 })],
    });
    const result = roundtrip(data);
    assert.ok(result.stickers[0]!.wear !== null);
    assert.ok(Math.abs(result.stickers[0]!.wear! - 0.5) < 1e-6);
  });

  test('keychains — stickerId and pattern', () => {
    const data = new ItemPreviewData({
      keychains: [new Sticker({ slot: 0, stickerId: 999, pattern: 42 })],
    });
    const result = roundtrip(data);
    assert.equal(result.keychains.length, 1);
    assert.equal(result.keychains[0]!.stickerId, 999);
    assert.equal(result.keychains[0]!.pattern, 42);
  });

  test('customName string', () => {
    const data = new ItemPreviewData({ defIndex: 7, customName: 'My Knife' });
    assert.equal(roundtrip(data).customName, 'My Knife');
  });

  test('rarity and quality', () => {
    const data = new ItemPreviewData({ rarity: 6, quality: 9 });
    const result = roundtrip(data);
    assert.equal(result.rarity, 6);
    assert.equal(result.quality, 9);
  });

  test('full item with 5 stickers', () => {
    const data = new ItemPreviewData({
      itemId:     46876117973,
      defIndex:   7,
      paintIndex: 422,
      rarity:     3,
      quality:    4,
      paintWear:  0.04121,
      paintSeed:  922,
      stickers: [
        new Sticker({ slot: 0, stickerId: 7436 }),
        new Sticker({ slot: 1, stickerId: 5144 }),
        new Sticker({ slot: 2, stickerId: 6970 }),
        new Sticker({ slot: 3, stickerId: 8069 }),
        new Sticker({ slot: 4, stickerId: 5592 }),
      ],
    });
    const result = roundtrip(data);
    assert.equal(result.defIndex, 7);
    assert.equal(result.paintIndex, 422);
    assert.equal(result.paintSeed, 922);
    assert.equal(result.stickers.length, 5);
    assert.deepEqual(result.stickers.map(s => s.stickerId), [7436, 5144, 6970, 8069, 5592]);
  });

  test('empty stickers array', () => {
    const data = new ItemPreviewData({ defIndex: 7, stickers: [] });
    const result = roundtrip(data);
    assert.equal(result.stickers.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Validation and hybrid URL tests
// ---------------------------------------------------------------------------

const HYBRID_URL = (
  'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20' +
  'S76561199323320483A50075495125D1101C4C4FCD4AB10092D31B8143914211829A1FAE3FD125119591141117308191301' +
  'EA550C1111912E3C111151D12C413E6BAC54D1D29BAD731E191501B92C2C9B6BF92F5411C25B2A731E191501B92C2C' +
  'EA2B182E5411F7212A731E191501B92C2C4F89C12F549164592A799713611956F4339F'
);

const CLASSIC_URL = (
  'steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20' +
  'S76561199842063946A49749521570D2751293026650298712'
);

describe('isMasked', () => {
  test('returns true for pure hex payload URL', () => {
    const url = `steam://run/730//+csgo_econ_action_preview%20${TOOL_HEX}`;
    assert.equal(InspectLink.isMasked(url), true);
  });

  test('returns true for full native masked URL', () => {
    const url = `steam://rungame/730/76561202255233023/+csgo_econ_action_preview%20${NATIVE_HEX}`;
    assert.equal(InspectLink.isMasked(url), true);
  });

  test('returns true for hybrid URL', () => {
    assert.equal(InspectLink.isMasked(HYBRID_URL), true);
  });

  test('returns false for classic URL', () => {
    assert.equal(InspectLink.isMasked(CLASSIC_URL), false);
  });
});

describe('isClassic', () => {
  test('returns true for classic URL', () => {
    assert.equal(InspectLink.isClassic(CLASSIC_URL), true);
  });

  test('returns false for masked URL', () => {
    const url = `steam://run/730//+csgo_econ_action_preview%20${TOOL_HEX}`;
    assert.equal(InspectLink.isClassic(url), false);
  });

  test('returns false for hybrid URL', () => {
    assert.equal(InspectLink.isClassic(HYBRID_URL), false);
  });
});

describe('deserialize — hybrid URL', () => {
  test('itemId equals assetId from URL (50075495125)', () => {
    const item = InspectLink.deserialize(HYBRID_URL);
    assert.equal(item.itemId, 50075495125);
  });
});

// ---------------------------------------------------------------------------
// Checksum test
// ---------------------------------------------------------------------------

describe('checksum', () => {
  test('known hex checksum matches', () => {
    const data = new ItemPreviewData({
      defIndex:  60,
      paintIndex: 440,
      paintSeed:  353,
      paintWear:  0.005411375779658556,
      rarity:     5,
    });
    assert.equal(InspectLink.serialize(data), TOOL_HEX);
  });
});

// ---------------------------------------------------------------------------
// Defensive validation tests
// ---------------------------------------------------------------------------

describe('deserialize — payload too long', () => {
  test('throws MalformedInspectLinkError for hex payload exceeding 4096 chars (4098 chars)', () => {
    const longHex = '00'.repeat(2049); // 4098 hex chars
    assert.throws(() => InspectLink.deserialize(longHex), MalformedInspectLinkError);
  });
});

describe('serialize — paintwear validation', () => {
  test('throws RangeError when paintwear > 1.0', () => {
    const data = new ItemPreviewData({ paintWear: 1.1 });
    assert.throws(() => InspectLink.serialize(data), RangeError);
  });

  test('throws RangeError when paintwear < 0.0', () => {
    const data = new ItemPreviewData({ paintWear: -0.1 });
    assert.throws(() => InspectLink.serialize(data), RangeError);
  });

  test('does not throw when paintwear = 0.0 (boundary)', () => {
    const data = new ItemPreviewData({ paintWear: 0.0 });
    assert.doesNotThrow(() => InspectLink.serialize(data));
  });

  test('does not throw when paintwear = 1.0 (boundary)', () => {
    const data = new ItemPreviewData({ paintWear: 1.0 });
    assert.doesNotThrow(() => InspectLink.serialize(data));
  });
});

describe('serialize — customname validation', () => {
  test('throws RangeError when customName is 101 characters', () => {
    const data = new ItemPreviewData({ customName: 'a'.repeat(101) });
    assert.throws(() => InspectLink.serialize(data), RangeError);
  });

  test('does not throw when customName is exactly 100 characters', () => {
    const data = new ItemPreviewData({ customName: 'a'.repeat(100) });
    assert.doesNotThrow(() => InspectLink.serialize(data));
  });
});

// ---------------------------------------------------------------------------
// CSFloat/gen.test.ts vectors
// ---------------------------------------------------------------------------

const CSFLOAT_A = '00180720DA03280638FBEE88F90340B2026BC03C96';
const CSFLOAT_B = '00180720C80A280638A4E1F5FB03409A0562040800104C62040801104C62040802104C62040803104C6D4F5E30';
const CSFLOAT_C = 'A2B2A2BA69A882A28AA192AECAA2D2B700A3A5AAA2B286FA7BA0D684BE72';

describe('CSFloat test vectors', () => {
  test('VectorA: defindex', () => assert.equal(InspectLink.deserialize(CSFLOAT_A).defIndex, 7));
  test('VectorA: paintindex', () => assert.equal(InspectLink.deserialize(CSFLOAT_A).paintIndex, 474));
  test('VectorA: paintseed', () => assert.equal(InspectLink.deserialize(CSFLOAT_A).paintSeed, 306));
  test('VectorA: rarity', () => assert.equal(InspectLink.deserialize(CSFLOAT_A).rarity, 6));
  test('VectorA: paintwear not null', () => assert.notEqual(InspectLink.deserialize(CSFLOAT_A).paintWear, null));
  test('VectorA: paintwear approx', () => assert.ok(Math.abs((InspectLink.deserialize(CSFLOAT_A).paintWear ?? 0) - 0.6337) < 0.001));

  test('VectorB: 4 stickers', () => assert.equal(InspectLink.deserialize(CSFLOAT_B).stickers.length, 4));
  test('VectorB: sticker ids all 76', () => {
    InspectLink.deserialize(CSFLOAT_B).stickers.forEach(s => assert.equal(s.stickerId, 76));
  });
  test('VectorB: paintindex', () => assert.equal(InspectLink.deserialize(CSFLOAT_B).paintIndex, 1352));
  test('VectorB: paintwear approx 0.99', () => assert.ok(Math.abs((InspectLink.deserialize(CSFLOAT_B).paintWear ?? 0) - 0.99) < 0.01));

  test('VectorC: defindex', () => assert.equal(InspectLink.deserialize(CSFLOAT_C).defIndex, 1355));
  test('VectorC: quality', () => assert.equal(InspectLink.deserialize(CSFLOAT_C).quality, 12));
  test('VectorC: keychain count', () => assert.equal(InspectLink.deserialize(CSFLOAT_C).keychains.length, 1));
  test('VectorC: keychain highlightReel', () => assert.equal(InspectLink.deserialize(CSFLOAT_C).keychains[0]!.highlightReel, 345));
  test('VectorC: no paintwear', () => assert.equal(InspectLink.deserialize(CSFLOAT_C).paintWear, null));
});

// ---------------------------------------------------------------------------
// Sticker Slab — paintKit (proto field 12 inside Sticker sub-message)
// keychains[0].stickerId is always 37 (placeholder); paintKit holds the
// actual slab variant ID.
// ---------------------------------------------------------------------------

describe('Sticker Slab — paintKit', () => {
  describe('rarity=5, paintKit=7256', () => {
    const url = 'steam://run/730//+csgo_econ_action_preview%20918191895A9BB191B994A199F991E191339096999181B4F149A98D5C0889';
    test('defIndex = 1355',             () => assert.equal(InspectLink.deserialize(url).defIndex,                 1355));
    test('paintIndex = 0',              () => assert.equal(InspectLink.deserialize(url).paintIndex,                  0));
    test('rarity = 5',                  () => assert.equal(InspectLink.deserialize(url).rarity,                      5));
    test('quality = 8',                 () => assert.equal(InspectLink.deserialize(url).quality,                     8));
    test('keychains.length = 1',        () => assert.equal(InspectLink.deserialize(url).keychains.length,             1));
    test('keychains[0].stickerId = 37', () => assert.equal(InspectLink.deserialize(url).keychains[0]!.stickerId,     37));
    test('keychains[0].paintKit = 7256',() => assert.equal(InspectLink.deserialize(url).keychains[0]!.paintKit,    7256));
  });

  describe('rarity=3, paintKit=275', () => {
    const url = 'steam://run/730//+csgo_econ_action_preview%20CBDBCBD300C1EBCBE3C8FBC3A3CBBBCB69CACCC3CBDBEEAB58C9B8B67C83';
    test('defIndex = 1355',             () => assert.equal(InspectLink.deserialize(url).defIndex,                 1355));
    test('rarity = 3',                  () => assert.equal(InspectLink.deserialize(url).rarity,                      3));
    test('quality = 8',                 () => assert.equal(InspectLink.deserialize(url).quality,                     8));
    test('keychains.length = 1',        () => assert.equal(InspectLink.deserialize(url).keychains.length,             1));
    test('keychains[0].stickerId = 37', () => assert.equal(InspectLink.deserialize(url).keychains[0]!.stickerId,     37));
    test('keychains[0].paintKit = 275', () => assert.equal(InspectLink.deserialize(url).keychains[0]!.paintKit,     275));
  });
});

describe('Roundtrip: highlight_reel and nullable paintWear', () => {
  test('highlightReel roundtrip', () => {
    const data = new ItemPreviewData({ defIndex: 7, keychains: [new Sticker({ slot: 0, stickerId: 36, highlightReel: 345 })] });
    const result = InspectLink.deserialize(InspectLink.serialize(data));
    assert.equal(result.keychains[0]!.highlightReel, 345);
  });
  test('null paintWear roundtrip', () => {
    const data = new ItemPreviewData({ defIndex: 7, paintWear: null });
    const result = InspectLink.deserialize(InspectLink.serialize(data));
    assert.equal(result.paintWear, null);
  });
});

// ---------------------------------------------------------------------------
// Malformed URLs (regression: must reject cleanly without silent truncation)
// ---------------------------------------------------------------------------

const MALFORMED_URLS: ReadonlyArray<readonly [string, string]> = [
  ['truncated mid-keychain (defindex=1, key=0xAD)',  'steam://run/730//+csgo_econ_action_preview%20ADBD1050393912ACB5AC8D45AC85A99DA9956A116D5FAEED21ACCFB4A5AFBD348EB0ADAD2D9280ADADDD6F90EDA37510E84D8BEE11CFB4A5ACBD348EB0ADAD2D9280ADAD5D6F906F2B4C13E84D93D591CFB9A5ADBD419EB0ADAD2D9290ADF22010E8B72FB213CFB4A5ADBD549EB0ADAD2D9280ADADED6C90CFD43F10E892DFE513CFB4A5ADBD549EB0ADAD2D9280ADAD85EE902F952210E82EB8A613C52E2D2D2DA1DDA90FACBBA5ADBD89902923AAECE83'],
  ['truncated mid-keychain (defindex=9, key=0xEE)',  'steam://run/730//+csgo_econ_action_preview%20EEFE3144332550EFF6E7CE28E8C6EADEEAD642323218EDAE4DEA8CFAE6ECFE35A7F302BFD6D1D3004FCB50ABAE5CF8528CF7E6EEFE0DA7F3394DDED1C3EEEE7EAFD39E25B3D3AB9EAE70D28CFAE6ECFE32A7F3EEEE6ED1D3595B17D3AB9E8E65538CFAE6ECFE64ADF3EEEE6ED1D3E597F3D3AB2EEA1AD58CF7E6EDFE0BCAF302BFD6D1C3EEEEEF2DD3AEF5F552ABEE31A855866D6E6E6EE29EE64CEFF8E6EEFED8D3B6CBCBACABFD70EED1A31F96E7AFBE5'],
  ['truncated mid-keychain (defindex=1, key=0x4A)',  'steam://run/730//+csgo_econ_action_preview%204A5A8EFCB1B9F44B524B6AA24B624E7A4E72BACFF6B8490AD449285E42485AAB75576316457577CA2422760F4A413E712853424A5AA679574A4ACA75674A4A8A8A770A7F85760FD04246F4285342495AB279574A4ACA75674A4A8A0A7799714A750F0A5140F7285342495AAD7277EB4547F40F0A00EB7122C9CACACA463A4EE84B5D424A5A4C776C02A10A0F34A5C17407F0145C0A1AA'],
  ['truncated mid-keychain (AK-47 1035, key=0xFA)',  'steam://run/730//+csgo_econ_action_preview%20FAEA5766387F45FBE2FDDA71F2D2FECAF3C2142C0C0EF9BA7CFFB2FAAAFA98EEF2F8EA3BFBD7FAFA3ABBC7EA2FB7C7BF9ACC47C698E3F2F9EA03C9E7FAFA7AC5D7FAFABA3AC780CA89C4BFFAAAD9C198E3F2F9EA03C9E7FAFA7AC5D7FAFACEB9C7B60177C4BFAAB82AC698EEF2F9EA03C9E7FAFA7AC5C7C11558C4BFFA43DBC198F5F2FBEA13DEC7759A1147BF9A16F64692797A7A7AF68AF258FBEFF2FAEADEC7DEAC32BBBF0BF9BAC4B760382CC5A2D24'],
  ['truncated mid-keychain (defindex=40, key=0x9F)', 'steam://run/730//+csgo_econ_action_preview%209F8F4F504C7C219E87B7BF629EB79CAF9BA73F1D53419CDF0699FD8B979F8F5CCF82050686A0A2F4038821DA17F3FD22FD8B979F8F49D4825C6AB7A0A25F50B224DA7F0CF222FD8B979D8F5DCF82F9F9B9A0A2B7B25422DA6F6F1422FD8B979D8F5DCF822781DAA0A247B731A2DA7F92EF23FD86979F8F5DCF827EE5CBA0B29F9FDFDFA285AD4322DA9FFD8AA3F71C1F1F1F93EF873D9E88979F8FDDA243C05EDFDA4CFB44A0D202B77EDFCF3F339C3DF89'],
  ['truncated mid-keychain (M4A1-S 1130, key=0xFA)', 'steam://run/730//+csgo_econ_action_preview%20FAEA5B24060844FBE2C6DA10F2D2FECAF3C2631A3308F9BA47F8B2FAAAFA98EEF2FEEA29B2E781EED4C5C7776B78C4BFFAFA21CD98EEF2FAEA09BCE7F02DD9C5C7FE6C57C7BF7A58ED4698EEF2FEEA6DBDE79C9CDCC5C7929F2F47BFFA461BC398E3F2FBEA15BDE7E57FD1C5D7FAFA8AB8C7C2CEDC46BF12973EC798EEF2FEEA24B8E781EED4C5C75696FCC5BF2AEBF2C792797A7A7AF68AF258FBEDF2FAEAD2C7B3683FBBBF065F8CC5B763A382BAAA0C5'],
  ['truncated mid-keychain (defindex=35, key=0x4D)', 'steam://run/730//+csgo_econ_action_preview%204D5D9DF8C7D2F34C556E6DDC4C654E7D4975B2D2AEBB4E0DAB4B2F59454E5D9A70604D4DBD8C7002A356F308CD4603F62F5445495DEB745011C20F72604D4D798F70797F9FF3089D49ABF12F5945495DEB74502B2BAB737045B3FAF308FD4BE8F12F5945495DF868508081417270BFB9D2F308ADD283F12F5945495DF86850AC375972702FA3CBF3083D2EBFF125CECDCDCD413D5AEF4C5A454D5D567084E4F80C08254C547200CE3E1D0D1DF9D24C63938'],
  ['truncated mid-keychain (AK-47 1171, key=0xCF)',  'steam://run/730//+csgo_econ_action_preview%20CFDF6258412F71CED7C8EF5CC6E7C9FFCBF7465B3B38CC8F7ACEADD6C7CEDF3BF2D2F2C5D8F0E2CFCFE40CF27F72E1728AF786F5F2ADC0C7CCDF3BF2F241D88EF18A0F03F6F2ADDBC7CCDF3CF2E2CFCF0F8DF27B3FB7F18A6F5ACDF2ADD6C7CCDF3CF2D2C518ECF0E2CFCF8F0EF2D5C29AF18ACFCFD8F5ADDBC7CFDF3CF2E2CFCF6D8DF24DB0DA718A2FA6DBF3A74C4F4F4FC3BFC76DCED8C7CFDF87F27B950C8E8A37D0A3F182A2B8A48F9F4332CD2C2B6'],
  ['truncated mid-keychain (defindex=1 1050, key=0xCE)', 'steam://run/730//+csgo_econ_action_preview%20CEDE51082D1C70CFD6CFEE54C6E6CAFEC7F631274538CD8E2DC886CE9ECEACDAC6CDDE0C8DD3CECE4EF1F382996B738B4E5E8D75ACD7C6CEDE0C8DD3CECE4EF1E3CECE8E0FF3A56603708BECDBE170ACD7C6CEDE0C8DD3CECE4EF1E3CECEDE0FF37682A5708B0650FB70ACD7C6CEDE0C8DD3CECE4EF1E3CECEDE0FF34E3CEC738BDAC6F870ACD7C6CDDE798AD3CECE4EF1E3CECE0E0EF3333BC5F18BAE8E9FF2A64D4E4E4EC2BECA6CCFD9C6CEDECFF37C6'],
  ['odd-length bare hex',  'ABC'],
  ['empty string',         ''],
  ['non-hex characters',   'ZZZZZZZZZZZZ'],
];

describe('deserialize — malformed URLs (regression)', () => {
  for (const [label, url] of MALFORMED_URLS) {
    test(label, () => {
      assert.throws(() => InspectLink.deserialize(url), MalformedInspectLinkError);
    });
  }

  test('error message mentions "Malformed" and length hint for odd hex', () => {
    let caught: unknown = null;
    try { InspectLink.deserialize('ABC'); } catch (e) { caught = e; }
    assert.ok(caught instanceof MalformedInspectLinkError);
    assert.match((caught as Error).message, /Malformed/);
    assert.match((caught as Error).message, /length|even|hex/i);
  });

  test('MalformedInspectLinkError extends Error', () => {
    const err = new MalformedInspectLinkError('x');
    assert.ok(err instanceof Error);
    assert.equal(err.name, 'MalformedInspectLinkError');
  });
});
