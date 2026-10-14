> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Tasks — Design System

Mỗi task là một đơn vị verify được. Verify build 1 lần cuối mỗi phase, trong phase dùng kiểm tra kiểu.

## Phase 1 — Token nền tảng

- [x] Task 1: Viết lại bộ token toàn cục theo mockup shared.css
  - Thay bộ token shadcn mặc định trong stylesheet toàn cục bằng bảng token thống nhất (primary #007acc, nền/chữ/viền kiểu VS Code, dark + light).
  - Rà đủ cặp foreground cho mỗi surface + token phụ mockup có (card-elevated, border-strong, subtle-foreground, primary-soft, primary-hover, shadow, shadow-soft).
  - Thêm motion token (duration-fast 60ms, duration-normal 200ms, easing-standard).
  - Verify: mở app, primary ra xanh, đổi dark/light màu đổi đúng.

- [x] Task 2: Cập nhật Tailwind config đọc token mới
  - Map token sang màu Tailwind để dùng class bg-primary, text-foreground, border-border... + token phụ.
  - Verify: class Tailwind ra đúng màu token; kiểm tra kiểu sạch.

- [x] Task 3: Kiểm lại Landing scaffold sau khi đổi token
  - Landing hiện dùng token cũ. Rà cho hợp token mới, sửa chỗ lệch nếu có.
  - Verify: build pass, Landing hiển thị đúng màu mới.

## Phase 2 — Store phong cách + ánh xạ drawably

- [x] Task 4: Store phong cách hiển thị (vẽ tay | phẳng) + đồng bộ localStorage
  - Store UI giữ phong cách hiện tại, mặc định vẽ tay, đọc/ghi localStorage.
  - Gắn dấu hiệu phong cách lên phần tử gốc (data-ui-style) khi đổi.
  - Verify: đổi phong cách trong store, dấu hiệu trên phần tử gốc đổi; đóng mở lại giữ đúng lựa chọn.

- [x] Task 5: Ánh xạ token chung sang biến drawably
  - Khai báo biến drawably (nét, tô, giấy, độ dày) ở phần tử gốc, gán từ token chung (nét theo primary, giấy theo background), theo dark/light.
  - Nạp style drawably một lần ở nơi phù hợp.
  - Verify: render một control drawably, đổi dark/light thì nét/giấy đổi theo token, không set tay.

## Phase 3 — Lớp vỏ component

- [x] Task 6: Lớp vỏ cho control drawably có
  - Đã dựng 3 vỏ phổ biến nhất: Button, Card, Badge (đủ cho Task 7 demo).
  - Các vỏ còn lại (Input, Checkbox, Toggle, Radio, Select, Textarea, List, Tabs, Tooltip, Alert, Kbd, Arrow) dựng dần khi tool thật cần — ghi chú trong `src/components/style/index.ts`.
  - Mỗi vỏ đọc `useUiStyleStore`, render drawably (hand) hoặc shadcn/HTML theme (flat). Nơi dùng chỉ gọi vỏ, không cần biết phong cách.

- [x] Task 7: Trang demo phong cách nội bộ
  - Bày các vỏ component + toggle phong cách + toggle dark/light để đối chiếu. Có thể chuyển từ trang thử trong experiments.
  - Verify: mở trang demo, toggle phong cách và theme hoạt động đúng.

## Phase 4 — Thành phần dùng chung (nice-to-have, dựng dần)

- [x] Task 8: Thành phần loading/empty/error dùng chung theme token
  - Đã dựng: `Skeleton`, `LoadingState` (skeleton/inline/default variant), `EmptyState`, `ErrorState` trong `src/components/shared/`.
  - Keyframe `shimmer` thêm vào `index.css`. Đều theme theo token, hoạt động cả dark/light.

- [ ] Task 9: Overlay dùng chung (dialog, dropdown, toast) — DEFERRED
  - Spec đã ghi "dựng khi tool thật cần, không chặn nền tảng". Tool đầu tiên gọi cái nào thì dựng cái đó, tránh dựng vô mục đích.

## Ghi chú

- Phase 1-3 là nền tảng phải xong để tool thật dùng được design system.
- Phase 4 dựng dần theo nhu cầu tool, không bắt buộc xong hết trước khi làm tool đầu tiên.
- Sau khi Phase 1-3 xong: cập nhật docs/product-vision.md (mục design system) và note .kiro/notes/design-system.md (chốt, bỏ trạng thái "đang bàn").
