# Thiết kế — Quản lý phím tắt tập trung

**Trạng thái**: Nháp

## Hiện trạng (rà ngày 2026-10-07)

| Nơi | Phím | Cách gắn |
|---|---|---|
| `src/lib/useGlobalShortcuts.ts` | Ctrl+Shift+< / > / D | window capture |
| `tools/canvas/hooks/useCanvasKeys.ts` | Undo/Redo, layer, zoom, Ctrl+A/C/X/V/D, F, 0, Esc, Enter | window bubble |
| `tools/canvas/hooks/useDeleteKey.ts` | Delete, Backspace | window bubble |
| `tools/canvas/hooks/usePointerInteraction.ts` | Space giữ để kéo màn hình | window bubble, keydown + keyup |
| `tools/canvas/components/CanvasApp.tsx` | Ctrl+Shift+U, Esc đóng Unsort | window bubble, 2 effect |
| `tools/canvas/components/UnsortPanel.tsx` | Ctrl+A trong Unsort | window bubble, tự viết lại kiểm tra đang gõ, chỉ bắt `a` thường |
| `tools/canvas/hooks/usePopup.ts`, `ToolbarPopup.tsx`, `settings/AccountMenu.tsx` | Esc đóng popup | window capture + stopPropagation |
| `tools/canvas/components/ContextMenu.tsx` | Esc đóng menu | document bubble, không chặn → lọt xuống canvas |
| `tools/canvas/components/ConfirmDialog.tsx` | Esc huỷ, Enter xác nhận | document bubble, không chặn → Esc bỏ chọn luôn, Delete lọt xuống canvas |
| `settings/SettingsModal.tsx` | Esc đóng, Tab giữ focus, chặn mọi phím khác | window capture + stopPropagation |
| `settings/sections/ShortcutsSection.tsx` | Bảng hiển thị | chép tay |

## Mô hình

### Bảng phím
Mỗi phím là 1 khai báo gồm:
- **id** ổn định (dùng cho React key, cảnh báo trùng, và sau này cho người dùng tự đổi phím).
- **tổ hợp**: 1 hoặc nhiều cách bấm thay thế (VD Redo = Ctrl+Shift+Z hoặc Ctrl+Y). Ctrl và Cmd coi là 1 (`mod`).
- **lớp** áp dụng.
- **điều kiện** (tuỳ chọn): đọc state lúc bấm. Không thoả → coi như phím này không tồn tại, phím rơi xuống lớp dưới.
- **chạy khi đang gõ**: mặc định tắt cho lớp tool/panel, bật cho lớp popup/dialog/modal.
- **hiển thị**: nhóm + key i18n nhãn. Không có phần này → phím nội bộ, không hiện trong Cài đặt.
- **hành động khi bấm**. Phím giữ (Space) có thêm **hành động khi thả**.

Khai báo nằm gần code sở hữu nó: phím canvas khai báo trong thư mục canvas, phím toàn app trong `src/lib/`. Bảng Cài đặt gom từ tất cả khai báo tĩnh (lớp toàn app + tool + panel). Phím của popup/dialog là nội bộ, không cần gom.

### Lớp và thứ tự
1. **Toàn app** — luôn chạy, kể cả khi modal mở (giữ hành vi hiện tại của Ctrl+Shift+< / > / D).
2. **Lớp động** (dialog, modal, popup, menu) — đăng ký khi mở, gỡ khi đóng. Mở sau nằm trên. Lớp có cờ **chặn** (modal Cài đặt, dialog xác nhận) thì mọi lớp bên dưới (trừ toàn app) không nhận phím.
3. **Panel** — Unsort, chỉ khi `activePanel === 'unsort'` hoặc panel đang mở (theo điều kiện từng phím).
4. **Tool** — Canvas, khi route canvas đang mount.

Duyệt từ trên xuống. Phím đầu tiên khớp tổ hợp + thoả điều kiện thì chạy, gọi `preventDefault`, dừng duyệt. Không khớp ở đâu thì trình duyệt xử lý bình thường.

### Bộ điều phối
- 1 listener `keydown` + 1 listener `keyup` ở `window` capture, gắn 1 lần ở `App`.
- Tool/panel đăng ký bảng phím của mình khi mount (hook), gỡ khi unmount.
- Popup/dialog đăng ký lớp động khi mở (hook nhận `open`).
- State lớp nằm trong 1 module (không cần Zustand vì không có UI subscribe; bảng Cài đặt đọc khai báo tĩnh).
- Hành động đọc state qua `getState()` lúc bấm, không qua closure → không phải gắn lại listener khi state đổi.

### Chuẩn hoá phím
- Phím chữ so bằng `e.code` (`KeyA`, `KeyF`...) → không phụ thuộc Caps Lock, Shift, bố cục. Giữ cách hiện tại cho `<` `>` (nhận cả `e.key` lẫn `Comma`/`Period`).
- Phím ký hiệu (`]`, `[`, `=`, `+`, `-`, `0`) so bằng `e.key` như hiện tại, kèm `e.code` thay thế nếu cần.
- Kiểm tra đang gõ dùng `isEditableTarget` ở `@/lib/dom` cho mọi phím; bỏ bản tự viết trong UnsortPanel.

