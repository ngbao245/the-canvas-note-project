import type { DisplayWay, ShortcutDef } from '@/lib/shortcuts';

/**
 * Bảng phím của Canvas — CHỈ dữ liệu (không import store / engine) để modal phím tắt
 * đọc được mà không kéo code canvas vào bundle chính.
 *
 * Hành động gắn ở nơi sở hữu, mỗi nơi 1 lớp:
 *   - hooks/useCanvasKeys.ts         lớp tool: phần lớn phím
 *   - components/CanvasApp.tsx       lớp tool: Delete, Ctrl+Shift+U; lớp panel: Esc đóng Unsort
 *   - hooks/usePointerInteraction.ts lớp tool: Space giữ để kéo màn hình
 *   - components/UnsortPanel.tsx     lớp panel: Ctrl+A trong Unsort
 *
 * Dòng `combos: []` + `display.ways` là dòng chỉ hiển thị: thao tác chuột (listener chuột ở
 * ObjectsLayer, useObjectDrag, usePointerInteraction, CanvasSurface, CardClipperButton,
 * UnsortItem) — không có handler, bộ điều phối không đụng tới.
 *
 * Thứ tự khai báo = thứ tự hiện trong modal (trong từng nhóm). Phím không có `display`
 * là phím nội bộ, không hiện.
 *
 * Chữ cái dùng `key` (so không phân biệt hoa/thường, theo bố cục bàn phím). `[` `]` dùng
 * `code` vì giữ Shift thì ký tự đổi thành `{` `}`.
 */

// Nhóm theo cách chia của Milanote: Cơ bản (sửa + chọn + sắp lớp + Unsort), Di chuyển
// (kéo màn hình, vào board), Thu phóng. Thứ tự trong nhóm = thứ tự khai báo bên dưới.
const BASICS = 'SHORTCUTS.GROUP.BASICS';
const EDIT = BASICS;
const SELECT = BASICS;
const LAYER = BASICS;
const UNSORT = BASICS;
const NAVIGATION = 'SHORTCUTS.GROUP.NAVIGATION';
const ZOOM = 'SHORTCUTS.GROUP.ZOOM';
const TEXT = 'SHORTCUTS.GROUP.TEXT';
const MARKDOWN = 'SHORTCUTS.GROUP.MARKDOWN';

const HOLD = { text: 'SHORTCUTS.WORD.HOLD' } as const;
const WHILE_DRAGGING = { text: 'SHORTCUTS.WORD.WHILE_DRAGGING' } as const;
const SHIFT = { combo: { shift: true } } as const;
const MOD = { combo: { mod: true } } as const;

