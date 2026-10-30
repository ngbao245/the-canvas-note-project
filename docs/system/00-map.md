# 00 — Bản đồ: nhắc chủ đề nào thì đọc file nào

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Cách dùng

1. Bạn nhắc 1 chủ đề → Kiro tìm dòng trong bảng dưới.
2. Đọc theo thứ tự: doc hệ thống → file code chính. Chỉ mở spec / note ở cột "Đọc thêm khi" đúng trường hợp đó.
3. Không đọc file ngoài dòng đó trừ khi chủ đề đụng 2 dòng (đọc cả 2 dòng, không hơn).
4. Doc lệch code → tin code, báo bạn, sửa doc trong cùng task.

Đường dẫn code tính từ `src/`. `cv/` = `tools/canvas/`.

## Bảng chủ đề

| Chủ đề (bạn hay gọi) | Doc hệ thống | Code chính | Đọc thêm khi |
|---|---|---|---|
| Stack, lệnh, build, folder, ranh giới import, alias | `01-core.md` | `package.json`, `vite.config.ts`, `eslint.config.js`, `App.tsx`, `register-tools.ts` | — |
| Mở app offline, service worker, thanh "bản mới" | `01-core.md` | `lib/pwa/index.ts`, `components/shared/UpdateBanner.tsx` | — |
| Bảng dev, server giả | `01-core.md` | `dev/`, `../dev/fake-api/` | Kế hoạch đo: `docs/legacy/specs/dev-panel/` |
| Theme, màu, chuyển động, lớp z, focus, con trỏ, chọn chữ | `02-ui-common.md` | `styles/index.css`, `styles/motion.css`, `tailwind.config.ts`, `lib/motion/`, `lib/cursor-override.ts`, `lib/focus-ring.ts` | Luật từng dòng: `coding-style.md` |
| Button / Card / Badge, phong cách phẳng ↔ vẽ tay, kích thước giao diện | `02-ui-common.md` | `components/style/`, `stores/ui-style-store.ts`, `stores/interface-store.ts` | — |
| Loading / Empty / Error | `02-ui-common.md` | `components/shared/` | — |
| Đa ngôn ngữ, chữ UI | `03-i18n.md` | `lib/i18n/`, `lib/i18n/locales/*.json` | Luật: `coding-style.md` mục i18n. Task mở: spec `i18n` |
| Phím tắt, modal phím tắt, Kiểu bàn phím | `04-shortcuts.md` | `lib/shortcuts/`, `cv/shortcuts.ts`, `cv/hooks/useCanvasKeys.ts`, `components/shortcuts/` | Luật: steering `shortcuts.md` |
| Cài đặt, menu tài khoản | `05-settings.md` | `components/settings/`, `stores/` | — |
| Board, board lồng, breadcrumb, header, đường dẫn board | `10-canvas-core.md` | `cv/route.tsx`, `cv/components/CanvasApp.tsx`, `CanvasHeader.tsx`, `BreadcrumbList.tsx`, `cv/store/boards-store.ts` | — |
| Camera, pan, zoom, lưới, fit | `10-canvas-core.md` | `cv/engine/camera*.ts`, `pan-bounds.ts`, `grid-lod.ts`, `cv/store/camera-store.ts` | — |
| Chọn, kéo, khung chọn, khớp cạnh, kéo ra mép, resize, thứ tự lớp | `10-canvas-core.md` | `cv/hooks/usePointerInteraction.ts`, `useObjectDrag.ts`, `useEdgePan.ts`, `cv/engine/alignment.ts`, `cv/components/SelectionBox.tsx` | — |
| Undo / redo, xoá, thùng rác | `10-canvas-core.md` | `cv/store/history-store.ts`, `cv/engine/actions.ts`, `cv/components/CanvasApp.tsx` | — |
| Unsort (Khay chờ) | `10-canvas-core.md` | `cv/components/UnsortPanel.tsx`, `UnsortItem.tsx`, `cv/hooks/useUnsort*.ts` | Chọn nhiều: spec `canvas-unsort-multi-select` (Task 5-7) |
| Sao chép / dán / nhân bản, menu chuột phải | `10-canvas-core.md` | `cv/lib/clipboard.ts`, `cv/hooks/useCanvasKeys.ts`, `cv/components/ContextMenu.tsx` | — |
| Nút type (thanh tạo object), loại object, thêm loại mới | `11-object-types.md` | `cv/components/objects/index.ts`, `*-type.ts(x)`, `cv/hooks/useObjectRegistry.tsx`, `cv/components/Toolbar.tsx` | Image / Link: spec `canvas-content-objects` |
| Note: editor, toolbar note, màu, tự cao | `12-note.md` | `cv/components/objects/NoteObject.tsx`, `NoteToolbar.tsx`, `cv/lib/note-*.ts` | — |
| Note tự lưu, Ctrl+Enter, khoá sửa phía note | `12-note.md` (+ `20` cơ chế khoá) | `NoteObject.tsx`, `cv/lib/note-commit-keys.ts`, `cv/lib/edit-locks.ts` | — |
| Mã đoạn note, Card Clipper | `12-note.md` | `cv/lib/note-block-keys.ts`, `note-clip.ts`, `cv/hooks/useCardClipper.ts`, `CardClipperButton.tsx` | Test tay N1–N4: spec `canvas-note-block-keys` |
| Dữ liệu, IndexedDB, hàng đợi ghi, `version`, trạng thái lưu, đồng bộ + khoá giữa tab | `20-local-data.md` | `cv/types.ts`, `cv/api.ts`, `cv/lib/idb.ts`, `write-queue.ts`, `tab-channel.ts`, `cv/hooks/useCanvasPersistence.ts` | — |
| Outbox, gửi server, server giả, trạng thái đồng bộ | `21-server-sync.md` | `cv/sync/`, `../dev/fake-api/` | Hướng đã chốt: note `milanote-sync-architecture.md`. Test O2 / O5: spec `canvas-outbox` |
| Supabase, đăng nhập (sắp làm) | `21-server-sync.md` mục "Câu còn mở" | Chưa có code | `docs/supabase-setup.md`, note `milanote-sync-architecture.md` mục 2.8 |
| Landing, canvas thử trên landing | `30-landing.md` | `routes/landing/` | — |
| Trang thử `/thu/*` (đã gỡ) | — | `experiments/`, `routes/StyleDemo.tsx` | note `backlog.md` |
| Quyết định đã chốt, vì sao | `decisions.md` | — | — |
| Việc đang dở, chờ test | — | — | `.kiro/notes/canvas-session-handoff.md` |
| Tính năng chưa làm | — | — | `.kiro/notes/canvas-backlog.md`, `backlog.md` |

