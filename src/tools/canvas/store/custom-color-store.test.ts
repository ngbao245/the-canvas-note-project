import { beforeEach, describe, expect, it } from 'vitest';
import { useCustomColorStore } from './custom-color-store';

describe('useCustomColorStore', () => {
  beforeEach(() => useCustomColorStore.setState({ colors: [] }));

  it('màu mới nhất đứng đầu, chọn lại màu cũ (khác hoa thường) không nhân đôi', () => {
    const { push } = useCustomColorStore.getState();
    push('#112233');
    push('#445566');
    push('#112233'.toUpperCase());
    expect(useCustomColorStore.getState().colors).toEqual(['#112233'.toUpperCase(), '#445566']);
  });

  it('giữ tối đa 1 hàng 5 ô', () => {
    const { push } = useCustomColorStore.getState();
    for (let i = 0; i < 7; i++) push(`#00000${i}`);
    const colors = useCustomColorStore.getState().colors;
    expect(colors).toHaveLength(5);
    expect(colors[0]).toBe('#000006');
  });
});
