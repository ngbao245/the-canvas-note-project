# Task — Hoàn thiện Note

**Trạng thái**: Chờ duyệt

Tham chiếu: `requirements.md`, `design.md`, `docs/system/12-note.md`. Verify build chạy 1 lần cuối mỗi phase; trong phase dùng getDiagnostics.

## Phase 1: Dọn nợ cũ

- [x] Task 1: Gộp undo kéo góc note (US-1)
  - File: `src/tools/canvas/components/objects/note-type.tsx` (`onResizeCommit`), `src/tools/canvas/engine/actions.ts` (nếu cần gộp bước)
  - Nội dung: khi kéo góc note `auto` chuyển sang `fixed`, gộp đổi `heightMode` vào cùng bước undo với resize thay vì tạo bước "Edit object" riêng.
  - Verify: kéo góc note auto → Ctrl+Z 1 lần → về đúng cỡ + heightMode cũ. Note đã fixed kéo góc vẫn 1 bước.

- [x] Task 2: Min 68 cho note fixed (US-2)
  - File: `src/tools/canvas/components/objects/note-type.tsx` hoặc `SelectionBox`/resize path (xác định min theo type note)
  - Nội dung: note `fixed` kéo góc không nhỏ hơn 68 chiều cao, bằng note auto.
  - Verify: kéo góc note fixed thu nhỏ → dừng ở 68.

- [x] Task 3: Dịch chữ cứng toolbar note (US-3)
  - File: `src/tools/canvas/components/objects/NoteToolbar.tsx`, `NoteObject.tsx` (placeholder), `src/lib/i18n/locales/vi.json` + `en.json`
  - Nội dung: thêm key cho nhãn nút (Đậm, Nghiêng, Bulleted list, Numbered list, Text style, Link, Save, Remove, Cancel, placeholder, tên kiểu chữ), dùng `t(...)`. `anchorLabel` Text style/Link dùng cùng key với nút mở.
  - Verify: đổi ngôn ngữ → mọi nhãn đổi; lệnh tự kiểm i18n trong coding-style không bắt chữ cứng mới; click nút Text style/Link vẫn đóng popup đúng.

## Phase 2: Mở rộng Text style

- [x] Task 4: Thêm extension màu chữ + highlight vào schema (US-5, US-6)
  - File: `src/tools/canvas/lib/note-schema.ts`, cài `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-highlight` nếu chưa có
  - Nội dung: thêm TextStyle + Color + Highlight (multicolor) vào `NOTE_SCHEMA_EXTENSIONS` để cả editor lẫn `sanitizeNoteHtml` hiểu. Giữ `INV-NOTE-02`.
  - Verify: getDiagnostics clean; tạm test tay sau Task 6.

- [x] Task 5: Palette màu chữ + highlight (US-5, US-6)
  - File: `src/tools/canvas/lib/note-text-colors.ts` (mới), `vi.json`/`en.json`
  - Nội dung: 2 bảng màu (5 màu chữ + 5 màu nền) kèm labelKey dịch, hex (data color exception). Giống cấu trúc `note-colors.ts`.
  - Verify: getDiagnostics clean.

- [x] Task 6: Mở rộng popup Text style — kiểu khối + Color + Highlight (US-4, US-5, US-6)
  - File: `src/tools/canvas/components/objects/NoteToolbar.tsx`
  - Nội dung: thêm Small text, Code block, Callout vào nhóm kiểu khối; thêm nhóm Color (ô "A" tô màu, active state); nhóm Highlight (ô "A" nền màu, active state). Mỗi nhóm cuộn trong popup nếu tràn.
  - Verify (build cuối phase): mở Text style → chọn từng kiểu/màu/nền → chữ đổi đúng; F5 giữ nguyên; xem lại note (không sửa) hiển thị đúng (sanitize giữ mark/node).

