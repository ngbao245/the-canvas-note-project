# 11 — Loại object trên canvas

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: khuôn định nghĩa 1 loại object, sổ đăng ký, thanh tạo object (nút type), các loại đang có, luật thêm loại mới, lọc dữ liệu khi dán.

Không gồm: chi tiết note (editor, tự lưu, mã đoạn, Card Clipper: `12`), chọn / kéo / resize / undo dùng chung mọi loại (`10`), cách lưu (`20`).

## Hiện trạng

### Khuôn 1 loại (`ObjectTypeDefinition`, `hooks/useObjectRegistry.tsx`)

| Trường | Bắt buộc | Dùng ở đâu |
|---|---|---|
| `type` | Có | Khoá trong sổ, lưu vào `CanvasObject.type` |
| `renderer` | Có | `ObjectsLayer` vẽ bên trong khung chung `ObjectShell`. Cũng dùng cho preview kéo |
| `defaultGeometry` | Có | Rộng, cao, `rotation`, `zIndex` lúc tạo. `zIndex` bị bỏ: `createObjectAt` luôn đặt = lớn nhất của board + 1 |
| `defaultData()` | Có | `data` ban đầu, mỗi lần gọi trả object mới |
| `label` | Có | Nhãn nút trên thanh tạo |
| `showInToolbar` | Không | Có nút trên thanh tạo không |
| `ownSelectionFrame` | Không | Renderer tự đặt `SelectionBox` quanh phần thân (Board: chỉ khối vuông). Không có thì viền bọc cả khung |
| `onResizeCommit` | Không | Chạy sau khi resize xong (Note: chuyển `heightMode` sang `fixed`) |
| `sanitizePastedData` | Không, trừ loại hiện HTML / URL người dùng nhập | Lọc `data` khi dán. Trả `null` → bỏ object |
| `renderElementActions` | Không | Nút khi chọn 1 object. Không có → bộ nút chung |
| `renderEditingActions` | Không | Nút khi đang sửa. Không có → loại đó không vào chế độ sửa trên toolbar |

### Sổ đăng ký

- Mảng `OBJECT_TYPES` trong `components/objects/index.ts` là chỗ đăng ký duy nhất; thứ tự mảng = thứ tự nút. `CanvasSurface` import file này 1 lần trước khi vẽ.
- Engine (toạ độ, camera, di chuyển, resize, xoá) không đọc sổ. Nơi tra sổ: `ObjectsLayer`, `Toolbar`, `createObjectAt`, `clipboard.ts`, `FloatingObjectPreview`, `SelectionBox`, Card Clipper.
- Object có `type` không có trong sổ: không vẽ (`ObjectsLayer` trả null), không xoá, dữ liệu giữ nguyên. Dán: bỏ object đó.

### Loại đang có

| Loại | Nút | Mặc định (rộng × cao) | Riêng |
|---|---|---|---|
| `note` | Có | 338 × 68 (Milanote đo DOM). Cao tự tăng theo chữ khi `heightMode: auto` | `sanitizePastedData` (lọc HTML), `onResizeCommit` (→ `fixed`), nút chọn + nút sửa riêng. Chi tiết `12` |
| `board` | Có | 98 × 139 (Milanote đo DOM) | `ownSelectionFrame`. Tạo qua `createBoardAt` (Board mới + tile trong 1 bước undo), không qua `createObjectAt`. `data` chỉ có `linkedBoardId`. Chi tiết `10` |

Loại `rect` (thử từ Phase A, không có nút) đã gỡ 2026-10-13 theo bạn chốt: không còn đường tạo, dữ liệu cũ đã bỏ khi lên database bản 2. Object `rect` còn sót (nếu có) rơi vào luật `INV-OBJ-06`: không vẽ, giữ nguyên dữ liệu.

### Thanh tạo object (`components/Toolbar.tsx`, chế độ tạo)

- Nút thật lấy từ `getToolbarObjectTypes()` (lọc `showInToolbar`). Bấm: tạo ở tâm màn hình. Kéo (`useToolbarDrag`): tạo tại chỗ thả, chỉ khi thả trên mặt canvas.
- Icon nút: bảng `REGISTRY_TO_TILE` (type → icon trong `TileIcons.tsx`). Loại thiếu trong bảng hiện icon note.
- Nút giữ chỗ (chưa làm, bấm không có gì): Link, Image, To-do, Table, File, Line (`PLACEHOLDER_TYPES`).
- Chế độ chọn / sửa của toolbar đọc `renderElementActions` / `renderEditingActions` của loại đang chọn.

### Kích thước dự kiến cho loại chưa làm

Dùng khi viết định nghĩa, để preview trong Unsort đúng tỉ lệ (chuyển từ note `canvas-object-type-defaults.md`, chưa đo lại Milanote):

