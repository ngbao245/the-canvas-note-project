# Thiết kế — Icon cho board tile (canvas-board-icon)

**Trạng thái**: Nháp

## Màn hình / luồng

### Nút Icon trên toolbar board (element mode)
Thay nút Icon đang để mờ bằng nút bấm được. Nút nằm trong `BoardElementActions` giữa nút Color và Rename (giữ đúng thứ tự Milanote: Color, Icon, Rename, More). Bấm nút mở popup; biểu tượng nút phản ánh icon hiện tại của board (hoặc biểu tượng gợi ý trung tính nếu chưa có).

### Popup chọn icon — layout D'
Popup mở cạnh nút (dùng chung cơ chế `ToolbarPopup`: tự định vị, kẹp viewport, đóng khi click ngoài / Escape). Popup rộng hơn popup màu để chứa cột danh mục + lưới. Bố cục:

```
┌──────────────────────────────────────────┐
│  Tìm icon...                          [x]  │  ← ô tìm kiếm, full-width trên cùng
├────────────┬─────────────────────────────┤
│ (nguồn)    │                             │
│ Thư viện ◄ │   lưới icon (cuộn, virtual) │
│ Tự nhập    │   ▢ ▢ ▢ ▢ ▢ ▢             │
│ Tải ảnh(mờ)│   ▢ ▢ ▢ ▢ ▢ ▢             │
│ ────────── │                             │
│ (danh mục) │                             │
│ Tất cả     │                             │
│ Mũi tên    │                             │
│ File       │                             │
│ ...        │                             │
├────────────┴─────────────────────────────┤
│  Bỏ icon (chỉ hiện khi board đã có icon)  │
└──────────────────────────────────────────┘
```

- **Cột trái** có 2 nhóm: nguồn (Thư viện / Tự nhập / Tải ảnh mờ) và danh mục icon (chỉ hiện khi nguồn = Thư viện). Danh mục đến từ metadata lucide, có mục "Tất cả" ở đầu.
- **Ô tìm kiếm** trên cùng, luôn hiện khi nguồn = Thư viện. Gõ vào lọc lưới theo tên + tag icon. Tách bạch với cột danh mục (không trộn vai trò như Milanote). Khi đang tìm kiếm, lưới hiện kết quả xuyên mọi danh mục.
- **Lưới icon** bên phải: ảo hóa (virtual) để render mượt với số lượng lớn. Icon đang là icon hiện tại của board được đánh dấu (nền `primary/10` + viền `primary`).
- **Nguồn "Tự nhập"**: vùng phải đổi thành ô nhập ký tự (tối đa 2 ký tự) + khối xem trước mô phỏng ô vuông board + nút xác nhận. Ô tìm kiếm và danh mục ẩn ở nguồn này.
- **Nguồn "Tải ảnh"**: để mờ, bấm không mở gì (title "sắp có").
- **Bỏ icon**: hàng dưới cùng, chỉ hiện khi board đang có icon.

### Chọn icon
Bấm icon trong lưới hoặc xác nhận ký tự → gắn ngay lên board (cập nhật tức thì tile), popup giữ mở để chọn tiếp (giống Milanote, giống popup Color hiện có). Bỏ icon → tile về chỉ còn màu nền.

### Icon trên board tile
Icon vẽ giữa ô vuông 72x72 trong `BoardObject`:
- Icon lucide: component icon kích thước vừa (ví dụ ~40px), màu tương phản với màu nền ô vuông (nền tối → icon sáng, ngược lại).
- Ký tự: text canh giữa, cỡ lớn, màu tương phản tương tự.
- Chưa có icon: giữ nguyên ô vuông màu như hiện tại.

## Dữ liệu

### Nơi lưu: Board entity (không phải BoardData của tile)
Icon là thuộc tính của board, giống `name` và `color` (board tile đã đọc `board.name`, `board.color` từ Board entity, không duplicate vào tile data). Nút Color hiện tại cũng sửa `board.color` qua `setBoardColor`. Icon theo cùng pattern: thêm field `icon` optional vào `boardSchema`.

Hình dạng field (lưu dạng rời rạc, dễ migrate sau):
- `icon`: optional, có thể null (không icon).
- Khi có icon: phân biệt kiểu bằng `kind`:
  - `kind: 'lucide'`, `value`: tên icon lucide dạng chuỗi (ví dụ "Star", "ArrowUp"). Lúc render tra ngược ra component.
  - `kind: 'text'`, `value`: chuỗi ký tự người dùng nhập (tối đa 2 ký tự).

