# Thiết kế — Đa ngôn ngữ (i18n)

## Đã chốt

- 2026-10-05: Bộ chữ lưu dạng **file JSON trong repo**, đóng gói cùng bundle. Không làm trang admin + API
  (cần backend chưa có, mất kiểm tra key lúc build, phải xử lý tải chữ / offline). Sau này cần sửa chữ ngoài code
  thì dùng Tolgee / Crowdin đồng bộ JSON qua git, không tự viết admin.
- Phase 1 tạo 2 bộ: `vi.json` (nguồn chuẩn) + `en.json`. Kiểm tra key: `en` khai báo theo kiểu của `vi`
  (`resolveJsonModule` đã bật trong `tsconfig.app.json`) → thiếu key là `tsc` báo lỗi.
- 2026-10-05: **Không dùng tiền tố URL** `/vi`, `/en`. Ngôn ngữ chỉ lấy từ lựa chọn đã lưu (`bibo-locale`).
  Lý do: Canvas là công cụ cá nhân, không cần SEO; link chia sẻ nên hiện theo ngôn ngữ người xem; tránh 2 nguồn
  quyết định ngôn ngữ lệch nhau; không phải sửa mọi `Link` / `navigate`. Sau này Landing cần SEO 2 tiếng thì mới
  thêm tiền tố riêng cho Landing (kèm prerender), không đụng app.
- 2026-10-05: **Mặc định lần đầu**: chưa có `bibo-locale` thì đọc `navigator.language`. Bắt đầu bằng `vi` → vi,
  còn lại → en. English là ngôn ngữ dự phòng. Kết quả đoán KHÔNG ghi vào `bibo-locale`: chưa chọn thì mỗi lần
  mở app lại theo trình duyệt. Chỉ ghi khi người dùng chọn trong Cài đặt, từ đó luôn giữ lựa chọn đó.

- 2026-10-05: **Tự viết module nhỏ** (câu 1 chọn B). Không thêm dependency, không đổi stack. Ngôn ngữ đang chọn
  nằm trong Zustand như theme. Chỗ gọi trong component giữ dạng hàm dịch theo key + tham số, để sau này đổi sang
  `react-i18next` chỉ thay phần bên dưới. Đổi sang thư viện khi: > 5 ngôn ngữ, tải bộ chữ từ server, hoặc nối dịch vụ dịch.
- 2026-10-05: **Tên mặc định board luôn tiếng Anh** (câu 3). "Home", "New Board" giữ nguyên ở mọi ngôn ngữ,
  không qua bộ dịch, như tên riêng. Không đổi code: `engine/actions.ts`, `lib/board-tree.ts` (`normalizeBoards`),
  `types.ts` giữ chuỗi tiếng Anh như hiện tại. Dữ liệu cũ không cần chuyển.
- 2026-10-05: **Chia việc**: Kiro làm nền tảng + vài mẫu đại diện + hướng dẫn. Bạn tự chuyển phần chữ còn lại.
  Bạn xong thì Kiro rà soát (chữ còn sót, key lệch giữa vi/en, key không dùng, build + lint).

## Câu cần chốt (session mới hỏi đầu tiên, trước khi code)

1. Cách làm dịch? → **Đã chốt B** (xem mục "Đã chốt"). Phân tích cũ giữ lại bên dưới để tra.
   A) Thư viện `react-i18next` + `i18next`: chuẩn, có sẵn số nhiều / nội suy / tách file theo tool. Thêm ~20 KB gzip
      và 2 dependency (phải pin version, ghi vào bảng Stack `docs/system/01-core.md` vì là đổi stack).
   B) Tự viết module nhỏ: bộ chữ là object TypeScript, hook đọc từ Zustand store, `Intl.PluralRules` cho số nhiều.
      Không thêm dependency, TypeScript bắt được key sai / thiếu lúc build. Phải tự lo nội suy + số nhiều.
   C) `@lingui` / `react-intl`: mạnh nhưng cần bước build tách chữ, nặng cho app cỡ này.
   Kiro nghiêng B: chỉ 2 ngôn ngữ, ~250 chuỗi, cần đúng stack đã chốt (Zustand) và muốn build fail khi thiếu chữ.
   Nếu sau này cần tải bộ chữ từ server hoặc >5 ngôn ngữ thì đổi sang A, API hook giữ giống để đổi ít.

