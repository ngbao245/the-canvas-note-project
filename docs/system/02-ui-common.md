# 02 — Giao diện chung: theme, phong cách, cỡ, chuyển động, lớp z, con trỏ

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: token màu + sáng / tối (`data-theme`), phong cách hiển thị phẳng / vẽ tay (`data-ui-style`), kích thước giao diện, token chuyển động, token lớp z, viền focus, con trỏ 3 tầng, chọn chữ theo vùng, Loading / Empty / Error / Skeleton.

Không gồm: khởi động app, thứ tự nạp CSS (`01`), modal Cài đặt (`05`), landing ký họa (`30`). Luật viết code từng dòng + ví dụ đúng / sai: `.kiro/steering/coding-style.md` (file này chỉ tóm tắt và trỏ sang).

## Hiện trạng

### Token màu và theme

- Nguồn duy nhất: `src/styles/index.css`. Token là HEX / rgba. `tailwind.config.ts` bọc mỗi token bằng `color-mix(in srgb, var(--x) calc(<alpha-value> * 100%), transparent)` (hàm `token()`), nên độ mờ `bg-primary/15`, `border-success/40` chạy được; không có `/xx` thì ra đúng màu gốc. Biến `*-soft` vẫn còn cho chỗ cần đúng 1 mức nhạt đã chỉnh tay. (Trước 2026-10-13 class có `/xx` bị bỏ im lặng.)
- Token màu: `background`, `foreground`, `card` (+ `-foreground`, `-elevated`), `popover` (+ `-foreground`), `muted` (+ `-foreground`), `subtle-foreground`, `primary` (+ `-foreground`, `-hover`, `-soft`), `success` / `warning` / `destructive` (mỗi cái + `-foreground`, `-soft`), `border`, `border-strong`, `input`, `ring`.
- Token không theo màu (`:root`): `--radius` (Tailwind `rounded-lg/md/sm`), `--shadow`, `--shadow-soft`, `--shadow-elevation-1/2/3` (đứng yên / hover / đang kéo; dark đè bản đậm hơn).
- 2 theme: `light` (mặc định) và `dark`. Khối `:root, [data-theme='light']` đứng TRƯỚC `[data-theme='dark']`: cùng độ ưu tiên, khối sau thắng. Chưa gắn `data-theme` thì ra light, lần đầu mở không nháy tối.
- Tailwind `darkMode: ['selector', '[data-theme="dark"]']`.
- Thêm theme: chép khối token, đổi tên `[data-theme='ten-moi']`, mở rộng type `Theme` trong `theme-store.ts`. Không sửa `tailwind.config.ts`.
- `theme-store.ts` (localStorage `bibo-theme`) lưu LỰA CHỌN: `light | dark | system`. `useResolvedTheme()` giải `system` theo `prefers-color-scheme` và tự đổi khi máy đổi. `App.tsx` gắn theme đã giải lên `<html data-theme>`, nên `<html>` không bao giờ mang `system`.
- Font: chữ chung `'Plus Jakarta Sans', Inter, system-ui...` (trên `body`). Tiêu đề card canvas dùng `font-serif` = Fraunces, nạp từ Google Fonts ở đầu `index.css`.
- Ngoại lệ màu cứng: màu do người dùng chọn (màu note) là dữ liệu; giấy ký họa landing dùng biến `--sk-*` riêng, chi tiết `30`.

### Phong cách hiển thị (phẳng / vẽ tay)

- Trục riêng, không phụ thuộc theme. `ui-style-store.ts` (localStorage `bibo-ui-style`): `flat` (shadcn theo token, mặc định) hoặc `hand` (drawably). `App.tsx` gắn `<html data-ui-style>`. Đổi trong Cài đặt → Giao diện.
- `src/components/style/`: vỏ `Button`, `Card`, `Badge` đọc store và render shadcn / drawably. `Badge` phẳng tự dựng bằng `span` + token (chưa cài shadcn Badge). Vỏ khác (Input, Tabs, Tooltip...) dựng khi cần, danh sách trong `style/index.ts`.
- Nơi đang dùng vỏ: `CanvasHeader` (Badge), `ConfirmDialog` (Button). Phần còn lại của app viết thẳng bằng Tailwind + token, không đổi theo phong cách.
- drawably đọc màu qua `--drawably-stroke/fill` = `primary`, `--drawably-paper` = `background` (khai trong `:root`), nên đổi theme thì nét vẽ tay đổi theo. `.drawably-badge` có chỉnh padding + màu chữ trong `index.css`.
- `src/components/ui/` là shadcn gốc, không sửa (`coding-style.md`).

