---
inclusion: fileMatch
fileMatchPattern: 'src/{lib/shortcuts/**/*,**/*[sS]hortcut*}'
---

# Phím tắt — chi tiết

Tự nạp khi Kiro đọc file trong `src/lib/shortcuts/` hoặc file tên có "shortcut" (`shortcuts.ts` của tool, `ShortcutsModal`, `ShortcutKeys`...). Sửa component thường mà đụng phím thì Kiro phải chủ động đọc file này (xem mục Phím tắt trong `coding-style.md`).

Luật cấm chung (keydown, `<Kbd>` tự viết, phím giữ khi click, Esc cho popup) nằm ở `coding-style.md`, không chép lại ở đây. Spec: `.kiro/specs/shortcuts/`, `.kiro/specs/shortcuts-modal/`.

## Khai báo phím của tool

- Dữ liệu ở `src/tools/{tên}/shortcuts.ts`: chỉ dữ liệu, không import store.
- Gắn hành động bằng `bindShortcuts(defs, handlers)` + `useShortcutLayer('tool' | 'panel', ...)`. Hành động đọc state bằng `getState()`.
- Có `display` thì tự hiện trong modal phím tắt (`src/components/shortcuts/ShortcutsModal.tsx`). Tool mới: thêm bảng defs vào `ALL_DEFS` ở đó.
- Thao tác do Tiptap xử hoặc thao tác chuột: `combos: []` + `display.ways` (chỉ hiển thị, không handler). Chỉ ghi khi đã thử thấy chạy.
- Thao tác chuột có phím (Ctrl + lăn chuột...): khai báo với `pointer: 'wheel'`, không cần handler. Bộ điều phối bỏ qua loại này, hành động nằm ở listener chuột.

## So khớp phím

- Modifier không ghi trong combo = phải KHÔNG giữ. Ctrl và Cmd gộp thành `mod`.
- Chữ cái dùng `key` (không phân biệt hoa / thường). Phím đổi ký tự khi giữ Shift (`[` `]`) dùng `code`.
- `shift: 'any'` khi ký tự có thể cần Shift tuỳ bố cục bàn phím (VD `/` trên bàn phím Đức).
- `run` trả `false` = không xử lý, phím rơi xuống lớp dưới / trình duyệt.

## Lớp

- Thứ tự: global → overlay (mở sau chạy trước) → panel → tool.
- Lớp tool / panel không chạy khi đang gõ chữ.
- Dialog cần phím khác Esc (VD Enter xác nhận): `useShortcutLayer('overlay', [...], { enabled: open, blocking: true })`.

## Hiển thị nhãn phím

- Gọi `shortcutKeys` / `formatCombo` trong component thì truyền `useKeyboardPlatform()` làm tham số thứ 2, để đổi Kiểu bàn phím trong Cài đặt là nhãn đổi ngay.
- Mac: Ctrl hiện thành ⌘. Phím 2 OS đều có (Shift, Alt, Enter, Backspace) giữ cùng tên chữ.
- Câu có phím: thêm biến (`{undo}`...) trong file dịch rồi truyền `shortcutKeys(...)` / `formatCombo(...)`.
