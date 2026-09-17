# Requirements — Canvas

## Bối cảnh

Canvas là màn hình trung tâm của bibo (theo `docs/product-vision.md`): mặt phẳng vô hạn kéo thả, gom nguồn/note/object trực quan, mọi object truy nguồn được.

Donor `bibo-hub` đã có canvas hoàn chỉnh (76 file, 6 spec liên tiếp). bibo port lại theo cùng lộ trình phase, không port một cục.

## Quyết định đã chốt (không hỏi lại)

- **Backend**: IndexedDB local ngay bây giờ. Repository viết theo interface sạch (Repository pattern), để sau ghép Supabase mà không phải viết lại logic tầng UI/store. Supabase là đích, không phải hiện tại.
- **Feature parity**: cuối cùng phải đầy đủ như donor. Chia phase để làm dần, không port một cục.
- **Scope**: chỉ canvas. Notes tool (route riêng theo mockup) thiết kế mới sau, tính riêng.
- **UI**: theo design system bibanote — dùng lớp vỏ `@/components/style` (Button, Card, Badge) và `@/components/shared` (LoadingState, EmptyState, ErrorState). Phong cách vẽ tay mặc định, đọc từ store `useUiStyleStore`.
- **Auth**: bibo hiện chưa có auth. Canvas mở thẳng, không có phase auth-loading. Sau khi có auth thì thêm gate.
- **Migration từ donor**: không migrate data. Bibo là workspace mới, dữ liệu bắt đầu từ 0.

## Lộ trình phase

Chia 4 phase, cuối phase Phase 4 = parity đầy đủ donor:

- **Phase A — Engine cốt lõi + persist (MVP chạy được)**: pan/zoom, tạo rect debug, drag, resize, select đơn/đa, marquee, xoá, undo/redo, IndexedDB persist. Đủ để bạn thao tác thật, chưa có content thật.
- **Phase B — Content objects thật**: Note (chữ + màu), Text (text plain), Image (upload/paste), Link (URL + metadata). Object đa dạng thay rect debug.
- **Phase C — Editing polish + spatial**: connector (nối object), snap-to-grid, alignment guide, keyboard nudge, copy/paste, group, z-order, fit view, breadcrumb navigation.
- **Phase D — Nested boards + sync + provenance**: board lồng nhau, sync realtime (khi có Supabase), gắn provenance từ source, inspector chi tiết.

Spec này viết User Stories cho **Phase A**. Phase B/C/D mở spec riêng sau khi phase trước xong (`canvas-content-objects`, `canvas-editing-polish`, `canvas-nested`).

## User Stories — Phase A

### US-1: Mở canvas từ Hub
Với tư cách người dùng, tôi muốn mở canvas từ trang chủ, để bắt đầu làm việc trên mặt phẳng vô hạn.

- Given app đang chạy
- When navigate `/canvas`
- Then hiển thị canvas trống với grid dots nền, camera ở origin (0,0) zoom 1x
- And không có object nào ở khởi tạo đầu
- And header có tên "Canvas", đếm số object (0), nút Fit + Reset view, breadcrumb (Phase A chỉ có 1 board "Home")

### US-2: Pan canvas
Với tư cách người dùng, tôi muốn pan bằng chuột/trackpad, để di chuyển trong space vô hạn.

- Given user đang ở canvas
- When giữ Space + drag chuột, hoặc drag chuột giữa, hoặc drag vùng trống với Ctrl/Cmd
- Then camera pan theo delta, grid dots di chuyển theo
- And cursor state chuyển grab/grabbing trong lúc pan

### US-3: Zoom in/out
Với tư cách người dùng, tôi muốn zoom bằng wheel/pinch, để xem chi tiết hoặc overview.

- Given user đang ở canvas
- When wheel scroll hoặc pinch trackpad
- Then zoom xảy ra quanh vị trí con trỏ, không phải giữa màn hình
- And zoom clamp trong khoảng [0.05x, 3x]
- And grid density scale theo zoom

### US-4: Tạo rect debug
Với tư cách người dùng, tôi muốn tạo rect qua context menu, để test engine ở Phase A.

- Given canvas trống hoặc có object
- When right-click vùng trống canvas
- Then hiện context menu với mục "Add rect"
- When click "Add rect"
- Then rect 200x120, nền primary-soft, xuất hiện tại vị trí right-click (canvas-space)
- And rect được auto-select