### Kiểm tra trùng (chỉ dev)
Khi đăng ký bảng phím: so tổ hợp với các phím cùng lớp và với lớp toàn app. Trùng → `console.warn` nêu 2 id. Phím có điều kiện loại trừ nhau (VD Ctrl+A canvas khi `activePanel === 'canvas'` và Ctrl+A Unsort khi `'unsort'`) nằm ở 2 lớp khác nhau nên không bị báo.

### Thứ tự với listener tại chỗ
Bộ điều phối ở window capture chạy TRƯỚC listener của phần tử (Tiptap, ô tên board). Đúng ý vì:
- Phím lớp tool/panel bỏ qua khi đang gõ → editor và ô nhập nhận phím như cũ.
- Phím lớp popup chạy cả khi đang gõ → Esc trong ô URL Link đóng popup (giống hiện tại, vì `ToolbarPopup` đã ở capture).

Rủi ro: canvas đang ở bubble, chuyển sang capture. Chỗ nào trước đây dựa vào `stopPropagation` ở phần tử để chặn canvas sẽ không còn chặn được. Rà ở Task 2: `BoardObject.tsx:127`, `BoardTitleRow.tsx:130`, `NoteToolbar.tsx:297` (đều là ô nhập → đã có kiểm tra đang gõ che).

## Quyết định thay đổi hành vi (Kiro tự chọn, chờ bạn duyệt)

- **Caps Lock**: Ctrl+A trong Unsort chạy cả khi bật Caps Lock (khớp canvas).
- **Esc khi Unsort mở + đang chọn**: chỉ đóng panel. Esc lần nữa mới bỏ chọn.
- **Esc / Delete khi dialog xác nhận mở**: dialog chặn lớp dưới. Esc chỉ huỷ dialog, Delete không làm gì.
- **Esc khi context menu mở**: chỉ đóng menu.

## Dữ liệu

Không lưu gì. Bảng phím là hằng số trong code. Đợt người dùng tự đổi phím sẽ thêm phần đè lưu localStorage theo id.

## Tương tác với tool khác

- Settings: `ShortcutsSection` đọc bảng chung thay danh sách chép tay. Thứ tự nhóm + nhãn i18n giữ nguyên (`SETTINGS.SHORTCUTS.*`).
- Tool sau này: chỉ khai báo bảng phím + gọi hook đăng ký.

## Điều kiện biên

- Route canvas unmount → bảng phím canvas tự gỡ, phím F / 0 không còn chạy ở trang khác.
- Popup đóng do unmount (đổi route) → lớp động tự gỡ, không kẹt lớp chặn.
- 2 popup cùng mở (popup trong toolbar + menu tài khoản): lớp mở sau nhận Esc trước.
- Space giữ rồi cửa sổ mất focus (Alt+Tab) → không có keyup. Thêm: mất focus cửa sổ thì gọi hành động thả cho mọi phím đang giữ.
- Paste async (Ctrl+V): hành động trả về ngay sau `preventDefault`, đọc clipboard chạy nền như cũ.

## Quyết định đã hoãn

- Người dùng tự đổi phím + giao diện ghi phím.
- Ký hiệu Mac trong bảng.
- Tooltip nút tự lấy tổ hợp từ bảng chung.

---

## Đợt 2: macOS (thêm 2026-10-07)

### Nguồn platform chuẩn
- Kết quả detect OS: giữ cache trong module như hiện tại (OS không đổi trong phiên).
- Lựa chọn của user: `auto | macos | windows-linux`, lưu localStorage qua store Zustand riêng ở `src/stores/`, không đồng bộ server.
- Platform hiệu lực = lựa chọn của user, hoặc kết quả detect nếu là `auto`. Tính lại mỗi lần gọi (đọc store lúc gọi), không cache.
- Code ngoài React (handler phím, handler chuột) đọc platform hiệu lực lúc sự kiện xảy ra.
- Code React hiện nhãn phím subscribe store để render lại khi đổi lựa chọn. Hằng nhãn tính ở cấp module (VD nhãn Undo trong `CanvasApp`) chuyển vào trong component.

### Phím chính cho chuột
- 1 helper dùng chung: Mac = `metaKey`, nơi khác = `ctrlKey`. Dùng cho chọn thêm object, chọn thêm trong Unsort, marquee cộng dồn, Ctrl/Cmd + kéo để pan.
- Trên Mac, pointerdown có `ctrlKey` + nút trái là chuột phải: bỏ qua ở các handler chọn/kéo, để `contextmenu` tự mở menu.
- Zoom bằng wheel giữ `ctrlKey || metaKey` (Chrome gửi pinch dưới dạng `ctrlKey`).
- Phím Ctrl+Enter trong note giữ nguyên (bàn phím, không phải chuột).

### Phím sắp lớp
- 4 phím `layer-*` luôn được canvas xử lý khi lớp tool chạy, kể cả khi không có gì để sắp, để phím không rơi xuống trình duyệt.
- Cmd+Shift+[ / ] (chuyển tab trên trình duyệt Mac) có thể không tới được trang. Không xử lý đợt này, ghi lại để thử trên Mac thật.

### Giao diện Cài đặt
- Mục Ngôn ngữ & vùng (`LocalizationSection`) thêm 1 dòng "Kiểu bàn phím" với 3 lựa chọn, cùng kiểu control các dòng chọn sẵn có trong mục đó.
- Lựa chọn Tự động hiện kèm kết quả detect (VD "Tự động (macOS)").