Lưu tên icon (chuỗi) chứ không lưu SVG — nhẹ, ổn định. Board record cũ không có field → default null (không icon), không vỡ hydrate. Lưu vào IndexedDB như các field board khác (đi theo luồng lưu board hiện có). "Tạm" theo nghĩa: nếu session sau làm bộ icon riêng và đổi cách đặt tên, có thể cần bước chuyển đổi — nhưng vẫn persist và reload thấy.

### Danh mục + tag cho tìm kiếm
Metadata không có sẵn trong `lucide-react`. Lấy từ package `lucide-static` (chỉ dùng khi dev):
- Thêm `lucide-static` làm devDependency.
- Script `scripts/gen-icon-catalog.mjs` lấy danh sách icon từ `lucide-react` (1544 icon), gắn tag từ `lucide-static/tags.json` (bản static mới hơn đổi tên một số icon nên không dùng làm danh sách), sinh file tĩnh `src/tools/canvas/lib/icon-catalog.ts`. Chạy bằng `npm run gen:icon-catalog`, không chạy lúc build thường.
- **Tag tìm kiếm**: lấy trực tiếp từ `tags.json` (có sẵn).
- **Danh mục**: `lucide-static` KHÔNG kèm category chính thức (category nằm ở repo lucide, không publish trong package, cũng không có file tổng hợp để fetch). Nên danh mục được derive từ tag + tên bằng bảng từ khoá trong script (~12 nhóm: arrows, files, communication, media, devices, weather, people, commerce, editing, nature, shapes, tools). Icon không khớp nhóm nào → "other". Danh mục chưa hoàn hảo nhưng đủ định hướng; tìm kiếm theo tag bù phần còn lại. Session sau làm bộ icon riêng có thể thay bằng category chuẩn.
- Runtime chỉ đọc file catalog tĩnh + import icon component từ `lucide-react`. `lucide-static` không vào bundle production.

### Bundle + hiệu năng (theo bản build 2026-10-16)
- Bộ icon lucide đầy đủ nằm 1 chunk lazy (~730 KB), chỉ tải khi mở popup hoặc board đang xem có icon lucide. Icon chữ không cần tải gì.
- Catalog (tên + danh mục + tag) nằm trong chunk popup (~210 KB), chỉ tải khi mở popup. Tile không tải catalog.
- Đã bỏ `lucide-react` khỏi `manualChunks.vendor` trong `vite.config.ts`: gom vào vendor thì cả bộ icon tải ngay lúc mở app. Sau khi bỏ, vendor còn ~62 KB (trước ~824 KB); icon dùng sẵn trong UI đi theo chunk dùng nó.
- Không tách từng icon thành chunk riêng: `import()` với template đường dẫn package Vite không phân tích được, bản build không sinh chunk.
- Lưới dùng ảo hóa với `@tanstack/react-virtual`: chỉ dựng các hàng icon đang trong vùng cuộn.

## Tương tác với tool khác

Không. Chỉ trong canvas. Icon lưu trong board data, canvas-sync sau này tự đồng bộ như field board khác.

## Điều kiện biên

- **Board chưa có icon**: ô vuông chỉ có màu nền (như hiện tại), nút Icon hiện biểu tượng gợi ý trung tính.
- **Tìm kiếm không ra kết quả**: lưới hiện trạng thái rỗng ngắn gọn ("Không tìm thấy icon"), không để trống trơn.
- **Ký tự nhập rỗng**: nút xác nhận không bấm được (hoặc bấm không gắn gì).
- **Màu nền ô vuông sát với màu icon**: chọn màu icon tương phản theo độ sáng của màu nền để luôn đọc được.
- **Offline**: hoạt động bình thường (lucide + catalog nằm trong app bundle, lưu IndexedDB cục bộ).

## Quyết định đã hoãn

- Màu riêng cho icon (cho người dùng chọn màu icon khác màu tương phản tự động): chưa làm, mặc định tương phản tự động.
- Nguồn "Tải ảnh lên": session sau.
- Danh mục tiếng Việt hoá tên: dùng tên danh mục lucide (tiếng Anh) trước; nếu cần dịch thì bổ sung sau qua i18n.
