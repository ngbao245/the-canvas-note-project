# Task — Cài đặt (phần không cần backend)

**Trạng thái**: Đã duyệt (bạn duyệt checklist 2026-10-05, yêu cầu làm hết phần không cần backend 1 lượt)

## Phase 1: Chỉ đọc

- [x] Task 1: Mục Phím tắt — bảng chỉ xem (US-5)
  - Verify: mở Cài đặt → Phím tắt, thấy đủ nhóm, khớp handler trong `useCanvasKeys`.
- [x] Task 2: Mục Dữ liệu — đếm board, object, dung lượng (US-6)
  - Verify: số board/object khớp canvas; lúc đếm hiện skeleton; lỗi có nút thử lại.

## Phase 2: Setting chỉnh được

- [x] Task 3: Store `canvas-settings` + mục Canvas (lưới, tốc độ cuộn, đặt lại) (US-2, US-3, US-4)
  - Verify: tắt lưới → mất chấm, F5 vẫn tắt; đổi tốc độ → cuộn khác; đặt lại → về Bật + Vừa.
- [x] Task 4: Theme "Theo hệ thống" + đặt lại Giao diện (US-1, US-4)
  - Verify: chọn Theo hệ thống, đổi dark/light máy → app đổi theo; đặt lại → Sáng + Vẽ tay (mặc định đổi sang Sáng 2026-10-05).

## Phase 3: Bàn phím

- [x] Task 5: Giữ Tab trong modal (US-7)
  - Verify: Tab liên tục chỉ đi vòng trong modal.

## Phase 4: Kích thước giao diện (mở rộng 2026-10-05, bạn duyệt 2026-10-05)

- [x] Task 6: Store `bibo-interface` + khối Kích thước trong Giao diện + phím tắt + dòng trong mục Phím tắt (US-8 phần chọn, US-9, US-4 bổ sung)
  - Verify: chọn Nhỏ/Vừa/Lớn → thẻ được tô viền + nền, F5 vẫn giữ; Đặt lại → Vừa (đổi 2026-10-06) + Sáng + Vẽ tay; Ctrl+Shift+< / > đổi mức ở canvas,
    gõ chữ trong Note thì không đổi; mục Phím tắt có 2 dòng mới; vi/en đủ key (tsc pass).
- [x] Task 7: Canvas phóng theo tỉ lệ qua zoom hiệu dụng (US-8 phần canvas) — code xong 2026-10-06, build pass, chờ bạn test trên trình duyệt
  - Verify ở zoom 100% (thang đổi 2026-10-06): Note mới rộng 372 / 338 / 304px trên màn hình ở Lớn / Vừa / Nhỏ; vị trí card nhân cùng tỉ lệ;
    badge zoom không đổi; F5 camera board không đổi. Ở mức Nhỏ: kéo thả + hút cạnh, chọn vùng, Ctrl+V, card clipper,
    edge-pan, Fit (F) đều đúng chỗ.
- [x] Task 8: Toolbar trái + panel Unsort phóng theo tỉ lệ (US-8 phần toolbar/Unsort) — code xong 2026-10-06, build + lint pass, chờ bạn test trên trình duyệt
  - Verify: ở Nhỏ toolbar + Unsort hẹp lại, header giữ nguyên; kéo từ toolbar ra canvas đúng chỗ; kéo sắp xếp trong
    Unsort rơi đúng hàng ở cả 3 mức. Cuối phase: `npm run build` + `npm run lint`.

## Phase 5: Header + modal theo kích thước (đổi 2026-10-06, bạn chọn B)

- [x] Task 9: Header canvas, menu tài khoản, modal Cài đặt phóng theo tỉ lệ (CSS `zoom`)
  - Verify: mở Cài đặt → Giao diện, bấm Nhỏ / Vừa / Lớn → chữ + menu trong modal nhỏ / to ngay; header canvas thấp lại,
    canvas lấp phần dư; menu tài khoản nhỏ theo; breadcrumb vẫn rút đúng khi hẹp. Cuối phase: `npm run build` + `npm run lint`.

## Phase 6: Hàng tiêu đề board (thêm 2026-10-06)

- [x] Task 10: Hàng 2 của header (Milanote `CurrentBoardHeader`) — code xong, build + lint pass, chờ bạn test
  - Trái: Đang lưu… / Đã lưu / Lưu lỗi (`store/save-status-store.ts`, repository bọc lệnh ghi, không tính camera).
  - Giữa: tên board 18px, double-click đổi tên (Home không đổi được).
  - Phải: nút Chia sẻ + Xuất, chỉ là nút, tooltip "Sắp có", chưa có tính năng.
  - View + % zoom giữ ở hàng 1 (đã có, không làm lại).
- [ ] Task 11: Tuỳ chọn ẩn/hiện hàng tiêu đề trong Cài đặt — KHOAN LÀM, bạn đang cân nhắc (2026-10-06).
  Hiện luôn hiện, giống Milanote. Câu cần chốt: tắt thì ẩn cả hàng hay chỉ tên; mặc định bật/tắt; 1 hay 2 công tắc.
- [x] Task 12: Giao diện popup View (bấm % zoom) + popup Xuất (Milanote parity) — build + lint pass, chờ bạn test
  - View: thanh zoom thang log hiện đúng % hiện tại (vạch 100%); nút "Về 100%" ↔ "Vừa nội dung" chạy thật;
    +/-, kéo thanh, Trình chiếu + 3 công tắc = "Sắp có".
  - Xuất: 3 nhóm (bố cục PDF/PNG, tài liệu dạng dòng Word/Markdown/Text + công tắc board con, tải file) = "Sắp có".
  - File: `components/HeaderPopups.tsx`, `hooks/usePopupDismiss.ts`, `Switch` thêm prop `disabled`.
- [ ] Sau này: tính năng thật cho Chia sẻ (cần backend), Xuất, Trình chiếu, +/- và kéo thanh zoom.

## Định nghĩa "xong"

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