### US-5: Drag object
Với tư cách người dùng, tôi muốn kéo object di chuyển trong canvas, để sắp xếp không gian.

- Given user đã select 1 object
- When mousedown trên object + drag
- Then object di chuyển theo cursor, giữ offset ban đầu
- And trong lúc drag, canvas không re-render toàn bộ, chỉ object đang drag update transform
- And khi mouseup, position mới commit vào store + repository (undo-able)

### US-6: Resize object
Với tư cách người dùng, tôi muốn resize object bằng 8 handle (4 góc + 4 cạnh), để chỉnh kích thước.

- Given user đã select object
- When mousedown trên handle + drag
- Then object resize theo hướng handle, anchor điểm đối diện không đổi
- And min-size 40x40
- And commit khi mouseup (undo-able)

### US-7: Select đơn
Với tư cách người dùng, tôi muốn select object bằng click, để thao tác lên nó.

- When click vào object → object đó được select, cái khác deselect, hiện outline + 8 resize handle
- When click vùng trống → deselect tất cả

### US-8: Multi-select bằng Shift
- When Shift+click object khác → add vào selection
- When Shift+click object đang select → remove khỏi selection
- Selection outline hiện quanh tất cả object trong set

### US-9: Marquee select
- Given vùng trống
- When mousedown vùng trống + drag → hiện selection rectangle (screen space)
- When mouseup → mọi object có AABB (canvas-space) intersect rectangle được select
- Shift đang giữ → add vào selection cũ; không giữ → replace

### US-10: Xoá object
- Given ≥ 1 object đang select
- When focus không ở input/textarea AND nhấn Delete hoặc Backspace
- Then object bị xoá
- And nếu > 1 object, confirm dialog trước
- Undo-able

### US-11: Undo/Redo
- Ctrl+Z / Cmd+Z → reverse action gần nhất
- Ctrl+Shift+Z / Cmd+Shift+Z → apply lại action đã undo
- Undo stack giữ tối thiểu 50 action gần nhất
- Action nào undo-able: create, move, resize, delete

### US-12: Persist qua reload
- Given user đã tạo/di chuyển object
- When reload page
- Then object hiện lại đúng vị trí, kích thước
- And camera state (pan + zoom) cũng persist
- And không cần backend, dùng IndexedDB

### US-13: Fit view + Reset view
- Nút Fit trong header (hoặc phím F): camera fit toàn bộ content trong viewport
- Nút Reset (hoặc phím 0): camera về (0,0) zoom 1x
- Không có content → Fit = Reset

### US-14: Repository interface sạch
Với tư cách người phát triển, tôi muốn tầng repository có interface rõ, để sau ghép Supabase không đụng UI/store.

- Given canvas code, When đọc code lưu trữ, Then thấy interface `CanvasRepository` với method rõ (loadBoards, loadObjects, saveObject, deleteObject, saveCamera...)
- IndexedDB implement interface đó. Không viết logic Supabase, chỉ để dành interface + comment "TODO ghép Supabase Phase D".

### US-15: UI theo design system bibanote
Với tư cách người dùng, tôi muốn canvas cùng phong cách với phần còn lại của app.

- Toolbar/nút/badge/card dùng `@/components/style` (Button, Card, Badge) — tự đọc phong cách hand/flat.
- Loading/Empty/Error dùng `@/components/shared`.
- Màu theo token (`bg-background`, `text-foreground`, `border-border`, `bg-primary-soft`, `text-primary`...), không hard-code màu.
- Motion dùng token duration + easing.

## Ngoài phạm vi (Phase A)

- Content objects thật (Note/Text/Image/Link) — Phase B.
- Connector, snap, alignment, keyboard nudge, copy/paste, group, z-order — Phase C.
- Nested boards, sync, provenance, inspector — Phase D.
- Auth gate — sau khi có auth.
- Migration data từ donor — bibo bắt đầu từ 0.

## Must-have vs Nice-to-have (Phase A)

Must-have: US-1 đến US-14.
Nice-to-have: US-13 (Fit view — có thể để cuối), US-15 (UI theo design system — bắt buộc, chỉ ghi Nice vì overlap với must-have về code style).
