// ============================================================
// Khoá object giữa các tab cùng trình duyệt (Web Locks API)
// ============================================================
//
// - Khoá theo người CHỌN (Milanote): mọi object đang chọn + object đang sửa ở tab
//   này đều giữ khoá `bibo-canvas-edit:X` (xin không chờ). Bỏ chọn / thoát sửa thì
//   nhả. Bám vào selection-store + interaction-store nên mọi đường chọn / vào sửa
//   (click, marquee, Ctrl+A, Enter, Ctrl+Enter...) đều qua đây, caller không gọi.
// - Không xin được → tab khác đang giữ: bỏ chọn / huỷ sửa + báo người dùng.
//   (selection-store đã lọc object khoá ở tab khác, đây chỉ bắt lúc 2 tab bấm cùng lúc.)
// - Tab đóng / treo / crash: trình duyệt tự nhả khoá, không bị khoá mãi.
// - Danh sách object khoá ở tab khác (`remote-lock-store`) lấy từ
//   `navigator.locks.query()`, trừ khoá của chính tab này: đang giữ, đang xin, và
//   ĐANG NHẢ (trình duyệt nhả bất đồng bộ; bỏ sót nhóm này thì tab tự coi khoá
//   của mình là của tab khác và tự bỏ chọn). Hỏi lại khi tab khác báo, khi tab
//   được focus, và định kỳ (bắt trường hợp tab kia crash không kịp báo).
// - Không có Web Locks: cho chọn / sửa bình thường, không khoá (cảnh báo 1 lần).
// ============================================================

import { useInteractionStore } from '../store/interaction-store';
import { useRemoteLockStore } from '../store/remote-lock-store';
import { useSelectionStore } from '../store/selection-store';
import { showNotice } from '../store/notice-store';
import { onTabMessage, postTabMessage } from './tab-channel';

const PREFIX = 'bibo-canvas-edit:';
const REFRESH_MS = 3000;

/** Khoá tab này đang giữ: id → hàm nhả. */
const held = new Map<string, () => void>();
/** Đang xin hoặc đang nhả: vẫn là của tab này, refresh không được tính là tab khác. */
const inFlight = new Set<string>();
let warned = false;

function locksApi(): LockManager | null {
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks : null;
}

function isOwn(id: string): boolean {
  return held.has(id) || inFlight.has(id);
}

/** Xin khoá không chờ. true = đã giữ (hoặc trình duyệt không hỗ trợ khoá). */
function acquire(id: string): Promise<boolean> {
  const locks = locksApi();
  if (!locks) {
    if (!warned) {
      warned = true;
      console.warn('[canvas] trình duyệt không có Web Locks, không khoá object giữa các tab');
    }
    return Promise.resolve(true);
  }
  inFlight.add(id);
  return new Promise<boolean>((resolve) => {
    let got = false;
    void locks
      .request(PREFIX + id, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve(false);
          return undefined;
        }
        got = true;
        // Giữ khoá tới khi gọi hàm nhả. `inFlight` vẫn giữ id tới khi request
        // xong hẳn (tức trình duyệt đã nhả) → refresh không nhầm là tab khác.
        const released = new Promise<void>((done) => held.set(id, done));
        resolve(true);
        postTabMessage({ type: 'locks' }); // báo đã giữ
        return released;
      })
      .finally(() => {
        // Đã có lần xin mới cho cùng id thì để lần đó tự quản `inFlight`.
        if (!held.has(id)) inFlight.delete(id);
        if (got) postTabMessage({ type: 'locks' }); // báo đã nhả
      });
  });
}

function release(id: string): void {
  const done = held.get(id);
  if (!done) return;
  held.delete(id);
  inFlight.add(id); // đang nhả; `.finally` ở acquire xoá khi trình duyệt nhả xong
  done();
}

export async function refreshRemoteLocks(): Promise<void> {
  const locks = locksApi();
  if (!locks) return;
  const state = await locks.query();
  const next = new Set<string>();
  for (const l of state.held ?? []) {
    if (!l.name?.startsWith(PREFIX)) continue;
    const id = l.name.slice(PREFIX.length);
    if (!isOwn(id)) next.add(id);
  }
  const cur = useRemoteLockStore.getState().ids;
  if (next.size === cur.size && [...next].every((id) => cur.has(id))) return;
  useRemoteLockStore.setState({ ids: next });
}

/**
 * Nút "×" trên badge: xin tab đang giữ object `id` nhường. Chữ của tab kia không
 * mất (đã tự lưu). Tab kia không phản hồi (đơ) thì khoá vẫn giữ tới khi tab đó đóng.
 */
export function requestRelease(id: string): void {
  postTabMessage({ type: 'release', id });
}

/** Object tab này cần giữ khoá: đang chọn + đang sửa. */
function wantedIds(): Set<string> {
  const ids = new Set(useSelectionStore.getState().selectedIds);
  const editing = useInteractionStore.getState().editingId;
  if (editing) ids.add(editing);
  return ids;
}

/** Không xin được khoá: thôi chọn / thôi sửa object đó. */
function dropLocal(id: string): void {
  const inter = useInteractionStore.getState();
  if (inter.editingId === id) inter.setEditingId(null);
  const sel = useSelectionStore.getState();
  if (sel.selectedIds.has(id)) sel.replace([...sel.selectedIds].filter((x) => x !== id));
}

/** Bật khoá. Trả hàm tắt (nhả mọi khoá, gỡ listener). */
export function startEditLocks(): () => void {
  const sync = () => {
    const wanted = wantedIds();
    for (const id of [...held.keys()]) if (!wanted.has(id)) release(id);
    for (const id of wanted) {
      if (isOwn(id)) continue;
      void acquire(id).then((ok) => {
        const stillWanted = wantedIds().has(id);
        if (ok) {
          if (!stillWanted) release(id); // đã bỏ chọn trong lúc chờ khoá
          return;
        }
        if (stillWanted) {
          dropLocal(id);
          showNotice('CANVAS.NOTE_LOCK.BUSY');
        }
        void refreshRemoteLocks();
      });
    }
  };

  const unsubSel = useSelectionStore.subscribe(sync);
  const unsubEditing = useInteractionStore.subscribe((s, prev) => {
    if (s.editingId !== prev.editingId) sync();
  });

  const unsubTab = onTabMessage((msg) => {
    if (msg.type === 'locks') void refreshRemoteLocks();
    // Tab khác bấm "×": thoát sửa + bỏ chọn (Milanote "force-deselect") → sync nhả
    // khoá. Chữ đã tự lưu từ trước, NoteEditor gỡ thì ghi bước undo.
    if (msg.type === 'release' && held.has(msg.id)) {
      dropLocal(msg.id);
      showNotice('CANVAS.NOTE_LOCK.TAKEN');
    }
  });
  const onFocus = () => void refreshRemoteLocks();
  window.addEventListener('focus', onFocus);
  const timer = setInterval(() => {
    if (document.visibilityState === 'visible') void refreshRemoteLocks();
  }, REFRESH_MS);
  sync();
  void refreshRemoteLocks();

  return () => {
    unsubSel();
    unsubEditing();
    unsubTab();
    window.removeEventListener('focus', onFocus);
    clearInterval(timer);
    for (const id of [...held.keys()]) release(id);
  };
}
