import { describe, expect, it } from 'vitest';
import {
  markEntryNew,
  mergeOutboxEntry,
  parseOutboxEntry,
  toSyncOp,
  type OutboxChange,
} from './outbox-entry';

function ids() {
  let n = 0;
  return () => `op-${++n}`;
}

const change = (over: Partial<OutboxChange> = {}): OutboxChange => ({
  objectId: 'a',
  kind: 'put',
  isNew: false,
  fields: ['geometry'],
  channels: ['props'],
  baseVersion: 3,
  groupId: 'g1',
  now: 100,
  ...over,
});

const obj = {
  id: 'a',
  version: 4,
  updatedAt: 't4',
  geometry: { x: 1 },
  data: { body: '<p>dài</p>', color: '#f00' },
};

describe('mergeOutboxEntry', () => {
  it('mục đầu: rev 1, giữ baseVersion + trường của thay đổi', () => {
    const e = mergeOutboxEntry(null, change(), ids());
    expect(e).toMatchObject({ rev: 1, baseVersion: 3, opId: 'op-1', fields: ['geometry'], isNew: false });
  });

  it('sửa rồi sửa: 1 mục, giữ baseVersion + createdAt, hợp trường, đổi opId', () => {
    const next = ids();
    const first = mergeOutboxEntry(null, change({ fields: ['data.body'], channels: ['text'] }), next);
    const second = mergeOutboxEntry(first, change({ baseVersion: 4, now: 200, groupId: 'g2' }), next);
    expect(second).toMatchObject({ baseVersion: 3, createdAt: 100, rev: 2, groupId: 'g2' });
    expect(second.opId).not.toBe(first.opId);
    expect(second.fields).toEqual(['data.body', 'geometry']);
    expect(second.channels).toEqual(['props', 'text']);
  });

  it('tạo mới rồi sửa tiếp: vẫn là tạo mới tới khi gửi được', () => {
    const next = ids();
    const first = mergeOutboxEntry(null, change({ isNew: true }), next);
    expect(mergeOutboxEntry(first, change(), next).isNew).toBe(true);
  });

  it('sửa rồi xoá → mục xoá', () => {
    const next = ids();
    expect(mergeOutboxEntry(mergeOutboxEntry(null, change(), next), change({ kind: 'delete' }), next).kind).toBe(
      'delete',
    );
  });

  it('xoá rồi ghi lại (undo xoá) → tạo mới, bỏ trường cũ', () => {
    const next = ids();
    const del = mergeOutboxEntry(null, change({ kind: 'delete', fields: [] }), next);
    const revived = mergeOutboxEntry(del, change({ fields: ['data.color'] }), next);
    expect(revived).toMatchObject({ kind: 'put', isNew: true, fields: ['data.color'] });
  });
});

describe('toSyncOp', () => {
  it('patch chỉ mang trường đã đổi, không mang nội dung chữ khi chỉ kéo', () => {
    const op = toSyncOp(mergeOutboxEntry(null, change(), ids()), obj);
    expect(op).toEqual({
      opId: 'op-1',
      objectId: 'a',
      baseVersion: 3,
      groupId: 'g1',
      kind: 'patch',
      version: 4,
      updatedAt: 't4',
      patch: { set: { geometry: { x: 1 } }, unset: [] },
    });
  });

  it('tạo mới → create mang nguyên object', () => {
    const op = toSyncOp(mergeOutboxEntry(null, change({ isNew: true }), ids()), obj);
    expect(op).toMatchObject({ kind: 'create', version: 4, object: obj });
  });

  it('object đã mất → gửi xoá', () => {
    expect(toSyncOp(mergeOutboxEntry(null, change(), ids()), null).kind).toBe('delete');
  });

  it('server báo thiếu → markEntryNew → create, giữ mã gửi', () => {
    const e = mergeOutboxEntry(null, change(), ids());
    const op = toSyncOp(markEntryNew(e), obj);
    expect(op).toMatchObject({ kind: 'create', opId: e.opId });
  });
});

describe('parseOutboxEntry', () => {
  it('đọc lại đúng mục đã ghi', () => {
    const e = mergeOutboxEntry(null, change(), ids());
    expect(parseOutboxEntry(structuredClone(e))).toEqual(e);
  });

  it('mục cũ chưa có fields / isNew → gửi nguyên object cho chắc', () => {
    const e = mergeOutboxEntry(null, change(), ids());
    const { fields: _f, isNew: _n, ...legacy } = e;
    void _f;
    void _n;
    expect(parseOutboxEntry(legacy)).toMatchObject({ isNew: true, fields: [] });
  });

  it('sai dạng → null', () => {
    expect(parseOutboxEntry(null)).toBeNull();
    expect(parseOutboxEntry({ objectId: 'a' })).toBeNull();
    expect(parseOutboxEntry({ ...mergeOutboxEntry(null, change(), ids()), kind: 'patch' })).toBeNull();
  });
});
