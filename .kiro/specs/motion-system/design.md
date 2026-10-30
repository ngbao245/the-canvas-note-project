# Thiết kế — Hệ thống chuyển động (motion-system)

**Trạng thái**: Nháp, chờ duyệt

## Ba nhóm, ba cơ chế

| Nhóm | Cơ chế | Lý do |
|---|---|---|
| Vào / ra (popup, menu, modal, tooltip, toast) | Keyframes CSS chọn theo loại (thuộc tính `data-motion`) và trạng thái (`data-state="open\|closed"`). Một hook giữ phần tử trong trang tới khi hiệu ứng thoát xong (nghe `animationend`, có hẹn giờ dự phòng) | Keyframes tự chạy khi mount, không cần đợi frame. Unmount sau khi thoát xong |
| Panel cạnh | Transition CSS trên phần tử luôn mount, đóng thì `inert` | Transition quay đầu được từ vị trí đang dở |
| Tương tác (hover, nhấn, focus) | Chuỗi class Tailwind dùng chung, dạng hằng như `FOCUS_RING` | Không cần JS |
| Liên tục (kéo, pan, zoom) | Giữ vòng rAF hiện có. Đọc thời gian / easing từ token qua `readCssToken`, kiểm giảm chuyển động qua helper chung | Phải bám tay 1:1 |

## Token

Đặt ở `:root` trong `src/styles/index.css`, map sang Tailwind trong `tailwind.config.ts`. Giữ tên cũ, chỉ thêm.

