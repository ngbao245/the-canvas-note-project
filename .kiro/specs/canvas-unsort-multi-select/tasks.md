# Tasks — Canvas Unsort Multi-Select

Spec ngắn cho feature multi-select trong Unsort panel. Đã discuss + chốt qua chat 2026-09-21.

## Scope

Bốn cách chọn nhiều item trong Unsort:

1. **Ctrl+click** — toggle từng item.
2. **Shift+click** — chọn range từ anchor tới item shift-click.
3. **Ctrl+A** — chọn toàn bộ item Unsort khi panel là active target.
4. **Marquee drag** — kéo chuột trong vùng trống panel để chọn item trong khung.

Sau đó: preview stack + reorder multi + drag-out multi (đã có backend, chỉ hoàn thiện UI).

## Ràng buộc

- Selection share chung với canvas (`useSelectionStore`). Không tách store.
- `activePanel` flag mới trong `unsort-store` để phân biệt Ctrl+A scope.
- Không đụng persistence, không đổi signature action `moveFromUnsortToCanvas` / `reorderInUnsort` / `moveObjectsToUnsort` (đã nhận array).

## Phase 1 — Chọn nhiều (input methods)

- [x] Task 1: Selection anchor + Shift range
  - Thêm `lastSelectedIndex: number | null` vào `unsort-store` (anchor cho Shift range).
  - Sửa `UnsortItem` click handler:
    - Click thường → `select(id)` + set anchor = index này.
    - Ctrl/Meta click → `toggle(id)` + set anchor = index này.
    - Shift click → nếu có anchor, `replace` selection = tất cả item từ `min(anchor, index)` đến `max(anchor, index)`. Anchor giữ nguyên (không đổi khi Shift).
  - Verify: getDiagnostics clean. Manual smoke sau Task 4.

- [x] Task 2: `activePanel` flag + Ctrl+A
  - Thêm `activePanel: 'unsort' | null` vào `unsort-store`, action `setActivePanel(p)`.
  - Set `'unsort'` khi user click vào panel (bất kỳ chỗ nào trong panel, bao gồm header, item, empty area).
  - Reset về `null` khi user click ngoài panel (canvas surface, toolbar, header canvas).
  - Thêm keyboard listener trong `UnsortPanel` (hoặc route.tsx): nếu `activePanel === 'unsort'` + panel mở + không đang focus input/textarea → Ctrl/Meta+A → `replace(items.map(o => o.id))`, preventDefault.
  - Verify: getDiagnostics clean. Manual smoke sau Task 4.

- [x] Task 3: Marquee drag select trong panel
  - Hook mới `hooks/useUnsortMarquee.ts` — pointer down trên vùng trống panel (target không có `data-unsort-item-id`).
  - Vẽ khung nét đứt (`div absolute` border-dashed, `bg-primary/10`).
  - `pointermove`: recompute intersect khung với `getBoundingClientRect()` từng item. Trong quá trình: `replace` selection = ids intersect. Nếu Ctrl held khi bắt đầu marquee → merge với selection cũ (`addToSelection`).
  - `pointerup`: clear khung, chốt selection.
  - Handle click trên empty area không di chuyển đủ threshold (4px) → clear selection (behavior click-outside).
  - Verify: getDiagnostics clean.

- [x] Task 4: Verify Phase 1
  - `npm run build` + `npm run lint` cuối phase.
  - Manual test:
    - Ctrl+click 3 item lẻ → 3 item highlight.
    - Click item 1, Shift+click item 5 → 5 item liên tiếp highlight.
    - Click panel + Ctrl+A → toàn bộ item Unsort highlight.
    - Click canvas + Ctrl+A → KHÔNG chọn Unsort (không leak).
    - Kéo chuột từ vùng trống panel qua 3 item → 3 item highlight.
    - Click 1 item → selection chỉ còn 1 item đó (Shift range mới dùng anchor này).

## Phase 2 — Hoàn thiện drag multi

- [ ] Task 5: Drag preview stack đa item
  - Sửa `UnsortDragPreview`: đếm số item trong selection nằm trong Unsort của board hiện tại.
  - Nếu > 1: render 3 layer stack (offset 4px + 4px), badge `+N-1` phía trên phải preview chính.
  - Nếu = 1: giữ như hiện tại.
  - Verify: getDiagnostics clean.

- [ ] Task 6: Reorder trong panel với multi-select
  - Sửa `useUnsortDrag` `onUp` khi `!drag.outsidePanel`:
    - Nếu selection có > 1 item trong Unsort của board hiện tại → rút toàn bộ selected ra khỏi order, chèn liên tiếp tại `targetIndex` (giữ thứ tự tương đối cũ).
    - Nếu = 1 → giữ logic cũ.
    - Anchor sau reorder: cập nhật `lastSelectedIndex` = vị trí item source mới.
  - Sửa `UnsortItem` opacity: nếu `isDragged` OR item nằm trong selection multi + đang drag → opacity 0.5.
  - Verify: getDiagnostics clean.

- [ ] Task 7: Verify Phase 2
  - `npm run build` + `npm run lint`.
  - Manual test:
    - Chọn 3 item → drag 1 trong 3 ra canvas → 3 item bay ra, xếp cascade (đã có sẵn).
    - Chọn 3 item → drag trong panel → 3 item collapse chỗ cũ mờ, chèn liên tiếp chỗ mới.
    - Preview thấy stack + badge "+2".
    - Kéo 1 item không nằm trong selection → chỉ 1 item bay (fallback single).

## Ngoài scope (không làm phase này)

- E — Bulk toolbar (Delete, Move to board, Clear all). Làm sau nếu vẫn cần.
- Escape hủy drag đang thực hiện.
- Feedback haptic / animate khi Ctrl+A.
