> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Task — Canvas demo trên landing

**Trạng thái**: Xong code, chờ thử trên trình duyệt

Rule chung mọi task: không sửa, không import file trong `src/tools/canvas/`. Kiểm bằng lệnh:
`Get-ChildItem -Recurse src\routes\landing | Select-String "tools/canvas"` → phải rỗng (chỉ được phép chuỗi đường dẫn `/canvas` trong link).

## Phase 1: Canvas mini độc lập

- [x] Task 1: Landing mới + canvas mini xem / kéo được
  - Route landing mới thay placeholder trong `App.tsx`, phần đầu + khung demo (tạm luôn ở trạng thái Bật).
  - Store riêng, board mẫu (2 note), camera pan / zoom quanh con trỏ, render note vẽ tay, chọn + viền, kéo note.
  - File: `src/routes/landing/` (mới), `src/App.tsx`, `src/lib/i18n/locales/*.json`
  - Verify: mở `/`, thấy 2 note, kéo được, Ctrl+wheel zoom quanh con trỏ, kéo vùng trống pan. `/canvas` vẫn như cũ. `npm run build` pass.

- [x] Task 2: Sửa, tạo, xoá, undo
  - Bấm đúp sửa chữ, thanh công cụ tile Note (kéo / bấm), Delete xoá, Undo / Redo (nút + phím qua lớp shortcut riêng), header gọn.
  - File: `src/routes/landing/`, file dịch
  - Verify: tạo → sửa → kéo → xoá → undo 4 lần về đúng trạng thái đầu. Gõ trong ô sửa không kích phím tắt. Cài đặt → Dữ liệu ở `/canvas` không đổi số.

- [x] Task 3: Khung nghỉ / bật / nhả + màn hình hẹp
  - Lớp phủ "Bấm để thử", Tab + Enter, nhả bằng bấm ngoài / Esc, wheel chỉ bắt khi Bật, phím tắt chỉ bật khi Bật.
  - Lazy load canvas mini + skeleton + `ErrorState`. Dưới 900px: ảnh tĩnh SVG.
  - File: `src/routes/landing/`, file dịch
  - Verify: lăn qua khung lúc Nghỉ trang cuộn. Ctrl+Z ngoài khung lúc Nghỉ không đổi demo. Dưới 900px không có request chunk canvas mini. `npm run build` pass.

## Phase 2: Ví dụ truy nguồn

- [x] Task 4: Trích dẫn có nguồn + panel + đường nối
  - Object trích dẫn trong board mẫu, nút "Mở nguồn", panel xem nguồn (đóng bằng nút / Esc), đường nối tĩnh.
  - File: `src/routes/landing/`, file dịch
  - Verify: Esc lần 1 đóng panel, lần 2 nhả khung. Kéo trích dẫn thì đường nối đi theo. Xoá note ý tưởng thì đường nối ẩn, undo hiện lại. `npm run build` pass.

## Phase 3: Phần ký họa

- [x] Task 5: Các phần ký họa bên dưới
  - Chuyển từ `docs/legacy/landing-sketch.html`: Vấn đề, Ba trụ, Tính năng (cụm Canvas trỏ lên demo), Cách dùng, Lộ trình, Kêu gọi cuối, Chân trang. Bộ lọc nét chì dùng chung 1 chỗ. Hiện dần khi cuộn, tôn trọng giảm chuyển động.
  - Ghi ngoại lệ màu cứng cho landing vào `coding-style.md`.
  - File: `src/routes/landing/`, file dịch, `.kiro/steering/coding-style.md`
  - Verify: so mắt với bản HTML ở 375 / 768 / 1024 / 1440px. Đổi vi / en đổi hết chữ. 2 lệnh tự kiểm chữ cứng trong `coding-style.md` không ra dòng mới. `npm run build` + `npm run lint` pass.

## Phase 4: Chốt

- [x] Task 6: Cập nhật tài liệu
  - `docs/architecture.md` (folder `src/routes/landing/`), `core.md` + `AGENTS.md` mục trạng thái.
  - Verify: đọc lại khớp code.

## Phase 5: Tách domain (bạn yêu cầu 2026-10-10)

- [x] Task 7: Landing thành bản build riêng
  - `landing.html` + `src/routes/landing/main.tsx` + `vite.landing.config.ts` (cổng 3001, ra `dist-landing/`). Link sang app qua `VITE_APP_URL`.
  - App bỏ landing: `/` và `*` chuyển sang `/canvas`. Không đụng `src/tools/canvas/`.
  - Verify: `npm run build` + `npm run build:landing` pass. `dist-landing/` không chứa code kho lưu canvas thật. Không file nào trong `src/tools/canvas/` bị sửa.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] Không có import từ src/tools/canvas/ trong src/routes/landing/
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
