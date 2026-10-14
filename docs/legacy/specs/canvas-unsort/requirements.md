> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Yêu cầu — Canvas Unsort Panel

**Trạng thái**: Chờ duyệt
**Cập nhật cuối**: 2026-09-18

## Mục tiêu

Panel bên phải canvas hiển thị object thuộc board hiện tại nhưng "chưa xếp lên canvas" (unsort). Object vào Unsort qua cross-board drop hoặc context menu chủ động. User kéo từ Unsort ra canvas để đặt vị trí, hoặc reorder trong Unsort. Mỗi board có Unsort riêng, persist qua IDB.

Feature này giải quyết vấn đề "handle vị trí khi cross-board drop" — object không cần geometry ngay, để user tự đặt sau. Đồng thời làm nền cho tương lai import/paste/drag-from-desktop (vào Unsort trước, xếp sau).

Data model thêm field `unsortIndex: number | null` vào `CanvasObject`. null = trên canvas (dùng `geometry`); số = trong Unsort của `boardId` đó, thứ tự tăng dần từ top.

## User stories

### US-1: Panel Unsort bên phải canvas
Là user, tôi muốn thấy panel Unsort bên phải canvas để nắm object nào chưa xếp.

**Điều kiện chấp nhận**:
- Cho canvas đang mở (root hay nested board), khi bấm tab "Unsort" ở góc phải-trên canvas, thì panel Unsort trượt vào từ phải, chiếm slot 260px, canvas thu hẹp lại.
- Cho panel đang mở, khi bấm nút X trong panel header hoặc bấm tab Unsort lần nữa, thì panel đóng, canvas trở lại full width.
- Cho panel đang mở, khi bấm Escape, thì panel đóng.
- Cho Unsort có ≥ 1 object, thì tab hiện count badge (số object đang trong Unsort của board hiện tại).
- Cho Unsort rỗng, thì tab vẫn hiện (không ẩn) với badge "0" hoặc chấm mờ.

### US-2: Cross-board drop → object vào Unsort đích
Là user, tôi muốn kéo object thả lên Board tile để chuyển vào Unsort của board đó, không phải lo vị trí.

**Điều kiện chấp nhận**:
- Cho object đang drag trên canvas cha, khi thả lên Board tile khác board hiện tại, thì object đổi `boardId` sang board đích + gán `unsortIndex = 0` (top của list), object khác trong Unsort đích đẩy index +1.
- Cho drop nhiều object cùng lúc (multi-select), thì tất cả vào top Unsort đích theo thứ tự selection, các item cũ đẩy xuống.
- Cho user vào board đích sau khi drop, thì object không hiện trên canvas (vì `unsortIndex !== null`) mà nằm ở đầu list Unsort.
- Cho Unsort panel của board đích đang không mở khi user vào, thì count badge trên tab tăng đúng số object mới vào.
- Cho user Ctrl+Z ngay sau cross-board drop, thì object về canvas cha vị trí cũ + `unsortIndex = null` khôi phục.

### US-3: Reorder items trong Unsort
Là user, tôi muốn kéo item up/down trong Unsort để sắp xếp theo ý.

**Điều kiện chấp nhận**:
- Cho ≥ 2 item trong Unsort, khi drag 1 item lên/xuống, thì item khác dịch chuyển để nhường chỗ (preview live).
- Cho thả item vào vị trí mới, thì `unsortIndex` của toàn bộ items được cập nhật đúng thứ tự mới, persist qua IDB.
- Cho drag ra ngoài panel (VD ra canvas), thì behavior chuyển thành US-4 (kéo ra canvas).
- Cho Ctrl+Z, thì thứ tự cũ được restore.

### US-4: Kéo Unsort item ra canvas → đặt vị trí
Là user, tôi muốn kéo item từ Unsort ra canvas để đặt object ở vị trí cụ thể.

**Điều kiện chấp nhận**:
- Cho item trong Unsort, khi drag item ra ngoài panel (thả lên canvas surface), thì object gán `unsortIndex = null`, `geometry` được set với x/y = toạ độ drop trong canvas space (dùng camera hiện tại).
- Cho drop vào canvas, thì object hiện trên canvas ngay, panel Unsort giảm 1 item, items còn lại reorder `unsortIndex`.
- Cho drop vào 1 Board tile khác trên canvas (nested), thì object chuyển vào Unsort của board đó (không đặt lên canvas), `unsortIndex = 0` board đích.
- Cho drop ngoài canvas (VD trên header/toolbar), thì huỷ, item về chỗ cũ trong Unsort.
- Cho Ctrl+Z, thì item về Unsort với `unsortIndex` cũ.

### US-5: Context menu "Move to Unsort" cho object canvas
Là user, tôi muốn chuyển object đang ở trên canvas vào Unsort của board hiện tại để dọn dẹp mà không mất object.