2. Lần đầu mở app dùng ngôn ngữ nào? → **Đã chốt B** (xem mục "Đã chốt").

3. Tên mặc định đang lưu trong dữ liệu ("Home", "New Board")? → **Đã chốt: luôn tiếng Anh** (xem mục "Đã chốt").
   Phân tích cũ giữ lại để tra:
   A) Lưu theo ngôn ngữ lúc tạo, không đổi khi đổi ngôn ngữ (đơn giản, như Milanote).
   B) Board chưa từng đổi tên thì hiện tên dịch theo ngôn ngữ hiện tại (cần cờ "tên mặc định" hoặc so chuỗi).
   Kiro nghiêng A + riêng Home: hiện tên dịch nếu tên vẫn là mặc định "Home" (Home là board hệ thống).
   Lưu ý: `lib/board-tree.ts` `normalizeBoards` đang so tên "Home"/"Board" → đổi gì ở đây phải sửa cùng.

Phụ (Kiro tự chọn nếu bạn không nói):
- Landing (`src/routes/Landing.tsx`) dịch luôn.
- Giữ nguyên không dịch: "bibo", "Canvas", "Unsort", "Note", "Board" làm tên loại object? → Kiro đề xuất dịch
  "Note" → "Ghi chú" ở vi? Hỏi lại nếu bạn có ý; mặc định giữ "Note", "Board", "Unsort" như tên riêng.

## Cấu trúc (nếu chọn B)

- `src/lib/i18n/`
  - `locales/vi.json` (nguồn chuẩn, quyết định kiểu key) + `locales/en.json` khai báo theo kiểu của vi
    → thiếu key là lỗi build. Key lồng theo vùng (`canvas.header.objectCount`), nội suy dạng `{name}`.
  - store ngôn ngữ (Zustand persist, key localStorage `bibo-locale`), giá trị `vi` | `en`.
  - hook dịch: trả hàm dịch theo key, hỗ trợ nội suy `{name}` và số nhiều qua `Intl.PluralRules`.
  - hàm định dạng số qua `Intl.NumberFormat` theo ngôn ngữ.
  - hàm đọc ngoài React (cho `engine/actions.ts`, label undo) đọc `getState()`.
- Chữ chia theo vùng: `common` (nút chung, loading/empty/error), `settings`, `canvas`, `account`, `landing`.
  Tool sau này thêm vùng của mình.
- Đồng bộ `<html lang>` ở `App.tsx` cùng chỗ đang đồng bộ `data-theme`.
- Cài đặt → Ngôn ngữ và vùng: dòng Ngôn ngữ thành nút chọn (Segmented: Tiếng Việt / English).
  Định dạng ngày, ngày đầu tuần giữ "Chưa đổi được".

## Gotcha cần nhớ khi làm

- `aria-label`, `title`, `placeholder` cũng phải dịch, không chỉ chữ hiển thị.
- `engine/actions.ts` có label undo ("Move objects", "Create board"...): hiện không hiển thị ở đâu → Kiro đề xuất
  KHÔNG dịch (là tên nội bộ), chỉ dịch nếu sau này có UI lịch sử. Xác nhận lúc grep.
- Tên mặc định khi tạo object/board (`createBoardAt` 'New Board', `renameBoard` fallback) đọc ngôn ngữ lúc tạo.
- `ShortcutsSection`: tên phím (Ctrl, Shift, Delete) giữ nguyên, chỉ dịch mô tả và chữ "hoặc".
- `DataSection` đang `toLocaleString('vi-VN')` → đổi sang hàm định dạng theo ngôn ngữ.
- Comment trong code vẫn tiếng Việt (rule `core.md`), chỉ chữ UI mới qua bộ dịch.
- Không đụng `../bibo-hub/` (donor).

## Kiểm tra lệch nhau
- Bộ chữ en phải cùng kiểu với vi → `tsc` báo thiếu key.
- Sau khi xong: grep chuỗi có dấu tiếng Việt và chữ tiếng Anh trong JSX ngoài `src/lib/i18n/` → phải còn 0
  (trừ comment, tên riêng, tên phím). Ghi lệnh grep vào handoff để lần sau dùng lại.
