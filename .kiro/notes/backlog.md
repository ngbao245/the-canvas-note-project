# Backlog chung (ngoài canvas)

Việc chưa làm / chờ đánh giá không thuộc riêng canvas. Việc của canvas ở `canvas-backlog.md`.

## Chờ bạn đánh giá

### Trang thử `/thu/*` (gỡ khỏi router 2026-10-13)

Bạn chốt: coi như phần mở rộng, gỡ khỏi app, không đụng file, đánh giá sau.

- Đã làm: bỏ 3 route + 3 lazy import trong `src/App.tsx`. File giữ nguyên, không có code nào import nữa (vẫn qua `tsc` / lint vì nằm trong `src/`).
- File còn lại:
  - `src/experiments/drawably/LandingDraw.tsx` (từng ở `/thu/drawably-landing`): thử landing kiểu vẽ tay bằng `drawably`.
  - `src/experiments/drawably/CanvasDraw.tsx` (từng ở `/thu/drawably-canvas`): thử canvas kiểu vẽ tay.
  - `src/routes/StyleDemo.tsx` (từng ở `/thu/style-demo`): bày Button/Card/Badge + Loading/Empty/Error, đổi shadcn ↔ drawably, sáng ↔ tối.
- Liên quan nhưng KHÔNG gỡ (đang dùng thật): `src/components/style/` (canvas dùng), `src/stores/ui-style-store.ts`, mục phong cách trong `AppearanceSection`, gói `drawably`.
- Khi đánh giá, chọn: xoá hẳn / đưa thành trang chỉ có ở dev (giống `DevPanel`) / gắn lại vào app.

## Chép từ spec đã chuyển vào legacy (2026-10-13)

- **Cài đặt** (spec cũ `docs/legacy/specs/settings/` Task 11): tuỳ chọn ẩn / hiện hàng tiêu đề. KHOAN, bạn đang cân nhắc (2026-10-06).
- **Cài đặt** (cùng spec): tính năng thật cho Chia sẻ (cần backend), Xuất, Trình chiếu, nút +/- và kéo thanh zoom. Hiện là nút "Sắp ra mắt".
- **Modal phím tắt** (spec cũ `docs/legacy/specs/shortcuts-modal/`): trạng thái "không tìm thấy" khi tìm phím.
- **Overlay dùng chung** (spec cũ `docs/legacy/specs/design-system/` Task 9, hoãn): dialog, dropdown, toast dùng chung 1 lớp.
- **Cài bibo như app** (PWA install): manifest + bộ icon. Làm khi có icon chính thức.
