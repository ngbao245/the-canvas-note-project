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
  - Verify: chọn Theo hệ thống, đổi dark/light máy → app đổi theo; đặt lại → Tối + Vẽ tay.

## Phase 3: Bàn phím

- [x] Task 5: Giữ Tab trong modal (US-7)
  - Verify: Tab liên tục chỉ đi vòng trong modal.

## Phase 4: Kích thước giao diện (mở rộng 2026-10-05, CHỜ DUYỆT)

- [ ] Task 6: Store `bibo-interface` + khối Kích thước trong Giao diện + phím tắt + dòng trong mục Phím tắt (US-8 phần chọn, US-9, US-4 bổ sung)
  - Verify: chọn Nhỏ/Vừa/Lớn → thẻ có tick, F5 vẫn giữ; Đặt lại → Lớn + Tối + Vẽ tay; Ctrl+Shift+< / > đổi mức ở canvas,
    gõ chữ trong Note thì không đổi; mục Phím tắt có 2 dòng mới; vi/en đủ key (tsc pass).
- [ ] Task 7: Canvas phóng theo tỉ lệ qua zoom hiệu dụng (US-8 phần canvas)
  - Verify ở zoom 100%: Note mới rộng 338 / 304 / 270px trên màn hình ở Lớn / Vừa / Nhỏ; vị trí card nhân cùng tỉ lệ;
    badge zoom không đổi; F5 camera board không đổi. Ở mức Nhỏ: kéo thả + hút cạnh, chọn vùng, Ctrl+V, card clipper,
    edge-pan, Fit (F) đều đúng chỗ.
- [ ] Task 8: Toolbar trái + panel Unsort phóng theo tỉ lệ (US-8 phần toolbar/Unsort)
  - Verify: ở Nhỏ toolbar + Unsort hẹp lại, header giữ nguyên; kéo từ toolbar ra canvas đúng chỗ; kéo sắp xếp trong
    Unsort rơi đúng hàng ở cả 3 mức. Cuối phase: `npm run build` + `npm run lint`.

## Định nghĩa "xong"

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
