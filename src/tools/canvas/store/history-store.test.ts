import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_STACK,
  beginHistoryGroup,
  endHistoryGroup,
  useHistoryStore,
  type Command,
} from './history-store';

const h = () => useHistoryStore.getState();

/** Lệnh ghi lại thứ tự undo / redo vào `log`. */
function cmd(name: string, log: string[]): Command {
  return { label: name, undo: () => log.push(`undo ${name}`), redo: () => log.push(`redo ${name}`) };
}

beforeEach(() => {
  h().clear();
  h().setActiveBoard(null);
});

describe('history-store theo board', () => {
  it('bỏ push khi chưa vào board nào', () => {
    h().push(cmd('a', []));
    expect(h().undoStack).toHaveLength(0);
  });

  it('mỗi board 1 stack riêng, đổi board không chạy lệnh board kia', () => {
    const log: string[] = [];
    h().setActiveBoard('A');
    h().push(cmd('a1', log));
    h().setActiveBoard('B');
    expect(h().undoStack).toHaveLength(0);
    h().undo();
    expect(log).toEqual([]);
    h().setActiveBoard('A');
    expect(h().undoStack).toHaveLength(1);
    h().undo();
    expect(log).toEqual(['undo a1']);
    expect(h().redoStack).toHaveLength(1);
  });

  it('redo của board A còn nguyên sau khi qua B rồi về', () => {
    const log: string[] = [];
    h().setActiveBoard('A');
    h().push(cmd('a1', log));
    h().undo();
    h().setActiveBoard('B');
    h().push(cmd('b1', log));
    h().setActiveBoard('A');
    h().redo();
    expect(log).toEqual(['undo a1', 'redo a1']);
  });

  it('push mới xoá redo của chính board đó', () => {
    const log: string[] = [];
    h().setActiveBoard('A');
    h().push(cmd('a1', log));
    h().undo();
    h().push(cmd('a2', log));
    expect(h().redoStack).toHaveLength(0);
  });

  it('push kèm boardId vào stack board đó, không đổi stack đang hiện', () => {
    h().setActiveBoard('B');
    h().push(cmd('x', []), 'A');
    expect(h().undoStack).toHaveLength(0);
    h().setActiveBoard('A');
    expect(h().undoStack).toHaveLength(1);
  });

  it('bỏ push phát sinh trong lúc undo / redo (redo gọi lại hàm gốc)', () => {
    h().setActiveBoard('A');
    const inner = cmd('inner', []);
    const outer: Command = {
      label: 'outer',
      undo: () => {},
      redo: () => h().push(inner),
    };
    h().push(outer);
    h().undo();
    h().redo();
    expect(h().undoStack).toEqual([outer]);
  });

  it(`giữ tối đa ${MAX_STACK} bước mỗi board`, () => {
    h().setActiveBoard('A');
    for (let i = 0; i < MAX_STACK + 5; i++) h().push(cmd(`c${i}`, []));
    expect(h().undoStack).toHaveLength(MAX_STACK);
    expect(h().undoStack[0].label).toBe('c5');
  });
});

describe('gom nhóm', () => {
  it('gộp nhiều push thành 1 bước, undo ngược, redo xuôi', () => {
    const log: string[] = [];
    h().setActiveBoard('A');
    beginHistoryGroup();
    h().push(cmd('1', log));
    h().push(cmd('2', log));
    endHistoryGroup('group');
    expect(h().undoStack).toHaveLength(1);
    h().undo();
    h().redo();
    expect(log).toEqual(['undo 2', 'undo 1', 'redo 1', 'redo 2']);
  });

  it('nhóm vào board lúc begin, kể cả khi đổi board trước end', () => {
    h().setActiveBoard('A');
    beginHistoryGroup();
    h().push(cmd('1', []));
    h().setActiveBoard('B');
    h().push(cmd('2', []));
    endHistoryGroup('group');
    expect(h().undoStack).toHaveLength(0);
    h().setActiveBoard('A');
    expect(h().undoStack).toHaveLength(1);
  });

  it('nhóm rỗng không thêm bước', () => {
    h().setActiveBoard('A');
    beginHistoryGroup();
    endHistoryGroup('group');
    expect(h().undoStack).toHaveLength(0);
  });
});
