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

## File shadcn (`src/components/ui/`)

Giữ đúng bản gốc shadcn để sau này cập nhật không phải gộp tay. Không dọn class, không tách export, không sửa theo luật khác trong file này. Cần đổi giao diện thì bọc ngoài hoặc truyền `className` từ chỗ dùng. Cảnh báo lint trong thư mục này (VD `buttonVariants`) là đã biết, bỏ qua.

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

Ngoại lệ thứ 2: giấy ký họa của landing (`src/routes/landing/sketch/` + `LandingPage.tsx`) dùng màu cứng (giấy, mực, đỏ, xanh) trong biến `--sk-*` của `sketch.css` và trong hình SVG, để giữ chất sổ vẽ dù đổi theme. Chỉ trong thư mục landing. Khung canvas thử (`src/routes/landing/demo/`) vẫn phải dùng token theme.

## Chọn chữ (user-select)

Chặn theo vùng, không rải theo từng component.

- Vùng tương tác (kéo thả, pan/zoom, list kéo được): đặt `select-none` 1 lần ở phần tử gốc của vùng. Con bên trong tự kế thừa, không thêm lại.
- `input` / `textarea` trong vùng bị chặn: vẫn chọn được, không cần làm gì.
- `contenteditable` (Tiptap) trong vùng bị chặn: bắt buộc `select-text` (Safari không cho chọn nếu tổ tiên là `none`).
- Chữ trang trí (`aria-hidden`, ảnh preview): chặn ngay tại chỗ. Ảnh thêm `draggable={false}`.
- Mảnh UI dùng lại nhiều nơi (phím `Kbd`, badge, chip): đặt `select-none` trong chính component dùng chung, không đặt ở từng nơi gọi hay ở hàng/bảng bọc ngoài. Chưa có component dùng chung thì tách ra trước rồi mới chặn.
- Đang kéo bằng pointer: hook kéo thả gọi `preventDefault()` ở `pointerdown`, component không tự xử.

Gốc vùng hiện có: `CanvasSurface` (canvas, gồm luôn thanh nút type `Toolbar` và nút mở Unsort), `UnsortPanel` (`<aside>`, ngoài canvas), `CanvasHeader` (`<header>`).

Đúng:
```tsx
<div className="relative flex-1 select-none">   {/* gốc vùng */}
  <div className="flex flex-col">...</div>      {/* con: không thêm select-none */}
  <EditorContent className="select-text" />     {/* contenteditable: mở lại */}
</div>
```

Sai:
```tsx
<div className="select-none">
  <div className="select-none">...</div>        {/* trùng, cha đã chặn */}
  <EditorContent />                             {/* Safari không chọn được chữ */}
</div>
```

## Con trỏ chuột (cursor)

Mỗi loại con trỏ có đúng 1 chỗ quyết định, theo 3 tầng.

**Tầng 1 — chung toàn app, không viết class:**
- `<button>`, `[role="button"]`: `pointer` có sẵn từ preflight Tailwind. Không thêm `cursor-pointer`.
- `disabled` và `aria-disabled="true"`: `not-allowed` từ rule base trong `src/styles/index.css`. Không thêm `cursor-not-allowed` / `disabled:cursor-*`.
- Phần tử click được mà không phải nút (`div`, `li`...): ưu tiên đổi thành `<button>` hoặc thêm `role="button"`. Chỉ khi không được mới viết `cursor-pointer`.

**Tầng 2 — con trỏ riêng của loại vật, class tại component:**
- Object trên canvas: `cursor-move` (`ObjectsLayer`).
- Item kéo được ngoài canvas: `cursor-grab` (`UnsortItem`, `CardClipperButton`).
- Góc resize: tên gốc trình duyệt (`nwse-resize` trong `SelectionBox`).
- Chữ sửa được tại chỗ: `cursor-text` (`BoardTitleRow`).

Vật mới chọn theo bảng trên, không đặt kiểu khác cho cùng ý nghĩa.

**Tầng 3 — con trỏ tạm lúc thao tác (kéo, pan, thả sai chỗ):**
- Chỉ dùng `setCursorOverride(value, target?)` từ `@/lib/cursor-override`. Giá trị: `'grab' | 'grabbing' | 'not-allowed' | null`.
- Mặc định đè toàn trang (`<html>`). Truyền `target` khi chỉ đè trong 1 vùng (giữ Space → `grab` trên mặt canvas).
- Bật ở đâu thì tắt ở cleanup của chính hook đó (pointerup, pointercancel, unmount).
- Cấm `el.style.cursor = ...`, cấm `document.body.classList` cho con trỏ, cấm thêm rule `!important` khác.
- Cần giá trị mới: thêm vào type `CursorOverride` + 1 rule trong `index.css` (đặt theo thứ tự ưu tiên).

Đúng:
```tsx
<button onClick={save}>Lưu</button>                     {/* pointer tự có */}
<button aria-disabled="true">Sắp có</button>             {/* not-allowed tự có */}
setCursorOverride(invalid ? 'not-allowed' : null);        // trong hook kéo thả
```

Sai:
```tsx
<button className="cursor-pointer">Lưu</button>          {/* thừa */}
<button disabled className="disabled:cursor-not-allowed" /> {/* thừa */}
el.style.cursor = 'grabbing';                            // dùng setCursorOverride
document.body.classList.add('drag-invalid');             // dùng setCursorOverride
```

## Chuyển động

Nguồn chuẩn + bảng loại component: `docs/system/02-ui-common.md` mục Chuyển động. Token ở `src/styles/index.css`, preset vào / ra ở `src/styles/motion.css`, code dùng chung ở `@/lib/motion`.