export const CANVAS_SHORTCUT_DEFS = {
  'canvas.undo': {
    combos: [{ mod: true, key: 'z' }],
    display: { groupKey: EDIT, labelKey: 'SHORTCUTS.ACTION.UNDO' },
  },
  'canvas.redo': {
    combos: [
      { mod: true, shift: true, key: 'z' },
      { mod: true, key: 'y' },
    ],
    display: { groupKey: EDIT, labelKey: 'SHORTCUTS.ACTION.REDO' },
  },
  'canvas.copy': {
    combos: [{ mod: true, key: 'c' }],
    display: { groupKey: EDIT, labelKey: 'SHORTCUTS.ACTION.COPY' },
  },
  'canvas.cut': {
    combos: [{ mod: true, key: 'x' }],
    display: { groupKey: EDIT, labelKey: 'SHORTCUTS.ACTION.CUT' },
  },
  'canvas.paste': {
    combos: [{ mod: true, key: 'v' }],
    display: { groupKey: EDIT, labelKey: 'SHORTCUTS.ACTION.PASTE' },
  },
  'canvas.duplicate': {
    combos: [{ mod: true, key: 'd' }],
    display: { groupKey: EDIT, labelKey: 'SHORTCUTS.ACTION.DUPLICATE' },
  },
  'canvas.delete': {
    combos: [
      { shift: 'any', key: 'Delete' },
      { shift: 'any', key: 'Backspace' },
    ],
    display: { groupKey: EDIT, labelKey: 'SHORTCUTS.ACTION.DELETE' },
  },
  // Double-click object: ObjectsLayer → vào sửa, caret tại điểm click.
  'canvas.edit-selected': {
    combos: [{ shift: 'any', key: 'Enter' }],
    display: {
      groupKey: EDIT,
      labelKey: 'SHORTCUTS.ACTION.EDIT_SELECTED',
      ways: [[{ combo: { key: 'Enter' } }], [{ pointer: 'double-click' }]],
    },
  },
  // CardClipperButton: thả = cắt đoạn, giữ Alt khi thả = chép.
  'canvas.clip-cut': {
    combos: [],
    display: {
      groupKey: EDIT,
      labelKey: 'SHORTCUTS.ACTION.CLIP_CUT',
      ways: [[{ pointer: 'drag' }]],
    },
  },
  'canvas.clip-copy': {
    combos: [],
    display: {
      groupKey: EDIT,
      labelKey: 'SHORTCUTS.ACTION.CLIP_COPY',
      ways: [[HOLD, { combo: { alt: true } }, WHILE_DRAGGING]],
    },
  },
  'canvas.select-all': {
    combos: [{ mod: true, key: 'a' }],
    display: { groupKey: SELECT, labelKey: 'SHORTCUTS.ACTION.SELECT_ALL' },
  },
  'canvas.deselect': {
    combos: [{ shift: 'any', key: 'Escape' }],
    display: { groupKey: SELECT, labelKey: 'SHORTCUTS.ACTION.DESELECT' },
  },
  // useObjectDrag: Shift+click toggle; Ctrl/Cmd+click không kéo quá ngưỡng → toggle.
  'canvas.toggle-select': {
    combos: [],
    display: {
      groupKey: SELECT,
      labelKey: 'SHORTCUTS.ACTION.TOGGLE_SELECT',
      ways: [
        [SHIFT, { pointer: 'click' }],
        [MOD, { pointer: 'click' }],
      ],
    },
  },
  // usePointerInteraction: kéo vùng trống = marquee, có Shift thì cộng thêm vào chọn cũ.
  'canvas.marquee': {
    combos: [],
    display: {
      groupKey: SELECT,
      labelKey: 'SHORTCUTS.ACTION.MARQUEE',
      ways: [[{ pointer: 'drag' }]],
    },
  },
  'canvas.marquee-add': {
    combos: [],
    display: {
      groupKey: SELECT,
      labelKey: 'SHORTCUTS.ACTION.MARQUEE_ADD',
      ways: [[SHIFT, { pointer: 'drag' }]],
    },
  },
  'canvas.fit': {
    combos: [{ shift: 'any', key: 'f' }],
    display: { groupKey: ZOOM, labelKey: 'SHORTCUTS.ACTION.FIT' },
  },
  'canvas.reset-view': {
    combos: [{ key: '0' }, { mod: true, key: '0' }],
    display: { groupKey: ZOOM, labelKey: 'SHORTCUTS.ACTION.RESET_VIEW' },
  },
  // '+' = Shift+'=' trên bàn phím US, hoặc phím + numpad → nhận cả 2, có/không Shift.
  'canvas.zoom-in': {
    combos: [
      { mod: true, shift: 'any', key: '+' },
      { mod: true, shift: 'any', key: '=', alias: true },
    ],
    display: { groupKey: ZOOM, labelKey: 'SHORTCUTS.ACTION.ZOOM_IN' },
  },
  'canvas.zoom-out': {
    combos: [{ mod: true, shift: 'any', key: '-' }],
    display: { groupKey: ZOOM, labelKey: 'SHORTCUTS.ACTION.ZOOM_OUT' },
  },
  // Chỉ hiển thị: Ctrl/Cmd + lăn chuột (cả pinch trackpad) xử ở CanvasSurface (listener wheel).
  'canvas.zoom-wheel': {
    combos: [{ mod: true, pointer: 'wheel' }],
    display: { groupKey: ZOOM, labelKey: 'SHORTCUTS.ACTION.ZOOM_WHEEL' },
  },
  // Không consume: Space vẫn bấm được nút đang focus như trước.
  // usePointerInteraction: pan khi giữ Space, Ctrl/Cmd + kéo, hoặc kéo chuột giữa.
  'canvas.pan': {
    combos: [{ code: 'Space' }],
    consume: false,
    display: {
      groupKey: NAVIGATION,
      labelKey: 'SHORTCUTS.ACTION.PAN',
      ways: [
        [MOD, { pointer: 'drag' }],
        [HOLD, { combo: { code: 'Space' } }, { pointer: 'drag' }],
        [{ pointer: 'middle-drag' }],
      ],
    },
  },
  // CanvasSurface: Shift + lăn chuột → cuộn ngang.
  'canvas.scroll-sideways': {
    combos: [],
    display: {
      groupKey: NAVIGATION,
      labelKey: 'SHORTCUTS.ACTION.SCROLL_SIDEWAYS',
      ways: [[SHIFT, { pointer: 'wheel' }]],
    },
  },
  // BoardObject: double-click khối màu → vào board.
  'canvas.open-board': {
    combos: [],
    display: {
      groupKey: NAVIGATION,
      labelKey: 'SHORTCUTS.ACTION.OPEN_BOARD',
      ways: [[{ pointer: 'double-click' }]],
    },
  },
  'canvas.layer-up': {
    combos: [{ mod: true, code: 'BracketRight' }],
    display: { groupKey: LAYER, labelKey: 'SHORTCUTS.ACTION.LAYER_UP' },
  },
  'canvas.layer-down': {
    combos: [{ mod: true, code: 'BracketLeft' }],
    display: { groupKey: LAYER, labelKey: 'SHORTCUTS.ACTION.LAYER_DOWN' },
  },
  'canvas.layer-top': {
    combos: [{ mod: true, shift: true, code: 'BracketRight' }],
    display: { groupKey: LAYER, labelKey: 'SHORTCUTS.ACTION.LAYER_TOP' },
  },
  'canvas.layer-bottom': {
    combos: [{ mod: true, shift: true, code: 'BracketLeft' }],
    display: { groupKey: LAYER, labelKey: 'SHORTCUTS.ACTION.LAYER_BOTTOM' },
  },
  'canvas.to-unsort': {
    combos: [{ mod: true, shift: true, key: 'u' }],
    display: { groupKey: UNSORT, labelKey: 'SHORTCUTS.ACTION.TO_UNSORT' },
  },
  'unsort.close': {
    combos: [{ shift: 'any', key: 'Escape' }],
    display: { groupKey: NAVIGATION, labelKey: 'SHORTCUTS.ACTION.CLOSE_UNSORT' },
  },
  // UnsortItem: Shift+click chọn liên tiếp từ item chọn trước.
  'unsort.range': {
    combos: [],
    display: {
      groupKey: UNSORT,
      labelKey: 'SHORTCUTS.ACTION.UNSORT_RANGE',
      ways: [[SHIFT, { pointer: 'click' }]],
    },
  },
  // Cùng tổ hợp với canvas.select-all, khác lớp (panel) → modal chỉ hiện 1 dòng.
  'unsort.select-all': {
    combos: [{ mod: true, key: 'a' }],
  },
} satisfies Record<string, ShortcutDef>;

