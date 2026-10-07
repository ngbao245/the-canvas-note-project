---
inclusion: fileMatch
fileMatchPattern: 'src/**/*.{ts,tsx}'
---

# Coding Style — bibo

Chỉ load khi Kiro đọc file trong `src/`. Rule ngắn + ví dụ.

## TypeScript

- `strict: true`. Không `any`. Không unused locals.
- Kiểm tra kiểu trước khi dùng (narrow bằng `typeof`, `in`, guard).
- Alias `@/` trỏ `src/`. Dùng thay relative dài.

Đúng:
```ts
function parse(input: unknown): Result {
  if (typeof input !== 'string') throw new Error('...');
  // narrow xong mới xài input như string
  return { text: input };
}
```

Sai:
```ts
function parse(input: any): any {
  return input.toString();
}
```

## Đặt tên file

- Component React: `PascalCase.tsx` (`NoteObject.tsx`, `CanvasHeader.tsx`).
- Hook: `useCamelCase.ts` (`useObjectDrag.ts`).
- Util/lib: `kebab-case.ts` (`hit-test.ts`, `pan-bounds.ts`).
- Route: `PascalCase.tsx` hoặc `route.tsx` khi trong `src/tools/{name}/`.

## Folder tool

Tool đặt trong `src/tools/{tên}/`. Cấu trúc chuẩn:

```
src/tools/{tên}/
  route.tsx       — entry route
  api.ts          — repository / adapter
  types.ts        — Zod schema + types
  components/     — UI
  hooks/          — hook riêng của tool
  engine/         — pure logic (nếu tool phức tạp)
  lib/            — util nội bộ tool
  store/          — Zustand store riêng
```

Import vào `App.tsx` bằng lazy: `lazy(() => import('./tools/{tên}/route'))`.

## Theme token

Dùng token trong `src/styles/index.css`:

- `primary` — CTA, brand highlight
- `foreground` / `muted-foreground` — text
- `background` / `card` / `popover` / `muted` — surface
- `border` / `input` / `ring` — outline
- `destructive` — error, delete
- `success` — completed, ok
- `warning` — cảnh báo pending

Đúng:
```tsx
<div className="bg-primary text-foreground border-border" />
<span className="bg-success/10 text-success">Xong</span>
<span className="text-destructive">Lỗi</span>
```

Sai:
```tsx
<div className="bg-blue-500 text-slate-100" />
<div className="bg-emerald-400" />
<span className="bg-green-500/10 text-green-500" />  // dùng success
<span className="bg-yellow-500/10 text-yellow-500" /> // dùng warning
```

Data màu do user chọn (highlight vàng/xanh/đỏ, diff added/removed) là ngoại lệ — hard-code được vì là data, không phải theme.

## Console

- Không `console.log` trong commit.
- Chỉ `console.warn` / `console.error` khi thật cần, kèm comment:

```ts
// eslint-disable-next-line no-console
console.warn('[canvas] persist failed', err);
```

## State

- UI state → Zustand store.
- Server state → TanStack Query v5.
- Không dùng Redux, không dùng Context cho global state mới.
- Store đặt trong `src/stores/` (global) hoặc `src/tools/{tên}/store/` (riêng tool).

## Hook rule

- `useCallback` / `useMemo` chỉ khi có lý do rõ (deps của effect khác, prop truyền xuống child memoized). Không dùng "phòng hờ".
- Hook deps đầy đủ. Nếu cố ý bỏ deps thì kèm `// eslint-disable-next-line react-hooks/exhaustive-deps` + comment lý do.

## Component pattern

- Cấu trúc file component:
  1. Import
  2. Type / interface local
  3. Constant
  4. Export component chính
  5. Subcomponent (nếu có)
  6. Helper (nếu có)

- Prop dùng inline object type nếu ≤ 4 field, tách interface nếu > 4:

```tsx
// Nhỏ, inline
function Badge({ tone, children }: { tone: 'default' | 'primary'; children: ReactNode }) {}

// Lớn, tách
interface CanvasHeaderProps {
  board: Board;
  onFit: () => void;
  onReset: () => void;
  onSettings?: () => void;
  onExport?: () => void;
}
function CanvasHeader(props: CanvasHeaderProps) {}
```

## Comment

- Comment tiếng Việt. Ngắn, đi vào lý do (why), không mô tả code (what).
- File có logic phức tạp → header comment ở đầu file mô tả kiến trúc/luồng.
- Comment lỗi thời phải xóa (không giữ comment không còn đúng).

Đúng:
```ts
// Anchor lock: derive x/y từ zoom(t) để cursor không drift ~12px trong ramp.
```

Sai:
```ts
// Set zoom
this.zoom = newZoom;
```

## Shared components

Import từ `@/components/shared` cho loading / empty / error:

```tsx
import { LoadingState, EmptyState, ErrorState } from '@/components/shared';
```

- Loading async data → `<LoadingState variant="skeleton" />` match footprint content thật.
- Empty state → `<EmptyState icon={...} title="..." description="..." action={...} />`.
- Error → `<ErrorState message={...} onRetry={...} />`.

