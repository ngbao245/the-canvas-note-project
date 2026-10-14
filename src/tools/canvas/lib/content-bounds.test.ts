import { describe, expect, it } from 'vitest';
import { computeContentBounds } from './content-bounds';
import type { CanvasObject } from '../types';

function obj(id: string, x: number, y: number, unsortIndex: number | null = null): CanvasObject {
  return {
    id,
    type: 'note',
    boardId: 'b',
    geometry: { x, y, width: 100, height: 50, rotation: 0, zIndex: 0 },
    data: {},
    unsortIndex,
    version: 0,
    createdAt: '',
    updatedAt: '',
  };
}

describe('computeContentBounds', () => {
  it('bao mọi object trên canvas', () => {
    expect(computeContentBounds([obj('a', 0, 0), obj('b', 200, 100)])).toEqual({
      x: 0,
      y: 0,
      width: 300,
      height: 150,
    });
  });

  it('bỏ item trong Unsort dù geometry cũ ở rất xa', () => {
    expect(computeContentBounds([obj('a', 0, 0), obj('u', 5000, 5000, 0)])).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
  });

  it('chỉ có item Unsort → null (như canvas trống)', () => {
    expect(computeContentBounds([obj('u', 10, 10, 0)])).toBeNull();
  });
});
