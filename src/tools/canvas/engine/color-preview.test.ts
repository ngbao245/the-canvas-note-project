import { beforeEach, describe, expect, it, vi } from 'vitest';

// Repository thật dùng IndexedDB → thay bằng bản giả chỉ nhận lệnh ghi.
const saved = vi.hoisted(() => ({ objects: [] as unknown[], boards: [] as unknown[] }));
vi.mock('../api', () => ({
  getCanvasRepository: () => ({
    saveObject: (o: unknown) => {
      saved.objects.push(o);
      return Promise.resolve();
    },
    saveBoard: (b: unknown) => {
      saved.boards.push(b);
      return Promise.resolve();
    },
  }),
}));

import {
  hasObjectPreview,
  previewBoardColor,
  previewObjectData,
  setBoardColor,
  setBoardIcon,
  updateObjectData,
} from './actions';
import { useObjectsStore } from '../store/objects-store';
import { useBoardsStore } from '../store/boards-store';
import { useHistoryStore } from '../store/history-store';
import { makeDefaultBoard, type CanvasObject } from '../types';

const NOTE_ID = 'n1';
const BOARD_ID = 'b1';

function noteData(): Record<string, unknown> {
  const o = useObjectsStore.getState().objects.get(NOTE_ID);
  return o?.data as Record<string, unknown>;
}

beforeEach(() => {
  saved.objects.length = 0;
  saved.boards.length = 0;
  useHistoryStore.getState().clear();
  // Lịch sử undo theo board: lệnh chỉ vào stack khi có board đang mở.
  useHistoryStore.getState().setActiveBoard(BOARD_ID);
  const note = {
    id: NOTE_ID,
    type: 'note',
    boardId: BOARD_ID,
    unsortIndex: null,
    geometry: { x: 0, y: 0, width: 300, height: 68, rotation: 0, zIndex: 0 },
    data: { body: '<p></p>', color: null, background: null, textColor: null, heightMode: 'auto', locked: false },
    createdAt: '',
    updatedAt: '',
  } as unknown as CanvasObject;
  useObjectsStore.getState().hydrate([note], BOARD_ID);
  useBoardsStore.getState().hydrate([{ ...makeDefaultBoard(), id: BOARD_ID, color: '#111111', icon: null }]);
});

describe('xem trước màu object', () => {
  it('chốt màu không đè trường khác bị đổi giữa lúc xem trước', () => {
    const before = noteData();
    previewObjectData(NOTE_ID, { ...before, background: '#aa0000' });
    // Thay đổi xen giữa (VD sync / khoá) ghi thẳng store, không qua updateObjectData.
    useObjectsStore.getState().updateData(NOTE_ID, { ...noteData(), locked: true });
    updateObjectData(NOTE_ID, { ...noteData(), background: '#bb0000' });

    expect(noteData().background).toBe('#bb0000');
    expect(noteData().locked).toBe(true);
    expect(hasObjectPreview(NOTE_ID)).toBe(false);
  });

  it('cả lần kéo chỉ ra 1 bước undo, undo về màu gốc', () => {
    previewObjectData(NOTE_ID, { ...noteData(), background: '#aa0000' });
    previewObjectData(NOTE_ID, { ...noteData(), background: '#cc0000' });
    updateObjectData(NOTE_ID, { ...noteData(), background: '#cc0000' });

    expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    useHistoryStore.getState().undo();
    expect(noteData().background).toBeNull();
  });
});

describe('xem trước màu board', () => {
  it('đổi icon lúc đang xem trước màu không lưu màu chưa chốt', () => {
    previewBoardColor(BOARD_ID, '#ff0000');
    setBoardIcon(BOARD_ID, { kind: 'text', value: 'x' });

    const board = useBoardsStore.getState().boards.get(BOARD_ID);
    expect(board?.color).toBe('#111111');
    expect(saved.boards.every((b) => (b as { color: string }).color === '#111111')).toBe(true);
  });

  it('chốt màu sau xem trước: undo về màu gốc', () => {
    previewBoardColor(BOARD_ID, '#ff0000');
    setBoardColor(BOARD_ID, '#ff0000');
    expect(useBoardsStore.getState().boards.get(BOARD_ID)?.color).toBe('#ff0000');
    useHistoryStore.getState().undo();
    expect(useBoardsStore.getState().boards.get(BOARD_ID)?.color).toBe('#111111');
  });
});
