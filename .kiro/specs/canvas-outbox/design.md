# Thiết kế — Outbox + server giả (canvas-outbox)

**Trạng thái**: Đã duyệt, đã code 2026-10-13 (gồm bổ sung gửi theo trường, Task 7)

## Luồng tổng

```
Thao tác (gõ, kéo, xoá)
  → hàng đợi ghi (có sẵn, không đổi cách gom)
  → 1 transaction IndexedDB: đọc bản cũ → ghi object → so ra trường đã đổi → ghi / gộp mục outbox
  → báo lớp gửi "có mục mới" (cùng tab gọi thẳng, tab khác qua BroadcastChannel)
  → lớp gửi (chỉ ở tab giữ quyền gửi): cửa sổ 1s → đọc hết outbox → 1 request
       mỗi mục thành create (nguyên object) / patch (chỉ trường đã đổi) / delete (chỉ id)
  → server giả: bỏ mã trùng, áp theo trường, trả mã đã nhận + object bị thiếu
  → lớp gửi xoá mục có mã khớp; mục server báo thiếu → chuyển sang create
```

## Dữ liệu

### Store `outbox` (cùng database `bibo-canvas`, nâng phiên bản 2 → 3)

- Nâng từ < 2: như cũ (xoá hết, tạo lại) rồi thêm outbox. Nâng từ 2: chỉ thêm store outbox, không đụng dữ liệu.
- Mỗi object tối đa 1 mục, khoá theo id object. Mục gồm:
  - kiểu: sửa / xoá
  - mới: server chưa có object (vừa tạo, hoặc server báo thiếu) → gửi nguyên object
  - các trường đã đổi kể từ lần gửi được gần nhất, gộp dồn (xem "Trường")
  - kênh đã đổi (chữ, thuộc tính), gộp dồn. Chỉ là nhãn, chưa dùng khi gửi
  - phiên bản gốc: version của object lúc bắt đầu chuỗi sửa chưa gửi. Gộp thêm thì giữ nguyên
  - số sửa (tăng mỗi lần gộp) + mã gửi (đổi mỗi lần gộp): server dùng mã gửi để bỏ trùng, client dùng để không xoá nhầm mục đã sửa tiếp
  - mã nhóm: các object ghi trong cùng 1 lô hàng đợi chung 1 mã nhóm
  - giờ tạo
- Không chép nội dung object vào mục: lúc gửi đọc object từ store `objects` trong cùng transaction đọc outbox, rồi chỉ lấy giá trị các trường đã đổi.
- Gộp đặc biệt:
  - Sửa rồi xoá → mục xoá.
  - Xoá rồi ghi lại trước khi gửi (undo xoá) → mục mới, bỏ danh sách trường cũ.
  - Mục ghi trước khi có gửi theo trường (chưa có danh sách trường) → coi là mới, gửi nguyên object.

### Trường

- `type`, `boardId`, `unsortIndex`: mỗi cái 1 trường.
- `geometry`: 1 trường (x, y, rộng, cao, lớp luôn đi cùng nhau khi kéo / đổi cỡ).
- `data`: mỗi khoá 1 trường (`data.body`, `data.color`, `data.heightMode`...). `data` không phải object thường → cả `data` là 1 trường.
- Không tính: `id` (không đổi), `version`, `createdAt`, `updatedAt` (siêu dữ liệu, đi kèm gói).
- So bằng JSON có sắp khoá: cùng nội dung khác thứ tự khoá thì không tính là đổi.

### Ghi cùng transaction

Hàm ghi lô mở 1 transaction trên `objects` + `outbox`. Với mỗi object: đọc bản cũ (request chạy theo thứ tự nên đọc trước khi ghi đè) → so ra trường đã đổi → ghi object → đọc mục cũ → gộp → ghi mục. Không có bản cũ → mục mới. Lô lỗi thì cả object lẫn mục đều không xuống. Không phải sửa chỗ nào gọi `saveObject`.

### Khi nào bật

- Bật khi chạy dev (có server giả). Bản build: không ghi outbox, không chạy lớp gửi, không đổi trạng thái lưu. Lý do: chưa có server thật, ghi outbox ở bản build chỉ dồn mãi.
- `canvas-sync` đổi cờ này thành "đã đăng nhập + có cấu hình Supabase".

## Dạng gói gửi

Mỗi request: `{ clientId, ops: [...] }`. Mỗi phần tử có mã gửi, id object, phiên bản gốc, mã nhóm, cộng 1 trong 3 loại:

| Loại | Khi nào | Mang theo |
|---|---|---|
| create | Server chưa có object | Nguyên object + version |
| patch | Object đã có trên server | `set` (trường → giá trị mới), `unset` (khoá data đã bị xoá), version, updatedAt |
| delete | Object bị xoá | Chỉ id |

