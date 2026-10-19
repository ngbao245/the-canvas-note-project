import { describe, expect, it } from 'vitest';
import { createWheelClassifier, looksLikeTouchpad } from './wheel-input';

const ev = (deltaX: number, deltaY: number, deltaMode = 0) => ({ deltaX, deltaY, deltaMode });

describe('looksLikeTouchpad', () => {
  it('nấc chuột 100 / 120 → chuột', () => {
    expect(looksLikeTouchpad(ev(0, 100))).toBe(false);
    expect(looksLikeTouchpad(ev(0, -120))).toBe(false);
  });

  it('line mode → chuột dù delta nhỏ', () => {
    expect(looksLikeTouchpad(ev(0, 3, 1))).toBe(false);
  });

  it('delta nhỏ / lẻ / 2 trục → touchpad', () => {
    expect(looksLikeTouchpad(ev(0, 12))).toBe(true);
    expect(looksLikeTouchpad(ev(0, 52.5))).toBe(true);
    expect(looksLikeTouchpad(ev(60, 60))).toBe(true);
  });

  it('sự kiện rỗng → chuột', () => {
    expect(looksLikeTouchpad(ev(0, 0))).toBe(false);
  });
});

describe('createWheelClassifier', () => {
  it('trong 1 cử chỉ touchpad, delta to tròn vẫn là touchpad', () => {
    const c = createWheelClassifier();
    expect(c(ev(0, 8), 0)).toBe('touchpad');
    expect(c(ev(0, 100), 16)).toBe('touchpad');
  });

  it('nghỉ quá quãng cử chỉ → phân loại lại', () => {
    const c = createWheelClassifier();
    expect(c(ev(0, 8), 0)).toBe('touchpad');
    expect(c(ev(0, 100), 500)).toBe('mouse');
  });

  it('chuột lăn liên tục giữ là chuột', () => {
    const c = createWheelClassifier();
    expect(c(ev(0, 100), 0)).toBe('mouse');
    expect(c(ev(0, 100), 30)).toBe('mouse');
  });
});
