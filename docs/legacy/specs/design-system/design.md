> LEGACY (chuyển 2026-10-13). Spec đã ship, chỉ còn là lịch sử thay đổi. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Task còn mở (nếu có) đã chép sang `.kiro/notes/backlog.md` / `canvas-backlog.md`.

# Design — Design System

Tài liệu này mô tả cấu trúc và luồng, không viết code cụ thể. Tên biến/hàm minh hoạ chỉ để dễ hình dung, Builder quyết tên cuối.

## Kiến trúc 3 lớp

```
Lớp 1: Token nền tảng (một nguồn)
  màu, nền, chữ, viền, dark/light, font, motion
        │
        ├── ánh xạ ──> biến drawably (nét, tô, giấy)
        │
Lớp 2: Phong cách hiển thị (người dùng chọn)
  - Vẽ tay: drawably control + shadcn-đã-theme (phần drawably thiếu)
  - Phẳng: shadcn thuần đã theme
        │
Lớp 3: Thành phần dùng chung
  loading/empty/error, dialog, dropdown, toast... theme theo token
```

## Lớp 1 — Token nền tảng

Nguồn token duy nhất đặt trong stylesheet toàn cục của app (thay bộ token shadcn mặc định hiện tại). Lấy mockup `shared.css` làm gốc, rà cho đủ.

Nhóm token:
- Surface + foreground: background, card, card-elevated, popover, muted + các cặp foreground tương ứng, subtle-foreground.
- Brand: primary (#007acc), primary-foreground, primary-hover, primary-soft.
- Trạng thái: destructive, success, warning + soft variant + foreground.
- Viền: border, border-strong, input, ring.
- Hình khối: radius, shadow, shadow-soft.
- Motion: duration-fast (60ms), duration-normal (200ms), easing-standard.

Trục theme (chỉ đổi màu): mỗi theme là một khối token đặt tên, ngang hàng, chọn bằng thuộc tính data-theme trên phần tử gốc. Hiện có dark (mặc định) và light. Thêm theme mới = sao chép một khối token, đổi tên [data-theme='...'] và giá trị màu, không đụng cấu trúc. Token không đổi theo màu (radius, motion) đặt ở :root dùng chung. Trục phong cách vẽ tay/phẳng độc lập, không nằm trong data-theme.

Tailwind config đọc các token này (map sang màu Tailwind), để dùng được class kiểu bg-primary, text-foreground như rule dự án yêu cầu.

## Lớp 1b — Ánh xạ token sang drawably

drawably đọc biến CSS riêng (nét, tô, giấy, độ dày). Thay vì set màu rời như bản thử, các biến này lấy giá trị từ token chung:
- Nét và tô drawably lấy theo primary.
- Giấy drawably lấy theo background.
- Đổi dark/light thì token đổi, kéo theo biến drawably đổi, không set tay từng màn hình.

Cách làm: khai báo các biến drawably ở phần tử gốc, gán bằng giá trị token chung. Khi phong cách là phẳng, các biến này không có tác dụng (không dùng component drawably).

## Lớp 2 — Phong cách hiển thị

Trạng thái phong cách (vẽ tay | phẳng) lưu ở store UI (Zustand theo stack dự án) và đồng bộ localStorage. Mặc định vẽ tay.

Đổi phong cách: cập nhật store, đồng thời gắn một dấu hiệu lên phần tử gốc (ví dụ data-ui-style="hand" | "flat") để CSS/component biết đường render. Đổi ngay, không tải lại trang.

Cách component chọn phong cách: có một lớp component vỏ dùng chung (ví dụ Button, Card, Badge...). Vỏ này đọc phong cách hiện tại rồi render drawably hoặc shadcn tương ứng. Nơi dùng chỉ gọi Button, không cần biết đang phong cách nào.

- Vẽ tay: vỏ render component drawably (button, card, badge, input, checkbox, toggle, list, tabs, tooltip, alert, kbd, arrow).
- Phẳng: vỏ render component shadcn tương ứng, theme theo token.

Phần drawably không có (dialog, dropdown, popover, toast, command palette, table, progress, avatar, drop zone): cả hai phong cách đều dùng shadcn theme token. Ở phong cách vẽ tay chúng trông phẳng hơn phần còn lại, chấp nhận theo quyết định đã chốt.

## Lớp 3 — Thành phần dùng chung

Theo rule dự án, cần sẵn thành phần loading/empty/error dùng chung, theme theo token. Các thành phần overlay (dialog, dropdown, toast) dựng trên shadcn/Radix, theme token. Dựng dần khi tool thật cần, không phải làm hết ngay giai đoạn nền tảng.

## Nơi đặt trong mã (dự kiến)

- Token: stylesheet toàn cục hiện có của app + Tailwind config.
- Store phong cách: store UI dùng chung.
- Lớp vỏ component: một thư mục component dùng chung, mỗi vỏ tự chọn drawably/shadcn theo phong cách.
- Trang xem thử phong cách (đã có trong experiments): giữ để đối chiếu, hoặc chuyển thành trang demo nội bộ.

## Luồng người dùng

1. Mở app lần đầu: phong cách vẽ tay, theme dark (mặc định).
2. Vào phần cài đặt hiển thị (hoặc toggle nhanh): chọn phẳng.
3. App đổi ngay sang phẳng, lưu localStorage.
4. Đóng mở lại: giữ phẳng.
5. Đổi dark/light bất kỳ lúc nào: màu đổi theo token, cả hai phong cách đều đúng màu.

## Rủi ro và lưu ý

- drawably Arrow/tooltip gắn theo toạ độ document. Trên canvas có pan/zoom sẽ cần tính lại vị trí. Ghi nhận, xử lý khi làm canvas thật, không thuộc phạm vi spec này.
- Lớp vỏ component cần bao đủ các control drawably có, nếu không nơi dùng phải tự phân nhánh phong cách, dễ sót. Ưu tiên bao trọn control chính.
- Bộ token đổi sẽ ảnh hưởng mọi thứ đang dùng token cũ (hiện chỉ có Landing scaffold). Kiểm lại Landing sau khi đổi.