### Kích thước giao diện

- `interface-store.ts` (localStorage `bibo-interface`): `small 0.9 / medium 1 (mặc định) / large 1.1`. Phím `Ctrl+Shift+<` / `>` đổi 1 mức (`lib/shortcuts/global-shortcuts.ts`).
- Đọc: `useInterfaceScale()` trong React, `getInterfaceScale()` ngoài React (engine camera, `useUnsortDrag`).
- Áp theo 2 cách: `style={{ zoom }}` (header canvas, modal Cài đặt, modal phím tắt) và `scaledFillStyle()` (`tools/canvas/lib/scaled-box.ts`, `transform: scale` + bù chiều cao) cho toolbar trái + panel Unsort. Canvas nhân tỉ lệ trong engine camera.

### Chuyển động

- Token: `--duration-fast` 60ms, `--duration-normal` 200ms, `--easing-standard` `cubic-bezier(0.4, 0, 0.2, 1)`. Tailwind: `duration-fast`, `duration-normal`, `ease-standard`.
- `fast` cho thao tác trực tiếp trên canvas; `normal` cho hover / mở đóng ở phần khung (header, modal, menu, panel).
- `el.animate()` không nhận `var()`: đọc lúc chạy bằng `readCssToken()` (`lib/css-token.ts`, đang dùng ở `useObjectDrag`).
- Keyframes có tên: `shimmer` (Skeleton, `index.css`), `presence-pulse` (nhãn "đang sửa ở tab khác", `tailwind.config.ts`).
- Đối chiếu: code ngoài `src/experiments/` không còn `duration-<số>` cứng.

### Lớp z

Có 2 lớp, không so số giữa 2 lớp:

- Chồng object trong board: `CanvasObject.geometry.zIndex` (dữ liệu, `11` / `20`), không phải token.
- Lớp trên màn hình: token `--z-*` trong `index.css`, Tailwind `z-{tên}`, inline `zIndex: 'var(--z-...)'`.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `canvas`, `canvas-object`, `canvas-selection`, `canvas-drag-preview` | 100 / 300 / 500 / 700 | Các lớp bên trong mặt canvas |
| `toolbar` | 20000 | Toolbar trái, nút Unsort, banner, gợi ý |
| `header` | 30000 | Header canvas |
| `drag-layer` | 40000 | Preview kéo portal ra `body` (`FloatingObjectPreview`, Unsort, toolbar) |
| `modal` | 50000 | ConfirmDialog, menu chuột phải, popover |
| `tooltip` | 60000 | Tooltip, menu thả xuống trên cùng |
| `dev` | 90000 | Bảng dev (chỉ dev) |

Preview kéo dùng `drag-layer`, không dùng `canvas-drag-preview`: phải nổi trên toolbar + header, dưới modal. Chưa có sổ z động theo thứ tự mở (chỉ làm khi có modal chồng modal).

### Viền focus