Không tự viết inline copy-paste. Xem trực tiếp `src/components/shared/{LoadingState,EmptyState,ErrorState}.tsx` để biết props có sẵn.

## Phím tắt

Mọi phím đi qua bộ điều phối `@/lib/shortcuts` (spec `.kiro/specs/shortcuts/`). Cấm tự gắn `addEventListener('keydown')` trên `window` / `document`. Ngoại lệ duy nhất: listener trên chính phần tử đang gõ (Tiptap editor, `onKeyDown` của ô nhập). Ô sửa 1 dòng dùng `editKeyHandler({ onCommit, onCancel })` từ `@/lib/dom` (đã bỏ qua lúc bộ gõ ghép chữ); listener tự viết phải kiểm `isImeComposing(e)` trước.

- Phím của tool: khai báo dữ liệu ở `src/tools/{tên}/shortcuts.ts` (chỉ dữ liệu, không import store), gắn hành động bằng `bindShortcuts(defs, handlers)` + `useShortcutLayer('tool' | 'panel', ...)`. Có `display` → tự hiện trong modal phím tắt (`src/components/shortcuts/ShortcutsModal.tsx`; tool mới thì thêm bảng defs vào `ALL_DEFS` ở đó). Thao tác chuột / phím do Tiptap xử: khai báo `combos: []` + `display.ways` (chỉ hiển thị, không handler) và chỉ ghi khi đã thử thấy chạy.
- Gợi ý phím trong UI (Cài đặt, tooltip) dùng `<ShortcutWays def={...} />` hoặc `shortcutKeys(def)`, không tự viết `<Kbd>Ctrl</Kbd>` — để Mac tự hiện ⌘. Phím 2 OS đều có (Shift, Alt, Enter, Backspace) hiện cùng tên chữ, chỉ Ctrl đổi thành ⌘.
- Trong component, gọi `shortcutKeys` / `formatCombo` thì truyền `useKeyboardPlatform()` làm tham số thứ 2, để đổi Kiểu bàn phím trong Cài đặt là nhãn đổi ngay. Không tính nhãn phím ở cấp module.
- Thao tác chuột có phím giữ (chọn thêm, kéo màn hình): dùng `isPrimaryModifier(e)` (Cmd trên Mac, Ctrl nơi khác), không viết `e.ctrlKey || e.metaKey`. Handler chọn / kéo bằng nút trái phải bỏ qua `isMacSecondaryClick(e)` (Ctrl + click trên Mac là chuột phải). Ngoại lệ: zoom bằng lăn chuột giữ `ctrlKey || metaKey` vì pinch trackpad gửi `ctrlKey`.
- Popup / menu chỉ cần Esc: `useEscapeLayer(onClose, { enabled: open })`. Dialog / modal chặn phím bên dưới: `useShortcutLayer('overlay', [...], { enabled: open, blocking: true })`.
- Thứ tự lớp: global → overlay (mở sau trước) → panel → tool. Lớp tool / panel không chạy khi đang gõ chữ.
- `run` trả `false` = không xử lý, phím rơi xuống lớp dưới / trình duyệt. Hành động đọc state bằng `getState()`.
- Chữ cái dùng `key` (không phân biệt hoa/thường). Phím đổi ký tự khi giữ Shift (`[` `]`) dùng `code`.
- Thao tác tắt bằng chuột (Ctrl + lăn chuột...) cũng khai báo trong bảng với `pointer: 'wheel'`, không cần handler. Bộ điều phối bỏ qua loại này, hành động nằm ở listener chuột; bảng chỉ để hiện trong Cài đặt / tooltip.
- Không ghi cứng tổ hợp phím trong file dịch. Tooltip: `t('COMMON.WITH_SHORTCUT', { label, keys: shortcutKeys(DEFS['id']) })`. Trong câu: thêm biến `{undo}`... rồi truyền `shortcutKeys(...)` / `formatCombo(...)`.

## Chữ UI và đa ngôn ngữ (i18n)

Mọi chữ người dùng nhìn thấy hoặc nghe thấy phải qua bộ dịch, không viết chữ cứng trong JSX. Spec: `.kiro/specs/i18n/`.

### Thêm 1 câu

1. Thêm key vào `src/lib/i18n/locales/vi.json` (nguồn chuẩn), rồi thêm đúng key đó vào `en.json`.
   Thiếu bên en → `tsc` báo lỗi tại `src/lib/i18n/messages.ts`.
2. Key IN HOA, lồng theo vùng: `{VÙNG}.{KHỐI}.{TÊN}`. Vùng: `COMMON`, `SETTINGS`, `SHORTCUTS`, `CANVAS`, `ACCOUNT`, `LANDING`.
   Tên nhiều từ nối bằng `_`: `UNDO_TITLE`, `FIT_CONTENT`. Hai thứ giữ chữ thường: `one` / `other` của số nhiều
   (tên do trình duyệt trả về) và biến trong câu `{name}`, `{count}` (tên tham số).
   Câu dùng nhiều nơi (Huỷ, Xoá, OK) để ở `COMMON`, không chép lại.
