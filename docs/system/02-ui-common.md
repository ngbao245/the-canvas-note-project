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
- Font (2026-10-15): 3 vai trò, khai 1 chỗ. `@import` Google Fonts đầu `index.css` nạp Inter + Fraunces + JetBrains Mono; `tailwind.config.ts` `fontFamily`: `sans` = Inter (body qua `font-sans`, thân note, UI), `serif` = Fraunces (heading note, tên board header `TITLE_TEXT_CLS`), `mono` = JetBrains Mono (code note). Đổi font: sửa dòng `@import` + bảng `fontFamily`, không ghi tên font trong component.
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

Spec: `.kiro/specs/motion-system/`. Luật chung: không spring, không nảy, không vượt đích; scale nhỏ nhất 0.96, không phóng quá 1; thoát nhanh hơn vào; không hiệu ứng nào chặn thao tác.

Ba nhóm, chung token, khác cơ chế:

| Nhóm | Cơ chế | Chỗ |
|---|---|---|
| Vào / ra (popup, menu, modal, tooltip, toast) | Keyframes theo `data-motion` + `data-state`, hook `usePresence` giữ mount tới khi thoát xong | `src/styles/motion.css`, `src/lib/motion/usePresence.ts` |
| Panel cạnh | Transition trên phần tử luôn mount (`data-motion="panel"`), đóng thì `inert` | `motion.css`, `CanvasApp` |
| Tương tác (hover, nhấn) | Hằng class `PRESSABLE_MOTION` (nút icon / tile), `HOVER_MOTION` (nút chữ), `ROW_MOTION` (dòng menu) | `src/lib/motion/interaction.ts` |
| Liên tục (kéo, pan, zoom) | Vòng rAF riêng; đọc token bằng `readCssToken`, kiểm `prefersReducedMotion()` | `camera-engine`, `useObjectDrag`, `useEdgePan` |

