# Z-index Tiers — bibo

Ghi 2026-09-20. Nguồn chuẩn cho mọi quyết định về z-index screen-space toàn app.

## Nguyên tắc

- KHÔNG hardcode literal z-index (`z-50`, `zIndex: 9999`, `z-[100]`).
- Dùng token semantic: Tailwind class `z-{name}` hoặc CSS var `var(--z-{name})`.
- Một nguồn duy nhất: CSS var định nghĩa trong `src/styles/index.css`, Tailwind
  map lại trong `tailwind.config.ts`. Đổi giá trị chỉ sửa `index.css`.

## Hai lớp z-index KHÔNG nhầm lẫn

Có 2 stacking context khác nhau, đừng so sánh số giữa 2 lớp:

### Lớp 1 — Canvas object stacking (world-space)
Item chồng item TRONG board. Không phải CSS z-index screen. Lưu ở
`CanvasObject.geometry.zIndex`, apply qua inline style trong ObjectShell /
ObjectsLayer, sort trước khi render. Các token `--z-canvas-*` dưới chỉ để
đặt các LAYER world (grid, object layer, selection layer, drag preview
world) so với nhau — vẫn thấp hơn mọi overlay screen.

### Lớp 2 — Screen overlay (screen-space)
Overlay hiện trên/dưới nhau trên MÀN HÌNH: toolbar, header, dialog, menu,
drag ghost. Đây là CSS z-index thật. Token `--z-toolbar` trở lên.

## Bảng token (nguồn: src/styles/index.css)

| Token / class          | Value | Lớp    | Dùng cho                                        |
|------------------------|-------|--------|-------------------------------------------------|
| `z-canvas`             | 100   | world  | Grid nền / canvas base layer                    |
| `z-canvas-object`      | 300   | world  | Object layer trong world                        |
| `z-canvas-selection`   | 500   | world  | Selection box / handle trong world              |
| `z-canvas-drag-preview`| 700   | world  | Drag preview world-space (nếu cần trong world)  |
| `z-toolbar`            | 20000 | screen | Toolbar palette, UnsortToggle, banner, hint     |
| `z-header`             | 30000 | screen | Header 2-row canvas                             |
| `z-drag-layer`         | 40000 | screen | Drag ghost / floating preview (toolbar, unsort) |
| `z-modal`              | 50000 | screen | ConfirmDialog, ContextMenu, popover menu        |
| `z-tooltip`            | 60000 | screen | Tooltip, ViewMenu dropdown, top-most            |

Cách nhau bội số 100/1000 để chèn tầng mới không phải xáo trộn số cũ.

## Cách dùng

Trong className (ưu tiên):
```tsx
<div className="fixed z-modal ..." />       // dialog
<div className="absolute z-toolbar ..." />  // toolbar overlay
```

Trong inline style (khi buộc set qua JS, VD portal preview):
```tsx
style={{ zIndex: 'var(--z-drag-layer)' }}
```

Set qua DOM element.style (drag ghost tạo bằng document.createElement):
```ts
wrapper.style.zIndex = 'var(--z-drag-layer)';
```

## Vì sao drag ghost dùng z-drag-layer (40000) không phải z-canvas-drag-preview (700)

Drag ghost / floating preview là SCREEN-space overlay, phải nổi trên toolbar
(20000) và header (30000). `--z-canvas-drag-preview` (700) là world-space,
thấp hơn mọi overlay screen → dùng sai sẽ bị toolbar che. Chọn `--z-drag-layer`
(40000): trên toolbar/header, dưới modal (50000) để dialog vẫn chặn được thao
tác khi cần.

## Registry động — DEFER

Session discuss trước chốt: tokens tĩnh đủ cho scope hiện tại. Nếu tương lai
scale to (nested modal chồng nhau, toast stack, popover trong modal) cần z-index
động theo thứ tự mở → migrate lên registry qua Zustand (~15-20 phút). Chưa làm
tới khi có multi-modal case thực.

## Không dùng lib

bibo dùng shadcn utility (copy vào repo), KHÔNG có Radix hay lib portal riêng.
Không add lib chỉ để quản z-index.