3. Trong component: `const { t } = useI18n();` rồi `t('CANVAS.HEADER.FIT_CONTENT')`. Gõ sai key → `tsc` báo.

### Các kiểu câu

- Chèn biến: viết `{tên}` trong câu, truyền qua tham số.
  `"title": "Xoá board \"{name}\"?"` → `t('CANVAS.CONFIRM.DELETE_BOARD.TITLE', { name: board.name })`.
- Số nhiều: key là object có `other` (bắt buộc) và `one` (en cần, vi không cần), truyền `count`.
  `t('CANVAS.COUNT.OBJECT', { count: 3 })` → en "3 objects", vi "3 object". Số trong `{count}` tự định dạng theo ngôn ngữ.
- Ghép nhiều phần có số nhiều riêng: dịch từng phần rồi ghép bằng 1 key (xem `deleteBoardItems` trong `CanvasApp.tsx`).
- Số đứng riêng: `formatNumber(n)` từ `useI18n()`. Không `toLocaleString('vi-VN')`.
  Cần cố định số chữ số thập phân thì truyền tham số thứ 2: `formatNumber(1.5, 1)` → vi "1,5", en "1.5".
- Hằng số ngoài component (danh sách màu, menu): lưu KEY, dịch lúc render (xem `lib/note-colors.ts` + `NoteToolbar`).
- Ngoài React (engine, hàm tạo object): `import { t } from '@/lib/i18n'`. Chỉ cho chữ tạo 1 lần, không tự đổi khi đổi ngôn ngữ.

Mẫu đã làm sẵn: `LocalizationSection`, `DataSection`, `CanvasHeader`, `ConfirmDialog` + `CanvasApp`, phần chọn màu trong `NoteToolbar`.

### Đúng / sai

Đúng:
```tsx
const { t } = useI18n();
<Badge>{t('CANVAS.COUNT.OBJECT', { count })}</Badge>
<IconButton title={t('CANVAS.HEADER.UNDO_TITLE')} ariaLabel={t('CANVAS.HEADER.UNDO')} />
```

Sai:
```tsx
<Badge>{count} object{count === 1 ? '' : 's'}</Badge>   // tự ghép số nhiều
<IconButton title="Undo (Ctrl+Z)" ariaLabel="Undo" />   // title / aria-label cũng là chữ UI
const LABEL = t('CANVAS.HEADER.UNDO');                   // gọi t() ở ngoài component → không đổi khi đổi ngôn ngữ
`Sẽ mất ${n} object` + ' + ' + `${b} board con`          // cộng chuỗi, en không dịch được thứ tự câu
```

### Không dịch

- Dữ liệu người dùng: tên board, nội dung note.
- Tên riêng: bibo, Canvas, Note, Board (khi là tên loại object). Tên phím: Ctrl, Shift, Delete.
  Unsort thì có dịch: vi "Khay chờ" (key `CANVAS.UNSORT.TITLE`), en giữ "Unsort". Câu nào nhắc tới Unsort phải dùng đúng từ này.
- Tên mặc định board lưu vào dữ liệu: "Home", "New Board" (luôn tiếng Anh).
- Comment trong code (vẫn tiếng Việt), `console.warn`, label undo trong `engine/actions.ts` (chưa hiện trên UI).
- Tên ngôn ngữ trong `LOCALE.*`: luôn viết bằng chính tiếng đó ("English" ở cả 2 bộ).

### Gotcha

- `title`, `aria-label`, `placeholder`, `alt` đều phải dịch, không chỉ chữ giữa thẻ.
- `useToolbarPopupClose({ anchorLabel })` tìm nút mở theo `aria-label`. Dịch label của nút thì `anchorLabel` phải dùng cùng key, không thì click nút không đóng popup.
- Tên mặc định của board ("Home", "New Board" trong `engine/actions.ts`, `lib/board-tree.ts`, `types.ts`): luôn tiếng Anh, KHÔNG đưa qua bộ dịch. `normalizeBoards` so tên "Home" / "Board", dịch là hỏng.

### Tự kiểm tra (PowerShell, chạy ở gốc `bibo`)

```powershell
$files = Get-ChildItem -Recurse -Include *.tsx src | Where-Object { $_.FullName -notmatch '\\(lib\\i18n|experiments)\\' }
# Chữ tiếng Việt nằm giữa thẻ JSX
$files | Select-String -Pattern '>[^<>{}]*[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][^<>{}]*<'
# Thuộc tính còn chữ cứng
$files | Select-String -Pattern '(title|aria-label|placeholder|label|alt)="[^"]*[A-Za-zÀ-ỹ]{2,}'
```

Hai lệnh chỉ bắt kiểu hay gặp. Chữ tiếng Anh giữa thẻ (`<span>Default</span>`) và chữ trong biến / hằng số thì lệnh không bắt hết, Kiro rà thêm ở bước rà soát.
