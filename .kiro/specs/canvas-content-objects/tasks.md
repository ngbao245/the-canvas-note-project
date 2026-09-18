# Task — Canvas Content Objects (Phase B)

**Trạng thái**: Chờ duyệt

Mỗi task là 1 verifiable unit. Trong phase dùng kiểm tra kiểu (getDiagnostics) sau mỗi task; chạy `npm run build` 1 lần cuối phase. Engine core Phase A giữ nguyên.

Reference donor: `bibo-hub/src/tools/canvas/components/objects/` + `hooks/useObjectRegistry.ts` (chỉ đọc). Đọc để bám pattern, viết lại theo convention bibo (design system, TS strict, alias `@/`, không copy nguyên xi).

## Phase 1: Registry + shell + refactor render (nền)

- [x] Task 1: Zod schema per type + registry
  - `types.ts`: thêm `noteDataSchema`, `imageDataSchema`, `linkDataSchema` + type export.
  - `hooks/useObjectRegistry.tsx`: registry map + `registerObjectType`, `getObjectTypeDefinition`, `getAllObjectTypes`, `getToolbarObjectTypes`, `ObjectRendererProps`, `ObjectTypeDefinition`.
  - Verify: build pass.

- [x] Task 2: ObjectShell + refactor ObjectsLayer sang registry
  - `components/objects/ObjectShell.tsx`: vỏ chung (position, border, selection, shadow, slot children).
  - `components/objects/RectObject.tsx`: chuyển RectRenderer hiện tại thành renderer đăng ký type 'rect' (giữ tương thích data cũ).
  - `components/ObjectsLayer.tsx`: đổi từ RectRenderer inline sang tra registry theo `obj.type`; giữ nguyên logic drag/select Phase A.
  - `engine/actions.ts`: tổng quát `createRectAt` thành `createObjectAt(type, x, y, boardId)` dùng defaultGeometry/defaultData từ registry (giữ createRectAt như wrapper nếu cần).
  - Verify cuối Phase 1: `npm run build` pass; mở `/canvas`, rect cũ vẫn render, tạo/drag/select/xoá/undo rect không hồi quy. [x]

## Phase 2: Note object

- [x] Task 3: NoteObject + edit inline
  - `components/objects/NoteObject.tsx`: register type 'note'. Idle hiển thị title + body (placeholder khi rỗng). Edit: double-click → title focus, Enter xuống body, blur/Escape/Ctrl+Enter thoát + lưu (undo được).
  - Wire double-click → isEditing trong ObjectsLayer (cơ chế edit chung: 1 object đang edit tại 1 thời điểm).
  - Verify cuối Phase 2: build pass; tạo Note (tạm qua createObjectAt), sửa title/body, reload thấy giữ nội dung, undo edit hoạt động.

## Phase 3: Toolbar palette + tạo object

- [x] Task 4: Toolbar palette dọc + click-tạo + kéo-thả-tạo
  - `components/Toolbar.tsx`: cột nút dọc screen-space, đọc `getAllObjectTypes()` (Note + Trash trước; Image/Link thêm khi có ở Phase 4/5). Icon + tooltip.
  - Click nút → `createObjectAt(type, tâm-viewport-canvas-space)` + select.
  - Kéo nút → thả canvas → `createObjectAt(type, điểm-thả-canvas-space)` + select.
  - Nút Trash: xoá object đang chọn.
  - Verify cuối Phase 3: build pass; click Note ra giữa màn, kéo Note thả đúng chỗ, Trash xoá được, undo tạo được.

## Phase 4: Image object

- [ ] Task 5: Blob store + helper ảnh
  - `api.ts`: thêm `saveBlob/loadBlob/deleteBlob` vào interface + IndexedDbCanvasRepository (kv-store `bibo-canvas-blobs`).
  - `lib/file-to-image.ts`: validate mime ảnh, File → { blob, mimeType, naturalWidth, naturalHeight }.
  - `lib/blob-url-cache.ts`: createObjectURL cache theo blobId + revoke.
  - Verify: getDiagnostics sạch (pure lib + repo method).

- [ ] Task 6: ImageObject + 3 nguồn nhập
  - `components/objects/ImageObject.tsx`: register 'image'. Load blob → object URL, skeleton khi chờ, icon vỡ khi lỗi. Double-click → thay ảnh (file picker).
  - Upload: toolbar Image click → file picker → tạo object.
  - Paste: nghe paste ảnh trên canvas → tạo tại giữa viewport.
  - Drag-drop desktop: nghe drop file ảnh trên surface → tạo tại vị trí thả (phân biệt drag nội bộ). File không hợp lệ → toast lỗi.
  - Verify cuối Phase 4: build pass; upload + paste + drag-drop đều tạo Image; reload thấy ảnh; resize giữ object-fit; xoá + undo.

## Phase 5: Link object

- [ ] Task 7: Helper link + LinkDialog
  - `lib/link-metadata.ts`: validate URL (thử prepend https), lấy hostname, faviconUrl từ hostname.
  - `components/LinkDialog.tsx`: dialog nhập/sửa URL (Style Button + input), validate inline.
  - Verify: getDiagnostics sạch.

- [ ] Task 8: LinkObject + tạo qua toolbar/paste
  - `components/objects/LinkObject.tsx`: register 'link'. Hiển thị favicon (globe khi lỗi) + title (mặc định hostname) + URL. Ctrl/Cmd+Click mở tab mới. Double-click → LinkDialog sửa URL.
  - Toolbar Link click → LinkDialog → tạo object.
  - Paste URL text → tạo Link.
  - Verify cuối Phase 5: build pass; tạo Link qua dialog + paste; favicon hiện/degrade; mở link; sửa URL; reload giữ; xoá + undo.

## Phase 6: Polish + verify tổng

- [ ] Task 9: Nhất quán edit + biên + verify Phase B
  - Kiểm rule "đang edit text → Delete không xoá object" cho cả 3 type.
  - Kiểm resize content co giãn đúng (Note cắt/cuộn, Image fit, Link ellipsis).
  - LoadingState/ErrorState theo `ui-patterns` nơi có async (blob load).
  - Verify cuối Phase B: `npm run build` pass, `npm run lint` pass; chạy toàn bộ US-1..US-7 bằng tay.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass (cuối phase)
[ ] npm run lint pass (cuối phase)
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior/AC: doc/spec liên quan đã update (docs/canvas.md nếu đụng engine/kiến trúc)
[ ] Nếu tạo folder mới trong src/: cân nhắc note kiến trúc
```

## Ghi chú

- Thứ tự phase: nền (registry/shell) → Note → toolbar → Image → Link → polish. Toolbar (Phase 3) làm sau Note để có ít nhất 1 type thật click-tạo; Image/Link thêm vào toolbar khi tới phase của chúng.
- Phần khó nhất: Task 6 (Image 3 nguồn nhập + blob + object URL lifecycle) và Task 4 (kéo-thả-từ-toolbar). Đọc kỹ donor ImageObject + blob-url-cache.
- Nice-to-have có thể cắt nếu chậm: kéo-thả-từ-toolbar (giữ click-tạo), paste ảnh/URL (giữ upload/dialog). Cắt thì ghi vào deviations.
- Sau Phase B: `canvas-editing-polish` (Phase C — màu tag, rich text, connector, snap, sidebar palette).
