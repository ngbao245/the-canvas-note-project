import { describe, expect, it } from 'vitest';
import { BOARD_COLOR_THEME, boardInkColor, resolveBoardColor } from './board-colors';

describe('resolveBoardColor', () => {
  it('nền theo giao diện: sáng → trắng, tối → đen', () => {
    expect(resolveBoardColor(BOARD_COLOR_THEME, 'light')).toBe('#ffffff');
    expect(resolveBoardColor(BOARD_COLOR_THEME, 'dark')).toBe('#17171b');
  });

  it('hex giữ nguyên', () => {
    expect(resolveBoardColor('#ff5757', 'dark')).toBe('#ff5757');
  });
});

describe('boardInkColor', () => {
  it('nền đậm → trắng, nền sáng → đen', () => {
    expect(boardInkColor('#4e4e4e')).toBe('#ffffff');
    expect(boardInkColor('#ffd14d')).toBe('#17171b');
  });

  it('nền theo giao diện vẫn tương phản sau khi đổi ra hex', () => {
    expect(boardInkColor(resolveBoardColor(BOARD_COLOR_THEME, 'light'))).toBe('#17171b');
    expect(boardInkColor(resolveBoardColor(BOARD_COLOR_THEME, 'dark'))).toBe('#ffffff');
  });
});
