# Prompt mở session mới — tiếp màu board / note (canvas)

Dán nguyên khối dưới cho Kiro ở session mới.

---

Tiếp việc canvas: popup Màu của board tile và note. Đọc trước:
- `.kiro/notes/canvas-session-handoff.md` (mục màu board/note: BT2, BT6, BT7, BT8, NC1, CC1–CC8)
- `.kiro/specs/canvas-board-color-polish/` và `.kiro/specs/canvas-board-icon/`
- `docs/system/11-object-types.md` (mục Màu / Màu icon / Icon của board) + `docs/system/12-note.md` (mục Màu) + `docs/system/decisions.md` phần 2026-10-16

File chính đụng tới:
- `src/tools/canvas/components/ColorSwatches.tsx` — `Swatch`, `SwatchRow`, `SavedColorRow`, `CustomColorButton`
- `src/tools/canvas/components/objects/BoardToolbar.tsx` — `BoardColorPopup`
- `src/tools/canvas/components/objects/NoteToolbar.tsx` — `ColorPopup`
- `src/tools/canvas/lib/board-colors.ts` — `BOARD_DARK_COLORS` / `BOARD_LIGHT_COLORS` (mỗi list 10 màu), `boardInkColor`, `boardSwatchBackground`, `resolveBoardColor`, `BOARD_COLOR_THEME`
- `src/tools/canvas/store/custom-color-store.ts` — màu tuỳ chỉnh dùng chung note + board, 5 ô
- `src/tools/canvas/engine/actions.ts` — `setBoardColor`, `updateObjectData`, `previewBoardColor`, `previewObjectData`, `hasObjectPreview`

## Luật màu đã chốt (2026-10-16, không hỏi lại)
- Màu chữ / icon LUÔN tự tính theo độ sáng nền (như Milanote), không lưu, không chỉnh tay. Nền đậm → chữ/icon trắng (ô vẽ trơn), nền sáng → đen (ô vẽ chia chéo `boardSwatchBackground`). Ngưỡng luminance 0.6 — CHƯA đo khớp Milanote, nếu lệch thì đo qua MCP rồi chỉnh.
- Đã gỡ hẳn: `Board.iconColor`, `Board.ink`, nhấp đúp đổi chữ, khu "Màu biểu tượng" trong popup icon, hàng cặp "A" + hàng gợi ý của note.
- Popup Màu (cả board + note) = phần 1 màu chữ trắng + phần 2 màu chữ đen + phần 3 màu tuỳ chỉnh đã lưu. Board có thêm ô đầu "Theo giao diện" (chia chéo trắng/đen, lưu `Board.color = 'theme'`) + ô "Mặc định". Note có ô "không màu" / "bỏ màu" / "trong suốt" như cũ.
- Mỗi loại (trắng, đen) 10 màu, chia 5 ô / hàng → tự xuống 2 hàng. Danh sách cứng trong `board-colors.ts`, note dùng chung.
- Màu tuỳ chỉnh: kéo trong bảng màu đổi màu realtime trên object (preview, không lưu, không undo); chốt (OK / Enter / bấm ra ngoài) mới lưu + 1 bước undo. Dùng chung note + board.

## Trạng thái hiện tại
Code: diagnostics sạch 3 file màu, CHƯA build 1 lần cuối (nhờ chạy `npm run build` + `npm run lint` + `npm run test` đầu session để chốt).
- Popup Màu board + note cùng `w-[188px]`, `SwatchRow` lưới cố định 5 cột 28px canh giữa, ô 28×24. Vừa khít 5 ô, không dư (fix 2026-10-16).
- Note "Theo giao diện" ĐÃ GỠ (bạn đổi ý 2026-10-16): note không còn ô này, board vẫn giữ.
- `CustomColorButton` đã bỏ prop `compact` (code chết sau khi gỡ màu icon board).

## Chưa verify tay (nhờ bạn test)
BT8, NC1, realtime preview khi kéo custom (board + note, cả tab Thanh trên), bấm ra ngoài bảng màu vẫn áp, popup 5 ô co giãn cân đối.

## Lưu ý
- Chưa commit gì (git init rồi, chưa commit lần nào).
- Ngưỡng 0.6 chia trắng/đen chưa đo Milanote.
- Màu tuỳ chỉnh bản cũ (`bibo-board-color-recent`, `{hex,ink}`) đã có migrate về mảng hex trong `custom-color-store.ts`.