/**
 * "Gõ [#] rồi [Space]" — kiểu khối Markdown gõ ở đầu dòng. Truyền mảng để mỗi ký tự
 * 1 phím riêng (VD [1][.] như Milanote); chuỗi = 1 phím (VD [##]).
 */
function typeThenSpace(chars: string | readonly string[]): DisplayWay {
  const keys = typeof chars === 'string' ? [chars] : chars;
  return [
    { text: 'SHORTCUTS.WORD.TYPE' },
    ...keys.map((key) => ({ combo: { key } })),
    { text: 'SHORTCUTS.WORD.THEN' },
    { combo: { code: 'Space' } },
  ];
}

/** "Gõ [---]" — mẫu Markdown tự đổi ngay khi gõ xong, không cần Space. */
function typeOnly(chars: string): DisplayWay {
  return [{ text: 'SHORTCUTS.WORD.TYPE' }, { combo: { key: chars } }];
}

/**
 * Phím định dạng chữ trong note: CHỈ hiển thị. Tiptap (StarterKit trong
 * lib/note-schema.ts) tự xử khi đang sửa note; bộ điều phối không đăng ký, lớp
 * tool / panel cũng bỏ qua khi đang gõ nên không chen ngang.
 * Tổ hợp lấy từ addKeyboardShortcuts / input rule của từng extension (đã thử trên trình duyệt).
 * Đổi extension (VD bỏ StarterKit) thì kiểm lại bảng này.
 */
