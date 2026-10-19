import { describe, expect, it } from 'vitest';
import { recommendIcons } from './icon-recommend';

const names = (list: { n: string }[]) => list.map((e) => e.n);

describe('recommendIcons', () => {
  it('icon gần đây đứng đầu, bỏ tên không còn trong catalog', () => {
    const r = recommendIcons('', ['rocket', 'khong-co-icon-nay', 'star']);
    expect(names(r.recent)).toEqual(['rocket', 'star']);
  });

  it('khớp từ trong tên board, icon có từ đó trong tên đứng trước', () => {
    const r = recommendIcons('Music practice', []);
    expect(r.byName.length).toBeGreaterThan(0);
    expect(r.byName[0].n.split('-')).toContain('music');
  });

  it('bỏ từ không mang nghĩa (tên mặc định New Board) → không có nhóm theo tên', () => {
    expect(recommendIcons('New Board', []).byName).toEqual([]);
  });

  it('3 nhóm không trùng nhau', () => {
    const r = recommendIcons('Star music', ['star']);
    const all = [...names(r.recent), ...names(r.byName), ...names(r.popular)];
    expect(new Set(all).size).toBe(all.length);
    expect(names(r.popular)).not.toContain('star');
  });
});
