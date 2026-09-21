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

## Note auto-grow height (Milanote parity)

**Trạng thái**: Bibo Note hiện `height: fixed` (default 180). Milanote thực tế `height: auto` — grow theo content, min ~68 khi rỗng, tự cao khi có body dài. Kiro giữ fixed vì chưa refactor.

**Scope**:
- ObjectShell + NoteObject dùng `height: auto`, min-height (VD 68), max-height cap (VD viewport 80%).
- Corner resize handle hoạt động theo mode: kéo tay = fixed size (giữ nguyên), auto khi user không resize.
- `applyResize` cần biết mode auto vs fixed để không ghi height sai.
- Geometry.height meaning đổi: "hint" cho fixed mode, ignore cho auto mode. Cần field `heightMode: 'auto' | 'fixed'` trong data.
- Persist mode qua data (không phải geometry).

**Effort**: Medium (2-3 giờ). Cần đổi Zod schema note, ObjectShell layout, resize logic.

**Ưu tiên**: Sau khi ship object types khác. User có thể chấp nhận fixed height ở MVP.

## 5. Keyboard shortcuts

**Trạng thái**: Bibo hiện chỉ có Ctrl+Z/Y/Shift+Z (undo/redo), Delete/Backspace, F (fit), 0 (reset), Space+drag (pan). Session 2026-09-18 discuss xong danh sách shortcut, user chốt scope làm dưới đây.

**Ưu tiên**: Làm sau khi ship Image + Link object type (không blocking). Có thể xen kẽ theo mức phase.

### Phase 1 — Cực thiết yếu (làm sớm)

- **Ctrl+A** — Select all object trong board hiện tại.
- **Ctrl+C** — Copy object đang chọn vào clipboard (JSON serialize).
- **Ctrl+V** — Paste tại vị trí chuột trên canvas, hoặc tâm viewport nếu chuột ngoài canvas.
- **Ctrl+X** — Cut = Copy + Delete.
- **Ctrl+D** — Duplicate object đang chọn tại vị trí offset (VD +16px, +16px) để không đè.
- **Escape** — Deselect nếu có selection. Nếu đang edit note → thoát edit trước, chưa deselect (2 lần Esc mới deselect).
- **Enter** — Vào edit mode object đang chọn (thay double-click). Nếu > 1 object select → không làm gì hoặc chỉ vào edit primary.

Effort: ~2-3 giờ. Cần Clipboard API + JSON serialize object schema + strategy chọn vị trí paste.

### Phase 2 — Fine-tune (làm khi rảnh)

