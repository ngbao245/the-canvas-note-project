# Object Type Defaults — Canvas

Default geometry (width x height, canvas-space pixel) cho mỗi object type.
Khi làm type mới, reference bảng dưới để size khớp Milanote parity + Unsort
preview render đúng aspect ratio.

Cập nhật cuối: 2026-09-18 (session Unsort polish).

## Đã ship

| Type | Width | Height | Ratio | Ghi chú |
|------|-------|--------|-------|---------|
| note | 338 | 180 | 1.88 | Milanote parity thuần (đo DOM: width 338, height dynamic 68-auto). Bibo dùng height fixed 180 vì chưa hỗ trợ auto-grow. Đổi từ 240x200 → 200x180 → 338x180 (2026-09-20) |
| board | 98 | 139 | 0.71 | Milanote parity thuần (đo DOM: 98x139). Icon 72x72 bên trong khớp Milanote. Đổi từ 100x120 → 98x139 (2026-09-20) |
| rect | 200 | 120 | 1.67 | Debug Phase A, không hiện trên toolbar, giữ tương thích data cũ |

## Placeholder chưa ship — dùng defaults này khi register

Khi implement 1 type, put default vào `registerObjectType({ defaultGeometry })`.
Sizes match Milanote pattern để UnsortItem preview trong panel trông tự nhiên.

| Type | Width | Height | Ratio | Rationale |
|------|-------|--------|-------|-----------|
| link | 240 | 100 | 2.40 | URL preview: favicon 16 + title + hostname một hàng ngang |
| image | 240 | 180 | 1.33 | Ảnh landscape default; aspect thực từ file sẽ override khi upload/paste |
| todo | 240 | 240 | 1.00 | Nhiều dòng checkbox, vuông cho cân đối |
| table | 320 | 200 | 1.60 | Table cần chỗ ≥ 3 cột × ≥ 3 hàng |
| file | 200 | 100 | 2.00 | File icon + filename metadata một hàng |
| line | 100 | 100 | 1.00 | Connector line, shape thực dựa vào 2 endpoint (default là placeholder tile) |

## Quy tắc chỉnh

- Adjust default trong `types.ts` hoặc file renderer (không phải nơi khác).
- Không migrate data cũ khi đổi default — object đã tạo giữ geometry của lần
  đó, chỉ ảnh hưởng create mới.
- Test UnsortItem preview vẫn render đúng aspect ratio sau khi đổi.
- Cập nhật bảng này khi thêm type mới hoặc đổi size hiện có.

## Preview trong UnsortPanel

`UnsortItem.tsx` render item với aspect ratio khớp `object.geometry.width /
object.geometry.height`:

- Max width 232px, max height 140px (fit panel 260px trừ padding).
- Preserve aspect ratio, center horizontally.
- Cap min height 60px để icon + name + subtitle đủ chỗ.
- Nếu ratio quá vuông/dọc (VD Todo 1.0, Board 0.83) thì item sẽ narrow —
  UnsortItem tự adjust layout (icon top thay vì left) nếu height > width.
