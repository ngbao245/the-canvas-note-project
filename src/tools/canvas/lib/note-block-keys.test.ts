import { describe, expect, it } from 'vitest';
import { findBlockIndex, newBlockKey } from './note-block-keys';

describe('findBlockIndex', () => {
  const keys = ['aaa', 'bbb', 'ccc'];

  it('có mã → tìm theo mã, bất kể vị trí đã đổi', () => {
    expect(findBlockIndex(keys, { key: 'ccc', index: 0 })).toBe(2);
  });

  it('có mã mà khối đã bị xoá → -1, không lấy khối ở cùng vị trí', () => {
    expect(findBlockIndex(keys, { key: 'zzz', index: 1 })).toBe(-1);
  });

  it('không có mã (note cũ) → theo vị trí', () => {
    expect(findBlockIndex([null, null, null], { key: null, index: 1 })).toBe(1);
  });

  it('không có mã, vị trí ngoài phạm vi → -1', () => {
    expect(findBlockIndex(keys, { key: null, index: 3 })).toBe(-1);
    expect(findBlockIndex(keys, { key: null, index: -1 })).toBe(-1);
  });
});

describe('newBlockKey', () => {
  it('8 ký tự chữ + số, 1000 lần không trùng', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const k = newBlockKey();
      expect(k).toMatch(/^[A-Za-z0-9]{8}$/);
      seen.add(k);
    }
    expect(seen.size).toBe(1000);
  });
});
