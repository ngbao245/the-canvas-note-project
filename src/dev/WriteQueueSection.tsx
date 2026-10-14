import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useLocaleStore } from '@/lib/i18n';
import { useKeyboardPlatform } from '@/lib/shortcuts';
import { useObjectsStore } from '@/tools/canvas/store/objects-store';
import { useDevPanelStore, type WriteMetricsMode } from './dev-panel-store';
import { DevButton, DevSegmented } from './DevControls';
import {
  clearSessionResults,
  formatBytes,
  formatSummaries,
  formatWindow,
  getLiveSummary,
  getRunningSession,
  getSessionResults,
  getWriteMetricsVersion,
  isLongTaskSupported,
  resetLive,
  startSession,
  stopSession,
  subscribeWriteMetrics,
  type WriteSummary,
} from './write-metrics';

/**
 * Mục "Hàng đợi ghi" của bảng dev: đo số lần ghi object khi kéo / gõ.
 * Phiên: chọn kịch bản, Bắt đầu, thao tác, Dừng. Liên tục: đếm từ lúc mở app.
 */

const MODES: ReadonlyArray<{ value: WriteMetricsMode; label: string }> = [
  { value: 'session', label: 'session' },
  { value: 'live', label: 'live' },
];

// Kịch bản đã bàn 2026-10-13. Khác = tự đo thứ khác.
const SCENARIOS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'A', label: 'A — kéo 1 item, thả, lặp ~10 lần' },
  { value: 'B', label: 'B — chọn ~20 item, kéo cùng lúc' },
  { value: 'C', label: 'C — gõ ~200 ký tự tốc độ thường' },
  { value: 'D', label: 'D — gõ nhanh hết cỡ' },
  { value: 'E', label: 'E — gõ trên board ~300 object' },
  { value: 'Other', label: 'Khác' },
];

type CopyState = 'idle' | 'copied' | 'failed';

