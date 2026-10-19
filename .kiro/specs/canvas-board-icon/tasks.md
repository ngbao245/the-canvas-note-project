# Task — Icon cho board tile (canvas-board-icon)

**Trạng thái**: Đã duyệt, sẵn sàng Builder

Ghi chú: verify theo từng phase (chạy `npm run build` cuối phase), trong phase dùng chẩn đoán TS. Icon lucide + catalog nằm trong chunk lazy của popup, canvas không gánh thêm.

## Phase 1: Dữ liệu + catalog icon

- [x] Task 1: Thêm field `icon` vào board data model
  - File: `src/tools/canvas/types.ts` (thêm schema icon vào `boardSchema`), `src/tools/canvas/engine/actions.ts` (hàm `setBoardIcon(boardId, icon)` + `clearBoardIcon(boardId)` theo mẫu `setBoardColor`)
  - Verify: chẩn đoán TS sạch; board cũ không có field vẫn hydrate (default null).

- [x] Task 2: Thêm `lucide-static` (devDep) + script sinh catalog tĩnh
  - File: `package.json` (devDependency + script), `scripts/gen-icon-catalog.mjs` (hoặc vị trí script phù hợp), output `src/tools/canvas/lib/icon-catalog.ts` (map tên → danh mục + tag, danh sách danh mục)
  - Verify: chạy script sinh ra `icon-catalog.ts`; file export danh sách danh mục + tra cứu tag; chẩn đoán TS sạch.
  - Build cuối phase: `npm run build` pass (catalog tĩnh không kéo `lucide-static` vào bundle).

## Phase 2: Popup chọn icon (lazy chunk)

- [x] Task 3: Khung popup + nguồn + cột danh mục + ô tìm kiếm
  - File: `src/tools/canvas/components/objects/BoardIconPopup.tsx` (mới), dùng `ToolbarPopup` + `useToolbarPopupClose`
  - Verify: mở popup thấy cột trái (nguồn + danh mục) + ô tìm kiếm + vùng lưới rỗng tạm; đóng bằng click ngoài / Escape.

- [x] Task 4: Lưới icon lucide ảo hóa + tìm kiếm + lọc danh mục
  - File: `BoardIconPopup.tsx` (lưới), thêm `@tanstack/react-virtual` (dependency runtime)
  - Verify: lưới hiện toàn bộ icon lucide, cuộn mượt (không đứng hình khi mở); gõ tìm kiếm lọc theo tên/tag; chọn danh mục lọc đúng; trạng thái rỗng khi không có kết quả.

- [x] Task 5: Nguồn "Tự nhập" ký tự + nút "Tải ảnh" mờ + hàng "Bỏ icon"
  - File: `BoardIconPopup.tsx`
  - Verify: chọn "Tự nhập" hiện ô nhập (giới hạn 2 ký tự) + xem trước; "Tải ảnh" mờ; "Bỏ icon" chỉ hiện khi board có icon.
  - Build cuối phase: `npm run build` pass; popup là chunk lazy riêng (kiểm tra output build tách chunk).

## Phase 3: Gắn vào toolbar + render trên tile

- [x] Task 6: Thay nút Icon mờ trong toolbar bằng nút mở popup
  - File: `src/tools/canvas/components/objects/BoardToolbar.tsx` (bỏ `disabled`, wire mở `BoardIconPopup`, biểu tượng nút phản ánh icon hiện tại), lazy import popup
  - Verify: chọn board tile, bấm Icon mở popup; chọn icon/ký tự gắn ngay; "Bỏ icon" gỡ được; popup giữ mở sau khi chọn.

- [x] Task 7: Render icon giữa ô vuông board tile
  - File: `src/tools/canvas/components/objects/BoardObject.tsx` (vẽ icon lucide hoặc ký tự giữa ô 72x72, màu tương phản theo độ sáng nền)
  - Verify: gắn icon lucide → hiện giữa ô; gắn ký tự → hiện giữa ô cỡ lớn; không icon → chỉ màu nền; tải lại canvas icon vẫn còn; màu icon đọc được trên các màu nền board.
  - Build cuối phase: `npm run build` pass.

## Chuỗi phụ thuộc

Task 1 → (2 song song được) → 3 → 4, 5 → 6 → 7. Phase 3 cần Phase 1 (data) + Phase 2 (popup) xong.

## i18n

Mọi chữ UI mới (nhãn nguồn, danh mục, placeholder tìm kiếm, "Bỏ icon", "sắp có", trạng thái rỗng) thêm key vào `vi.json` + `en.json` theo vùng `CANVAS.BOARD_TOOLBAR.*` hoặc `CANVAS.ICON_PICKER.*`. Tên danh mục lucide giữ tiếng Anh ở phase này (ghi trong design).

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass (cuối phase)
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Chữ UI mới đã qua i18n (vi.json + en.json)
[ ] Nếu đổi behavior/data model: doc/spec liên quan đã update
```
