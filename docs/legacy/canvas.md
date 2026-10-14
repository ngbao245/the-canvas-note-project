> LEGACY (chuyển 2026-10-13). Có chỗ đã lệch code. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Phần chưa có doc mới vẫn tra ở đây khi viết phần đó.

# Canvas — kiến trúc và ghi chú kỹ thuật

**Status**: Active / Canonical. **Last verified**: 2026-09-17 (sau khi khép Phase A).

Doc canonical cho canvas domain. Spec ở `.kiro/specs/canvas/` (requirements + design + tasks Phase A). File này ghi kiến trúc thực tế đã ship + các hằng số chỉnh được, để session sau không phải đọc lại toàn bộ code.

Entry point: `src/tools/canvas/`. Route `/canvas`.

## Tổng quan lớp

```
route.tsx (header + bootstrap gate)
  └─ CanvasApp (layout)
       └─ CanvasSurface (nhận wheel/pointer, đăng ký DOM refs với engine)
            ├─ 3 div grid (base bg + gridDense + gridSparse) — engine ghi transform qua ref
            ├─ wrapper (world layer, engine ghi transform) → ObjectsLayer + SelectionLayer
            └─ MarqueeOverlay (screen space)
```

State: 5 store Zustand (`camera`, `objects`, `selection`, `interaction`, `history`).
Persist: `CanvasRepository` interface → `IndexedDbCanvasRepository` (idb-keyval).

## CameraEngine (imperative)

`engine/camera-engine.ts` — class imperative, KHÔNG phải React state. Lý do: pan/zoom đổi 60Hz, nếu qua React setState mỗi frame sẽ re-render cả cây. Engine ghi DOM `transform` trực tiếp qua ref, chỉ notify store snapshot throttled cho UI đọc (VD header zoom %).

Hai ref:
- `targetRef` — camera user muốn (goal). Update sync mỗi input.
- `currentRef` — camera đang render DOM. Chase target qua rAF ramp.

Pan: cả 2 ref update đồng thời (1:1, không ramp) khi pointer drag. Wheel pan qua `panSmooth` (ramp).
Zoom: chỉ `targetRef` nhảy theo nấc, `currentRef` chase mượt qua `rampStep`.

`rampStep`: pan (x,y) lerp tuyến tính, zoom lerp trên **log2-space** (zoom là đại lượng nhân, log-space cho in/out đối xứng mượt đều).

## Zoom model (Milanote parity)

Đây là phần trau chuốt nhiều nhất. Đọc kỹ trước khi đụng.

### Step-based, không momentum

1 notch wheel = **đúng 1 nấc**, KHÔNG phụ thuộc độ lớn deltaY (lăn mạnh/nhẹ không đổi bước — chỉ đổi tần suất event). Mỗi nấc nhân zoom:
- Zoom in: `× ZOOM_STEP_IN` (1.25)
- Zoom out: `× ZOOM_STEP_OUT` (0.75)

KHÔNG đối xứng: `1/1.25 = 0.8` nhưng out dùng 0.75 để zoom out dứt khoát hơn. Khớp data đo từ Milanote:
- In: 40 → 50 → 63 → 78 → 98 → 100 → 125 → 156 → 195 → 244 → 300
- Out: 300 → 225 → 169 → 127 → 100 → 75 → 56 → 42 → 40

`rampStep` chase mượt tới nấc mới → thấy "trượt" ngắn, không nhảy cứng.

### Detent 100% (time-gated)

100% = mốc 1:1 pixel quan trọng. Khi 1 notch làm zoom **băng qua 1.0** (đổi phía) → kẹp target về đúng 1.0 (khựng lại).

Để VƯỢT qua 100%: user phải **ngừng lăn ≥ `DETENT_RELEASE_MS` (250ms)** rồi lăn lại. Lăn liên tục (gap giữa 2 notch < 250ms) → notch bị nuốt, giữ 100%.

Cơ chế time-gate (không phải notch-gate): lăn liên tục = 1 ý định, ngừng-rồi-lăn = ý định mới muốn vượt. Đo qua `lastZoomNotchAt` timestamp.

### Zoom range

- `ZOOM_MIN = 0.05` — safety floor tuyệt đối.
- `ZOOM_MAX = 3` — 300% max, hằng cố định (không content-aware).
- `ZOOM_OUT_BASELINE = 0.4` — user luôn zoom out được tới ít nhất 40%.