`FOCUS_RING` (`lib/focus-ring.ts`) = `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Còn 8 chỗ (ngoài `ui/`) chép tay chuỗi này, đổi khi đụng tới.

### Con trỏ 3 tầng

1. Chung: `button` có `pointer` từ preflight; `:disabled` + `[aria-disabled='true']` có `not-allowed` từ rule `@layer base` trong `index.css`.
2. Riêng loại vật, class tại component: object canvas `cursor-move`, item kéo ngoài canvas `cursor-grab`, góc resize `nwse-resize`, chữ sửa tại chỗ `cursor-text`.
3. Tạm lúc thao tác: `setCursorOverride('grab' | 'grabbing' | 'not-allowed' | null, target?)` gắn `data-cursor` lên `<html>` (hoặc vùng `target`). CSS `!important` đè mọi con; 2 gốc lồng nhau thì thứ tự rule quyết (`grab` < `grabbing` < `not-allowed`). Đang dùng ở `useObjectDrag`, `CardClipperButton`, `useDemoGestures` (landing).

### Chọn chữ

`select-none` đặt 1 lần ở gốc vùng tương tác: `CanvasSurface` (gồm toolbar), `UnsortPanel`, `CanvasHeader`. Editor Tiptap trong vùng chặn mở lại bằng `select-text` (`NoteObject`). Mảnh dùng chung (phím trong `ShortcutKeys`, `OfflineBadge`) tự chặn trong component.

### Loading / Empty / Error / Skeleton (`components/shared/`)

| Component | Props | Ghi chú |
|---|---|---|
| `Skeleton` | `className` (cỡ) | Khối `bg-muted` + vệt `shimmer` |
| `LoadingState` | `variant: default \| skeleton \| inline`, `label`, `count`, `className` | Mặc định `default` (spinner giữa). `skeleton` = lưới `count` khối `h-24`. Label mặc định `COMMON.LOADING` |
| `EmptyState` | `icon` (lucide), `title`, `description`, `action`, `compact` | |
| `ErrorState` | `message`, `onRetry`, `compact` | Tiêu đề + nút thử lại qua bộ dịch |

Chờ dữ liệu: skeleton theo đúng hình nội dung thật. Spinner chỉ cho nút đang lưu, fallback chuyển trang, nội dung chưa biết hình. Mặt canvas trống dùng chữ gợi ý mờ thay `EmptyState`. Cùng folder còn `UpdateBanner`, `OfflineBadge` (tạm), xem `01`.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-UI-01` | Màu chỉ qua token theme, cấm màu Tailwind cứng (`bg-blue-500`...). Ngoại lệ: màu dữ liệu người dùng, giấy ký họa landing | Đổi / thêm theme ở 1 chỗ | Review + `coding-style.md` |
| `INV-UI-02` | Khối `:root, [data-theme='light']` đứng trước `[data-theme='dark']` | Sai thứ tự: dark không ăn, hoặc lần đầu mở nháy tối | Review `index.css` |
| `INV-UI-03` | `<html data-theme>` chỉ mang theme thật (`light` / `dark`), giải `system` trước khi gắn | CSS không có khối `system` | `useResolvedTheme` + `applyThemeAttr` |
| `INV-UI-13` | Màu trong `tailwind.config.ts` khai qua `token('x')`, không viết `'var(--x)'` thô | `var()` thô làm class `/xx` bị bỏ im lặng | Review. Kiểm: build xong tìm class `\/` trong `dist/assets/*.css` |
| `INV-UI-04` | Thêm theme = thêm khối `[data-theme]` + mở type `Theme`; không thêm tên token mới chỉ cho 1 theme | Mọi theme cùng bộ tên token, Tailwind không phải sửa | Review |
| `INV-UI-05` | Button / Card / Badge cần đổi theo phong cách: import từ `@/components/style`, không gọi drawably hay `components/ui` thẳng. Không sửa `components/ui/` | Đổi phong cách 1 chỗ; giữ shadcn gốc để cập nhật | Review |
| `INV-UI-06` | Chỗ theo kích thước giao diện đọc tỉ lệ qua `useInterfaceScale` / `getInterfaceScale`, không tự giữ hằng số | 3 mức đổi ở 1 chỗ, engine + UI khớp nhau | Review |
| `INV-UI-07` | Thời gian / easing chỉ qua token; `el.animate` đọc bằng `readCssToken`. Cần mức mới thì thêm token ở `index.css` + `tailwind.config.ts` | Đổi nhịp chuyển động ở 1 chỗ | Review |
| `INV-UI-08` | z-index trên màn hình chỉ qua token `--z-*`; không so / trộn với `geometry.zIndex`; preview kéo portal dùng `drag-layer` | Số cứng chồng lớp lộn; preview bị toolbar che | Review |
| `INV-UI-09` | Viền focus bàn phím dùng `FOCUS_RING` | Đổi kiểu focus ở 1 chỗ | Review |
| `INV-UI-10` | Con trỏ tạm chỉ qua `setCursorOverride`, tắt ở cleanup của chính hook bật; cấm `style.cursor`, class trên `body`, thêm `!important` khác | 1 cơ chế đè, không kẹt con trỏ sau khi kéo | Review |
| `INV-UI-11` | `select-none` 1 lần ở gốc vùng; `contenteditable` trong vùng chặn phải `select-text` | Safari không cho chọn chữ khi tổ tiên `none` | Review |
| `INV-UI-12` | Chờ / trống / lỗi dùng `components/shared`, không tự dựng lại; chờ dữ liệu ưu tiên skeleton | Đồng nhất, không nhảy bố cục khi dữ liệu về | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/styles/index.css` | Token màu / hình / chuyển động / z, map drawably, rule con trỏ tầng 1 + 3, `shimmer`, placeholder Tiptap |
| `tailwind.config.ts` | Map token sang class, `darkMode`, `presence-pulse` |
| `src/stores/theme-store.ts` | Lựa chọn theme, giải `system`, `applyThemeAttr` |
| `src/stores/ui-style-store.ts` | Phong cách, `applyUiStyleAttr` |
| `src/stores/interface-store.ts` | Kích thước giao diện |
| `src/App.tsx` | Gắn `data-theme`, `data-ui-style` lên `<html>` |
| `src/components/style/` | Vỏ Button / Card / Badge theo phong cách |
| `src/components/shared/` | Skeleton, Loading / Empty / ErrorState |
| `src/components/settings/sections/AppearanceSection.tsx` | Chọn theme, phong cách, kích thước |
| `src/lib/focus-ring.ts`, `cursor-override.ts`, `css-token.ts` | Viền focus, con trỏ tạm, đọc token lúc chạy |
| `src/tools/canvas/lib/scaled-box.ts` | `scaledFillStyle` cho toolbar + Unsort |

## Nguồn liên quan

- Steering: `.kiro/steering/coding-style.md` (theme, chọn chữ, con trỏ, chuyển động, shared, focus).
- Spec cũ: `docs/legacy/specs/design-system/`.
- Note cũ: `.kiro/notes/design-system.md` (còn luật modal), `docs/legacy/z-index-tiers.md`. Mục Theme của `docs/legacy/architecture.md` (lỗi thời, xem câu mở).
- Việc treo: `.kiro/notes/canvas-backlog.md` mục "Thu nhỏ số z-index".

## Câu còn mở

- (2026-10-13) Spec `design-system` + note `design-system.md` ghi theme mặc định dark, code mặc định light (comment trong `theme-store.ts` ghi bạn chốt 2026-10-05). Chờ bạn xác nhận để bỏ ghi chú cũ.
- (2026-10-13) Spec `design-system` US-3 ghi phong cách mặc định vẽ tay, code mặc định `flat`. Chưa thấy chỗ ghi chốt. Chờ bạn chốt.
- (2026-10-13) Font `Plus Jakarta Sans` đứng đầu `font-family` nhưng không nạp ở đâu (`index.css` chỉ nạp Fraunces, `index.html` không có link font). Máy không cài font này sẽ ra Inter / font hệ thống. Có nạp không: chờ bạn chốt.
- (2026-10-13) Vệt `shimmer` của `Skeleton` dùng `via-white/5` (trắng cứng): nền light gần như không thấy. Có đổi sang token không: chờ bạn chốt.
- (2026-10-13) `CardClipperButton` vừa dùng `setCursorOverride` vừa có `active:cursor-grabbing` (class tầng 3 tại component). Có gỡ class không: chờ bạn chốt.
- (2026-10-13) Thu nhỏ token `--z-toolbar` … `--z-tooltip` từ 20000-60000 xuống 1-9 (giữ tên): còn treo ở `canvas-backlog.md`.
- (2026-10-13) Luật modal (không bị cắt, chỉ thân cuộn, nền cuộn được) trong note `design-system.md` chưa có doc nào trong `docs/system/` nhận, chưa đối chiếu code modal. Đưa vào `02` hay `05`: chờ bạn chốt.
