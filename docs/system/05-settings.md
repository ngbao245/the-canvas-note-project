# 05 — Cài đặt

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: modal Cài đặt, menu tài khoản, các khối dựng chung, từng mục (lưu ở đâu, ảnh hưởng gì, mục nào chỉ là vỏ), các store cài đặt toàn app.

Không gồm: token theme, phong cách shadcn / drawably (`02`), bộ dịch (`03`), bộ điều phối phím + Kiểu bàn phím (`04`), cách đếm dữ liệu canvas (`20`).

## Hiện trạng

### Khung

- `SettingsModal` mount 1 lần ở `App`, ngoài router. Phủ toàn màn hình (`z-modal`): header (tiêu đề + nút X) + vùng cuộn (menu trái 200px | nội dung). Màn hẹp: menu thành hàng ngang trên cùng.
- Mở / đóng qua `useSettingsModalStore` (`stores/settings-modal-store.ts`, không persist): `openSettings(section?)` (không truyền thì giữ mục lần trước), `setSection`, `close`. Mục mặc định lúc tải trang: `appearance`.
- Chỗ mở hiện có: menu tài khoản → "Cài đặt". Chưa có phím tắt mở Cài đặt.
- Đóng: nút X, Esc. `useModalLayer`: phím canvas không chạy ngầm, Tab xoay vòng trong modal, phím toàn app (Ctrl+Shift+D, Ctrl+Shift+< >) vẫn chạy. Đang mở Cài đặt thì `/` không mở modal phím tắt.
- Mở: focus nút X; đóng: trả focus về chỗ cũ. Đổi mục: cuộn về đầu, không remount.
- Chống co dãn khi đổi mục: `scrollbar-gutter: stable`, khối `max-w-4xl` cố định, cột nội dung `minmax(0,1fr)`.
- Theo Kích thước giao diện: CSS `zoom` đặt lên header + khối nội dung, khung fixed không zoom để nền vẫn phủ kín.

### Khối dựng chung (`SettingsBlocks.tsx`)

`Section` (tiêu đề + mô tả + nút "Đặt lại mặc định" nếu có `onReset`), `Field` (nhãn + ô phụ bên phải, VD gợi ý phím), `Row` (tiêu đề + mô tả | điều khiển), `OptionCard` (thẻ chọn có ảnh), `Switch`, `Segmented`, `SoonBadge` (mặc định chữ "Sắp ra mắt").

### Menu tài khoản (`AccountMenu.tsx`)

- Nút avatar trên `CanvasHeader`, mở popup (`z-tooltip`). Đóng: bấm ra ngoài (mousedown trên `document`), Esc (`useEscapeLayer`).
- Phần 1: "Khách", "Chưa đăng nhập", nút "Cài đặt" (đóng popup, mở modal), nút "Đăng nhập" bị tắt.
- Phần 2: dữ liệu đang nằm trên trình duyệt này (chưa có backend).

### Các mục

Thứ tự = mảng `SECTIONS` trong `SettingsModal.tsx`.

