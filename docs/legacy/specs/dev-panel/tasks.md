> LEGACY (chuyển 2026-10-13). Trạng thái hiện tại: `docs/system/01-core.md`. Spec này chỉ còn là lịch sử thay đổi.

# Task — Bảng công cụ dev (dev-panel)

**Trạng thái**: Đã code xong 2026-10-13, chờ bạn test tay + gửi số đo

## Phase 1: Bộ đếm

- [x] Task 1: Hàng đợi báo sự kiện + bộ thu số đo dev
  - Hàng đợi ghi nhận tham số theo dõi tuỳ chọn (đưa vào, lô bắt đầu, lô xong + thành / lỗi). Không truyền thì như cũ.
  - Repository truyền tham số chỉ khi dev. Sửa comment sai về pointermove.
  - Bộ thu trong `src/dev/`: giữ sự kiện, chế độ Phiên / Liên tục, long task, tính số ở US-3, mô phỏng cửa sổ US-4, dựng chữ để Copy.
  - Verify: getDiagnostics sạch. Chạy dev, kéo 1 item → bộ thu ghi 1 lần đưa vào + 1 lô (xem qua đối tượng gắn trên `window` lúc dev).

## Phase 2: Bảng

- [x] Task 2: Bảng nổi thay nút dev cũ
  - Bảng thu gọn / mở rộng, mục Chung + Hàng đợi ghi, công tắc chế độ (mặc định Phiên), nhãn kịch bản, Bắt đầu / Dừng, Copy, Xoá.
  - Thay chỗ mount trong `App.tsx`, xoá `src/dev/DevQuickSwitch.tsx`.
  - Cập nhật handoff canvas mục công cụ dev + note kế hoạch đo trong `milanote-sync-architecture.md`.
  - Verify: `npm run build` + `npm run lint` pass. Dev thấy bảng ở mọi trang. Tìm trong `dist/` không có chữ của bảng. Bạn chạy 5 kịch bản, bấm Copy, dán vào chat.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
