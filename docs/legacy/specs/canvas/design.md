> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Design — Canvas (Phase A)

Tài liệu này mô tả cấu trúc kỹ thuật cho Phase A. Tên biến/hàm chỉ minh hoạ, Builder quyết tên cuối. Kiến trúc bám donor `bibo-hub/src/tools/canvas/` để dễ port pattern, khác ở tầng repository (chỉ IndexedDB) và lớp vỏ UI (design system bibanote).

## Nguyên tắc

1. **Engine core không biết object type**. Engine chỉ chạm `geometry` + `type` + `id` + `boardId` + `zIndex`. Field `data` là polymorphic, Phase B renderer plugin đọc theo type. Nhờ đó Phase B thêm Note/Text/Image không phải đụng engine.
2. **Repository interface tách khỏi implement**. UI/store chỉ gọi interface, IndexedDB adapter implement. Phase D thay adapter Supabase mà không đụng UI.
3. **Store tách theo trách nhiệm** (theo donor): camera, objects, selection, interaction, history. Mỗi store 1 file, Zustand.
4. **Commands cho undo/redo**. Mọi action mutate state đi qua command pattern (`execute` + `undo`), push vào history stack.
5. **UI theo design system bibanote**. Không dùng shadcn Button trực tiếp trong code canvas — luôn qua `@/components/style`.

## Data model

Bám nguyên bộ Zod schema donor:

```
Geometry { x, y, width, height, rotation=0, zIndex=0 }
CanvasObject { id, type, boardId (null=root), geometry, data:unknown, createdAt, updatedAt }
Camera { x=0, y=0, zoom=1 }
Board { id, name, parentId (null=root), camera, createdAt, updatedAt }
```

`boardId: string | null` giữ sẵn từ Phase A dù Phase A chỉ có 1 root board. Phase D nested boards không phải migrate schema.

Phase A `type = 'rect'` (debug). Phase B thêm 'note' | 'text' | 'image' | 'link'.

## Kiến trúc lớp

```
Route (route.tsx)
   ↓
CanvasApp (component chính)
   ↓
CanvasSurface (khung + xử lý pointer/wheel)
   ↓
Renderer (map object → DOM/SVG theo type)
   ↓ đọc
Stores (camera, objects, selection, interaction, history)
   ↓ persist qua
Repository (interface)
   ↓ implement
IndexedDB adapter (Phase A) / Supabase adapter (Phase D)
```

## Stores (Zustand)

- **camera-store**: pan (x,y), zoom, hydrate/reset/fit.
- **objects-store**: `Map<id, CanvasObject>`, add/update/remove/hydrate.
- **selection-store**: `Set<id>`, select/toggle/clear.
- **interaction-store**: state hiện tại (idle | panning | dragging | resizing | marquee), transient data trong drag/resize.
- **history-store**: undo/redo stack, execute command.

## Repository interface

```
interface CanvasRepository {
  loadBoards(): Promise<Board[]>
  saveBoard(board: Board): Promise<void>
  loadObjects(boardId: string | null): Promise<CanvasObject[]>
  saveObject(obj: CanvasObject): Promise<void>
  deleteObject(id: string): Promise<void>
  saveCamera(boardId: string, camera: Camera): Promise<void>
}
```

Phase A implement `IndexedDbCanvasRepository`. Dùng IDB directly hoặc thư viện nhẹ (idb-keyval). Comment "TODO Phase D: SupabaseCanvasRepository".

## Command pattern (undo/redo)

```
interface Command { execute(): void; undo(): void; label: string }
```

Ví dụ: `CreateObjectCommand`, `MoveObjectCommand(id, from, to)`, `ResizeObjectCommand`, `DeleteObjectsCommand`.

`history-store` giữ 2 stack undo/redo, tối thiểu 50 entry.

## Coord + camera math