- `null` là giá trị hợp lệ (VD màu về mặc định), nằm trong `set`. Xoá khoá dùng `unset`, không dùng `null`.
- Trả về: mã đã nhận (gồm mã bị bỏ vì trùng), id object bị thiếu (patch tới object server không có), số trùng, số lệch phiên bản.
- Hợp đồng nằm ở `src/tools/canvas/sync/protocol.ts`, dùng chung cho client và server giả. RPC `apply_ops` của `canvas-sync` nhận đúng dạng này.

## Lớp gửi

### Quyền gửi (1 tab)

Dùng khoá của trình duyệt (Web Locks) tên riêng cho outbox. Tab giữ khoá là tab gửi. Tab đóng → khoá tự nhả → tab khác đang chờ khoá nhận việc. Tab không gửi vẫn ghi outbox bình thường; tab gửi nghe BroadcastChannel để biết có mục mới, rồi báo lại trạng thái đồng bộ cho mọi tab. Trình duyệt không có Web Locks (mở dev qua IP mạng LAN) → tab tự gửi.

### Nhịp gửi

| Trạng thái | Nghĩa | Sang |
|---|---|---|
| Rảnh | Không có mục chờ | Có mục mới → Đang gom |
| Đang gom | Đã có mục, chờ hết cửa sổ 1s (tính từ mục đầu, không gia hạn khi có mục mới) | Hết cửa sổ hoặc gửi gấp → Đang gửi |
| Đang gửi | 1 request đang bay | Thành công: còn mục → Đang gom (cửa sổ mới), hết → Rảnh. Lỗi → Chờ thử lại |
| Chờ thử lại | Sau lỗi, chờ 1s, 2s, 4s… tối đa 30s | Hết giờ hoặc có mạng lại → Đang gửi |
| Offline | Mất mạng (trình duyệt báo hoặc bảng dev giả lập) | Có mạng → Đang gửi ngay nếu còn mục |

- Mỗi lúc chỉ 1 request bay. Mục mới trong lúc bay đợi lượt sau.
- Gửi gấp (mọi `repo.flush()`: thoát sửa note, đổi board, ẩn tab): bỏ phần còn lại của cửa sổ, gửi ngay. Đang bay thì gửi ngay sau khi request đang bay xong. Đang chờ thử lại vì lỗi thì không phá nhịp chờ (tránh dội server lỗi).
- Đóng tab (`pagehide`): gửi 1 request keepalive với phần đang chờ, không chờ trả lời, không xoá mục. Lần mở sau gửi lại, server bỏ trùng. Giới hạn body keepalive ~64KB, quá thì trình duyệt từ chối, mục vẫn còn.
- Mở app: còn mục trong outbox → coi như có mục mới.
- Thao tác nhiều object luôn ghi cùng lô hàng đợi, nên nằm chung 1 request. Không giới hạn số mục mỗi request trong lần này; `canvas-sync` cân nhắc giới hạn kích thước thì phải cắt theo mã nhóm.

### Xác nhận

1 transaction đọc-ghi outbox: mục có mã gửi khớp mã đã nhận → xoá. Mục có id nằm trong danh sách thiếu → đánh dấu mới (giữ mã gửi, server chưa ghi nhận mã đó). Còn lại giữ cho lượt sau.

## Server giả (chỉ dev)

- Plugin Vite `apply: 'serve'`, đường dẫn `/__fake-api/`. Bản build không có plugin, không có đường dẫn.
- Lưu trong bộ nhớ tiến trình `npm run dev`: object theo id (kèm version), tập mã gửi đã nhận. Tắt dev là mất.
- Không có đăng nhập. Dev mở ra mạng LAN (`server.host: true`) nên máy cùng mạng gọi được.
- Đường dẫn:
  - `POST /apply`: kiểm dạng cả request trước (sai 1 mục → 400, không áp gì); bỏ mã đã nhận; create ghi nguyên object; patch áp từng trường lên bản đang có (2 patch khác trường không đè nhau), patch tới object không có → trả thiếu, không ghi nhận mã; delete xoá. Lệch phiên bản chỉ đếm, vẫn áp (xung đột là việc của `canvas-sync`). Đếm byte body.
  - `POST /config`: độ trễ, tỉ lệ lỗi (trả 500 ngẫu nhiên, không áp gì, không ghi nhận mã).
  - `GET /state`: object + version + số đếm (request, lỗi, create, patch, xoá, thiếu, trùng, lệch, byte).
  - `POST /reset`: xoá dữ liệu.
- Offline giả lập nằm ở phía máy (cờ localStorage, mọi tab đọc chung), không ở server, vì server không giả được "không tới được".

## Trạng thái đồng bộ (giao diện thật)