export function WriteQueueSection() {
  // Bộ thu chỉ báo đổi ~4 lần / giây → render lại thưa, không theo từng phím.
  useSyncExternalStore(subscribeWriteMetrics, getWriteMetricsVersion);
  const mode = useDevPanelStore((s) => s.writeMode);
  const setMode = useDevPanelStore((s) => s.setWriteMode);
  const scenario = useDevPanelStore((s) => s.scenario);
  const setScenario = useDevPanelStore((s) => s.setScenario);
  const platform = useKeyboardPlatform();
  const locale = useLocaleStore((s) => s.locale);
  const [copy, setCopy] = useState<CopyState>('idle');

  useEffect(() => {
    if (copy === 'idle') return;
    const t = setTimeout(() => setCopy('idle'), 1500);
    return () => clearTimeout(t);
  }, [copy]);

  const running = getRunningSession();
  const results = getSessionResults();
  const live = getLiveSummary();
  const shown: readonly WriteSummary[] = mode === 'live' ? [live] : results;

  const changeMode = (next: WriteMetricsMode) => {
    // Đổi chế độ giữa phiên: chốt phiên trước, giữ kết quả.
    if (running) stopSession();
    setMode(next);
  };

  const onCopy = async () => {
    const { objects, loadedBoardId } = useObjectsStore.getState();
    const board = loadedBoardId ? `board ${loadedBoardId}: ${objects.size} object` : 'không ở canvas';
    const context = `${platform}, ${locale}, ${board}`;
    try {
      await navigator.clipboard.writeText(formatSummaries(shown, context));
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <DevSegmented label="Write metrics mode" options={MODES} value={mode} onChange={changeMode} />
        {!isLongTaskSupported() && (
          <span className="text-[10px] text-muted-foreground">long task: không hỗ trợ</span>
        )}
      </div>

      {mode === 'session' ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            Kịch bản
            <select
              value={scenario}
              disabled={running !== null}
              onChange={(e) => setScenario(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground disabled:opacity-50"
            >
              {SCENARIOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {running ? (
              <DevButton tone="destructive" onClick={stopSession}>
                Dừng
              </DevButton>
            ) : (
              <DevButton tone="primary" onClick={() => startSession(scenario)}>
                Bắt đầu
              </DevButton>
            )}
            <CopyButton state={copy} disabled={shown.length === 0} onClick={onCopy} />
            <DevButton onClick={clearSessionResults} disabled={results.length === 0 || running !== null}>
              Xoá hết
            </DevButton>
          </div>
          {running && <SummaryCard summary={running} />}
          {results.length === 0 && !running && (
            <p className="text-[11px] text-muted-foreground">
              Chọn kịch bản, bấm Bắt đầu, thao tác trên canvas, rồi bấm Dừng.
            </p>
          )}
          {results.map((r, i) => (
            <SummaryCard key={`${r.label}-${results.length - i}`} summary={r} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <CopyButton state={copy} onClick={onCopy} />
            <DevButton onClick={resetLive}>Xoá về 0</DevButton>
          </div>
          <SummaryCard summary={live} />
        </div>
      )}
    </div>
  );
}

function CopyButton({
  state,
  disabled,
  onClick,
}: {
  state: CopyState;
  disabled?: boolean;
  onClick: () => void;
}) {
  const label = state === 'copied' ? 'Đã copy' : state === 'failed' ? 'Copy lỗi' : 'Copy';
  return (
    <DevButton onClick={onClick} disabled={disabled}>
      <span aria-live="polite">{label}</span>
    </DevButton>
  );
}

function SummaryCard({ summary: s }: { summary: WriteSummary }) {
  return (
    <div className="rounded-md border border-border bg-background/60 px-2 py-1.5 text-[11px] tabular-nums">
      <div className="mb-1 flex items-center justify-between gap-2 font-medium text-foreground">
        <span>
          {s.label === 'live' ? 'Liên tục' : s.label}
          {s.running && <span className="ml-1.5 text-destructive">đang đo</span>}
        </span>
        <span className="text-muted-foreground">{(s.durationMs / 1000).toFixed(1)}s</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <Row label="Đưa vào">
          {s.enqueueTotal} (text {s.enqueueText}, props {s.enqueueProps}, xoá {s.enqueueDelete})
        </Row>
        <Row label="Lô ghi">
          {s.batches} (lỗi {s.failedBatches}, gấp {s.urgentBatches})
        </Row>
        <Row label="Object / lô">
          tb {s.avgBatchSize.toFixed(1)}, max {s.maxBatchSize}
        </Row>
        <Row label="Transaction giảm">{(s.txReduction * 100).toFixed(0)}%</Row>
        <Row label="Gộp cùng id">{(s.coalesceRatio * 100).toFixed(0)}%</Row>
        <Row label="Thời gian ghi">
          tb {s.avgWriteMs.toFixed(1)}ms, max {s.maxWriteMs.toFixed(1)}ms
        </Row>
        <Row label="Long task">
          {s.longTaskCount === null
            ? 'không hỗ trợ'
            : `${s.longTaskCount}${s.longTaskMaxMs !== null ? `, max ${s.longTaskMaxMs.toFixed(0)}ms` : ''}`}
        </Row>
        <Row label="Nếu gom">
          {s.sim.map((x) => `${formatWindow(x.windowMs)} ${x.writes}`).join(' · ')}
        </Row>
        <dt className="col-span-2 mt-1 border-t border-border pt-1 font-medium text-foreground">Outbox</dt>
        <Row label="Request">
          {s.outbox.requests} (gấp {s.outbox.urgent}, keepalive {s.outbox.keepalive})
        </Row>
        <Row label="Object / request">
          tb {s.outbox.avgOps.toFixed(1)}, max {s.outbox.maxOps}, tổng {s.outbox.opsSent}
        </Row>
        <Row label="Thời gian request">
          tb {s.outbox.avgMs.toFixed(0)}ms, max {s.outbox.maxMs.toFixed(0)}ms
        </Row>
        <Row label="Kích thước">
          tb {formatBytes(s.outbox.avgBytes)}, max {formatBytes(s.outbox.maxBytes)}, tổng{' '}
          {formatBytes(s.outbox.totalBytes)}
        </Row>
        <Row label="Lỗi / thử lại">
          {s.outbox.errors} / {s.outbox.retries}
        </Row>
        <Row label="Trùng / lệch">
          {s.outbox.duplicates} / {s.outbox.conflicts}
        </Row>
      </dl>
      {s.truncated && (
        <p className="mt-1 text-[10px] text-warning">Đã cắt bớt sự kiện cũ, mô phỏng tính trên phần còn giữ.</p>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </>
  );
}
