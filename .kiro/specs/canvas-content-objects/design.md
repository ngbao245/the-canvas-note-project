# Thiết kế — Canvas Content Objects (Phase B)

**Trạng thái**: Nháp

Tài liệu mô tả kiến trúc Phase B. Tên biến/hàm/component chỉ minh hoạ, Builder quyết tên cuối. Bám pattern donor `bibo-hub/src/tools/canvas/` (ObjectShell + registry + object type) nhưng viết lại theo convention bibo. Engine core Phase A giữ nguyên, chỉ thay tầng render + thêm cách tạo object + thêm blob store.

## Nguyên tắc

1. **Engine core không đổi**. `coord`, `camera`, `camera-engine`, các action move/resize/delete trong `actions.ts` giữ nguyên — chúng chỉ chạm `geometry/type/id/boardId/zIndex`. Phase B thêm object type mà không sửa engine.
2. **Registry thay switch cứng**. Tầng render Phase A (RectRenderer inline trong ObjectsLayer) đổi thành registry map. Mỗi type đăng ký renderer + defaultGeometry + defaultData + label. ObjectsLayer tra registry theo `obj.type` để render.
3. **Shell chung + content slot**. Tách vỏ object (position, border, selection outline, shadow) ra 1 component dùng chung. Mỗi renderer chỉ lo nội dung theo type.
4. **Data polymorphic + Zod per type**. `CanvasObject.data` vẫn `unknown` ở schema gốc. Mỗi type có Zod schema riêng cho phần `data` của nó, renderer parse/validate khi đọc.
5. **Offline-first**. Mọi thứ chạy qua IndexedDB. Link favicon là ảnh public (degrade sạch khi mất mạng). Không gọi backend.

## Màn hình / luồng

### Canvas (giữ full-screen `/canvas`)
- Header Phase A giữ nguyên (back, tên, badge count, zoom %, Fit, Reset, theme).
- **Toolbar palette dọc** nổi trong canvas (kiểu Milanote): cột nút dọc, mỗi nút 1 object type (Note, Image, Link) + nút Trash ở cuối. Đặt cố định 1 mép (VD trái), không bị camera transform (screen-space overlay).
  - Mỗi nút có icon + tooltip tên.
  - Click nút → tạo object type đó giữa viewport, auto-select.
  - Kéo nút thả xuống canvas → tạo object tại vị trí thả, auto-select.
  - Trash: đích kéo-thả để xoá (kéo object vào Trash → xoá). Phase B tối thiểu: nút Trash xoá object đang chọn (kéo-vào-trash là nice-to-have).

### Note (card ghi chữ)
- Idle: card nền `card`, border, vùng title (đậm) + vùng body, placeholder mờ khi rỗng.
- Double-click → edit: title input focus trước, Enter xuống body, blur/Escape/Ctrl+Enter thoát + lưu.

### Image
- Idle: ảnh fill khung (object-fit cover), bo góc theo vỏ.
- Loading blob: skeleton/placeholder. Lỗi: icon ảnh vỡ.
- Double-click → mở file picker thay ảnh.
- Tạo: click toolbar (file picker) / paste ảnh / drag-drop file desktop.

### Link
- Idle: hàng ngang — favicon (trái) + title (mặc định hostname) + URL (mờ, nhỏ).
- Favicon lỗi → globe icon.
- Ctrl/Cmd+Click → mở tab mới.
- Double-click → dialog sửa URL.
- Tạo: click toolbar (dialog nhập URL) / paste URL.

### Dialog nhập URL (Link)
- Input URL + nút Tạo/Huỷ. Validate URL hợp lệ (có scheme http/https hoặc tự thêm https). Sai → báo lỗi inline, không đóng.

## Dữ liệu

### Schema `data` theo type (Zod per type)
- **Note**: `{ title: string, body: string }`.
- **Image**: `{ blobId: string, mimeType: string, naturalWidth: number, naturalHeight: number }` — pixel ảnh KHÔNG nằm trong object, chỉ giữ `blobId`.
- **Link**: `{ url: string, title: string, hostname: string }` — favicon suy ra từ hostname lúc render (không lưu ảnh). `title` mặc định = hostname.

`CanvasObject` gốc (id/type/boardId/geometry/data/createdAt/updatedAt) giữ nguyên schema Phase A.

### Blob store (mới)
- Thêm kv-store IndexedDB riêng cho blob ảnh (VD `bibo-canvas-blobs`): `blobId -> Blob`.
- Repository interface thêm method: `saveBlob(id, blob)`, `loadBlob(id)`, `deleteBlob(id)`.
- Khi xoá Image object: xoá luôn blob tương ứng (trong undo cần khôi phục được — cân nhắc giữ blob tới khi undo stack đẩy ra, hoặc đơn giản: không xoá blob ngay, dọn sau; Builder chọn cách an toàn với undo).
- Object URL (`URL.createObjectURL`) cache theo `blobId`, revoke khi không còn dùng để tránh rò bộ nhớ.

### Persist
- Object data: mọi create/update/delete gọi repository ngay (như Phase A).
- Blob: lưu 1 lần khi tạo Image, đọc khi render.
- Camera: giữ debounce 500ms Phase A.

## Kiến trúc render (thay Phase A)

```
ObjectsLayer
  └─ với mỗi object: tra registry[obj.type] → render <ObjectShell> + content component của type
ObjectShell (vỏ chung)
  - absolute position theo geometry (world layer, đã trong wrapper transform của engine)
  - border, selection outline, shadow, hover state
  - slot children = content theo type
Registry (module-level singleton)
  - registerObjectType({ type, renderer, defaultGeometry, defaultData, label })
  - getObjectTypeDefinition(type), getAllObjectTypes()
Renderer per type (Note/Image/Link)
  - nhận { object, isSelected, isEditing, onEditEnd }
  - tự đọc object.data theo Zod schema của mình
```

