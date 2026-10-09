# Task — Modal phím tắt

**Trạng thái**: Xong (2026-10-07), chờ bạn test

## Phase 1: Lõi hiển thị

- [x] Task 1: Ký hiệu theo hệ điều hành + kiểu hiển thị mới
  - File: `src/lib/shortcuts/` (types, format, thêm nhận diện Mac), phím `/` mở modal trong `global-shortcuts.ts`
  - Verify:
    - Giả lập Mac (DevTools đổi user agent): tooltip Undo hiện "Undo (⌘Z)", nút X Cài đặt hiện "(Esc)", câu mẹo zoom hiện ⌘.
    - Máy Windows: chữ như cũ.
    - Kiểu "phím + chuột" và "gõ chuỗi" khai báo được, bộ điều phối không khớp chúng với phím thật.

## Phase 2: Modal + nội dung

- [x] Task 2: Modal phím tắt, bỏ khỏi Cài đặt
  - File: store modal mới, component modal mới (thư mục `src/components/shortcuts/`), `App.tsx`, `HelpMenu.tsx`, `SettingsModal.tsx`, `settings-modal-store.ts`, xoá `sections/ShortcutsSection.tsx`, file dịch
  - Verify:
    - Trợ giúp → Phím tắt và phím `/` đều mở modal. Đang gõ chữ thì `/` là ký tự.
    - Bấm nhóm bên trái → cuộn tới đúng nhóm; cuộn bên phải → nhóm đang xem được tô.
    - Esc / X / bấm nền đóng, focus về chỗ cũ. Phím canvas không lọt khi modal mở.
    - Cài đặt không còn mục Phím tắt.

- [x] Task 3: Bổ sung nội dung (chuột, định dạng chữ, Markdown, Thường dùng)
  - File: `src/tools/canvas/shortcuts.ts`, `src/lib/shortcuts/global-shortcuts.ts` (chuyển 3 phím sang nhóm Giao diện), file dịch
  - Verify:
    - Đọc code từng thao tác chuột (US-4) trước khi ghi; thử trên trình duyệt từng phím Tiptap (US-5). Không chạy → không ghi.
    - Modal hiện đủ 9 nhóm, nhóm Thường dùng ở đầu.
    - Ghi lại kết quả kiểm Ctrl+Enter trong note (design "Rủi ro").
    - Build + lint pass.

## Định nghĩa "xong"

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Handoff canvas + coding-style cập nhật (bảng hiển thị giờ ở modal, không ở Cài đặt)
```

## Việc treo (ghi 2026-10-07, sửa sau)

- [ ] Trạng thái "không tìm thấy" khi tìm phím tắt
  - Hiện tại: `ShortcutsModal.tsx` (~dòng 294) truyền `t('SHORTCUTS.NO_RESULTS', { query })` vào `title` của `EmptyState`. Chữ gõ vào chèn nguyên văn, không giới hạn độ dài, in đậm.
  - Lỗi UX: dán 1 đoạn văn là ra cả mảng chữ đậm chiếm hết cột phải, mắt đọc chữ người dùng gõ trước câu "Không tìm thấy". Không có lối ra hiện trên màn hình (Esc xoá được nhưng không có gợi ý, không có nút). Ô tìm không có `maxLength`.
  - Hướng đã chọn (A):
    - Tiêu đề cố định, ngắn: "Không tìm thấy phím tắt".
    - Mô tả nhỏ, màu nhạt, hiện chữ đã gõ cắt 1 dòng bằng `truncate`.
    - Nút "Xoá tìm kiếm" + gợi ý "hoặc bấm Esc" (tổ hợp lấy từ `formatCombo(ESCAPE_COMBO, platform)`, không ghi cứng trong file dịch).
    - Thêm `maxLength={100}` cho ô tìm.
  - Đổi key i18n: tách `SHORTCUTS.NO_RESULTS` thành tiêu đề + mô tả, thêm key cho nút. Sửa cả `vi.json` và `en.json`.
  - Verify: dán đoạn văn dài vào ô tìm → khung giữ nguyên kích thước, chữ cắt 1 dòng; bấm nút hoặc Esc thì ô tìm xoá và danh sách hiện lại; build + lint pass.
