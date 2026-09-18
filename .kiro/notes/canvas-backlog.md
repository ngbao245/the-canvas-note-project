# Canvas Backlog — Post Note Polish

Các topic đã discuss với user (session 2026-09-18) nhưng chưa làm. Đánh dấu để không quên khi quay lại canvas Phase B/C/D.

## 1. QuickLineCreationTool full feature

**Trạng thái**: Chỉ ship visual dot top-right ở Note polish task. Drag logic chưa có.

**Scope full feature**:
- Tạo `LineObject` type mới trong registry
- Endpoint anchor: line có 2 đầu, mỗi đầu có thể "attach" vào canvas point hoặc vào cạnh 1 object (magnet snap)
- Drag từ chấm QuickLine → tạo tạm line theo cursor → drop lên object khác = attach; drop trên canvas trống = tạo line free
- Routing math: line hiển thị dạng thẳng, cong (bezier) hoặc gấp (orthogonal). Milanote default cong.
- Render: SVG layer riêng trong canvas world, absolute path từ endpoint A đến B
- Persist: LineObject có `endpointA` và `endpointB` = `{ type: 'point', x, y } | { type: 'attach', objectId, edge: 'left'|'right'|'top'|'bottom'|'center' }`
- Nếu attach: khi object di chuyển/resize → line auto update endpoint theo edge object đó
- Nếu delete object có attached line → line convert endpoint sang free point (giữ nguyên vị trí lúc bị bỏ)

**Effort**: Medium-Large (1-2 ngày). Cần spec mini riêng: `.kiro/specs/canvas-line-object/`.

**Ưu tiên**: Sau khi ship xong Image + Link (Phase B) và Card polish. Vì cần LineObject là 4th object type độc lập với Note/Image/Link.

## 2. Alignment guides (magnetic snap)

**Trạng thái**: Đã đọc code plugin cũ `bibo-hub/src/tools/canvas/engine/alignment.ts` + `AlignmentGuideOverlay.tsx`. User confirm nghiêng option B: chỉ alignment guides, không snap-to-grid cứng.

**Scope**:
- Port pure math `alignment.ts` sang bibo v2 `src/tools/canvas/engine/alignment.ts` (không đổi logic, chỉ đổi import path)
- Thêm state `alignmentGuides: AlignmentGuide[]` vào `interaction-store.ts` (set khi drag detect, clear khi drop)
- Tích hợp compute alignment vào `useObjectDrag.ts`:
  - Trong lúc drag, mỗi frame compute alignment giữa dragging AABB vs mọi object khác (threshold ~4px canvas-space, chia zoom cho consistent screen threshold)
  - Nếu có snap delta → apply delta để "hút" dragging position về thẳng hàng
  - Set alignmentGuides state để overlay render
- Tạo `src/tools/canvas/components/AlignmentGuideOverlay.tsx` (port từ plugin cũ):
  - Render đường thẳng primary/60 full canvas surface qua guides
  - Convert canvas coord → screen qua camera
  - Position fixed, pointer-events-none, z-index dưới marquee/context menu
- Mount overlay trong CanvasSurface.tsx

**Effort**: Medium (2-3 tiếng). Không cần spec mini riêng, làm task đơn trong Phase B polish hoặc tách 1 task ngắn.

**Ưu tiên**: Sau khi ship Image + Link. Trước Line feature.

## 3. Snap-to-grid (grid magnetic)

**Trạng thái**: Discuss xong, user nghiêng KHÔNG làm (Milanote không có). Ghi để reference nếu sau này đổi ý.

**Nếu làm sau**:
- Port `snap.ts` từ plugin cũ (~30 dòng)
- Thêm `snap-store.ts` với toggle bật/tắt + persist localStorage
- Thêm SnapToggle button trong Toolbar
- Grid size default 20px (align với grid dot visual của CanvasSurface — hiện dùng dense 36px, cần sync nếu bật snap)

**Ưu tiên**: Chỉ làm nếu user đổi ý sau khi dùng alignment guides.

## 4. Line connection (từ QuickLine)

Redundant với #1, giữ như subitem của #1 nếu tách nhỏ hơn.

## Session context

- Session này ship: Note polish (radius, contrast shadow, ColorBar, Fraunces serif, padding, ResizeGrip decor), zoom smoothness fix (anchor lock + isolate ZoomBadge + alpha 0.20)
- Next session bắt đầu: Note polish part 2 (QuickLine visual dot + corner resize handle) → sau đó Phase B Task 5-9 (Image + Link)
