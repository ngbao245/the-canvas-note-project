import { describe, expect, it } from 'vitest';
import { applyFields, diffObjectFields, pickFields, stableStringify } from './object-fields';

const note = {
  id: 'n',
  type: 'note',
  boardId: 'b',
  unsortIndex: null,
  geometry: { x: 0, y: 0, width: 200, height: 100, rotation: 0, zIndex: 1 },
  data: { body: '<p>a</p>', color: null, heightMode: 'auto' },
  version: 3,
  createdAt: 't0',
  updatedAt: 't1',
};

describe('diffObjectFields', () => {
  it('kéo → chỉ geometry', () => {
    expect(diffObjectFields(note, { ...note, geometry: { ...note.geometry, x: 50 } })).toEqual(['geometry']);
  });

  it('gõ chữ → chỉ data.body, bỏ qua version / updatedAt', () => {
    const next = { ...note, data: { ...note.data, body: '<p>ab</p>' }, version: 4, updatedAt: 't2' };
    expect(diffObjectFields(note, next)).toEqual(['data.body']);
  });

  it('đổi màu + đổi cỡ → 2 trường', () => {
    const next = { ...note, data: { ...note.data, color: '#f00' }, geometry: { ...note.geometry, height: 300 } };
    expect(diffObjectFields(note, next)).toEqual(['data.color', 'geometry']);
  });

  it('không đổi gì (khác thứ tự khoá) → rỗng', () => {
    const next = { ...note, data: { heightMode: 'auto', color: null, body: '<p>a</p>' } };
    expect(diffObjectFields(note, next)).toEqual([]);
  });

  it('khoá data mới / bị xoá đều tính', () => {
    expect(diffObjectFields(note, { ...note, data: { ...note.data, extra: 1 } })).toEqual(['data.extra']);
    const { color: _c, ...rest } = note.data;
    void _c;
    expect(diffObjectFields(note, { ...note, data: rest })).toEqual(['data.color']);
  });

  it('data không phải object → cả data là 1 trường', () => {
    expect(diffObjectFields({ ...note, data: 'x' }, { ...note, data: 'y' })).toEqual(['data']);
  });
});

describe('pickFields + applyFields', () => {
  it('lấy đúng giá trị, áp lại ra cùng object', () => {
    const next = { ...note, data: { ...note.data, color: '#f00' }, geometry: { ...note.geometry, x: 9 } };
    const patch = pickFields(next, ['data.color', 'geometry']);
    expect(patch).toEqual({ set: { 'data.color': '#f00', geometry: next.geometry }, unset: [] });
    expect(stableStringify(applyFields(note, patch))).toBe(stableStringify(next));
  });

  it('2 patch khác trường áp lần lượt → giữ cả 2 thay đổi (không đè nhau)', () => {
    const a = applyFields(note, { set: { 'data.color': '#f00' }, unset: [] });
    const b = applyFields(a, { set: { 'data.body': '<p>B</p>' }, unset: [] });
    expect(b.data).toEqual({ body: '<p>B</p>', color: '#f00', heightMode: 'auto' });
  });

  it('đổi màu về mặc định (null) là giá trị, không phải xoá khoá', () => {
    const red = { ...note, data: { ...note.data, color: '#f00' } };
    const patch = pickFields(note, ['data.color']);
    expect(patch).toEqual({ set: { 'data.color': null }, unset: [] });
    expect(applyFields(red, patch).data).toEqual(note.data);
  });

  it('khoá data bị xoá → unset → server xoá khoá', () => {
    const { color: _c, ...rest } = note.data;
    void _c;
    const patch = pickFields({ ...note, data: rest }, ['data.color']);
    expect(patch).toEqual({ set: {}, unset: ['data.color'] });
    expect(applyFields(note, patch).data).toEqual(rest);
  });
});
