# Thiết kế — Hoàn thiện màu board + màu icon (canvas-board-color-polish)

## Màu board — 3 phần

Popup màu board (`BoardColorPopup` trong `BoardToolbar.tsx`) giữ dùng `ToolbarPopup` + `ColorSwatches`. Chia lại thành 3 phần:

- **Phần 1 — nền đậm**: ô "Mặc định" + các màu đậm (icon/chữ trên đó là trắng). Lấy từ `BOARD_STANDARD_COLORS` + màu gợi ý đậm, gom theo độ sáng < ngưỡng.
- **Phần 2 — nền sáng**: các màu sáng (icon/chữ trên đó là đen). Gom các màu có độ sáng ≥ ngưỡng (gồm phần lớn `BOARD_SUGGESTED_COLORS` hiện tại).
- **Phần 3 — custom**: dãy ô màu custom đã lưu (store riêng máy) + nút "Màu tuỳ chỉnh…". Chọn custom mới → thêm vào store + đổi nền. Khi chưa có custom nào, dãy để trống (vẫn render hàng, chừa chỗ) + nút chọn.

Phân loại đậm/sáng dùng cùng ngưỡng với `boardIconInkColor` (luminance 0.6) để "phần 1 = chữ trắng, phần 2 = chữ đen" luôn đúng. Tách danh sách màu đậm/sáng thành hằng trong `board-colors.ts` (dẫn xuất sẵn, không tính runtime).

### Lưu màu custom
- Store Zustand `useBoardColorRecentStore` (persist localStorage `bibo-board-color-recent`), danh sách hex, mới nhất đầu, không trùng, giới hạn ~ 1 hàng (10 ô). Dùng chung mọi board.

## Màu icon board

### Data: `Board.iconColor`
Thêm field optional vào `boardSchema`:
- `null` = Tự động tương phản (mặc định; board cũ thiếu field cũng về đây).
- `'theme'` = Tự động theo theme (đen ở theme sáng, trắng ở theme tối).
- chuỗi `#rrggbb` = màu cố định.

Action `setBoardIconColor(boardId, value)` theo mẫu `setBoardIcon` (1 bước undo).

### Resolve màu icon lúc render
Hàm quyết màu icon cuối cùng, nhận (iconColor, boardColor, resolvedTheme):
- `null` → `boardIconInkColor(boardColor)` (như hiện tại).
- `'theme'` → theme 'light' → đen, 'dark' → trắng (hằng `BOARD_INK_ON_LIGHT` / `BOARD_INK_ON_DARK`).
- `#rrggbb` → chính nó.

`BoardObject` render icon đọc `useResolvedTheme()` (đã có ở `@/stores/theme-store`) để chế độ 'theme' tự đổi khi đổi theme.

### UI chọn màu icon
Đặt trong popup chọn icon (`BoardIconPopup`) — nơi user đang làm việc với icon. Thêm một khu "Màu biểu tượng" (chỉ hiện khi board đã có icon):
- 2 ô chế độ tự động: "Tự động" (tương phản) + "Theo giao diện" (theme), ô đang chọn có viền.
- Dãy màu cố định (dùng lại các màu chuẩn) + nút custom (lưu chung store màu custom với màu board hoặc store riêng — xem Quyết định).
- Vị trí: khu nhỏ phía trên hoặc dưới lưới icon, không chiếm nhiều chỗ; chỉ hiện khi có icon (icon chữ hay lucide đều áp màu được).

## Quyết định

- Màu icon "theo theme" dùng A (đen/trắng cứng theo theme), không dùng token foreground — bạn chốt.
- Store màu custom: ĐÃ CHỐT (bạn, 2026-10-16) dùng chung mọi loại object (note, nền board, màu icon board): `store/custom-color-store.ts`, key `bibo-custom-colors`, 5 ô.

## Điều kiện biên

- Board chưa có icon: khu "Màu biểu tượng" ẩn (không có gì để tô màu).
- Màu cố định trùng nền: vẫn cho chọn (user tự chịu), không ép tương phản.
- Board cũ: `iconColor` undefined → coi như null (tương phản tự động), không cần migration.
