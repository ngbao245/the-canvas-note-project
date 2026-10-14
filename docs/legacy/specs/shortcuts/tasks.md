> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Task — Quản lý phím tắt tập trung

**Trạng thái**: Phase 1-5 xong (2026-10-07). Phase 5 chờ bạn test tay, phần Mac thật chưa thử.

## Phase 1: Lõi + phím toàn app

- [x] Task 1: Bộ điều phối + bảng phím toàn app
  - File: `src/lib/shortcuts/` (mới: kiểu khai báo, chuẩn hoá tổ hợp, ngăn xếp lớp, kiểm tra trùng, hook đăng ký), `src/App.tsx`, xoá `src/lib/useGlobalShortcuts.ts`
  - Verify:
    - Ctrl+Shift+< / > đổi kích thước giao diện, Ctrl+Shift+D đảo theme, ở canvas và khi modal Cài đặt mở.
    - Đang gõ trong input / note → 3 phím trên không chạy.
    - Bàn phím bố cục khác: < / > vẫn nhận theo phím vật lý.
    - Build pass.

## Phase 2: Canvas + Unsort

- [x] Task 2: Chuyển phím canvas sang bảng chung
  - File: `tools/canvas/` thêm file khai báo phím canvas; sửa `hooks/useCanvasKeys.ts`, `hooks/useDeleteKey.ts`, `hooks/usePointerInteraction.ts` (Space), `components/CanvasApp.tsx` (Ctrl+Shift+U)
  - Verify:
    - Từng phím nhóm Chỉnh sửa / Chọn / Xem / Lớp / Ctrl+Shift+U chạy như cũ.
    - Space giữ + kéo → kéo màn hình; thả Space hoặc Alt+Tab → hết chế độ kéo.
    - Ctrl+= / - / 0 không zoom trang trình duyệt.
    - Bật Caps Lock: F, Ctrl+D, Ctrl+Shift+U vẫn chạy.
    - Đang sửa note / tên board: F, 0, Delete, Ctrl+A không đụng canvas.
    - Rà 3 chỗ `onKeyDown` tại chỗ (BoardObject, BoardTitleRow, NoteToolbar) vẫn chạy đúng.

- [x] Task 3: Lớp panel Unsort
  - File: `tools/canvas/components/UnsortPanel.tsx` (Ctrl+A), `components/CanvasApp.tsx` (Esc đóng panel)
  - Verify:
    - Ctrl+A trong Unsort chọn hết item, cả khi bật Caps Lock.
    - Ctrl+A khi focus canvas chọn object canvas, không chọn item Unsort.
    - Unsort mở + đang chọn → Esc chỉ đóng panel; Esc lần 2 bỏ chọn.
    - Build pass (cuối phase).

## Phase 3: Popup, menu, dialog, modal

- [x] Task 4: Lớp động cho popup + menu
  - File: `tools/canvas/hooks/usePopup.ts`, `tools/canvas/components/ToolbarPopup.tsx`, `src/components/settings/AccountMenu.tsx`, `tools/canvas/components/ContextMenu.tsx`
  - Verify:
    - Popup View / Xuất / "..." breadcrumb / Color / TextStyle / Link / menu tài khoản / context menu: Esc chỉ đóng popup, vùng chọn giữ, đang edit note thì vẫn edit.
    - Esc trong ô URL Link đóng popup và trả focus về editor.
    - Mở popup toolbar rồi mở menu tài khoản → Esc đóng menu tài khoản trước.

- [x] Task 5: Lớp chặn cho dialog xác nhận + modal Cài đặt
  - File: `tools/canvas/components/ConfirmDialog.tsx`, `src/components/settings/SettingsModal.tsx`
  - Verify:
    - Dialog xoá mở: Esc huỷ (vùng chọn giữ), Enter xác nhận, Delete / Ctrl+Z / F không đụng canvas.
    - Modal Cài đặt: Esc đóng + trả focus, Tab / Shift+Tab xoay vòng trong modal, phím canvas không chạy, Ctrl+Shift+D vẫn đảo theme.
    - Build pass (cuối phase).

## Phase 4: Bảng Cài đặt + dọn dẹp

- [x] Task 6: Bảng Cài đặt đọc từ bảng chung + dọn
  - File: `src/components/settings/sections/ShortcutsSection.tsx`, xoá `tools/canvas/lib/dom.ts` (đổi import sang `@/lib/dom`), `.kiro/notes/canvas-session-handoff.md`, `.kiro/steering/coding-style.md`
  - Verify:
    - Cài đặt → Phím tắt hiện đủ 24 dòng, cùng nhóm, cùng thứ tự, cùng nhãn như trước.
    - Thêm thử 1 phím giả vào bảng canvas → hiện trong Cài đặt; khai báo trùng tổ hợp → console dev cảnh báo. Gỡ phím giả.
    - Grep `addEventListener('keydown'` trong `src/` chỉ còn bộ điều phối + listener của Tiptap editor.
    - Handoff ghi kiến trúc mới, coding-style thêm rule "thêm phím = khai báo trong bảng".
    - Build + lint pass.

## Phase 5: macOS (đợt 2, thêm 2026-10-07)

- [x] Task 7: Nguồn platform + lựa chọn trong Cài đặt (US-9)
  - File: `src/stores/` (store mới lưu lựa chọn), `src/lib/shortcuts/platform.ts`, `format.ts`, `index.ts`, `src/components/shortcuts/ShortcutKeys.tsx` + các chỗ gọi `shortcutKeys` / `formatCombo` trong component, `CanvasApp.tsx` (hằng nhãn Undo cấp module), `LocalizationSection.tsx`, `vi.json` + `en.json`
  - Verify:
    - Mặc định Tự động, nhãn theo máy (Windows: `Ctrl+Z`).
    - Chọn macOS → modal phím tắt, Cài đặt, tooltip Undo/Redo đổi sang `⌘Z` ngay, không F5.
    - F5 → lựa chọn giữ nguyên.
    - Chọn macOS trên Windows → Ctrl+Z vẫn undo.

- [x] Task 8: Chọn thêm bằng Cmd trên Mac + chặn Cmd+[ / ] (US-7, US-8)
  - File: helper phím chính cho chuột trong `src/lib/shortcuts/`, `tools/canvas/hooks/useObjectDrag.ts`, `hooks/usePointerInteraction.ts`, `hooks/useUnsortMarquee.ts`, `components/UnsortItem.tsx`, `hooks/useCanvasKeys.ts`
  - Verify (trên Windows, đặt Kiểu bàn phím = macOS để giả lập):
    - Ctrl + click object → không chọn thêm. Alt/Win key không đổi gì.
    - Đặt lại Tự động / Windows → Ctrl + click chọn thêm, Ctrl + kéo vùng trống pan như cũ.
    - Không chọn gì, bấm Ctrl+[ / ] → không có gì xảy ra, không Back.
    - Ctrl + lăn chuột vẫn zoom ở mọi lựa chọn.
    - Build + lint pass (cuối phase).
  - Cần thử trên Mac thật (ngoài phạm vi verify của Kiro): Cmd + click, Ctrl + click mở menu, Cmd+[ không Back trên Safari.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