**Dynamic zoom min content-aware** (`lib/content-bounds.ts` → `computeDynamicZoomMin`):
- Empty board → min = 40%.
- Content nhỏ gọn (fit-zoom > 40%) → giữ min 40% (không kéo lên, user vẫn "dư dả").
- Content trải rộng (fit-zoom < 40%) → min hạ xuống fit-zoom để thấy hết (VD 24%).

Công thức: `min(ZOOM_OUT_BASELINE, computeFitZoom(bounds, viewport))`.

## Grid LOD (level of detail)

`camera-engine.ts` → `applyTransforms`. Mục tiêu: dot spacing màn hình luôn dễ chịu ở mọi zoom (Milanote/Figma feel), không dày đặc khi zoom out, không thưa khi zoom in.

2 layer cross-fade (dense + sparse):
- `t = log2(1/zoom)`, `level = floor(t)`, `frac = t - level`
- Dense doc-size = `GRID_SIZE × 2^level`, sparse = `GRID_SIZE × 2^(level+1)`
- Cross-fade theo `frac`: dense opacity `1-frac`, sparse `frac` → chuyển band mượt
- Fade extremes: zoom < 0.2 → toàn bộ grid fade về 0 (overview sạch). Zoom in KHÔNG fade.

Dot render: `radial-gradient` trong `CanvasSurface.tsx`, engine ghi `backgroundSize/Position/opacity` qua ref.

## Repository pattern

`api.ts` — interface `CanvasRepository` tách khỏi implement. UI/store chỉ gọi interface.

`IndexedDbCanvasRepository` (Phase A) dùng idb-keyval, 2 kv-store riêng:
- `bibo-canvas-boards` (id → Board)
- `bibo-canvas-objects` (id → CanvasObject, filter theo boardId khi load)

Tách 2 DB vì idb-keyval `createStore` không tạo được store thứ 2 trong cùng DB.

Phase D: viết `SupabaseCanvasRepository` implement cùng interface, swap 1 chỗ trong `getCanvasRepository()`, không đụng UI/store.

## Undo/redo (Command pattern)

`store/history-store.ts` — 2 stack undo/redo, `MAX_STACK = 100`.

Mỗi `Command` có `redo()` + `undo()` + `label`. Pattern: caller thực hiện action trực tiếp (store + repo) rồi `push(cmd)` — history KHÔNG tự execute lần đầu, chỉ execute khi redo (tránh double-apply).

Command: create / move / resize / delete (trong `engine/actions.ts`).

## Persist camera

Camera đổi liên tục khi zoom/pan. Engine debounce **500ms** (`PERSIST_DEBOUNCE_MS`): chỉ ghi IndexedDB khi user ngừng thao tác đủ 500ms. `useCanvasBootstrap` inject persist callback, flush khi unmount.

## Các hằng số chỉnh được

Tất cả ở đầu `engine/camera-engine.ts` trừ zoom range (ở `types.ts`):

| Hằng | Giá trị | Ý nghĩa |
|---|---|---|
| `ZOOM_STEP_IN` | 1.25 | Nhân zoom mỗi notch khi zoom in |
| `ZOOM_STEP_OUT` | 0.75 | Nhân zoom mỗi notch khi zoom out (out nhanh hơn) |
| `DETENT_RELEASE_MS` | 250 | Ngừng lăn bao lâu (ms) mới vượt được mốc 100% |
| `ZOOM_RAMP_ALPHA` | 0.35 | Tốc độ current chase target mỗi frame (đuôi ramp) |
| `GRID_SIZE` | 32 | Base spacing grid dot (world-space) |
| `PERSIST_DEBOUNCE_MS` | 500 | Chờ bao lâu không đổi mới ghi camera xuống IndexedDB |
| `ZOOM_MIN` / `ZOOM_MAX` | 0.05 / 3 | Range zoom (ở `types.ts`) |
| `ZOOM_OUT_BASELINE` | 0.4 | Zoom out tối thiểu luôn cho phép (ở `types.ts`) |

Dot opacity: `color-mix(... 9%)` trong `CanvasSurface.tsx`. Dot radius: 3px.

## Roadmap phase

- **Phase A** (done): pan/zoom, rect debug, drag/resize, select/marquee, xoá, undo/redo, IndexedDB persist.
- **Phase B** (`canvas-content-objects`): Note/Text/Image/Link thật thay rect.
- **Phase C** (`canvas-editing-polish`): connector, snap, alignment, keyboard nudge, copy/paste, group, z-order.
- **Phase D** (`canvas-nested`): nested boards, Supabase sync, provenance, inspector.
