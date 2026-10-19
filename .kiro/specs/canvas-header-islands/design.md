# Thiết kế — Header canvas kiểu đảo nổi

## Màn hình

### Kiểu "2 hàng" (giữ nguyên)

Header khối ở trên, canvas bên dưới. Không đổi gì.

### Kiểu "Đảo nổi"

```
+------------------------------------------------------------------+
| [Home > Dự án > Ý tưởng · Đã lưu]  [ Ý tưởng app ]  [3 · ↶ ↷ ? 🔍 🔔 | Chia sẻ Xuất 100% | BN] |
|                                                                  |
| [tool]                       canvas                     [Khay chờ] |
| [bar ]                                                           |
+------------------------------------------------------------------+
```

- Ba đảo cùng hàng, cách mép trên 12px. Trái neo trái, phải neo phải, giữa căn giữa màn.
- Canvas nằm dưới, phủ cả màn. Đảo nằm trên canvas, dưới tầng kéo thả (preview object đang kéo vẫn bay trên đảo).
- Thanh công cụ trái: dời xuống dưới hàng đảo.
- Nút mở Khay chờ + panel Khay chờ: bắt đầu dưới hàng đảo.

## Luồng

1. Avatar → Cài đặt → Canvas → "Kiểu header": 2 hàng / Đảo nổi.
2. Đổi lựa chọn → canvas đổi layout ngay.
3. Đặt lại mặc định → 2 hàng.

## Hướng làm

- Lựa chọn lưu cùng nhóm Cài đặt Canvas trên máy (như lưới, tốc độ cuộn, màu viền chọn).
- Các mảnh header hiện có (breadcrumb, trạng thái lưu, tên board, cụm nút phải, Chia sẻ / Xuất / % zoom) tách ra dùng chung cho 2 kiểu, không chép code. Kiểu 2 hàng render y như cũ.
- Chiều cao hàng đảo là 1 hằng số dùng chung, để thanh công cụ và Khay chờ tính khoảng lùi từ đó (nhân Kích thước giao diện).
- Đảo gắn đánh dấu vùng overlay của canvas để: bấm vào đảo không mở khung chọn, kéo object qua đảo là vùng thả sai, lăn chuột trên đảo không cuộn canvas.
- Gốc mỗi đảo chặn chọn chữ (như header cũ).

## Trường hợp biên

- Màn hẹp: đảo giữa co trước (tên cắt "…"), breadcrumb trong đảo trái rút theo bề rộng như cũ. Đảo phải không co.
- Đang sửa tên board ở đảo giữa: ô sửa giãn theo chữ, vẫn không đè 2 đảo bên.
- Đang sửa note mà bấm nút trên đảo: giống bấm header cũ.
- Đổi kiểu header lúc đang mở popup Xuất / View: popup đóng theo header cũ, không treo.

## Doc cần sửa khi xong

- `10` mục Header (thêm kiểu đảo nổi), `05` mục Canvas (dòng mới + mặc định), `decisions.md`. (Đã sửa 2026-10-14.)