| Mục | Dòng | Lưu ở | Ảnh hưởng | Trạng thái |
|---|---|---|---|---|
| Tài khoản | Trạng thái | — | — | Vỏ: badge "Khách" |
| Email và thông báo | Bản tin, nhắc tên, lời mời, tin mới | — | — | Vỏ: 4 dòng "Sắp ra mắt". Khi có backend: lưu theo tài khoản, không localStorage |
| Giao diện | Theme: Sáng / Tối / Theo hệ thống | `useThemeStore`, `bibo-theme` | `App` gắn `<html data-theme>` (đã giải "theo hệ thống", tự đổi khi máy đổi) | Chạy. Gợi ý phím Ctrl+Shift+D |
| | Kích thước: Nhỏ / Vừa / Lớn | `useInterfaceStore`, `bibo-interface` | Tỉ lệ 0.9 / 1 / 1.1 cho canvas (object, chữ, vị trí), toolbar trái, Unsort, header canvas, menu tài khoản, modal Cài đặt, modal phím tắt | Chạy. Vừa có nhãn "Khuyên dùng". Gợi ý Ctrl+Shift+< > |
| | Phong cách: Vẽ tay / Phẳng | `useUiStyleStore`, `bibo-ui-style` | `App` gắn `<html data-ui-style>`; `components/style/` (Button, Card, Badge) và `ObjectShell` đổi theo | Chạy |
| Ngôn ngữ và vùng | Ngôn ngữ: Tiếng Việt / English | `useLocaleStore`, `bibo-locale` | Mọi chữ UI, `<html lang>` (`03`) | Chạy |
| | Kiểu bàn phím: Tự động (kèm máy nhận được) / macOS / Windows-Linux | `useKeyboardPlatformStore`, `bibo-keyboard-platform` | Nhãn ⌘ / Ctrl, phím giữ khi click (`04`) | Chạy |
| | Định dạng ngày, ngày đầu tuần | — | App chưa hiện ngày giờ nào | Vỏ: hiện giá trị (`dd/mm/yyyy`, Thứ Hai) + badge "Chưa hỗ trợ" |
| Thanh công cụ | — | — | — | Vỏ: `PlaceholderSection` (`EmptyState` "Sắp ra mắt") |
| Canvas | Lưới nền: bật / tắt | `useCanvasSettingsStore`, `bibo-canvas-settings` | `CanvasSurface` vẽ / ẩn lưới chấm | Chạy |
| | Tốc độ cuộn: Chậm / Vừa / Nhanh | như trên | Hệ số nhân delta lăn chuột 0.3 / 0.5 / 0.8, đọc lúc lăn (`CanvasSurface`). Mô tả chèn phím zoom qua `getShortcutDef('canvas.zoom-wheel')` | Chạy |
| Dữ liệu | Số board, số object | — (chỉ đọc) | Gọi `countData()` (`lib/data-stats.ts`) | Chạy |
| | Dung lượng | — (chỉ đọc) | `navigator.storage.estimate()` cho cả origin. Không hỗ trợ thì hiện "Không rõ" | Chạy |
| | Sao lưu | — | — | Vỏ: "Sắp ra mắt" (export lâu dài ở backend) |

Đặt lại mặc định: Giao diện (theme Sáng, Phẳng, Vừa) và Canvas (lưới bật, cuộn Vừa). Mục khác không có nút này.

Hút cạnh / khớp lưới khi thả luôn bật, không có trong Cài đặt (chốt 2026-10-02).

### Mặc định

| Store | Key | Mặc định |
|---|---|---|
| `theme-store` | `bibo-theme` | `light` (chốt 2026-10-05; người đã lưu lựa chọn giữ nguyên) |
| `interface-store` | `bibo-interface` | `medium` (= 1.0, cỡ như trước khi có setting) |
| `ui-style-store` | `bibo-ui-style` | `flat` |
| `canvas-settings-store` | `bibo-canvas-settings` | `{ showGrid: true, scrollSpeed: 'normal' }` |
| `keyboard-platform-store` | `bibo-keyboard-platform` | `auto` |
| `lib/i18n/locale-store` | `bibo-locale` | Theo trình duyệt, không ghi cho tới khi chọn (`03`) |

Tất cả là Zustand `persist`, chỉ trên máy này, chưa đồng bộ giữa máy. `canvas-settings` gom cả nhóm vào 1 object để sau đổi chỗ lưu dễ.

### Mục Dữ liệu và `register-tools`

- `lib/data-stats.ts` giữ 1 hàm đếm. `register-tools.ts` đăng ký hàm tự `import('@/tools/canvas/api')` lúc gọi → bundle chính không chứa code lưu trữ canvas. Chưa ai đăng ký → trả 0, không lỗi.
- `DataSection` gọi qua TanStack Query (`['settings', 'data-stats']`, `staleTime: 0`): mỗi lần mở mục là đếm lại.
- Đang đếm: `Skeleton` cùng cỡ số. Lỗi: `ErrorState` có nút thử lại. Số qua `formatNumber`; KB / MB luôn 1 chữ số thập phân.

### Thêm 1 mục