**Điều kiện chấp nhận**:
- Cho 1 hoặc nhiều object đang chọn trên canvas, khi mở context menu (right-click hoặc keyboard shortcut nếu có), thì có option "Chuyển vào Unsort".
- Cho user bấm option đó, thì object gán `unsortIndex = 0` (top) + `geometry` giữ nguyên nhưng không dùng (vì sẽ dùng lại khi kéo ra), object biến khỏi canvas view, panel Unsort có object mới ở top.
- Cho Ctrl+Z, thì object về canvas với geometry cũ.

### US-6: Delete object từ Unsort
Là user, tôi muốn xoá object không cần dùng nữa từ Unsort.

**Điều kiện chấp nhận**:
- Cho item trong Unsort chọn (click), khi bấm Delete/Backspace, thì object bị xoá khỏi Unsort + khỏi IDB (xoá thật, không phải move về canvas). Undo được.
- Cho multi-select nhiều item, khi bấm Delete, thì ConfirmDialog nêu số lượng như canvas.
- Cho Board object trong Unsort, khi bấm Delete, thì cascade dialog nêu board content (giống delete trên canvas).

### US-7: Preview item trong Unsort
Là user, tôi muốn biết item là gì mà không cần vào chi tiết.

**Điều kiện chấp nhận**:
- Cho item Note trong Unsort, thì list item hiện icon Note + title (fallback "Untitled note" nếu rỗng) + subtitle "Note · {relative time}" (VD "3 phút trước").
- Cho item Board, thì icon Board + name + subtitle "Board · {N} cards".
- Cho item Rect (Phase A debug), thì icon Rect + label "Rect · rectangle".
- Cho item tương lai (Image/Link/PDF), thì mỗi renderer expose metadata qua registry (Phase 2 sẽ thêm callback `renderUnsortSummary` — không thuộc scope này).

### US-8: Multi-select trong Unsort
Là user, tôi muốn chọn nhiều item trong Unsort để xoá / kéo hàng loạt.

**Điều kiện chấp nhận**:
- Cho click item, thì item được chọn (highlight ring primary), các item khác bỏ chọn.
- Cho Ctrl+Click item, thì toggle chọn (thêm vào selection nếu chưa có, bỏ nếu đã có).
- Cho Shift+Click item, thì range select từ item chọn gần nhất tới item vừa click.
- Cho Ctrl+A khi focus panel, thì chọn tất cả items trong Unsort.
- Cho drag khi có multi-selection, thì kéo cả nhóm (US-3 hoặc US-4).

### US-9: Undo/redo cho tất cả thao tác Unsort
Là user, tôi muốn Ctrl+Z hoạt động cho mọi thao tác Unsort như trên canvas.

**Điều kiện chấp nhận**:
- Cho vừa cross-board drop, Ctrl+Z → object về canvas cũ.
- Cho vừa reorder, Ctrl+Z → thứ tự cũ.
- Cho vừa kéo ra canvas, Ctrl+Z → về Unsort.
- Cho vừa Move to Unsort, Ctrl+Z → về canvas.
- Cho vừa Delete từ Unsort, Ctrl+Z → object khôi phục.

### US-10: Persist Unsort qua session
Là user, tôi muốn Unsort giữ state qua F5.

**Điều kiện chấp nhận**:
- Cho item trong Unsort, khi F5 refresh, thì item vẫn ở Unsort với đúng thứ tự (`unsortIndex` persist).
- Cho nhiều board mỗi board có Unsort riêng, khi navigate qua board khác rồi quay lại, thì Unsort của mỗi board giữ nguyên state.

## Phân loại

**Phải có (must-have)**: US-1, US-2, US-3, US-4, US-6, US-7, US-8, US-9, US-10.

**Nên có (nice-to-have)**:
- US-5 (context menu "Move to Unsort") — hữu ích nhưng không phải core flow. Nếu context menu chưa có framework (mockup 04 có gợi ý dots menu trên card head, chưa impl trong bibo) thì defer.
- US-7 metadata subtitle chi tiết hơn (VD "3 phút trước" cần relative-time helper) — MVP dùng type label thuần "Note · Untitled".

## Ngoài phạm vi

- Rail 56px + Workspace panel (mockup 04). Không liên quan Unsort.
- Import file / paste URL / drag từ desktop → Unsort. Chưa có infra, spec riêng cho từng loại.
- Auto-suggest chỗ đặt object khi kéo ra canvas (VD snap to empty area). MVP dùng cursor drop point.
- Filter / search trong Unsort (khi list dài). Backlog.
- Bulk move Unsort → canvas grid layout (VD "xếp hết 10 item vào grid 5x2"). Backlog.
- Share Unsort giữa boards (VD Unsort global). Không cần vì Unsort per-board đủ dùng.