- Bản build: chữ trạng thái lưu ở hàng tiêu đề board giữ nguyên.
- Khi outbox bật: "Đã lưu trên máy" (còn mục chờ) / "Đã đồng bộ" (hết mục, hiện 2s rồi ẩn) / "Chưa đồng bộ" (offline hoặc chờ thử lại, màu `warning`, giữ tới khi gửi được). "Không lưu được" (ghi máy lỗi) vẫn ưu tiên.
- Chữ qua bộ dịch: `CANVAS.HEADER.SYNC_LOCAL`, `SYNC_DONE`, `SYNC_PENDING` (vi + en).

## Bảng dev — mục Outbox

- Mục đo (dùng chung Phiên / Liên tục + nhãn kịch bản với hàng đợi ghi): số request (gấp, keepalive), object mỗi request, thời gian request, byte mỗi request, lỗi, thử lại, trùng, lệch.
- Mục "Server giả + outbox": độ trễ (0 / 200ms / 1s / 3s), tỉ lệ lỗi (0 / 20% / 50%), mạng (online / offline), số mục chờ gửi, số đếm server, "So với server", "Làm mới", "Xoá server".
- "So với server": object không còn chờ gửi phải trùng version + nội dung với server (JSON có sắp khoá). "Server chưa có" = object có từ trước khi bật outbox hoặc server vừa khởi động lại, không tính là lệch.
- Copy: thêm khối outbox vào chữ copy.

## Test tự động

`vitest` 4.1.10 (cố định), `npm run test`, chỉ quét `src/` + `dev/`.

- `object-fields.test.ts`: so trường (kéo → `geometry`, gõ → `data.body`, bỏ qua version / updatedAt, khác thứ tự khoá không tính), lấy + áp patch, 2 patch khác trường giữ cả 2, màu về `null` là giá trị, khoá bị xoá → `unset`.
- `outbox-entry.test.ts`: gộp mục (giữ phiên bản gốc, hợp trường, đổi mã gửi), mới giữ tới khi gửi, sửa rồi xoá, xoá rồi ghi lại → mới; đổi sang gói create / patch / delete; mục cũ chưa có trường → create.
- `outbox-sender.test.ts` (đồng hồ giả): 5 mục trong 1s → 1 request; gõ 10s → ~10 request; gửi gấp; gửi gấp khi đang bay; không phá nhịp chờ thử lại; thử lại 1s → 30s; sửa trong lúc bay không xoá nhầm; offline / online; keepalive không xoá mục.
- `dev/fake-api/server-core.test.ts`: create, patch giữ phần còn lại, 2 client khác trường không đè nhau + đếm lệch, patch tới object thiếu → gửi lại create cùng mã thì áp, bỏ trùng, delete, lỗi giả, request sai dạng, đếm byte, config sai dạng.

## Điều kiện biên

- IndexedDB nâng phiên bản 3 khi tab cũ (bản 2) còn mở: tab cũ tự đóng kết nối (`onversionchange`). Chưa xử `onblocked`; nếu bị chặn, tab mới báo lỗi ghi tới khi F5.
- Object bị xoá trong lúc mục sửa của nó đang bay: lượt sau gửi mục xoá.
- Outbox dồn lớn (offline lâu): đọc hết 1 lần; chấp nhận ở dev.
- Đổi board: chỉ gửi gấp, không chờ gửi xong mới chuyển (khác chờ ghi máy).
- Chữ note là 1 trường (`data.body`): sửa 1 ký tự vẫn gửi cả nội dung note; 2 người cùng sửa chữ 1 note thì bản đến sau đè. Đã chốt xử bằng khoá sửa theo người (`canvas-sharing`), giai đoạn 2 mới cân nhắc Yjs cho riêng chữ.

## Thay đổi so với note kiến trúc

- Mục 2.7 cũ: "thuộc tính gửi ngay, chữ throttle ~2s". Spec này: 1 cửa sổ 1s có trần cho cả chữ lẫn thuộc tính, vì vấn đề bạn nêu là kéo 1 item ra 1 request. Đã ghi vào note.
- Mục 2.5 cũ: mục outbox có `localRev`. Spec này: `rev` + mã gửi đổi theo mỗi lần gộp, client xác nhận bằng mã gửi. Cùng mục đích (không xoá nhầm mục đã sửa tiếp).
- Bản đầu của spec gửi nguyên object, lệch mục 2.1 + 2.5 (đã chốt gửi theo trường) mà không nêu ra. Đã sửa ở Task 7.

## Quyết định đã hoãn

- Giới hạn kích thước request, cắt theo nhóm: `canvas-sync`.
- Gửi board, camera: `canvas-sync`.
- Chiều nhận về (bản server khi mở board, gộp theo version, xung đột vào Unsort): `canvas-sync`.
- Đo thời gian request với Supabase thật: thay server giả bằng Supabase rồi đo lại bằng chính mục Outbox.