export const NOTE_TEXT_SHORTCUT_DEFS = {
  'note.bold': {
    combos: [{ mod: true, key: 'b' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.BOLD' },
  },
  'note.italic': {
    combos: [{ mod: true, key: 'i' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.ITALIC' },
  },
  'note.underline': {
    combos: [{ mod: true, key: 'u' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.UNDERLINE' },
  },
  'note.strike': {
    combos: [{ mod: true, shift: true, key: 's' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.STRIKE' },
  },
  'note.code': {
    combos: [{ mod: true, key: 'e' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.CODE' },
  },
  'note.h1': {
    combos: [{ mod: true, alt: true, code: 'Digit1' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.H1' },
  },
  'note.h2': {
    combos: [{ mod: true, alt: true, code: 'Digit2' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.H2' },
  },
  'note.h3': {
    combos: [{ mod: true, alt: true, code: 'Digit3' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.H3' },
  },
  'note.bullet': {
    combos: [{ mod: true, shift: true, code: 'Digit8' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.BULLET' },
  },
  'note.numbered': {
    combos: [{ mod: true, shift: true, code: 'Digit7' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.NUMBERED' },
  },
  'note.quote': {
    combos: [{ mod: true, shift: true, key: 'b' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.QUOTE' },
  },
  'note.code-block': {
    combos: [{ mod: true, alt: true, key: 'c' }],
    display: { groupKey: TEXT, labelKey: 'SHORTCUTS.ACTION.CODE_BLOCK' },
  },
  'md.h1': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.H1',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      ways: [typeThenSpace('#')],
    },
  },
  'md.h2': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.H2',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      ways: [typeThenSpace('##')],
    },
  },
  'md.h3': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.H3',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      ways: [typeThenSpace('###')],
    },
  },
  'md.bullet': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.BULLET',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      // `-` và `+` cũng chạy (Tiptap bulletListInputRegex); hiện 1 cách như Milanote cho gọn.
      ways: [typeThenSpace(['*'])],
    },
  },
  'md.numbered': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.NUMBERED',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      ways: [typeThenSpace(['1', '.'])],
    },
  },
  'md.quote': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.QUOTE',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      ways: [typeThenSpace('>')],
    },
  },
  'md.code-block': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.CODE_BLOCK',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      ways: [typeThenSpace('```')],
    },
  },
  'md.hr': {
    combos: [],
    display: {
      groupKey: MARKDOWN,
      labelKey: 'SHORTCUTS.ACTION.HR',
      subgroupKey: 'SHORTCUTS.SUBGROUP.LINE_START',
      ways: [typeOnly('---')],
    },
  },
} satisfies Record<string, ShortcutDef>;
