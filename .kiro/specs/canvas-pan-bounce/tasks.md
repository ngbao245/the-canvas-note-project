# Task — Giới hạn pan + kéo lố đàn hồi

**Trạng thái**: Xong 2026-10-16, bạn test tay OK

Bạn dặn không tự build: Kiro dùng `getDiagnostics` sau mỗi task, build / lint / test chạy khi bạn cho phép ở cuối Phase 2.

## Phase 1: Hàm thuần

- [x] Task 1: Công thức vùng tài liệu, phạm vi camera, kéo lố + test
  - File: `engine/pan-bounds.ts`, `engine/pan-bounds.test.ts` (mới)
  - Verify: diagnostics sạch. Test: hợp 2 khung; phạm vi khi tài liệu to hơn / nhỏ hơn màn; kéo lố = 0 trong phạm vi, tăng dần, không quá trần; trần = min(15% màn, 120px).

## Phase 2: Gắn vào engine

- [x] Task 2: Vùng tài liệu chỉ giãn, theo board, gồm object đang kéo + tự cuộn kéo object ra xa
  - File: `engine/camera-engine.ts`, `components/CanvasSurface.tsx`, `hooks/useBoardSync.ts`, `hooks/useEdgePan.ts`, `docs/system/10-canvas-core.md`
  - Verify (trình duyệt): PB3, PB4, PB5, PB6, PB10. Lúc này chưa có kéo lố: tới rìa vẫn dừng cứng.

- [x] Task 3: Kéo lố + trượt về
  - File: `engine/camera-engine.ts`, `hooks/usePointerInteraction.ts`, `docs/system/10-canvas-core.md`, `docs/system/decisions.md`
  - Verify (trình duyệt): PB1, PB2, PB7, PB8, PB9, PB11.
  - Cuối phase: `npm run build`, `npm run lint`, `npm run test` (khi bạn cho phép). Dọn dòng "Giới hạn pan bản hiện tại" trong handoff, thêm cụm PB.

## Case test tay

- PB1: board trống, kéo màn mọi hướng → có điểm dừng, kéo lố nặng tay, thả ra trượt về.
- PB2: 3 note giữa màn, zoom 300% → pan khắp tài liệu tự do; zoom out nhỏ → tài liệu đi trong màn, mép tài liệu chạm mép màn thì lố.
- PB3: note sát mép trái / trên → kéo màn thấy khoảng trống 500 / 400 phía đó.
- PB4: board 1 note ở xa gốc, kéo note → camera không bị lôi về gốc. Thử trên bản hiện tại trước để xác nhận lỗi.
- PB5: kéo note ra mép phải, giữ ở vùng tự cuộn → màn tự cuộn, đi tiếp được; thả xong kéo màn tới được note.
- PB6: kéo note xa về giữa / xoá nó → camera không tự dời, vẫn kéo màn tới vùng cũ; vào board khác rồi quay lại → vùng gọn lại.
- PB7: lăn chuột ra rìa → lố chút rồi trượt về, không giật; touchpad có quán tính cũng vậy.
- PB8: đang lố, Ctrl + lăn → về rìa rồi zoom, không nhảy; zoom ở rìa không lố.
- PB9: kéo lố, F5 ngay khi đang giữ → vị trí khôi phục trong rìa.
- PB10: camera gần rìa, thu nhỏ cửa sổ / đổi Kích thước giao diện → trượt về, không nhảy.
- PB11: Space + kéo bắt đầu trên header, thả ngoài cửa sổ → vẫn trượt về.

## Định nghĩa "xong"

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] npm run test pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Doc 10 + decisions.md đã cập nhật
```
