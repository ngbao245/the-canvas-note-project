# Task — Đa ngôn ngữ (i18n)

**Trạng thái**: Chờ duyệt. Đã chốt: JSON trong repo, tự viết module, không tiền tố URL, mặc định theo trình duyệt
(dự phòng English), tên mặc định board luôn tiếng Anh.

**Chia việc**: Kiro làm Phase 1 + 2. Bạn làm Phase 3. Kiro làm Phase 4.

## Phase 1: Nền tảng (Kiro)

- [x] Task 1: Module i18n trong `src/lib/i18n/`: `locales/vi.json` (nguồn chuẩn kiểu key) + `locales/en.json`
      cùng kiểu, store ngôn ngữ `bibo-locale` (mặc định đọc `navigator.language`), hook dịch có nội suy `{name}`
      + số nhiều, định dạng số, hàm đọc ngoài React. Đồng bộ `<html lang>` trong `App.tsx`.
  - Verify: `tsc` pass; xoá 1 key trong `en.json` → `tsc` báo lỗi (thử rồi trả lại); trình duyệt tiếng Anh
    mở lần đầu ra en, tiếng Việt ra vi.
- [x] Task 2: Cài đặt → Ngôn ngữ và vùng: nút chọn Tiếng Việt / English chạy thật
  - File: `src/components/settings/sections/LocalizationSection.tsx`
  - Verify: đổi ngôn ngữ → chữ đổi ngay, `<html lang>` đổi, URL không đổi, F5 giữ lựa chọn.

## Phase 2: Mẫu + hướng dẫn (Kiro)

Mỗi mẫu che 1 kiểu chữ hay gặp, để bạn làm theo:

- [x] Task 3: Chuyển mẫu sang bộ dịch (chỗ "ngoài component" chọn `note-colors` + phần chọn màu `NoteToolbar`)
  - `LocalizationSection` — chữ thường (làm cùng Task 2).
  - `CanvasHeader` — số nhiều ("1 object" / "3 objects") + `title` / `aria-label` của nút.
  - `ConfirmDialog` của canvas (hộp xoá board) — nội suy tên + số đếm.
  - `DataSection` — định dạng số theo ngôn ngữ (thay `toLocaleString('vi-VN')`).
  - 1 chỗ ngoài React nếu có chuỗi hiển thị (xác nhận lúc grep).
  - Verify: đổi en ↔ vi, 4 chỗ trên đổi đúng, kể cả tooltip và số.
- [x] Task 4: Hướng dẫn chuyển chữ trong `.kiro/steering/coding-style.md`: cách đặt key, thêm chữ vào 2 file,
      nội suy, số nhiều, aria-label / title, cái gì không dịch (tên riêng, tên phím, dữ liệu người dùng),
      kèm ví dụ đúng / sai và lệnh grep tự kiểm tra. Build + lint 1 lần cuối phase.
  - Verify: `npm run build` + `npm run lint` pass; bạn đọc hướng dẫn thấy đủ để tự làm.

## Phase 3: Chuyển phần còn lại (bạn)

- [ ] Task 5: Bạn chuyển chữ còn lại theo hướng dẫn Task 4. Gợi ý thứ tự: `components/shared`, `AccountMenu`,
      `components/settings/`, Canvas khung (`route.tsx`, `BreadcrumbList`, `CanvasApp`, menu chuột phải,
      `UnsortPanel`, `UnsortItem`), Canvas công cụ (`Toolbar`, `ToolbarPopup`, `NoteToolbar`, `note-colors`,
      `NoteObject`, `BoardObject`, `CardClipperButton`), Landing.
  - Tên mặc định board ("Home", "New Board"): đã chốt luôn tiếng Anh, KHÔNG chuyển sang bộ dịch.
  - Xong báo Kiro.

## Phase 4: Rà soát (Kiro)

- [ ] Task 6: Rà soát sau khi bạn xong
  - Grep chữ tiếng Việt / tiếng Anh còn trong JSX, `title`, `aria-label`, `placeholder` ngoài `src/lib/i18n/`.
  - So `vi.json` / `en.json`: key thiếu, key thừa không ai dùng, câu en còn tiếng Việt và ngược lại.
  - Kiểm tra số nhiều và nội suy dùng đúng.
  - Báo cáo danh sách, chờ bạn chọn Kiro sửa hay bạn sửa.
  - Verify: grep ra 0 (trừ ngoại lệ đã ghi), `npm run build` + `npm run lint` pass.
- [ ] Task 7: Ghi nhận: cập nhật `canvas-session-handoff.md` + trạng thái trong `core.md` / `AGENTS.md`.

## Định nghĩa "xong"

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
