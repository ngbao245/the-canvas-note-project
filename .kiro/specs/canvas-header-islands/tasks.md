# Task — Header canvas kiểu đảo nổi

**Trạng thái**: Đã code xong 2026-10-14 (bạn bảo gộp cả 4 task 1 lượt). Chờ bạn build + test H1–H4 (handoff).

## Phase 1: Cài đặt

- [x] Task 1: Thêm lựa chọn "Kiểu header" vào Cài đặt → Canvas
  - File: `src/stores/canvas-settings-store.ts` (`headerStyle`, `useHeaderStyle`), `src/components/settings/sections/CanvasSection.tsx`, `vi.json`, `en.json`
  - Mặc định "2 hàng", giá trị lạ → mặc định, Đặt lại → mặc định.

## Phase 2: Header đảo nổi

- [x] Task 2: Tách mảnh header dùng chung + dựng kiểu đảo nổi
  - File: `CanvasHeader.tsx` (export `UndoRedoCluster`, `ObjectCountBadge`, `HelpSearchNotify`, `HeaderDivider`), `BoardTitleRow.tsx` (export `SaveStatus`, `TitleEditable`, `ShareButton`), `BreadcrumbList.tsx` (lớp đo chồng trong grid), mới `CanvasHeaderIslands.tsx`, `lib/header-islands.ts`, `route.tsx`

- [x] Task 3: Dời thanh công cụ + Khay chờ khi ở kiểu đảo
  - File: `Toolbar.tsx`, `CanvasApp.tsx`, `UnsortPanel.tsx` (`UnsortToggle`)

- [x] Task 4: Sửa doc
  - File: `docs/system/10-canvas-core.md`, `05-settings.md`, `decisions.md`, handoff (H1–H4)

## Định nghĩa "xong"

```
[ ] npm run build pass (bạn build)
[ ] npm run lint pass (bạn chạy)
[x] Không có console.log mới
[x] tasks.md đã [x]
[x] Doc liên quan đã update
```
