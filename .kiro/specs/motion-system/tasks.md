# Task — Hệ thống chuyển động (motion-system)

**Trạng thái**: Đã làm xong 10 task (2026-10-21), chờ bạn test tay

Ghi chú: verify theo phase (chạy `npm run build` + `npm run lint` cuối phase), trong phase dùng chẩn đoán TS. Cuối mỗi phase bạn test tay theo mã case trong `requirements.md`.

## Phase 1: Nền + popup toolbar (thử cảm giác thật trước khi lan rộng)

- [x] Task 1: Token + motion.css + module chung
  - File: `src/styles/index.css` (token mới), `src/styles/motion.css` (mới: keyframes theo `data-motion` + `data-state`, khối giảm chuyển động), `tailwind.config.ts` (`duration-quick`, `duration-slow`, `ease-enter`, `ease-exit`, keyframe shimmer), `src/lib/motion/` (hook giữ mount khi thoát, helper giảm chuyển động, hằng class tương tác)
  - Verify: chẩn đoán TS sạch; class Tailwind mới sinh ra đúng (thử 1 class trong dev).

- [x] Task 2: Gắn vào `ToolbarPopup` + `PopupActionButton`
  - File: `src/tools/canvas/components/ToolbarPopup.tsx` (`data-side`, gốc transform, lớp nhận keyframes), `src/tools/canvas/components/Toolbar.tsx` (`PopupActionButton` dùng hook), `src/tools/canvas/components/objects/BoardToolbar.tsx` + `BoardIconPopup.tsx` nếu mở popup không qua `PopupActionButton`
  - Verify: case P1–P6, R1 (bật giảm chuyển động ở Windows: Settings > Accessibility > Visual effects > Animation effects tắt). Thử scale giao diện 80% / 125%.
  - Build cuối phase.

## Phase 2: Các overlay còn lại

- [x] Task 3: Dropdown header + menu chuột phải
  - File: `src/tools/canvas/components/HeaderPopups.tsx`, `src/tools/canvas/hooks/usePopup.ts`, `HelpMenu.tsx`, `BreadcrumbList.tsx`, `src/components/settings/AccountMenu.tsx`, `ContextMenu.tsx`, `CanvasSurface.tsx` (kèm sửa chữ cứng `'Thêm Note'` sang i18n)
  - Verify: case D1–D4.

- [x] Task 4: Modal
  - File: `ConfirmDialog.tsx` + chỗ gọi trong `CanvasApp.tsx`, `src/components/shortcuts/ShortcutsModal.tsx`, `src/components/settings/SettingsModal.tsx`. Nền mờ `rgba` inline đổi sang token (thêm token nền mờ nếu chưa có).
  - Verify: case M1–M4; focus trả về đúng nút đã mở.
  - Build cuối phase.

## Phase 3: Tương tác + tooltip

- [x] Task 5: Hover / nhấn cho nút toolbar, header, menu, ô màu
  - File: `Toolbar.tsx`, `ToolbarMenuItem.tsx`, `CanvasHeader.tsx`, `HeaderPopups.tsx`, `HelpMenu.tsx`, `AccountMenu.tsx`, `ColorSwatches.tsx`, `NoteToolbar.tsx` (bỏ `hover:scale-105`), các nút trong `BoardToolbar.tsx`. Bỏ `transition-all` ở thùng rác. Chuỗi focus chép tay ở các file đụng tới đổi sang `FOCUS_RING`.
  - Verify: case B1–B7.

- [x] Task 6: Component Tooltip + thay `title=` ở toolbar và header
  - File: `src/components/shared/Tooltip.tsx` (mới) + export ở `src/components/shared/index.ts`, các nút liệt kê trong design mục Tooltip
  - Verify: case T1–T7; đổi ngôn ngữ vi/en thấy tooltip đổi.
  - Build cuối phase.

## Phase 4: Panel + thông báo

- [x] Task 7: Panel Khay chờ + nút mở
  - File: `CanvasApp.tsx` (mở `slow`+`enter`, đóng `normal`+`exit`, `inert` khi đóng), `UnsortPanel.tsx` (nút mở dùng `fade`; lớp phím panel không chạy khi đóng)
  - Verify: case N1–N5.

- [x] Task 8: Toast / banner
  - File: `CanvasNotice.tsx`, `src/components/shared/UpdateBanner.tsx`, `src/components/shared/OfflineBadge.tsx`
  - Verify: case S1–S2 (offline: DevTools > Network > Offline).
  - Build cuối phase.

## Phase 5: Liên tục + chốt luật + doc

- [x] Task 9: Canvas và vòng lặp tôn trọng token / giảm chuyển động
  - File: `src/tools/canvas/hooks/useObjectDrag.ts` (`SETTLE_MS` → token, helper giảm chuyển động), `src/components/shared/Skeleton.tsx` (dùng keyframe đặt tên), `BoardTitleRow.tsx`, `RemoteEditBadge.tsx` (gom về khối giảm chuyển động chung), zoom bằng nút nếu có ramp
  - Verify: case C1–C3.

- [x] Task 10: Luật lint + doc
  - File: `eslint.config.js` (chặn `cubic-bezier(` và `duration-<số>` / `duration-[`), các doc ở design mục "Doc cần cập nhật"
  - Verify: `npm run lint` pass; thêm thử `duration-200` vào 1 file thì lint báo, xoá đi. Grep `src/` (trừ `experiments`, `landing`) không còn `cubic-bezier` ngoài `index.css`, không còn lifecycle vào/ra tự viết (E1–E3).
  - Build cuối phase.

## Chuỗi phụ thuộc

Task 1 → 2 → (3, 4, 5, 7, 8 làm độc lập) → 6 sau 5 (cùng file nút) → 9 → 10.

## i18n

Không có chữ UI mới, trừ việc sửa `'Thêm Note'` ở ContextMenu (dùng key có sẵn nếu có, không thì thêm `CANVAS.CONTEXT_MENU.*` vào `vi.json` + `en.json`). Tooltip dùng lại chuỗi `title` hiện có.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass (cuối phase)
[ ] npm run lint pass
[ ] npm run test pass (cuối phase)
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Không có số ms / cubic-bezier cứng mới ngoài file token
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