- Nút icon / tile (toolbar, header): `PRESSABLE_MOTION` (hover `quick`, nhấn lún 0.96 `fast`). Nút chữ / pill: `HOVER_MOTION`. Dòng menu: `ROW_MOTION`. Không tự viết `transition-colors duration-*` cho các loại này.
- Popup / menu / modal / toast mới: chọn loại `data-motion` có sẵn + `usePresence(open)` rồi spread `presence.props`. Esc, click ngoài, trả focus theo `open`, không theo `mounted`. Không viết keyframes trong component.
- Panel cạnh: `data-motion="panel"` + `data-side` + `data-state`, luôn mount, đóng thì `inert`.
- Tooltip ở toolbar / header: `<Tooltip label side>` từ `@/components/shared`, bỏ `title`, nút tắt dùng `aria-disabled`.
- Vòng lặp trang trí (`animate-*` lặp vô hạn): gắn `data-motion-loop`. Spinner thì không.
- Cấm số cứng (`duration-200`, `duration-[60ms]`, `cubic-bezier(`) — ESLint chặn. Cần mức mới thì thêm token vào `index.css` + `tailwind.config.ts`.
- Không `hover:scale-*` cho nút / ô màu (hover chỉ đổi màu / viền).
- `el.animate` / rAF: đọc token bằng `readCssToken('--duration-quick', '120ms')`, kiểm `prefersReducedMotion()` từ `@/lib/motion`, không gọi `matchMedia` tay.

## Icon

Chỉ dùng `lucide-react`. Không dùng emoji làm icon, không trộn bộ icon khác. (Chuyển từ `docs/legacy/conventions.md` 2026-10-13.)

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

- File component chỉ export component. Hàm / hằng số cần dùng ở file khác đặt trong `lib/`, hook đặt trong `hooks/`. Không export "phòng hờ": chưa có file nào import thì để nội bộ.
  Ngoại lệ duy nhất: file shadcn (mục trên), lint báo `react-refresh` là đã biết.
- Loại object canvas: renderer ở `components/objects/XxxObject.tsx` (chỉ export component), định nghĩa ở `xxx-type.ts(x)` (`ObjectTypeDefinition`), thêm vào mảng `OBJECT_TYPES` trong `objects/index.ts`. Không gọi `registerObjectType` trong file renderer.

- Viền focus bàn phím: dùng `FOCUS_RING` từ `@/lib/focus-ring`, không chép chuỗi `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. File cũ còn chuỗi chép tay thì đổi khi đụng tới.

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

Luật cấm áp cho mọi component. **Thêm, đổi hoặc hiển thị 1 phím tắt: đọc `.kiro/steering/shortcuts.md` trước** (cách khai báo, thứ tự lớp, key / code, hiển thị). File đó tự nạp khi mở file phím tắt, nhưng sửa component thường thì không, nên Kiro phải chủ động đọc.

- Mọi phím đi qua bộ điều phối `@/lib/shortcuts`. Cấm tự gắn `addEventListener('keydown')` trên `window` / `document`. Phím trong editor Tiptap: khai báo bằng extension `addKeyboardShortcuts` (mẫu: `src/tools/canvas/lib/note-commit-keys.ts`), không gắn `keydown` tay. Ô nhập thường dùng `onKeyDown` trên chính ô đó. Ô sửa 1 dòng dùng `editKeyHandler({ onCommit, onCancel })` từ `@/lib/dom`; listener tự viết phải kiểm `isImeComposing(e)` trước.
- Hiện phím trong UI: dùng `<ShortcutWays def={...} />` hoặc `shortcutKeys(def, useKeyboardPlatform())`. Không tự viết `<Kbd>Ctrl</Kbd>`, không tính nhãn phím ở cấp module.
- Thao tác chuột có phím giữ: `isPrimaryModifier(e)`, không viết `e.ctrlKey || e.metaKey`. Handler chọn / kéo bằng nút trái bỏ qua `isMacSecondaryClick(e)`. Lăn chuột để zoom: `isZoomWheel(e)` (nhận cả Ctrl lẫn Cmd vì pinch trackpad gửi `ctrlKey`).
- Popup / menu chỉ cần Esc: `useEscapeLayer(onClose, { enabled: open })`. Modal có Esc + giữ Tab: `useModalLayer(onClose, dialogRef, { enabled: open })`.
- Không ghi cứng tổ hợp phím trong file dịch. Tooltip: `t('COMMON.WITH_SHORTCUT', { label, keys: shortcutKeys(DEFS['id']) })`.

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
- Hằng số ngoài component (danh sách màu, menu): lưu KEY, dịch lúc render (xem `src/tools/canvas/lib/note-colors.ts` + `NoteToolbar`).
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
- Tên mặc định của board ("Home", "New Board" trong `engine/actions.ts`, `types.ts`): luôn tiếng Anh, KHÔNG đưa qua bộ dịch, vì tên lưu vào dữ liệu.

### Tự kiểm tra (PowerShell, chạy ở gốc `bibo`)

```powershell
$files = Get-ChildItem -Recurse -Include *.tsx src | Where-Object { $_.FullName -notmatch '\\(lib\\i18n|experiments)\\' }
# Chữ tiếng Việt nằm giữa thẻ JSX
$files | Select-String -Pattern '>[^<>{}]*[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ][^<>{}]*<'
# Thuộc tính còn chữ cứng
$files | Select-String -Pattern '(title|aria-label|placeholder|label|alt)="[^"]*[A-Za-zÀ-ỹ]{2,}'
```

Hai lệnh chỉ bắt kiểu hay gặp. Chữ tiếng Anh giữa thẻ (`<span>Default</span>`) và chữ trong biến / hằng số thì lệnh không bắt hết, Kiro rà thêm ở bước rà soát.