- Screen coord: pixel trên viewport
- Canvas coord: toạ độ trong không gian vô hạn
- Convert: `canvas = (screen - cameraOffset) / zoom`, `screen = canvas * zoom + cameraOffset`
- Zoom quanh cursor: giữ điểm dưới cursor cố định trong canvas-space khi zoom đổi
- Zoom clamp: [0.05, 3]

## Layout route

```
<CanvasRoute>
  <Header> (dùng Style Button, Badge — theo bibanote)
    "Canvas" · badge object count · [Fit] [Reset] · breadcrumb
  </Header>
  <CanvasApp>
    <CanvasSurface>
      <GridDots />   (SVG hoặc CSS background)
      <ObjectsLayer> {objects.map(obj => <Renderer obj={obj}/>)} </ObjectsLayer>
      <SelectionLayer>
        <MarqueeRect />
        <SelectionOutline + 8 ResizeHandles />
      </SelectionLayer>
      <ContextMenu /> (right-click, dùng dropdown-menu — có thể dùng Radix trực tiếp vì Style vỏ chưa có)
    </CanvasSurface>
  </CanvasApp>
</CanvasRoute>
```

Grid dots: `background-image: radial-gradient(...)` với size theo zoom.

## Renderer (Phase A)

Chỉ có `RectRenderer` cho type='rect'. Đơn giản: div với `bg-primary-soft`, `border-primary`, absolute positioned theo geometry * camera.

Phase B mở registry `Record<string, Renderer>` để thêm type mới.

## Selection UI

- Outline: border 2px `border-primary` bao AABB object đã select.
- 8 resize handle: 4 góc (nw, ne, sw, se) + 4 cạnh (n, s, e, w). Mỗi handle là dot 8x8 primary.
- Marquee rect: absolute positioned trong screen space (không đổi khi zoom), border dashed `border-primary`.

## Context menu

Right-click vùng trống → menu 1 mục "Add rect". Dùng Radix DropdownMenu (đã có sẵn qua @radix-ui). Wrap Style sau nếu cần.

## Persist strategy

- Object: mọi `add/update/delete` gọi repository ngay (không debounce ở Phase A).
- Camera: debounce 300ms rồi save (tránh save mỗi wheel event).
- Board: 1 root board "Home", tạo lần đầu mount nếu chưa có.

## Bootstrap

State machine đơn giản (không có auth/migration):
```
loading → ready | error
```

`loading`: load boards + objects từ IndexedDB.
`ready`: mount CanvasApp.
`error`: show ErrorState với retry.

Không phase auth-loading (chưa có auth). Không migration.

## Nơi đặt trong mã

Theo convention bibo (`src/tools/{tên-tool}/`):
```
src/tools/canvas/
  route.tsx
  types.ts             (Zod schema)
  api.ts               (repository interface + IndexedDB adapter)
  components/
    CanvasApp.tsx
    CanvasSurface.tsx
    Renderer.tsx
    SelectionLayer.tsx
    ContextMenu.tsx
    Grid.tsx
  store/
    camera-store.ts
    objects-store.ts
    selection-store.ts
    interaction-store.ts
    history-store.ts
  engine/
    coord.ts           (screen ↔ canvas conversion)
    commands.ts        (Command classes)
  lib/
    content-bounds.ts  (fit calculation)
  hooks/
    useCanvasBootstrap.ts
    usePointerInteraction.ts
    useWheelZoom.ts
```

## Rủi ro và lưu ý

- Hiệu năng: 500+ object cần render nhanh. Không React re-render toàn bộ khi drag 1 object — chỉ update transform CSS của object đang drag qua ref direct (donor làm vậy).
- IndexedDB write nhiều: batch nếu cần. Phase A không cần optimize, dùng gọn.
- Zoom quanh cursor: dễ sai công thức, viết unit test cho coord math (Phase A vẫn nên có test nhỏ).
- Design system: dùng Style vỏ cho button/badge. Nhưng selection handle, marquee, grid — là canvas-primitive, không dùng vỏ, code thẳng bằng div + class token.