Token (`:root` trong `index.css`, Tailwind map `duration-*`, `ease-*`):

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--duration-fast` | 60ms | Nhấn nút, dòng menu, dropdown / menu chuột phải / sheet thoát, phản hồi trực tiếp object |
| `--duration-quick` | 120ms | Hover nút (cả toolbar canvas), popup / modal thoát, tooltip, menu chuột phải vào, card trượt vào chỗ khớp |
| `--duration-normal` | 160ms | Popup / dropdown / modal / toast vào, panel đóng, đổi màu chrome |
| `--duration-slow` | 220ms | Panel mở, sheet vào |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Đổi trạng thái tại chỗ |
| `--easing-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Xuất hiện |
| `--easing-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Biến mất |
| `--motion-shift` / `--motion-shift-lg` | 4px / 8px | Quãng dịch popup / modal, toast (tooltip dùng nửa `shift`) |
| `--motion-scale-pop` / `--motion-scale-modal` | 0.98 / 0.96 | Scale khởi đầu popup, menu / modal, sheet |
| `--backdrop` | đen 40% | Nền mờ sau modal hộp |

Loại `data-motion` (thêm loại mới: 1 khối trong `motion.css` + 1 dòng ở đây, không viết keyframes trong component):

| Loại | Áp cho | Vào | Ra |
|---|---|---|---|
| `popover` | Popup toolbar (`ToolbarPopup`, cấp trạng thái qua `PopupActionButton`) | mờ + scale 0.98 + dịch 4px từ phía nút (`data-side`), gốc ở đầu mũi tên. `normal` + `enter` | mờ, `quick` + `exit` |
| `dropdown` | View, Export, Help, Account, breadcrumb "..." | như popover, dịch từ trên xuống, gốc góc trên phải (`data-align="start"` → trái). `normal` | mờ, `fast` |
| `context-menu` | Menu chuột phải canvas | mờ + scale 0.98, `quick` | mờ, `fast` |
| `modal-backdrop` + `modal` | ConfirmDialog, ShortcutsModal | nền mờ dần; hộp mờ + scale 0.96 + dịch 8px lên, chạy song song | cả hai mờ, `quick`, hộp thu về 0.96 |
| `sheet` | SettingsModal (toàn màn) | mờ + scale 0.96 + dịch 4px lên, `slow` | mờ + thu về 0.96, `fast` |
| `tooltip` | `Tooltip` | mờ + dịch 2px, `quick` | gỡ ngay |
| `toast` | CanvasNotice, UpdateBanner, OfflineBadge | mờ + dịch 8px từ cạnh gắn (`data-edge`) | mờ |
| `fade` | Nút mở Khay chờ | mờ chéo, `quick` | mờ chéo |
| `panel` | Khay chờ | trượt vào `slow` + `enter` | trượt ra `normal` + `exit`, quay đầu được giữa chừng |

Vòng đời vào / ra (`usePresence`):
- Mở là render ngay. Đóng: phần tử giữ lại với `data-state="closed"`, gỡ khi `animationend` của chính nó (hẹn giờ dự phòng 400ms khi tab ẩn).
- Lớp phím (Esc, chặn phím), click ngoài, trả focus theo `open`, không theo `mounted`: gỡ ngay khi bắt đầu đóng.
- Phần tử đang tan: `pointer-events: none` + `aria-hidden` → click đi xuống phần bên dưới.
- Đang tan mà mở lại → về `open`, keyframes vào chạy lại.
- Cha cần giữ nội dung lần cuối lúc tan (ConfirmDialog, CanvasNotice) thì tự nhớ bằng ref.
- Dùng thuộc tính `translate` / `scale` riêng, không `transform`, để không đè transform sẵn có (căn giữa `-translate-x-1/2`, scale giao diện của `ToolbarPopup`).

Tooltip (`components/shared/Tooltip.tsx`): chỉ ở nút toolbar canvas + header; chỗ khác vẫn `title=`. Trễ 500ms, "ấm" 300ms (rê sang nút kế hiện ngay), focus bàn phím hiện ngay, ẩn khi rời / nhấn / Esc (Esc vẫn rơi xuống lớp dưới), bỏ qua chạm. Nút dùng Tooltip bỏ `title`, giữ `aria-label`; nút tắt dùng `aria-disabled` (nút `disabled` không nhận chuột).

Giảm chuyển động: 1 khối `@media (prefers-reduced-motion: reduce)` ở `motion.css` đặt biên độ về 0 / scale về 1 (chỉ còn mờ dần), panel hiện thẳng, phần tử `data-motion-loop` (save-breathe, presence-pulse, shimmer) đứng yên; spinner vẫn quay. JS: `prefersReducedMotion()` (thả object nhảy thẳng vào chỗ khớp, Fit / Về 100% nhảy thẳng tới đích). Sau này thêm lựa chọn trong Cài đặt: lặp khối đó cho `:root[data-motion-pref='reduce']`.

- `el.animate()` không nhận `var()`: đọc lúc chạy bằng `readCssToken()` (`lib/css-token.ts`).
- Keyframes có tên ở `tailwind.config.ts`: `shimmer`, `presence-pulse`, `save-breathe(-strong)`. Nhịp riêng của từng chỉ báo, không phải token chung.
- Kiểm tự động: ESLint chặn `duration-<số>`, `duration-[...]`, `cubic-bezier(` trong `src/**/*.ts(x)` (trừ `experiments`). CSS chưa có lint: `cubic-bezier` chỉ được nằm ở `index.css`.

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

`OverlayScroll` (cùng folder): vùng cuộn dọc có tay cuộn tự vẽ (kiểu Milanote). Giấu thanh cuộn gốc, tay cuộn nổi đè mép phải, hiện khi hover / cuộn / kéo. Lý do: thanh cuộn hệ thống Windows còn mũi tên, CSS không gỡ chắc được. `className` = khung ngoài, `viewportClassName` = vùng cuộn; `ref` + prop khác gắn vào vùng cuộn. Đang dùng ở Cài đặt, Phím tắt, Unsort, popup icon board, popup Text style của note. Màu tay cuộn: token `--scrollbar-thumb` / `--scrollbar-thumb-hover` trong `index.css` (riêng sáng / tối, class `bg-scrollbar-thumb`), dùng chung cho `OverlayScroll`, thanh cuộn canvas và thanh cuộn trình duyệt.

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
| `INV-UI-07` | Thời gian / easing chỉ qua token; `el.animate` đọc bằng `readCssToken`. Cần mức mới thì thêm token ở `index.css` + `tailwind.config.ts`. Vào / ra chọn loại `data-motion` có sẵn, không viết keyframes trong component | Đổi nhịp chuyển động ở 1 chỗ | ESLint (`duration-<số>`, `cubic-bezier(`) + Review |
| `INV-UI-14` | Overlay có hiệu ứng thoát dùng `usePresence`; lớp phím, click ngoài, trả focus theo `open` (gỡ ngay khi bắt đầu đóng); phần tử đang tan không nhận click | Esc / click không bị phần tử đang biến mất nuốt | Review |
| `INV-UI-15` | Giảm chuyển động 1 nguồn: CSS ở khối `prefers-reduced-motion` của `motion.css`, JS qua `prefersReducedMotion()`; vòng lặp trang trí gắn `data-motion-loop` | Không rải `matchMedia` / `motion-safe:` theo từng component | Review |
| `INV-UI-08` | z-index trên màn hình chỉ qua token `--z-*`; không so / trộn với `geometry.zIndex`; preview kéo portal dùng `drag-layer` | Số cứng chồng lớp lộn; preview bị toolbar che | Review |
| `INV-UI-09` | Viền focus bàn phím dùng `FOCUS_RING` | Đổi kiểu focus ở 1 chỗ | Review |
| `INV-UI-10` | Con trỏ tạm chỉ qua `setCursorOverride`, tắt ở cleanup của chính hook bật; cấm `style.cursor`, class trên `body`, thêm `!important` khác | 1 cơ chế đè, không kẹt con trỏ sau khi kéo | Review |
| `INV-UI-11` | `select-none` 1 lần ở gốc vùng; `contenteditable` trong vùng chặn phải `select-text` | Safari không cho chọn chữ khi tổ tiên `none` | Review |
| `INV-UI-12` | Chờ / trống / lỗi dùng `components/shared`, không tự dựng lại; chờ dữ liệu ưu tiên skeleton | Đồng nhất, không nhảy bố cục khi dữ liệu về | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/styles/index.css` | Token màu / hình / chuyển động / z, map drawably, rule con trỏ tầng 1 + 3, placeholder Tiptap |
| `src/styles/motion.css` | Preset vào / ra theo `data-motion`, panel, khối giảm chuyển động |
| `src/lib/motion/` | `usePresence`, `prefersReducedMotion`, hằng class tương tác |
| `src/components/shared/Tooltip.tsx` | Tooltip có độ trễ (toolbar, header) |
| `tailwind.config.ts` | Map token sang class, `darkMode`, keyframes `shimmer` / `presence-pulse` / `save-breathe` |
| `src/stores/theme-store.ts` | Lựa chọn theme, giải `system`, `applyThemeAttr` |
| `src/stores/ui-style-store.ts` | Phong cách, `applyUiStyleAttr` |
| `src/stores/interface-store.ts` | Kích thước giao diện |
| `src/App.tsx` | Gắn `data-theme`, `data-ui-style` lên `<html>` |
| `src/components/style/` | Vỏ Button / Card / Badge theo phong cách |
| `src/components/shared/` | Skeleton, Loading / Empty / ErrorState, OverlayScroll |
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
- (2026-10-13) Vệt `shimmer` của `Skeleton` dùng `via-white/5` (trắng cứng): nền light gần như không thấy. Có đổi sang token không: chờ bạn chốt.
- (2026-10-13) `CardClipperButton` vừa dùng `setCursorOverride` vừa có `active:cursor-grabbing` (class tầng 3 tại component). Có gỡ class không: chờ bạn chốt.
- (2026-10-13) Thu nhỏ token `--z-toolbar` … `--z-tooltip` từ 20000-60000 xuống 1-9 (giữ tên): còn treo ở `canvas-backlog.md`.
- (2026-10-13) Luật modal (không bị cắt, chỉ thân cuộn, nền cuộn được) trong note `design-system.md` chưa có doc nào trong `docs/system/` nhận, chưa đối chiếu code modal. Đưa vào `02` hay `05`: chờ bạn chốt.
