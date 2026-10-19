# Thiết kế — Popup Màu của Note

**Trạng thái**: Đã làm 2026-10-15

## Đo Milanote (MCP, 2026-10-15, theme tối)

Popup `ColorPopupContent`, thứ tự khối:

| Tab | Khối |
|---|---|
| Background | Thanh tab → 13 màu chuẩn → vạch → 6 ô "A" (cặp nền + chữ) → vạch → 7 màu gợi ý → Custom color… |
| Top strip | Thanh tab → 12 màu (ô đầu = bỏ màu, gạch chéo đỏ; không có trong suốt) → vạch → 7 màu gợi ý → Custom color… |

13 màu chuẩn (biến `--color-element-*`, chỉ khai 1 lần ở `:root`, theme sáng / tối DÙNG CHUNG, trừ xám đổi theo theme):

| Tên | Hex |
|---|---|
| không màu | (nền mặc định note) |
| xám | sáng `--color-gray-light-mode-300`, tối `--color-gray-dark-mode-500` (Kiro chọn hex gần nhất khi làm) |
| cyan | `#62dbc8` |
| xanh lá | `#7cd651` |
| nâu | `#d58558` |
| vàng | `#ffd14d` |
| cam | `#ff8d48` |
| đỏ | `#ff5757` |
| hồng | `#ff6ed4` |
| tím | `#ad6fff` |
| xanh dương | `#4ebafd` |
| xanh đậm | `#5882f8` |
| trong suốt | `rgba(0,0,0,0)` |

Cặp "A" (nền / chữ):
- Theme tối (đo): `#c5a87a`/`rgb(115,38,42)`, `#e5c590`/`rgb(96,71,32)`, `#ffbd99`/`rgb(153,54,0)`, `#ffad99`/`rgb(57,43,19)`, `#e6989c`/`rgb(96,32,45)`, `#dcd0bd`/`rgb(49,27,31)`.
- Theme sáng (HTML bạn dán): `#6592c5`/`rgb(19,37,57)`, `#918abc`/`rgb(43,19,57)`, `#b090c4`/`rgb(71,8,6)`, `#c17b8a`/`rgb(19,37,57)`, `#f47772`/`rgb(57,19,27)`, `#eab174`/`rgb(38,74,115)`, `#eaca8b`/`rgb(115,38,55)`.

Màu gợi ý (7 ô):
- Theme tối: `#c5a87a #e5c590 #e9d3af #ffcdb2 #ffb4a2 #e6989c #d592a0`.
- Theme sáng: `#6592c5 #918abc #b090c4 #c17b8a #f47772 #eab174 #eaca8b`.

Hành vi đo được:
- Chọn nền: note thêm class `colored-background-light` → chữ chuyển màu tối (`--color-gray-light-mode-900`). Đây là cơ chế tự đọc được (US-6).
- Chọn ô "A": note đặt cả `--ws-element-background-primary` (nền) và `--ws-element-primary` (chữ). Chữ đoạn `p` đổi theo.
- Custom color = `<input type="color">` gốc trình duyệt. Chọn xong chỉ đặt nền, chữ không cố định (tự tương phản).
- 2 hàng dưới KHÔNG đổi sau khi chọn màu tự do → không phải "màu gần đây". Bộ màu khác nhau giữa HTML bạn dán (theme sáng) và lần đo (theme tối) → Kiro coi là bộ cố định theo theme (giả định, xem "Câu cần chốt").
- Đặt nền + thanh cùng lúc: cả 2 hiện, thanh 5px trên đầu.
- Icon nút Color trên toolbar vẽ lại theo màu note (nền + thanh, hoặc chữ "A" trên nền cặp).
- Chọn màu ở hàng đầu: popup vẫn mở, chuyển tab vẫn mở.

## Màn hình / luồng

Không có màn hình mới. Thay nội dung popup Màu (mở từ toolbar note chế độ chọn), vẫn dùng khung popup chung có mũi tên + chống tràn.

Popup rộng cố định (~ 5 ô 1 hàng như Milanote, ô 36×30), các khối cách nhau bằng vạch ngang `border`. Ô đang áp có viền chọn. Ô màu chuẩn có tên khi rê chuột. Tab Top strip: ô vẽ dạng "khung có thanh màu trên đầu" (như Milanote), không tô kín.

Toolbar nút Màu: icon vẽ màu hiện tại của note (US-7).

## Dữ liệu

NoteData (đọc / ghi qua `parseNoteData`, giữ `INV-NOTE-04`):

| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `color` | hex hoặc `null` | `null` | Giữ tên cũ = màu thanh trên đầu (Top strip). Note cũ không phải chuyển đổi |
| `background` | hex, `'transparent'` hoặc `null` | `null` | MỚI. Màu nền cả note |
| `textColor` | hex hoặc `null` | `null` | MỚI. Màu chữ đi kèm khi chọn ô "A". Chọn nền khác / không màu thì về `null` |

- Lưu hex, không lưu tên màu: Milanote dùng chung 1 bộ màu cho 2 theme, nên lưu hex không bị chói khi đổi theme. Giữ `INV-NOTE-17`. Riêng xám: lưu hex của theme đang dùng lúc chọn (lệch nhẹ khi đổi theme, chấp nhận).
- Màu chữ tự tương phản (US-6) không lưu: tính lúc vẽ từ độ sáng của `background`.
- Đổi màu qua đường cập nhật data hiện có (1 bước undo mỗi lần chọn).
- Tách đoạn ra note mới, dán, Card Clipper: copy cả 3 trường.

Hàng màu (chuẩn, cặp, gợi ý) khai trong lib màu note hiện có, tên màu lưu key dịch (như hiện tại). Bỏ bảng 6 màu cũ; hex cũ của note vẫn vẽ đúng vì lưu hex.

## Hiển thị note

- Nền: `background` có giá trị → đè nền card mặc định. `'transparent'` → không nền, giữ viền chọn.
- Chữ: `textColor` có → dùng; không có mà nền sáng → chữ tối; còn lại → màu chữ theme. Áp cho cả xem lẫn sửa (cùng 1 chỗ tính, không nhảy khi đổi chế độ).
- Mark màu chữ trong body (Text style) vẫn thắng vì là inline style trên đoạn.
- Thanh trên đầu: như hiện tại, theo `color`.

## Tương tác với tool khác

Không. Trong `src/tools/canvas/`. Khay chờ (Unsort) hiện item note: nếu đang vẽ thanh màu thì thêm nền cho khớp (Kiro kiểm khi làm).

## Điều kiện biên

- Dữ liệu lạ (`background` không phải chuỗi) → `parseNoteData` trả `null`.
- Nền trong suốt + theme sáng: chữ dùng màu theme (không tính tương phản với lưới).
- Ô chọn màu trình duyệt bị huỷ → không đổi gì, không tạo bước undo.
- Kéo liên tục trong ô chọn màu trình duyệt (sự kiện `input` bắn nhiều lần): chỉ ghi 1 bước undo khi `change`.
- Offline: lưu IndexedDB như hiện tại.

## Câu cần chốt

- Hàng "A" và màu gợi ý: Kiro giả định là bộ cố định theo theme (sáng / tối). Chưa đo được Milanote ở theme sáng trên cùng board vì phải đổi cài đặt tài khoản của bạn. Nếu bạn thấy 2 hàng này đổi theo board / theo thời gian thì báo, Kiro sửa.