- **Arrow ←→↑↓** — Nudge object đang chọn 1px canvas-space theo hướng phím.
- **Shift+Arrow** — Nudge 10px.
- ~~**Ctrl+]** / **Ctrl+[** — Bring forward / send backward~~ ĐÃ LÀM (2026-09-20, Phase 2 stacking).
- ~~**Ctrl+Shift+]** / **Ctrl+Shift+[** — Bring to front / send to back~~ ĐÃ LÀM (2026-09-20).
- **Ctrl++** / **Ctrl+=** — Zoom in quanh tâm viewport, dùng notch ZOOM_STEP_IN.
- **Ctrl+-** — Zoom out quanh tâm viewport, dùng notch ZOOM_STEP_OUT.
- **Shift+drag** — Constrain di chuyển theo trục ngang HOẶC dọc (theo trục cursor di lệch nhiều hơn tại thời điểm drag start).
- **Ctrl+drag** — Duplicate + drag (giữ nguyên object cũ, kéo bản sao đi theo cursor).
- **Ctrl+Shift+drag** — Duplicate + constrain axis (kết hợp 2 cái trên).

Effort: ~2-3 giờ. Nudge + zIndex + zoom shortcut nhỏ, dễ. Ctrl+drag phức tạp hơn vì đụng flow drag hiện tại.

**Cẩn thận Ctrl+drag conflict**:
- `usePointerInteraction.ts` hiện dùng Ctrl+drag trên VÙNG TRỐNG = pan camera. Cần giữ.
- `useObjectDrag.ts` hiện có `if (e.button === 1 || e.ctrlKey || e.metaKey) return;` — Ctrl+drag trên object hiện SKIP drag để nhường surface xử pan.
- Muốn Ctrl+drag = duplicate object: đổi `useObjectDrag.onPointerDown` cho phép Ctrl+drag, phân biệt với pan bằng target (Ctrl+click object = duplicate flow, Ctrl+click trống = pan).
- **Alternative chuẩn Figma/Miro: Alt+drag** thay Ctrl+drag. Bibo hiện chưa dùng Alt cho gì, không conflict. Khi implement nên hỏi user chốt: Ctrl+drag (Windows-style) hay Alt+drag (Figma-style).

### Phase 3 — Tool shortcut (làm khi có object type mới)

Bấm 1 phím = chọn công cụ, click canvas = tạo object đó tại điểm click, xong cursor về Select.

- **V** — Select tool (mặc định).
- **H** — Hand tool (drag = pan luôn, không cần giữ Space).
- **N** — Add Note.
- **I** — Add Image (khi có).
- **L** — Add Link (khi có).
- **T** — Add Todo (khi có).
- **B** — Add sub-Board (khi có nested).
- **/** — Add Line (khi có).

Effort: ~1 giờ. Cần state `activeTool` trong interaction-store + cursor override khi tool khác Select.

### Phase 4 — Power user (khi bibo lớn hơn)

- **Ctrl+K** — Command palette / quick action search. Kiểu VS Code. Rất mạnh khi bibo có 20+ tool.
- **Ctrl+F** — Search text trong board (tìm note theo nội dung).
- **?** hoặc **Ctrl+/** — Overlay hiện danh sách phím tắt để user tự discover.
- **Tab** / **Shift+Tab** — Cycle selection giữa các object.
- **Home / End** — Scroll đến object đầu / cuối theo zIndex hoặc createdAt.
- **Ctrl+G** / **Ctrl+Shift+G** — Group / ungroup (chỉ làm khi bibo có concept group ngoài nested board).

Effort: Ctrl+K palette ~4-6 giờ nếu làm đàng hoàng. Còn lại ~30 phút mỗi cái.

### Phase 5 — Nested board (khi có nested board tool)

- **Backspace** (không có object select) hoặc **Ctrl+←** — Back về parent board.
- **Ctrl+→** — Đi vào board đang chọn (nếu object là board type).
- **Ctrl+Shift+←** — Về root board.

Effort: ~30 phút sau khi nested board xong.

### Rule chung khi implement

1. Guard `isEditableTarget` — mọi shortcut check user không đang gõ input/textarea. Bibo có sẵn `lib/dom.ts::isEditableTarget`.
2. Check `e.ctrlKey || e.metaKey` cho Mac cross-platform.
3. Không override phím tắt browser hay dùng (Ctrl+W/T/R).
4. Ưu tiên implement discoverability sớm — nếu có ≥ 10 shortcut, làm luôn overlay `?` help.
5. Ctrl+0 vs `0`: bibo đang dùng `0` không modifier cho reset view. Có thể trùng ý người dùng với Ctrl+0 mặc định browser (reset zoom trang). Cân nhắc chuyển `0` → `Ctrl+0` (override browser default) khi làm zoom shortcut.

### Gợi ý chưa chốt (để tham khảo sau)

- **Alt+drag** thay Ctrl+drag cho duplicate (chuẩn Figma/Miro, không conflict Ctrl-drag-pan).
- **S** — Save shortcut giả cho cảm giác "đã lưu" (bibo auto save qua IDB, không cần save thật). Tâm lý user.
- **Ctrl+Shift+D** — Toggle dark mode nhanh (bibo đã có nút toggle).
- **Ctrl+Shift+H** — Toggle hand-drawn / flat style.
- **Ctrl+Shift+E** — Export board thành PNG/JSON.

### Mac cross-platform

Mọi shortcut phải handle Mac song song với Windows. Convention:

**Modifier mapping**
- `Ctrl` (Windows/Linux) ↔ `Cmd` / `⌘` (Mac) → check `e.ctrlKey || e.metaKey` trong handler.
- `Alt` (Windows) ↔ `Option` / `⌥` (Mac) → check `e.altKey` (giống nhau, không cần map).
- `Shift` → giống nhau.

**Rule cứng**
1. Mọi handler shortcut BẮT BUỘC dùng `const mod = e.ctrlKey || e.metaKey` rồi check `mod` thay vì `e.ctrlKey` riêng. Bibo đã làm đúng ở `useCanvasKeys.ts` (undo/redo), giữ pattern này khi thêm shortcut mới.
2. Mac không có phím Delete riêng (bàn phím Apple), chỉ có Backspace. Bibo đã handle cả 2 phím trong `useDeleteKey.ts` → OK không cần đổi.
3. Ctrl+Y (redo Windows-only): trên Mac, phím Y có thể conflict browser default. Chỉ giữ Ctrl+Y trên Windows, còn Mac dùng Cmd+Shift+Z. Handler hiện tại của bibo có cả 2 shortcut nên OK.

**Detect OS trong UI (khi làm overlay `?` help hoặc tooltip)**

Cần helper `isMac()` để hiển thị tooltip đúng convention:
- Windows/Linux → "Ctrl+Z", "Ctrl+Shift+Z"
- Mac → "⌘Z", "⌘⇧Z" (hoặc "Cmd+Z", "Cmd+Shift+Z")

Đặt trong `src/tools/canvas/lib/dom.ts` hoặc `src/lib/os.ts` (shared toàn app):

```ts
export function isMac(): boolean {
  return typeof navigator !== 'undefined'
    && /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent);
}

export function modifierLabel(): string {
  return isMac() ? '⌘' : 'Ctrl';
}
```

Dùng: `title={`Undo (${modifierLabel()}+Z)`}`.

**Cẩn thận Mac-specific**
- `Cmd+W` đóng tab → không override.
- `Cmd+Q` thoát app → không override.
- `Cmd+H` ẩn app → không override (nếu định dùng H = Hand tool thì chỉ dùng khi không có modifier: `!mod && e.key === 'h'`).
- `Cmd+M` minimize → không override.
- `Ctrl` trên Mac thường dành cho terminal emulation, KHÔNG hijack Ctrl trên Mac cho shortcut app. Dùng Cmd.

**Alt/Option drag trên Mac**
- macOS Finder: Option+drag = copy file. Analog rất tốt cho canvas → chuẩn Figma/Miro cũng dùng Option+drag = duplicate.
- Bibo hiện chưa dùng Alt cho gì → dùng Alt+drag làm duplicate là an toàn, cross-platform hoạt động cùng convention.
- Nếu chọn Ctrl+drag (Windows-style) thì Mac tương ứng phải là Cmd+drag → nhưng Cmd+drag trên Mac có thể conflict với behavior khác. **Kiro nghiêng Alt+drag** khi implement để nhất quán 2 nền tảng.

## 6. activePanel = 'canvas' khi đóng Unsort

**Trạng thái**: Session 2026-09-21 ship multi-select Unsort. Hiện `activePanel` chỉ có 2 state: `'unsort' | null`. Đóng panel → set null. Khi đó Ctrl+A trên canvas cũng không có "owner", nếu sau này thêm Ctrl+A cho canvas thì cần biết focus đang ở đâu.

**Scope làm sau**:
- Đổi type `activePanel: 'unsort' | 'canvas' | null` (default `'canvas'`).
- Đóng panel Unsort (`setOpen(false)` hoặc `toggle` từ mở sang đóng) → set `'canvas'` thay vì `null`.
- Click canvas surface → set `'canvas'` (thay listener document click hiện tại).
- Ctrl+A khi `activePanel === 'canvas'` → chọn toàn bộ object canvas board hiện tại (chưa có, làm cùng lượt).

**Effort**: Small. Chỉ 1-2 file (`unsort-store.ts` + keyboard handler ở route/CanvasSurface).

**Ưu tiên**: Không blocking. Làm khi user muốn Ctrl+A trên canvas.

## 7. Portal drag item ra body

**Trạng thái**: Session 2026-09-21 phát hiện bug 2: item canvas khi drag lên gần header bị clip vì `CanvasApp` wrapper có `overflow-hidden`. Đã thử fix bằng nâng surface z-index + overflow visible → phá layout Unsort panel (bug 3: panel biến mất khi drag). Rollback.

Preview toolbar/Unsort không có bug vì portal ra `document.body` — position fixed, thoát mọi stacking + overflow clip. Canvas drag item chưa portal (item DOM giữ nguyên vị trí trong `ObjectsLayer` để engine transform theo camera).

**Scope làm sau**:
- Khi drag start, portal item DOM sang `document.body` (position fixed).
- Position tính bằng screen-space: cursor - grabOffset (không dùng camera transform).
- Kích thước = geometry.width/height × camera.zoom.
- Drop → un-portal, item về vị trí cũ trong ObjectsLayer với geometry đã update.
- Edge auto-pan vẫn work qua reposition (chỉ điều chỉnh camera state, item screen-space theo cursor).

**Effort**: Medium. Cần care về:
- Cursor grab offset chuyển từ canvas-space → screen-space.
- `applyMoveDelta` không đổi trực tiếp DOM (item DOM đã portal), thay vào đó chỉ update store; render trở lại chỉ khi drop.
- Multi-select: nhiều item portal đồng thời, giữ relative position.

**Trigger dọn**: Khi user complain header clip item lại, hoặc khi làm feature drag ra Unsort với "item bay tự nhiên" cần visual chuyển qua panel.

**Cùng lượt**: convert z-index tokens về số nhỏ. Hiện dùng 20000-60000 (`--z-toolbar` tới `--z-tooltip`) — anti-pattern z-index inflation. Sau khi portal xong thì:
- Modal/tooltip/drag layer portal ra body → paint order tự nhiên trên, không cần z-index cao.
- Đổi 6 token trong `src/styles/index.css` xuống 1-9 (hoặc 100-600 nếu muốn gap cho tier mới).
- CSS var names giữ nguyên → mọi component dùng var tự follow, không breakage.
- Tránh Tailwind default z-0..z-50, dùng z-index custom mapping trong `tailwind.config.ts`.
