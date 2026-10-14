> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Task — Canvas Nested Boards

**Trạng thái**: Đã ship, chờ user manual verify.

## Phase 1: Data model + repository

- [x] Task 1: Extend `types.ts` cho Board.color + boardDataSchema
- [x] Task 2: Extend repository actions cho Board CRUD (`deleteBoard`, `deleteObjectsByBoard`)

## Phase 2: Current board state + URL routing

- [x] Task 3: Store `current-board-store.ts` + `boards-store.ts` + `lib/slug.ts` + routes `/canvas/:boardId?/:slug?`
- [x] Task 4: Adjust `useCanvasBootstrap` (load boards vào store) + tách `useBoardSync` (hydrate camera + objects + persist theo currentBoardId)

## Phase 3: BoardObject renderer + create

- [x] Task 5: Component `BoardObject.tsx` + register vào registry (icon vuông solid color 72x72, title editable, "N cards", `data-board-tile-id` cho hit-test)
- [x] Task 6: Toolbar Board tile → real. Action `createBoardAt` compound (Board entity + BoardObject atomic undo). Rotate color qua 6 màu palette theo sibling count.

## Phase 4: Navigation + move cross-board

- [x] Task 7: Double-click Board icon → navigate `/canvas/:linkedBoardId/:slug`. Breadcrumb Row 1 render ancestry chain, click segment về board đó. Home label cho root. Collapse `Home / ... / Parent / Current` khi ≥ 4 segments.
- [x] Task 8: Drop-onto-tile move cross-board. `useObjectDrag` hit-test BoardObject, `interaction-store.hoveredBoardTileId` cho BoardObject ring highlight + count +1 preview. Drop → `moveObjectsToBoard` push undo với snapshot.

## Phase 5: Delete cascade + rename

- [x] Task 9: `deleteBoardCascade` recursive. `countBoardTreeSize` async query IDB. CanvasApp branch Delete flow: Board → cascade dialog show "{N} object + {M} board con"; non-board → simple confirm.
- [x] Task 10: Inline rename Board:
  - Tile: BoardObject double-click title bubble → ObjectsLayer set editingId → renderer show inline input.
  - Breadcrumb Row 2: title nested board double-click → `TitleEditable` input. Commit → renameBoard + URL slug replace (không push history mới).

## Phase 6: Undo/redo + polish

- [x] Task 11: Undo/redo cho toàn bộ Board ops (create, delete cascade, rename, move cross-board) — mỗi action push command với snapshot đủ để restore.
- [x] Task 12: Polish:
  - Invalid URL `/canvas/:invalidId` → redirect `/canvas`.
  - Canonical form: paste `/canvas/:rootBoardId` → redirect `/canvas`.
  - Breadcrumb collapse ≥ 4 segments (không popover, backlog #6).
  - Color rotate 6 màu palette theo sibling count.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[x] npm run build pass (10s, 0 error)
[x] npm run lint pass (0 error, 7 warning react-refresh — 2 mới từ BoardObject cùng pattern object cũ, non-blocking)
[x] Không có console.log mới
[x] tasks.md task này đã [x]
[x] progress.md không tạo (task xong 1 lượt)
[x] Handoff `.kiro/notes/canvas-session-handoff.md` cập nhật state mới
[x] Doc/spec liên quan: chính spec `canvas-nested-boards/` đã ghi đủ decisions
```

## Manual verify

Test cases user cần chạy (build pass không đảm bảo behavior đúng):

1. **Tạo Board trên root**: click Board tile trong Toolbar → tile mới ở tâm viewport, icon dark neutral (root là index 0 → tan). Ctrl+Z → biến. Ctrl+Y → xuất hiện lại.
2. **Vào Board con**: double-click icon Board → URL đổi `/canvas/{id}/{slug}`, canvas empty với hint mờ giữa. Breadcrumb Row 1 hiện `Home / New Board`.
3. **Tạo tree 3 tầng**: trong Board A tạo Board B, double-click B, tạo Board C. Breadcrumb hiện `Home / New Board / New Board / New Board`. Click segment giữa về đúng board.
4. **Refresh nested**: F5 trong `/canvas/{id}/{slug}` → resume đúng board đó, camera restore.
5. **Rename tile**: double-click title Board (không phải icon) → input focus → gõ tên mới → Enter. Tile update. Undo → tên cũ.
6. **Rename breadcrumb Row 2**: vào 1 board con, double-click tên board Row 2 → input → gõ tên mới → Enter. URL slug replace ngay. Undo → về tên cũ.
7. **Drop-onto-tile**: drag 1 note trên canvas cha → hover Board tile → ring primary + count "0 cards" thành "1 cards" preview. Thả → note biến khỏi canvas cha. Vào board → note ở đó. Undo → note về canvas cha.
8. **Delete Board có content**: chọn Board tile → Backspace → dialog "Xoá board X? Sẽ mất N object + M board con.". Confirm → toàn cây biến. Undo → restore hết.
9. **URL invalid**: gõ `/canvas/xxxxxxxx` → redirect `/canvas`.
10. **URL canonical root**: gõ `/canvas/{rootBoardId}` → redirect `/canvas`.
11. **Camera per-board**: trong Board A zoom 200%, vào Board B zoom 50%, quay lại A → 200%. Persist qua refresh.
12. **Color rotate**: tạo 6 board liên tục → 6 màu khác nhau (tan, coral, sage, sky, rose, ...). Board thứ 7 → wrap về zinc.
13. **Breadcrumb collapse**: tạo tree 5 tầng → Row 1 hiện `Home / ... / Parent / Current`.
