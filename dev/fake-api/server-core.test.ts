import { describe, expect, it } from 'vitest';
import { createFakeServer } from './server-core';
import type { SyncOp } from '../../src/tools/canvas/sync/protocol';

const note = {
  id: 'a',
  type: 'note',
  version: 1,
  updatedAt: 't1',
  geometry: { x: 0, y: 0 },
  data: { body: '<p>v1</p>', color: null },
};

const create = (over: Partial<Extract<SyncOp, { kind: 'create' }>> = {}): SyncOp => ({
  opId: 'op-1',
  objectId: 'a',
  baseVersion: 0,
  groupId: 'g',
  kind: 'create',
  version: 1,
  object: note,
  ...over,
});

const patch = (opId: string, set: Record<string, unknown>, version: number, baseVersion: number): SyncOp => ({
  opId,
  objectId: 'a',
  baseVersion,
  groupId: 'g',
  kind: 'patch',
  version,
  updatedAt: `t${version}`,
  patch: { set, unset: [] },
});

const req = (ops: SyncOp[]) => ({ clientId: 'c', ops });
const body = (r: ReturnType<ReturnType<typeof createFakeServer>['apply']>) => {
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  return r.body;
};

describe('server giả', () => {
  it('create ghi nguyên object, trả mã đã nhận', () => {
    const s = createFakeServer();
    expect(body(s.apply(req([create()])))).toEqual({
      acceptedOpIds: ['op-1'],
      missingObjectIds: [],
      duplicates: 0,
      versionConflicts: 0,
    });
    expect(s.getState().objects).toEqual([{ id: 'a', version: 1, object: note }]);
  });

  it('patch chỉ đổi trường trong gói, giữ phần còn lại + cập nhật version', () => {
    const s = createFakeServer();
    s.apply(req([create()]));
    s.apply(req([patch('op-2', { geometry: { x: 9, y: 9 } }, 2, 1)]));
    const o = s.getState().objects[0];
    expect(o.version).toBe(2);
    expect(o.object).toEqual({ ...note, version: 2, updatedAt: 't2', geometry: { x: 9, y: 9 } });
  });

  it('2 patch khác trường từ 2 client (cùng base) → giữ cả 2, đếm lệch phiên bản', () => {
    const s = createFakeServer();
    s.apply(req([create()]));
    s.apply({ clientId: 'A', ops: [patch('A-1', { 'data.color': '#f00' }, 2, 1)] });
    const r = body(s.apply({ clientId: 'B', ops: [patch('B-1', { 'data.body': '<p>B</p>' }, 2, 1)] }));
    expect(r.versionConflicts).toBe(1);
    const data = (s.getState().objects[0].object as { data: unknown }).data;
    expect(data).toEqual({ body: '<p>B</p>', color: '#f00' });
  });

  it('patch tới object server không có → missing, không ghi nhận mã; gửi lại create cùng mã thì áp', () => {
    const s = createFakeServer();
    const r = body(s.apply(req([patch('op-9', { geometry: { x: 1 } }, 5, 4)])));
    expect(r).toMatchObject({ acceptedOpIds: [], missingObjectIds: ['a'] });
    const r2 = body(s.apply(req([create({ opId: 'op-9', version: 5 })])));
    expect(r2).toMatchObject({ acceptedOpIds: ['op-9'], duplicates: 0 });
    expect(s.getState().objects).toHaveLength(1);
  });

  it('gửi lại cùng mã → không áp lần 2, vẫn trả là đã nhận', () => {
    const s = createFakeServer();
    s.apply(req([create()]));
    const r = body(s.apply(req([create({ version: 9, object: { ...note, version: 9 } })])));
    expect(r).toMatchObject({ acceptedOpIds: ['op-1'], duplicates: 1 });
    expect(s.getState().objects[0].version).toBe(1);
  });

  it('delete xoá object', () => {
    const s = createFakeServer();
    s.apply(req([create()]));
    s.apply(req([{ opId: 'op-2', objectId: 'a', baseVersion: 1, groupId: 'g', kind: 'delete' }]));
    expect(s.getState().objects).toEqual([]);
  });

  it('lỗi giả → 500, không áp gì, không ghi nhận mã (gửi lại thì áp)', () => {
    const s = createFakeServer(() => 0);
    s.setConfig({ latencyMs: 0, errorRate: 0.5 });
    expect(s.apply(req([create()])).status).toBe(500);
    expect(s.getState().objects).toEqual([]);
    s.setConfig({ latencyMs: 0, errorRate: 0 });
    expect(body(s.apply(req([create()]))).duplicates).toBe(0);
    expect(s.getState().objects).toHaveLength(1);
  });

  it('1 mục sai dạng → 400, cả request không áp', () => {
    const s = createFakeServer();
    expect(s.apply({ clientId: 'c', ops: [create(), { opId: 'x' }] }).status).toBe(400);
    expect(s.getState().objects).toEqual([]);
  });

  it('đếm byte request', () => {
    const s = createFakeServer();
    s.apply(req([create()]), 120);
    s.apply(req([create({ opId: 'op-2' })]), 80);
    expect(s.getState().stats.bytes).toBe(200);
  });

  it('config sai dạng bị từ chối', () => {
    const s = createFakeServer();
    expect(s.setConfig({ latencyMs: -1, errorRate: 0 })).toBeNull();
    expect(s.setConfig({ latencyMs: 0, errorRate: 2 })).toBeNull();
    expect(s.getConfig()).toEqual({ latencyMs: 0, errorRate: 0 });
  });
});