1. Thêm id vào union `SettingsSection` (`settings-modal-store.ts`).
2. Thêm 1 dòng vào `SECTIONS` (lưu key dịch, icon lucide).
3. Thêm `case` trong `SettingsContent`; không có case thì tự hiện vỏ "Sắp ra mắt".
4. Giá trị cần lưu: store Zustand `persist` riêng trong `src/stores/`, key `bibo-*`. Tool cần đọc số liệu của mình: đăng ký qua `register-tools.ts`, không import `src/tools/` từ `components/settings/`.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-SET-01` | Mỗi nhóm cài đặt là 1 store Zustand `persist` với 1 key `bibo-*`; component đọc store, không tự đọc / ghi localStorage | 1 chỗ biết mỗi giá trị nằm đâu; sau đổi chỗ lưu chỉ sửa store | Review |
| `INV-SET-02` | `components/settings/` không import `src/tools/`; số liệu qua `countData`, phím qua `getShortcutDef` / `GLOBAL_SHORTCUT_DEFS` | Gom phần chung thành package sau này (`INV-CORE-02`) | Lint (error) |
| `INV-SET-03` | Modal Cài đặt dùng `useModalLayer`: phím canvas không chạy ngầm, Tab không thoát modal, phím toàn app vẫn chạy | Đổi kích thước / theme bằng phím phải thấy ngay trong Cài đặt | Code `SettingsModal.tsx` |
| `INV-SET-04` | "Đặt lại mặc định" chỉ đổi nhóm của mục đó | Không mất lựa chọn ở mục khác | Review |
| `INV-SET-05` | Mục / dòng chưa làm phải hiện rõ "Sắp ra mắt" / "Chưa hỗ trợ" (`SoonBadge`, `PlaceholderSection`); không có nút trông như chạy được mà không làm gì | Người dùng không tưởng đã đổi được | Review |
| `INV-SET-06` | Kích thước Vừa = tỉ lệ 1.0 = cỡ canvas như trước khi có setting | Đổi mặc định là đổi cả giao diện người mới | Review `interface-store.ts` |
| `INV-SET-07` | Hút cạnh / khớp lưới khi thả không có công tắc trong Cài đặt | Luôn bật (chốt 2026-10-02) | Review |
| `INV-SET-08` | Chữ trong `SECTIONS` và danh sách lựa chọn lưu key, dịch lúc render | Đổi ngôn ngữ ngay trong Cài đặt phải đổi hết (`INV-I18N-03`) | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/components/settings/SettingsModal.tsx` | Khung modal, `SECTIONS`, mục Tài khoản, vỏ mục chưa làm |
| `src/components/settings/SettingsBlocks.tsx` | Khối dựng chung |
| `src/components/settings/AccountMenu.tsx` | Avatar + popup tài khoản |
| `src/components/settings/sections/*.tsx` | Giao diện, Ngôn ngữ và vùng, Canvas, Dữ liệu, Email và thông báo |
| `src/stores/settings-modal-store.ts` | Mở / đóng, mục đang xem |
| `src/stores/theme-store.ts`, `ui-style-store.ts`, `interface-store.ts`, `canvas-settings-store.ts`, `keyboard-platform-store.ts` | Giá trị cài đặt |
| `src/lib/data-stats.ts`, `src/register-tools.ts` | Hàm đếm dữ liệu |
| `src/tools/canvas/components/CanvasSurface.tsx` | Đọc lưới nền + tốc độ cuộn |

## Nguồn liên quan

- Spec cũ (lịch sử): `docs/legacy/specs/settings/` (US-1..9, kích thước giao diện).
- Việc chưa làm: `.kiro/notes/backlog.md` mục Cài đặt.

## Câu còn mở

- (2026-10-13) Ẩn / hiện hàng tiêu đề (spec cũ `settings` Task 11): bạn đang cân nhắc, ghi ở `backlog.md`.
- (2026-10-13) `backlog.md` ghi "Cài đặt: Chia sẻ, Xuất, Trình chiếu, nút +/- và kéo thanh zoom là nút Sắp ra mắt". Trong modal Cài đặt không có các nút này (Kiro chưa mở header canvas để kiểm chúng nằm đâu). Chờ bạn chốt dòng backlog đó thuộc Cài đặt hay header canvas.
- (2026-10-13) Mục Thanh công cụ chỉ là vỏ, nội dung chưa chốt. Chưa có phím tắt mở Cài đặt (comment `settings-modal-store.ts` ghi "phím tắt sau này").
- (2026-10-13) Spec cũ `settings` ghi Ngôn ngữ "tạm không làm" và có mục "Phím tắt" trong Cài đặt. Code đã làm Ngôn ngữ (spec `i18n`) và chuyển danh sách phím sang modal riêng (spec `shortcuts-modal` thay). Không cần chốt, ghi để khỏi nhầm khi đọc spec cũ.
- (2026-10-13) Chỗ hở: chỉ Kiểu bàn phím xử giá trị lạ trong localStorage (coi như `auto`). `bibo-theme`, `bibo-interface`, `bibo-ui-style` bị sửa tay thành giá trị lạ thì chưa có chặn (VD `INTERFACE_SCALE` không có mức đó). Chờ bạn chốt có cần chặn không.
- (2026-10-13) Comment đầu `SettingsModal.tsx` còn tả cách chặn phím cũ (capture + `stopPropagation` trên `window`); code đã dùng `useModalLayer`. Sửa comment khi đụng file, hành vi không lệch.
