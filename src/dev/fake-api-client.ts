// Gọi server giả từ bảng dev (spec `canvas-outbox`): cấu hình, đọc trạng thái, xoá, so với máy.

import { getOutboxStore } from '@/tools/canvas/api';
import { stableStringify } from '@/tools/canvas/sync/object-fields';
import {
  FAKE_API_PREFIX,
  parseFakeServerConfig,
  parseFakeServerState,
  type FakeServerConfig,
  type FakeServerState,
} from '@/tools/canvas/sync/protocol';

export async function fetchFakeState(): Promise<FakeServerState> {
  const res = await fetch(`${FAKE_API_PREFIX}/state`);
  if (!res.ok) throw new Error(`state ${res.status}`);
  const state = parseFakeServerState(await res.json());
  if (!state) throw new Error('state sai dạng');
  return state;
}

export async function setFakeConfig(config: FakeServerConfig): Promise<FakeServerConfig> {
  const res = await fetch(`${FAKE_API_PREFIX}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const next = res.ok ? parseFakeServerConfig(await res.json()) : null;
  if (!next) throw new Error(`config ${res.status}`);
  return next;
}

export async function resetFakeServer(): Promise<void> {
  const res = await fetch(`${FAKE_API_PREFIX}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error(`reset ${res.status}`);
}

export interface CompareResult {
  /** Object không còn chờ gửi, trùng version + nội dung với server. */
  matched: number;
  /** Có trên cả 2 nhưng khác version hoặc nội dung. */
  different: string[];
  /** Trên máy có, server không có, không còn chờ gửi. Thường là object có từ trước khi bật
   *  outbox (chưa từng sửa lại) hoặc server vừa xoá / khởi động lại dev. */
  missingOnServer: number;
  /** Server có, máy đã xoá, không còn chờ xoá. */
  extraOnServer: string[];
  /** Object đang chờ gửi (bỏ qua khi so). */
  pending: number;
}

export async function compareWithFakeServer(): Promise<CompareResult> {
  const [local, server] = await Promise.all([getOutboxStore().snapshot(), fetchFakeState()]);
  const pending = new Set(local.pendingIds);
  const remote = new Map(server.objects.map((o) => [o.id, o]));
  const localIds = new Set<string>();
  const different: string[] = [];
  let matched = 0;
  let missingOnServer = 0;
  for (const o of local.objects) {
    localIds.add(o.id);
    if (pending.has(o.id)) continue;
    const r = remote.get(o.id);
    if (!r) missingOnServer++;
    // Server nhận qua JSON và ghép patch (thứ tự khoá khác) → so JSON có sắp khoá.
    else if (r.version === o.version && stableStringify(r.object) === stableStringify(o)) matched++;
    else different.push(o.id);
  }
  const extraOnServer = server.objects
    .filter((r) => !localIds.has(r.id) && !pending.has(r.id))
    .map((r) => r.id);
  return { matched, different, missingOnServer, extraOnServer, pending: pending.size };
}
