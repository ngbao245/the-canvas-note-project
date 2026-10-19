import { describe, expect, it } from 'vitest';
import {
  DOC_COORD_LIMIT,
  OVERSCROLL_MAX_PX,
  axisRange,
  clampCameraToBounds,
  computeScrollRegion,
  overscrollLimit,
  rubberBand,
  rubberBandInverse,
  softClampCamera,
  unionBounds,
  unsoftCamera,
} from './pan-bounds';

const VIEW = { width: 1000, height: 600 };

describe('computeScrollRegion', () => {
  it('board trống → 1000 × 800 quanh gốc', () => {
    expect(computeScrollRegion(null)).toEqual({ x: -500, y: -400, width: 1000, height: 800 });
  });

  it('nới 500 / 400 mỗi phía', () => {
    expect(computeScrollRegion({ x: 100, y: 50, width: 200, height: 100 })).toEqual({
      x: -400,
      y: -350,
      width: 1200,
      height: 900,
    });
  });

  it('cắt theo trần an toàn', () => {
    const r = computeScrollRegion({ x: DOC_COORD_LIMIT * 2, y: 0, width: 10, height: 10 });
    expect(r.x + r.width).toBeLessThanOrEqual(DOC_COORD_LIMIT);
  });
});

describe('unionBounds', () => {
  it('khung nhỏ nhất chứa cả 2', () => {
    expect(
      unionBounds({ x: 0, y: 0, width: 10, height: 10 }, { x: -5, y: 20, width: 10, height: 5 }),
    ).toEqual({ x: -5, y: 0, width: 15, height: 25 });
  });
});

describe('axisRange', () => {
  it('tài liệu to hơn màn → màn đi trong tài liệu', () => {
    // Tài liệu 0..2000, zoom 1, màn 1000: cam từ -1000 (thấy mép phải) tới 0 (thấy mép trái).
    expect(axisRange(0, 2000, 1, 1000)).toEqual([-1000, 0]);
  });

  it('tài liệu nhỏ hơn màn → tài liệu trôi trong màn', () => {
    // Tài liệu 0..400, màn 1000: cam từ 0 (sát trái) tới 600 (sát phải).
    expect(axisRange(0, 400, 1, 1000)).toEqual([0, 600]);
  });

  it('tính theo zoom', () => {
    expect(axisRange(0, 2000, 0.25, 1000)).toEqual([0, 500]);
  });
});

describe('kéo lố', () => {
  it('trần = min(15% màn, 120px)', () => {
    expect(overscrollLimit(400)).toBe(60);
    expect(overscrollLimit(2000)).toBe(OVERSCROLL_MAX_PX);
  });

  it('0 khi không lố, tăng dần, không quá trần', () => {
    expect(rubberBand(0, 100)).toBe(0);
    const a = rubberBand(50, 100);
    const b = rubberBand(200, 100);
    const c = rubberBand(100_000, 100);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeLessThan(100);
  });

  it('hàm ngược khớp', () => {
    const shown = rubberBand(80, 120);
    expect(rubberBandInverse(shown, 120)).toBeCloseTo(80, 6);
  });
});

describe('chặn camera', () => {
  const doc = { x: 0, y: 0, width: 2000, height: 1200 };

  it('chặn cứng trong phạm vi, không đổi thì trả object cũ', () => {
    const inside = { x: -500, y: -300, zoom: 1 };
    expect(clampCameraToBounds(inside, doc, VIEW)).toBe(inside);
    expect(clampCameraToBounds({ x: 300, y: 0, zoom: 1 }, doc, VIEW)).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
    });
  });

  it('chặn mềm: lố có trần, ngược lại về vị trí thô', () => {
    const raw = { x: 400, y: -2000, zoom: 1 };
    const shown = softClampCamera(raw, doc, VIEW);
    expect(shown.x).toBeGreaterThan(0);
    expect(shown.x).toBeLessThan(overscrollLimit(VIEW.width));
    expect(shown.y).toBeLessThan(-600);
    expect(shown.y).toBeGreaterThan(-600 - overscrollLimit(VIEW.height));
    const back = unsoftCamera(shown, doc, VIEW);
    expect(back.x).toBeCloseTo(400, 4);
    expect(back.y).toBeCloseTo(-2000, 4);
  });

  it('chưa biết tài liệu / màn → không chặn', () => {
    const cam = { x: 99999, y: 0, zoom: 1 };
    expect(clampCameraToBounds(cam, null, VIEW)).toBe(cam);
    expect(softClampCamera(cam, doc, { width: 0, height: 0 })).toBe(cam);
  });
});
