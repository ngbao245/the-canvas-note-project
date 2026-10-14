import { useEffect, useState, type ReactNode } from 'react';
import { getOutboxStore } from '@/tools/canvas/api';
import { isFakeOffline, setFakeOffline } from '@/tools/canvas/sync/outbox-runtime';
import type { FakeServerConfig, FakeServerStats } from '@/tools/canvas/sync/protocol';
import { DevButton, DevSegmented } from './DevControls';
import {
  compareWithFakeServer,
  fetchFakeState,
  resetFakeServer,
  setFakeConfig,
  type CompareResult,
} from './fake-api-client';

/**
 * Mục "Server giả + outbox" của bảng dev (spec `canvas-outbox`): chỉnh độ trễ, tỉ lệ lỗi,
 * mất mạng giả; xem số mục chờ gửi; so dữ liệu máy với server. Số request nằm ở mục đo
 * (dùng chung Phiên / Liên tục).
 */

// Giá trị là chuỗi số (nút chọn chỉ nhận chuỗi), đổi lại Number lúc gửi.
const LATENCIES: ReadonlyArray<{ value: string; label: string }> = [
  { value: '0', label: '0' },
  { value: '200', label: '200ms' },
  { value: '1000', label: '1s' },
  { value: '3000', label: '3s' },
];

const ERROR_RATES: ReadonlyArray<{ value: string; label: string }> = [
  { value: '0', label: '0%' },
  { value: '0.2', label: '20%' },
  { value: '0.5', label: '50%' },
];

const NETWORK = [
  { value: 'online', label: 'online' },
  { value: 'offline', label: 'offline' },
] as const;

const PENDING_POLL_MS = 1000;
const MAX_IDS_SHOWN = 3;

export function OutboxSection() {
  const [config, setConfig] = useState<FakeServerConfig | null>(null);
  const [stats, setStats] = useState<FakeServerStats | null>(null);
  const [serverObjects, setServerObjects] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [offline, setOffline] = useState(isFakeOffline);
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshServer = async () => {
    try {
      const s = await fetchFakeState();
      setConfig(s.config);
      setStats(s.stats);
      setServerObjects(s.objects.length);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'server giả không trả lời');
    }
  };

  useEffect(() => {
    void refreshServer();
    const id = setInterval(() => {
      void getOutboxStore()
        .count()
        .then(setPending)
        .catch(() => setPending(null));
    }, PENDING_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const updateConfig = async (patch: Partial<FakeServerConfig>) => {
    if (!config) return;
    try {
      setConfig(await setFakeConfig({ ...config, ...patch }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'đổi config lỗi');
    }
  };

  const toggleOffline = (value: 'online' | 'offline') => {
    const next = value === 'offline';
    setFakeOffline(next);
    setOffline(next);
  };

  const runCompare = async () => {
    try {
      setCompare(await compareWithFakeServer());
      await refreshServer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'so lỗi');
    }
  };

  const clearServer = async () => {
    try {
      await resetFakeServer();
      setCompare(null);
      await refreshServer();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'xoá lỗi');
    }
  };

  return (
    <div className="flex flex-col gap-2 text-[11px]">
      <Control label="Độ trễ">
        <DevSegmented
          label="Fake server latency"
          options={LATENCIES}
          value={config ? String(config.latencyMs) : '0'}
          onChange={(v) => void updateConfig({ latencyMs: Number(v) })}
        />
      </Control>
      <Control label="Lỗi">
        <DevSegmented
          label="Fake server error rate"
          options={ERROR_RATES}
          value={config ? String(config.errorRate) : '0'}
          onChange={(v) => void updateConfig({ errorRate: Number(v) })}
        />
      </Control>
      <Control label="Mạng">
        <DevSegmented
          label="Fake network"
          options={NETWORK}
          value={offline ? 'offline' : 'online'}
          onChange={toggleOffline}
        />
      </Control>

      <div className="tabular-nums text-muted-foreground">
        Chờ gửi: <span className="text-foreground">{pending ?? '?'}</span> · Server:{' '}
        <span className="text-foreground">{serverObjects ?? '?'}</span> object
        {stats && (
          <>
            {' '}
            · {stats.requests} request, lỗi {stats.failed}, trùng {stats.duplicates}, lệch {stats.versionConflicts}
            · create {stats.creates}, patch {stats.patches}, xoá {stats.deletes}, thiếu {stats.missing}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <DevButton onClick={() => void runCompare()}>So với server</DevButton>
        <DevButton onClick={() => void refreshServer()}>Làm mới</DevButton>
        <DevButton tone="destructive" onClick={() => void clearServer()}>
          Xoá server
        </DevButton>
      </div>

      {compare && <CompareView result={compare} />}
      {error && <p className="text-destructive">{error}</p>}
    </div>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function CompareView({ result: r }: { result: CompareResult }) {
  const ok = r.different.length === 0 && r.extraOnServer.length === 0;
  return (
    <div
      aria-live="polite"
      className={`rounded-md border px-2 py-1.5 tabular-nums ${
        ok ? 'border-success/40 bg-success/10' : 'border-warning/40 bg-warning/10'
      }`}
    >
      <p className={ok ? 'text-success' : 'text-warning'}>
        {ok ? `Khớp ${r.matched} object` : `Lệch: khác ${r.different.length}, server thừa ${r.extraOnServer.length}`}
      </p>
      <p className="text-muted-foreground">
        Khớp {r.matched} · đang chờ gửi {r.pending} · server chưa có {r.missingOnServer}
      </p>
      {r.different.length > 0 && <IdList label="Khác" ids={r.different} />}
      {r.extraOnServer.length > 0 && <IdList label="Server thừa" ids={r.extraOnServer} />}
      {r.missingOnServer > 0 && (
        <p className="text-muted-foreground">
          "Server chưa có" thường là object có từ trước khi bật outbox hoặc server vừa xoá / khởi động lại dev.
        </p>
      )}
    </div>
  );
}

function IdList({ label, ids }: { label: string; ids: readonly string[] }) {
  const shown = ids.slice(0, MAX_IDS_SHOWN).map((id) => id.slice(0, 8));
  return (
    <p className="text-muted-foreground">
      {label}: {shown.join(', ')}
      {ids.length > MAX_IDS_SHOWN ? ` +${ids.length - MAX_IDS_SHOWN}` : ''}
    </p>
  );
}