Toolbar palette đọc `getAllObjectTypes()` để render danh sách nút (label + icon), nên thêm type mới tự lên toolbar.

## Cách tạo object

- Hàm tạo dùng chung: nhận `type` + vị trí canvas-space → lấy `defaultGeometry` + `defaultData` từ registry → tạo `CanvasObject` → add store + persist + select + push undo command (dùng lại pattern `createRectAt` Phase A, tổng quát hoá thành `createObjectAt(type, x, y, boardId)`).
- Click toolbar: vị trí = tâm viewport quy về canvas-space (dùng coord + camera hiện tại).
- Kéo toolbar → thả: vị trí = điểm thả quy về canvas-space.
- Image/Link cần dữ liệu bổ sung (blob / url) → tạo object sau khi có dữ liệu (chọn file xong / nhập URL xong), không tạo rỗng.

## Nhập ảnh (Image)

- **Upload**: input file ẩn, accept image types. Đọc file → lưu blob → đọc kích thước tự nhiên → tạo object.
- **Paste**: nghe `paste` event trên canvas, nếu `clipboardData` có image item → đọc như file.
- **Drag-drop desktop**: nghe `dragover`/`drop` trên surface, `dataTransfer.files` có ảnh → tạo tại vị trí thả. Cần `preventDefault` trên dragover để nhận drop; phân biệt với drag nội bộ (toolbar/object) bằng cờ hoặc kiểm `dataTransfer.types`.
- Helper chung: File ảnh → { blob, mimeType, naturalWidth, naturalHeight }.

## Nhập link (Link)

- Validate: thử `new URL(input)`; nếu thiếu scheme thử prepend `https://`. Hỏng → lỗi.
- Favicon: `https://www.google.com/s2/favicons?domain={hostname}&sz=64` (hoặc service tương đương). Render `<img>` onError → globe icon.
- Paste URL: nghe paste text, nếu match URL pattern → tạo Link.

## Tương tác với tool khác

Không. Phase B khép trong canvas domain.

## Điều kiện biên

- **Empty canvas**: giữ như Phase A (grid dots, không object). Toolbar vẫn hiện.
- **Blob load lỗi / mất**: Image hiện icon vỡ, không crash.
- **Favicon lỗi / offline**: globe icon.
- **Paste không phải ảnh/URL**: bỏ qua (không tạo gì), không báo lỗi ồn.
- **File không phải ảnh hợp lệ**: toast lỗi ngắn.
- **URL sai**: lỗi inline trong dialog.
- **Đang edit text mà nhấn Delete**: chỉ sửa text, không xoá object (rule Phase A: focus trong input → phím xoá không kích hoạt delete object).
- **Resize Image rất nhỏ / rất to**: giữ tỉ lệ hợp lý, min 40x40.

## Rủi ro và lưu ý

- **Undo cho Image + blob**: xoá object thì blob nên giữ lại để undo khôi phục được. Cách an toàn: delete object không xoá blob ngay; dọn blob mồ côi khi cần (hoặc bỏ qua ở Phase B, chấp nhận blob dư — dọn ở phase sau). Builder chọn, ghi rõ trong code.
- **Object URL memory leak**: phải revoke khi Image unmount / thay ảnh. Dùng cache theo blobId + reference count đơn giản.
- **Drag-drop desktop va với pan/marquee**: chỉ nhận drop khi `dataTransfer` chứa file từ ngoài (không phải drag nội bộ). Test kỹ.
- **Registry + HMR**: register ở module load, HMR có thể register lại — cho phép overwrite (như donor).
- **Migration data Phase A**: rect cũ trong IndexedDB vẫn còn type='rect'. Phase B nên giữ RectRenderer (hoặc bỏ qua render type lạ) để không crash với data cũ. Cân nhắc: giữ 'rect' như debug type, hoặc migrate/bỏ. Builder xử nhẹ (giữ rect renderer tối thiểu).

## Nơi đặt trong mã (dự kiến)

```
src/tools/canvas/
  types.ts                 (thêm Zod schema per type: note/image/link data)
  api.ts                   (thêm blob store + saveBlob/loadBlob/deleteBlob vào interface + adapter)
  engine/actions.ts        (tổng quát createObjectAt; giữ move/resize/delete)
  hooks/
    useObjectRegistry.ts    (registry: register/get/getAll)
  components/
    objects/
      ObjectShell.tsx       (vỏ chung)
      NoteObject.tsx        (register type 'note')
      ImageObject.tsx       (register type 'image')
      LinkObject.tsx        (register type 'link')
      RectObject.tsx        (giữ 'rect' tối thiểu cho data cũ — optional)
    ObjectsLayer.tsx        (đổi: tra registry thay RectRenderer inline)
    Toolbar.tsx             (palette dọc, đọc getAllObjectTypes)
    LinkDialog.tsx          (dialog nhập/sửa URL)
  lib/
    file-to-image.ts        (File ảnh -> blob + kích thước; validate mime)
    link-metadata.ts        (validate URL, hostname, faviconUrl)
    blob-url-cache.ts       (createObjectURL cache + revoke)
```

## Quyết định đã hoãn

- Note màu tag (ColorBar) — Phase C.
- Rich text — Phase C.
- Kéo object vào Trash để xoá (Phase B tối thiểu: Trash xoá object đang chọn) — bản đầy đủ để sau.
- Dọn blob mồ côi triệt để — Phase sau.