| Token | Giá trị | Tailwind | Dùng cho |
|---|---|---|---|
| `--duration-fast` | 60ms | `duration-fast` | Nhấn nút, menu chuột phải thoát, hover dòng menu, phản hồi trực tiếp object |
| `--duration-quick` (mới) | 120ms | `duration-quick` | Hover nút, popup / menu / modal thoát, tooltip, card trượt vào chỗ khớp |
| `--duration-normal` | 160ms | `duration-normal` | Popup / dropdown / modal / toast vào, panel đóng, đổi màu chrome |
| `--duration-slow` (mới) | 220ms | `duration-slow` | Panel mở, sheet vào |
| `--easing-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | `ease-standard` | Đổi trạng thái tại chỗ (màu, toggle, nhấn) |
| `--easing-enter` (mới) | `cubic-bezier(0.16, 1, 0.3, 1)` | `ease-enter` | Xuất hiện. Không vượt 1 nên không nảy |
| `--easing-exit` (mới) | `cubic-bezier(0.4, 0, 1, 1)` | `ease-exit` | Biến mất |
| `--motion-shift` (mới) | 4px | — | Quãng dịch popup / menu |
| `--motion-shift-lg` (mới) | 8px | — | Quãng dịch modal / toast |
| `--motion-scale-pop` (mới) | 0.98 | — | Scale khởi đầu popup / menu |
| `--motion-scale-modal` (mới) | 0.96 | — | Scale khởi đầu modal hộp, sheet |

Thời gian của vòng lặp trang trí (save-breathe 2.8s / 1.1s, presence-pulse 1.5s, shimmer 1.6s) giữ giá trị, gom định nghĩa về `tailwind.config.ts` (shimmer hiện viết arbitrary trong `Skeleton`). Đây là nhịp riêng của từng chỉ báo, không thành token dùng chung.

## Bảng quy định theo loại component

| Loại (`data-motion`) | Áp cho | Vào | Ra | Gốc / hướng |
|---|---|---|---|---|
| `popover` | 8 popup qua `ToolbarPopup`, BoardIconPopup | opacity 0→1, scale pop→1, dịch shift từ phía nút. `normal` + `enter` | opacity 1→0. `quick` + `exit` | Gốc ở cạnh có mũi tên, cao bằng mũi tên. Hướng đọc từ `data-side` |
| `dropdown` | View, Export, Help, Account, breadcrumb "..." | Như popover, dịch từ trên xuống | Như popover | Góc trên phía nút (phải hoặc trái theo cách căn) |
| `context-menu` | Menu chuột phải canvas | opacity + scale 0.97. `quick` + `enter` | opacity. `fast` + `exit` | Góc trên trái tại con trỏ |
| `modal-backdrop` | Nền mờ ConfirmDialog, ShortcutsModal | opacity. `normal` + `standard` | opacity. `quick` + `exit` | — |
| `modal` | Hộp ConfirmDialog, ShortcutsModal | opacity + scale modal + dịch shift-lg lên. `normal` + `enter` | opacity + scale về modal. `quick` + `exit` | Tâm |
| `sheet` | SettingsModal (toàn màn) | opacity + dịch shift-lg lên. `normal` + `enter` | opacity. `quick` + `exit` | Không scale |
| `tooltip` | Tooltip mới | opacity + dịch 2px từ phía nút. `quick` + `enter` | Mất ngay (không có pha thoát) | Phía đối diện nút |
| `toast` | CanvasNotice, UpdateBanner, OfflineBadge | opacity + dịch shift-lg từ cạnh gắn. `normal` + `enter` | opacity. `quick` + `exit` | Cạnh gắn (trên / dưới) |
| `fade` | Nút mở Khay chờ, chữ trạng thái lưu | opacity. `quick` | opacity. `quick` | — |
| Panel cạnh (transition, không qua `data-motion`) | Khay chờ | translateX 100%→0. `slow` + `enter` | 0→100%. `normal` + `exit` | Cạnh phải. Không mờ dần |

Thêm loại mới: thêm 1 khối trong `motion.css` + 1 dòng vào bảng doc. Không viết keyframes trong component.

## Lifecycle vào / ra

Trạng thái: `closed` (không mount) → `open` (mount, chạy keyframes vào) → `closing` (vẫn mount, `data-state="closed"`, chạy keyframes ra) → gỡ.

- Bắt đầu đóng: gỡ ngay lớp phím (Esc / chặn phím), trả focus về chỗ cũ, đặt `pointer-events: none` + `aria-hidden` lên phần tử đang tan. Không chờ hiệu ứng.
- Gỡ khi `animationend` của chính phần tử (lọc theo target, bỏ sự kiện từ con). Hẹn giờ dự phòng = thời gian ra + một ít, phòng trường hợp không có animation (giảm chuyển động, tab ẩn).
- Đang `closing` mà mở lại: về `open`, keyframes vào chạy lại từ đầu.
- Đóng ngay không hiệu ứng khi: component unmount theo cha (đổi board, rời route). Không cố giữ lại.
- Một số nơi cha đang tự quyết mount (`{open ? <X/> : null}`): đổi sang truyền `open` xuống, component dùng hook để quyết mount. Riêng `ToolbarPopup`, hook đặt ở `PopupActionButton` (1 chỗ phủ 8 popup); popup tự đóng qua `useToolbarPopupClose` vẫn gọi về cùng setter nên không đổi.
- ContextMenu: chuột phải chỗ mới khi menu đang mở → thay vị trí ngay (giữ 1 instance), không chạy thoát rồi vào.

### Chỗ gắn hiệu ứng trong `ToolbarPopup`

- `place()` ghi `transform` (scale giao diện) và `visibility` lên lớp ngoài, nên keyframes gắn vào lớp trong (khung card). Mũi tên là con của lớp ngoài, cần chạy cùng: bọc lớp trong + mũi tên trong một lớp giữa nhận keyframes, hoặc cho mũi tên nhận cùng `data-motion`. Builder chọn cách ít đụng `place()` nhất, kiểm bằng mắt mũi tên không tách khỏi popup lúc vào.
- `place()` ghi thêm `data-side="left|right"` và biến CSS gốc transform (theo `arrowTop`) lên lớp ngoài, keyframes đọc từ đó.
- Scale bằng transform không đổi kích thước đo được, ResizeObserver không lặp.

## Tương tác

Hằng class đặt trong `src/lib/motion/`, cạnh `src/lib/focus-ring.ts` về cách dùng.

| Loại | Hover | Nhấn | Ghi chú |
|---|---|---|---|
| Nút icon (toolbar, header, dismiss, thùng rác) | `transition-[color,background-color,transform]`, `quick` + `standard` | `active:scale-[0.96]` với `fast`; nhả về trong `quick` | Disabled / `aria-disabled` không đổi nền, không scale |
| Tile tạo object (toolbar) | Như nút icon | Như nút icon | Nhãn `group-hover` đổi màu cùng nhịp |
| Dòng menu (`ToolbarMenuItem`, dòng dropdown, ContextMenu) | Nền, `fast` | Nền đậm hơn một bậc, không scale | |
| Ô màu | Viền ring, `quick` | Không scale | Bỏ `hover:scale-105` ở `MarkSwatch` |
| Focus bàn phím | `FOCUS_RING` không transition | — | Thuộc tính transition không gồm `box-shadow` của ring |

Nhấn đổi `transform` dùng thuộc tính `scale` riêng hoặc transform trên phần tử không bị JS ghi `transform`. Kiểm `Toolbar.tsx` không có chỗ nào ghi `transform` lên nút.

## Tooltip

- Component dùng chung ở `src/components/shared/`, portal ra body, z `tooltip`.
- Mở sau 500ms rê chuột yên hoặc ngay khi focus bàn phím (`:focus-visible`). Có "cửa sổ ấm" 300ms: vừa đóng tooltip xong rê sang nút khác thì hiện ngay. Trạng thái ấm dùng chung toàn app (một biến module, không cần store).
- Đóng ngay khi rời nút, pointerdown, Esc (qua `useEscapeLayer`, lớp thấp nhất, không nuốt Esc của popup), khi nút mở popup.
- Bỏ qua `pointerType === 'touch'`.
- Nội dung: chuỗi đang có ở `title` (đã gồm phím tắt qua `COMMON.WITH_SHORTCUT`). Nút dùng tooltip thì bỏ `title`, giữ `aria-label`. Tooltip gắn `aria-describedby` khi hiện.
- Vị trí: nhận phía ưu tiên (`right` cho toolbar dọc, `bottom` cho header), lật khi sát mép. Theo scale giao diện như `ToolbarPopup`.
- Áp cho: `ActionButton`, `TileButton`, `DismissButton`, nút thùng rác trong `Toolbar.tsx`; `IconButton` / `SoonIconButton` trong `CanvasHeader.tsx` + `HeaderPopups.tsx`; nút mở menu header, HelpMenu, AccountMenu.

## Giảm chuyển động

- CSS: một khối `@media (prefers-reduced-motion: reduce)` trong `motion.css` đặt `--motion-shift*: 0`, `--motion-scale-*: 1`, panel bỏ transition, vòng lặp trang trí `animation: none`. Spinner không đụng.
- Chừa sẵn: cùng khối áp được cho `html[data-motion-pref="reduce"]` khi sau này thêm Settings.
- JS: một helper trong `src/lib/motion/` trả về giảm chuyển động hiện tại (đọc `matchMedia`, nghe đổi). `useObjectDrag` và zoom bằng nút (Fit, 100%, nếu có ramp) dùng helper này.
- Vì keyframes vẫn chạy (chỉ còn mờ dần), `animationend` vẫn đến, lifecycle không cần nhánh riêng.

## Liên tục (canvas)

- `SETTLE_MS` trong `useObjectDrag.ts` đổi sang đọc `--duration-quick`; easing đọc `--easing-enter` (vào chỗ khớp là xuất hiện ở vị trí mới). Builder so cảm giác với bản cũ (`standard`), lệch thì giữ `standard`.
- Không đụng `camera-engine.ts`, `useEdgePan.ts`, rubberBand.

## Kiểm tra tự động

- Luật ESLint `no-restricted-syntax` chặn chuỗi `cubic-bezier(` và class `duration-<số>` / `duration-[` trong `src/**/*.tsx?` (trừ `src/experiments/`). CSS kiểm bằng lệnh grep trong doc (chưa có stylelint, không thêm).

## Dữ liệu

Không lưu gì. Không đổi data model.

## Tương tác với tool khác

- Landing không import gì từ hệ này (landing có `sketch.css` riêng). Token CSS ở `:root` landing vẫn dùng như cũ.
- Phím: tooltip và lifecycle dùng `useEscapeLayer` / `useModalLayer` / `useShortcutLayer` có sẵn, không thêm listener `keydown`.

## Điều kiện biên

- Tab ẩn: trình duyệt có thể không bắn `animationend` → hẹn giờ dự phòng gỡ phần tử.
- Đổi board khi popup đang tan: cha unmount, phần tử mất ngay, không lỗi.
- Popup nặng lazy (BoardIconPopup): keyframes chạy khi chunk xong và mount, không chạy trên Suspense fallback.
- Scale giao diện (Settings) khác 1: gốc transform tính sau scale, kiểm ở 80% và 125%.
- Rê nhanh dọc toolbar: không tooltip nào hiện (chưa đủ 500ms), không chớp.

## Doc cần cập nhật (trong task cuối)

- `docs/system/02-ui-common.md`: viết lại mục Chuyển động (3 nhóm, token, bảng loại component, lifecycle, giảm chuyển động, tooltip). Mở rộng `INV-UI-07`, thêm `INV-UI-*` cho lifecycle (gỡ lớp phím khi bắt đầu đóng, phần tử tan không nhận click) và giảm chuyển động một nguồn.
- `docs/system/00-map.md`: thêm `INV-*` mới vào danh sách.
- `.kiro/steering/coding-style.md`: mục Chuyển động theo bảng mới (hover nút dùng `quick`, nhấn dùng `fast`, popup mới gắn `data-motion`).
- `docs/system/10-canvas-core.md`: sửa dòng 85 (`animate-pulse` → `save-breathe`), dòng 122 (350ms → 280ms), dòng 329 (`SETTLE_MS` đã thành token).
- `docs/system/decisions.md`: dòng 21 bỏ trỏ `motion-rules.md`, thêm quyết định của spec này.

## Quyết định đã hoãn

- Chuyển cảnh vào / ra board con.
- Ramp zoom theo thời gian.
- Lựa chọn giảm chuyển động trong Settings.