| Loại | Rộng × cao | Lý do |
|---|---|---|
| link | 240 × 100 | favicon + tiêu đề + hostname 1 hàng |
| image | 240 × 180 | Ảnh ngang; tỉ lệ thật của file đè lên khi thêm |
| todo | 240 × 240 | Nhiều dòng checkbox |
| table | 320 × 200 | ≥ 3 cột × 3 hàng |
| file | 200 × 100 | Icon + tên file 1 hàng |
| line | 100 × 100 | Chỉ là ô giữ chỗ; hình thật theo 2 đầu (`canvas-backlog.md`) |

Đổi kích thước mặc định không đổi object đã tạo. Kiểm lại preview Unsort sau khi đổi.

### Dán (`lib/clipboard.ts`)

Clipboard là nguồn không tin được (trang nào cũng ghi được chuỗi `canvas-clip:v1:`). Mỗi object được kiểm: `type` phải có trong sổ, `geometry` qua `geometrySchema`, `data` qua `sanitizePastedData` của loại. Sai thì bỏ object đó, không báo lỗi.

## Thêm 1 loại mới

1. Renderer `components/objects/XxxObject.tsx` (chỉ export component, không gọi `registerObjectType`).
2. Định nghĩa `components/objects/xxx-type.ts(x)` theo khuôn trên. Schema `data` trong `types.ts` (Zod).
3. Thêm vào `OBJECT_TYPES`. Có nút thì thêm icon vào `REGISTRY_TO_TILE` và bỏ khỏi `PLACEHOLDER_TYPES`.
4. Hiện HTML / URL người dùng nhập → bắt buộc `sanitizePastedData`, không `innerHTML` data thô.
5. Cần tạo nhiều thứ cùng lúc (như Board) → hàm tạo riêng trong `engine/actions.ts`, 1 bước undo.
6. Ghi 1 dòng vào bảng "Loại đang có" của file này.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-OBJ-01` | Đăng ký loại chỉ qua mảng `OBJECT_TYPES`; file renderer không gọi `registerObjectType` | 1 chỗ biết đủ mọi loại, file renderer chỉ export component (Fast Refresh) | Review + `coding-style.md` |
| `INV-OBJ-02` | Engine (toạ độ, camera, di chuyển, resize, xoá) không đọc sổ, không đọc `data` | Thêm loại không đụng engine | Review |
| `INV-OBJ-03` | Loại hiện HTML / URL người dùng nhập phải có `sanitizePastedData`; không `innerHTML` / `dangerouslySetInnerHTML` data chưa lọc | Chặn XSS qua clipboard và dữ liệu cũ | Review |
| `INV-OBJ-04` | Dán phải qua `readCanvasClipboard` (kiểm type, geometry, data từng object) | Clipboard không tin được | Review |
| `INV-OBJ-05` | Đọc chữ từ HTML không dùng `div.innerHTML` trên document chính; dùng `DOMParser` hoặc `<template>` | `<img onerror>` chạy dù div chưa gắn vào trang | Review |
| `INV-OBJ-06` | Object có `type` lạ: không vẽ, không xoá, không sửa `data` | Không mất dữ liệu khi gỡ / đổi tên loại | Review `ObjectsLayer` |
| `INV-OBJ-07` | Object mới luôn nằm trên cùng (`zIndex` = lớn nhất board + 1), bỏ `zIndex` của `defaultGeometry` | Milanote: vừa tạo là thấy | Review `createObjectAt` |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/tools/canvas/hooks/useObjectRegistry.tsx` | Khuôn `ObjectTypeDefinition`, sổ, `getToolbarObjectTypes` |
| `src/tools/canvas/components/objects/index.ts` | `OBJECT_TYPES` |
| `src/tools/canvas/components/objects/{note,board}-type.ts(x)` | Định nghĩa từng loại |
| `src/tools/canvas/components/objects/{Note,Board}Object.tsx`, `ObjectShell.tsx` | Renderer, khung chung |
| `src/tools/canvas/components/Toolbar.tsx`, `TileIcons.tsx`, `hooks/useToolbarDrag.tsx` | Thanh tạo object, nút giữ chỗ, kéo tạo |
| `src/tools/canvas/engine/actions.ts` | `createObjectAt`, `createBoardAt` |
| `src/tools/canvas/components/ObjectsLayer.tsx` | Vẽ theo sổ, viền chọn |
| `src/tools/canvas/lib/clipboard.ts` | Kiểm object khi dán |

## Nguồn liên quan

- Spec `.kiro/specs/canvas-content-objects/` (Image + Link, Task 5-9 chưa làm).
- `.kiro/notes/canvas-backlog.md` (Line, các loại chưa làm).
- Bản cũ: `docs/legacy/canvas.md`, `docs/legacy/canvas-object-type-defaults.md`.

## Câu còn mở

- (2026-10-13) Nhãn nút trên thanh tạo chưa qua bộ dịch: `aria-label` ghép cứng "Tạo {label}", nhãn giữ chỗ (Link, Image...) viết cứng. Thuộc việc `i18n` Task 5-7.
- (2026-10-13) `imageDataSchema` nhắc kho blob cho ảnh, kho này chưa có. Quyết khi làm Image.