- [x] Task 6b: Menu More lúc sửa — Underline, Strike, Code inline, Align (US-9)
  - File: `src/tools/canvas/lib/note-schema.ts` (thêm Underline + TextAlign; cài `@tiptap/extension-underline`, `@tiptap/extension-text-align`), `src/tools/canvas/components/objects/NoteToolbar.tsx` (menu More lúc sửa), `vi.json`/`en.json`
  - Nội dung: nút More lúc sửa mở ToolbarPopup gồm Code inline (`toggleCode`, có sẵn StarterKit), Underline (`toggleUnderline`), Strikethrough (`toggleStrike`, có sẵn), Align trái/giữa/phải (`setTextAlign`). Active state mỗi mục. Nút có `onMouseDown preventDefault` giữ chế độ sửa.
  - Verify (build cuối phase): mở More lúc sửa → bật từng định dạng → chữ đổi đúng, active hiện; F5 giữ; xem lại note hiển thị đúng (sanitize giữ mark + attribute align).

## Phase 3: Menu More + khoá vị trí

- [x] Task 7: Trường `locked` trong NoteData (US-7)
  - File: `src/tools/canvas/types.ts` (`noteDataSchema`), `src/tools/canvas/lib/note-data.ts` (`parseNoteData`), `docs/system/12-note.md` (bảng dữ liệu)
  - Nội dung: thêm `locked: boolean` mặc định false; parseNoteData điền mặc định.
  - Verify: getDiagnostics clean.

- [x] Task 8: Chặn kéo/resize khi note khoá (US-7)
  - File: hook kéo (`useObjectDrag.ts` / `usePointerFSM.ts`), path resize (`SelectionBox`/`note-type`)
  - Nội dung: note `locked` → bỏ qua kéo di chuyển + kéo góc. Chọn/sửa/đổi màu vẫn được. Kéo cụm có note khoá → note khoá đứng yên.
  - Verify (build cuối phase): khoá note → không kéo/resize được; mở khoá → kéo lại được; F5 giữ khoá.

- [x] Task 9: Menu More chế độ chọn (US-7, US-8)
  - File: `src/tools/canvas/components/objects/NoteToolbar.tsx`, dùng `bringToFront`/`sendToBack` sẵn có trong `actions.ts`
  - Nội dung: nút More mở menu (dùng ToolbarPopup) 4 mục: Convert to Document (vô hiệu mờ), Lock/Unlock Position (toggle `locked`), Bring to Front, Send to Back. Thêm key dịch.
  - Verify (build cuối phase): bấm Bring to Front/Send to Back đổi lớp đúng; Lock/Unlock toggle + đổi nhãn; Convert to Document mờ không bấm được.

## Phase 4: Vô hiệu nút chưa làm

- [x] Task 10: Vô hiệu Labels/Reactions/Comment (US-8)
  - File: `src/tools/canvas/components/objects/NoteToolbar.tsx`, `Toolbar.tsx` (nếu ActionButton cần prop disabled), `vi.json`/`en.json`
  - Nội dung: Labels/Reactions/Comment (chọn) + Comment (sửa) ở trạng thái `aria-disabled`, mờ, tooltip "chưa có / cần đăng nhập". Dùng rule cursor not-allowed sẵn có (aria-disabled tự có not-allowed theo coding-style).
  - Verify (build cuối phase): các nút mờ, bấm không làm gì, tooltip hiện.

## Phase 5: Chốt doc

- [x] Task 11: Cập nhật doc + handoff (US-1..US-8)
  - File: `docs/system/12-note.md` (bảng dữ liệu `locked`, bảng toolbar đã nối, mục Text style mở rộng, invariant mới nếu có), `.kiro/notes/canvas-session-handoff.md` (xoá câu đã chốt US-1/US-2, cập nhật mục nối nút), `docs/system/decisions.md` (ghi quyết định đợt này)
  - Nội dung: đồng bộ doc với hành vi mới; gỡ 2 câu còn mở về undo kéo góc + min 68.
  - Verify: doc khớp code; không còn dòng mâu thuẫn.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass (cuối phase)
[ ] npm run lint pass (cuối phase)
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
[ ] .kiro/status/task-log.jsonl append 1 dòng (nếu có file)
```
