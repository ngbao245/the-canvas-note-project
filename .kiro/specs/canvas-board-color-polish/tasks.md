# Task — Hoàn thiện màu board + màu icon (canvas-board-color-polish)

**Trạng thái**: Đã duyệt, làm trong 1 lượt (bạn chốt)

## Phase 1: Data + helper màu

- [x] Task 1: Field `iconColor` + resolve màu icon + phân loại màu đậm/sáng
  - File: `types.ts` (`iconColor` vào `boardSchema` + `makeDefaultBoard`), `engine/actions.ts` (`setBoardIconColor`, `createBoardAt` thêm `iconColor: null`), `lib/board-colors.ts` (tách `BOARD_DARK_COLORS` / `BOARD_LIGHT_COLORS` theo luminance; hàm `resolveIconColor(iconColor, boardColor, theme)`)
  - Verify: getDiagnostics sạch; board cũ hydrate về `iconColor` null.

- [x] Task 2: Store màu custom đã lưu
  - File: `store/board-color-recent-store.ts` (persist `bibo-board-color-recent`, push dedupe, giới hạn 10)
  - Verify: getDiagnostics sạch.

## Phase 2: Popup màu board 3 phần + custom lưu

- [x] Task 3: Chia 3 phần + wire store custom
  - File: `BoardToolbar.tsx` `BoardColorPopup` (phần 1 đậm + Mặc định, phần 2 sáng, phần 3 custom đã lưu + nút chọn), dùng store Task 2
  - Verify: mở popup thấy 3 phần; chọn custom → thêm ô + đổi nền; F5 giữ ô custom; chọn trùng không nhân đôi.
  - Build cuối phase: `npm run build`.

## Phase 3: Màu icon trong popup icon

- [x] Task 4: Khu "Màu biểu tượng" + áp màu khi render
  - File: `BoardIconPopup.tsx` (khu chọn: Tự động / Theo giao diện / dãy màu + custom, chỉ khi board có icon), `BoardObject.tsx` + `BoardIconButton` dùng `resolveIconColor` + `useResolvedTheme`
  - Verify: Tự động = tương phản nền; Theo giao diện = đổi đen/trắng khi đổi theme; màu cố định giữ nguyên; F5 giữ lựa chọn; board chưa có icon thì khu này ẩn.
  - Build cuối phase: `npm run build`.

## i18n

Chữ UI mới (Màu biểu tượng, Tự động, Theo giao diện) vào `vi.json` + `en.json`, vùng `CANVAS.ICON_PICKER.*` hoặc `CANVAS.BOARD_TOOLBAR.*`.

## Định nghĩa "xong"

```
[ ] npm run build pass
[ ] npm run lint pass (chỉ còn warning shadcn)
[ ] npm run test pass
[ ] Chữ UI mới qua i18n (vi + en)
[ ] tasks.md tick hết
[ ] doc/handoff cập nhật (docs/system/11, handoff)
```