## Không dùng làm nguồn (chỉ đọc khi bạn bảo)

- `docs/legacy/*`: chỗ DUY NHẤT gom mọi markdown không dùng nữa. Mỗi file có dòng đầu ghi lý do + file thay thế. Không cập nhật.
- Spec đã xong: chỉ là lịch sử thay đổi.
- Nhật ký cũ: `docs/legacy/canvas-session-handoff-2026-10-13.md` (tìm theo từ khoá, đừng đọc hết).

## Sơ đồ

- `docs/architecture-diagram/bibo-architecture.html`: sơ đồ kiến trúc, nguồn `bibo.architecture.json` (skill technical-diagrams `deliver`). `explanations.json`: giải thích từng khối. Vẽ lại theo bộ doc 2026-10-13. Khối "Server" là 1 khối duy nhất: hiện là server giả (dev), đứng thay Supabase; `canvas-sync` chỉ đổi đích, không thêm khối.
- `docs/sync-diagrams/`: 3 sơ đồ đồng bộ, đối chiếu + vẽ lại 2026-10-13. Doc chữ `21` là nguồn chuẩn.
- File json của sơ đồ phải lưu UTF-8 KHÔNG BOM (PowerShell `Set-Content -Encoding utf8` thêm BOM, `deliver` báo lỗi).

## Câu còn mở

- Chưa có.

## Không được phá (toàn bộ)

| Phần | Mã |
|---|---|
| `01-core.md` | `INV-CORE-01`..`09` |
| `02-ui-common.md` | `INV-UI-01`..`15` |
| `03-i18n.md` | `INV-I18N-01`..`09` |
| `04-shortcuts.md` | `INV-KEY-01`..`11` |
| `05-settings.md` | `INV-SET-01`..`08` |
| `10-canvas-core.md` | `INV-CANVAS-01`..`21` |
| `11-object-types.md` | `INV-OBJ-01`..`07` |
| `12-note.md` | `INV-NOTE-01`..`17` |
| `20-local-data.md` | `INV-DATA-01`..`11` |
| `21-server-sync.md` | `INV-SYNC-01`..`10` |
| `30-landing.md` | `INV-LAND-01`..`09` |
