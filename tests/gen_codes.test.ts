import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toGenCode, generate, parseGenCode, genCodeFromLink, INSPECT_BASE } from '../src/GenCode.ts';
import { InspectLink } from '../src/InspectLink.ts';
import { ItemPreviewData } from '../src/ItemPreviewData.ts';
import { Sticker } from '../src/Sticker.ts';

describe('toGenCode', () => {
  it('basic item', () => {
    const item = new ItemPreviewData({ defIndex: 7, paintIndex: 474, paintSeed: 306, paintWear: 0.22540508210659027 });
    assert.equal(toGenCode(item), '!gen 7 474 306 0.22540508');
  });

  it('custom prefix', () => {
    const item = new ItemPreviewData({ defIndex: 7, paintIndex: 474, paintSeed: 306, paintWear: 0.22540508210659027 });
    assert.equal(toGenCode(item, '!g'), '!g 7 474 306 0.22540508');
  });

  it('with sticker in slot 2 and keychain', () => {
    const item = new ItemPreviewData({
      defIndex: 7, paintIndex: 941, paintSeed: 2, paintWear: 0.22540508210659027,
      stickers: [new Sticker({ slot: 2, stickerId: 7203, wear: 0 })],
      keychains: [new Sticker({ slot: 0, stickerId: 36, wear: 0 })],
    });
    assert.equal(toGenCode(item, '!g'), '!g 7 941 2 0.22540508 0 0 0 0 7203 0 0 0 0 0 36 0');
  });

  it('zero wear formats as 0', () => {
    const item = new ItemPreviewData({ defIndex: 7, paintIndex: 474, paintSeed: 306, paintWear: 0.0 });
    assert.equal(toGenCode(item), '!gen 7 474 306 0');
  });

  it('keychain with paintKit appends paintKit after wear', () => {
    const item = new ItemPreviewData({
      defIndex: 1355, paintIndex: 0, paintSeed: 0, paintWear: 0.0,
      keychains: [new Sticker({ slot: 0, stickerId: 37, wear: 0, paintKit: 929 })],
    });
    const code = toGenCode(item, '');
    const tokens = code.split(' ');
    assert.equal(tokens[tokens.length - 3], '37');
    assert.equal(tokens[tokens.length - 2], '0');
    assert.equal(tokens[tokens.length - 1], '929');
  });

  it('keychain without paintKit does not append extra token', () => {
    const item = new ItemPreviewData({
      defIndex: 7, paintIndex: 0, paintSeed: 0, paintWear: 0.0,
      keychains: [new Sticker({ slot: 0, stickerId: 36, wear: 0 })],
    });
    const code = toGenCode(item, '');
    const tokens = code.split(' ');
    assert.equal(tokens[tokens.length - 2], '36');
    assert.equal(tokens[tokens.length - 1], '0');
  });
});

describe('genCodeFromLink (sticker slab)', () => {
  it('mousesports slab URL produces gen code ending with 37 0 929', () => {
    const slabUrl = 'steam://run/730//+csgo_econ_action_preview%20819181994A8BA181A982B189E981F181238086898191A4E1208698F309C9';
    const code = genCodeFromLink(slabUrl, '');
    const tokens = code.split(' ');
    assert.equal(tokens[tokens.length - 3], '37');
    assert.equal(tokens[tokens.length - 2], '0');
    assert.equal(tokens[tokens.length - 1], '929');
  });
});

describe('parseGenCode', () => {
  it('basic parse', () => {
    const item = parseGenCode('!gen 7 474 306 0.22540508');
    assert.equal(item.defIndex, 7);
    assert.equal(item.paintIndex, 474);
    assert.equal(item.paintSeed, 306);
    assert.ok(Math.abs(item.paintWear! - 0.22540508) < 1e-6);
  });

  it('parse without prefix', () => {
    const item = parseGenCode('7 474 306 0.22540508');
    assert.equal(item.defIndex, 7);
  });

  it('parse with sticker and keychain', () => {
    const item = parseGenCode('!g 7 941 2 0.22540508 0 0 0 0 7203 0 0 0 0 0 36 0');
    assert.equal(item.stickers.length, 1);
    assert.equal(item.stickers[0]!.stickerId, 7203);
    assert.equal(item.keychains.length, 1);
    assert.equal(item.keychains[0]!.stickerId, 36);
  });
});

describe('genCodeFromLink', () => {
  it('from hex payload', () => {
    const url = generate(7, 474, 306, 0.22540508);
    const hex = url.replace(INSPECT_BASE, '');
    const code = genCodeFromLink(hex);
    assert.match(code, /^!gen 7 474 306/);
  });

  it('from full URL', () => {
    const url = generate(7, 474, 306, 0.22540508);
    const code = genCodeFromLink(url);
    assert.match(code, /^!gen 7 474 306/);
  });
});

describe('generate', () => {
  it('returns steam inspect URL', () => {
    const url = generate(7, 474, 306, 0.22540508);
    assert.ok(url.startsWith('steam://rungame/730'));
  });

  it('roundtrip encode/decode', () => {
    const url = generate(7, 474, 306, 0.22540508);
    const hex = url.replace(INSPECT_BASE, '');
    const item = InspectLink.deserialize(hex);
    assert.equal(item.defIndex, 7);
    assert.equal(item.paintIndex, 474);
    assert.equal(item.paintSeed, 306);
    assert.ok(Math.abs(item.paintWear! - 0.22540508) < 1e-5);
  });
});
