# 21 — Gửi thay đổi lên server (outbox)

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: outbox (mục chờ gửi), dạng gói create / patch / delete, đơn vị trường, gộp mục, lớp gửi (cửa sổ 1s, thử lại, offline, gửi gấp, keepalive), chỉ 1 tab gửi, xác nhận, trạng thái đồng bộ, server giả, bảng dev.

Không gồm: ghi object xuống máy và hàng đợi ghi (`20`, nơi có chỗ nối "object + mục outbox chung 1 transaction"). Chiều nhận về, xung đột, realtime, khoá giữa người, Supabase thật: chưa có code, xem "Câu còn mở".

**Hiện chỉ chạy ở dev.** `OUTBOX_ENABLED = import.meta.env.DEV` (`sync/outbox-config.ts`). Bản build không ghi outbox, không có lớp gửi, không có `/__fake-api`. `canvas-sync` đổi cờ thành "đã đăng nhập + có Supabase".

## Hiện trạng

### Luồng

```
thao tác → hàng đợi ghi (20) → 1 transaction: đọc bản cũ → ghi object → tính trường đổi → gộp mục outbox
        → báo lớp gửi (cùng tab gọi thẳng, tab khác qua BroadcastChannel)
        → lớp gửi (tab giữ Web Lock): cửa sổ 1s → đọc HẾT outbox → 1 request
        → server: bỏ opId đã nhận, áp theo trường → trả opId đã nhận + object thiếu
        → client xoá mục có opId khớp; mục server báo thiếu → chuyển sang create
```

### Mục outbox (store `outbox`, khoá `objectId`)

Mỗi object tối đa 1 mục: `{ objectId, kind: put | delete, isNew, fields, channels, baseVersion, rev, opId, groupId, createdAt }` (`sync/outbox-entry.ts`).

- Không chép nội dung object vào mục. Lúc gửi đọc object từ store `objects` trong cùng transaction đọc outbox, rồi chỉ lấy các trường đã đổi.
- Sửa nhiều lần trước khi gửi → gộp vào 1 mục: hợp các trường, giữ `baseVersion` lúc bắt đầu chuỗi sửa, tăng `rev`, ĐỔI `opId`.
- Sửa rồi xoá → mục xoá. Xoá rồi ghi lại trước khi gửi (undo xoá) → mục mới (`isNew`), bỏ danh sách trường cũ.
- `isNew` giữ tới khi gửi được. Mục cũ thiếu `fields` / `isNew` (trước khi có gửi theo trường) → coi là mới, gửi nguyên object.
- `groupId`: mã của lô hàng đợi vừa gộp vào mục. Gộp lần sau thì bị đè bằng mã lô mới (xem "Câu còn mở").
- Mục `put` mà object đã mất (không nên xảy ra vì chung transaction) → gửi như xoá.

### Trường (`sync/object-fields.ts`)

- `type`, `boardId`, `unsortIndex`: mỗi cái 1 trường. `geometry`: cả khối là 1 trường.
- `data`: mỗi khoá 1 trường (`data.body`, `data.color`, `data.heightMode`...). `data` không phải object thường → cả `data` là 1 trường.
- Không tính `id`, `version`, `createdAt`, `updatedAt` (đi kèm gói).
- So bằng JSON có sắp khoá: cùng nội dung khác thứ tự khoá không tính là đổi.
- Chữ note là 1 trường `data.body`: sửa 1 ký tự vẫn gửi cả nội dung note. Mã từng đoạn (`12`) đã có nhưng chưa dùng khi gửi.

### Dạng gói (`sync/protocol.ts`, dùng chung client + server giả)

Request: `{ clientId, ops }`. Mỗi op có `opId`, `objectId`, `baseVersion`, `groupId`, cộng 1 trong 3:

| Loại | Khi nào | Mang theo |
|---|---|---|
| `create` | Server chưa có object (`isNew`) | Nguyên object + `version` |
| `patch` | Server đã có | `set` (trường → giá trị mới), `unset` (khoá `data` đã xoá), `version`, `updatedAt` |
| `delete` | Object bị xoá | Chỉ id |

- `null` là giá trị hợp lệ (VD màu về mặc định), nằm trong `set`. Xoá khoá dùng `unset`.
- Trả về: `acceptedOpIds` (gồm cả mã bị bỏ vì trùng), `missingObjectIds` (patch tới object server không có), `duplicates`, `versionConflicts`.
- Bỏ gói trùng CHỈ dựa vào `opId`. `clientId` sinh mới mỗi lần nạp trang, server hiện không dùng. Không có số thứ tự tăng dần.

### Lớp gửi (`sync/outbox-sender.ts` thuần, `sync/outbox-runtime.ts` nối trình duyệt)

| Trạng thái | Nghĩa | Sang |
|---|---|---|
| `idle` | Không có mục chờ | Có mục → `collecting` |
| `collecting` | Chờ hết cửa sổ 1s, tính từ mục đầu, KHÔNG gia hạn khi có mục mới | Hết cửa sổ / gửi gấp → `sending` |
| `sending` | 1 request đang bay. Mục mới đợi lượt sau | Xong: còn mục → `collecting`, hết → `idle`. Lỗi → `retry` |
| `retry` | Chờ 1s, 2s, 4s… tối đa 30s | Hết giờ → `sending` |
| `offline` | `navigator.onLine` false hoặc mất mạng giả | Có mạng → gửi ngay |

- Mỗi lần gửi đọc HẾT outbox → 1 request, không giới hạn số mục. Gõ liên tục 10s ≈ 10 request (đo dev 2026-10-13).
- Gửi gấp: mọi `repo.flush()` (thoát sửa note, đổi board, ẩn tab) bỏ phần còn lại của cửa sổ. Đang bay → gửi ngay sau khi xong. Đang `retry` thì KHÔNG phá nhịp chờ (tránh dội server đang lỗi).
- Đóng tab (`pagehide`): gửi 1 request `fetch(..., { keepalive: true })` (trình duyệt cho chạy tiếp sau khi trang đóng, body tối đa ~64KB). Không chờ trả lời, không xoá mục. Chạy song song với ghi gấp xuống máy nên có thể thiếu thay đổi cuối; thay đổi đó vẫn nằm trong outbox, lần mở sau gửi tiếp, server bỏ trùng theo `opId` (bạn chốt giữ như vậy 2026-10-13).
- Mở app: outbox còn mục → coi như có mục mới, gửi tiếp.
- Đổi board chỉ gửi gấp, không chờ gửi xong mới chuyển.

### Chỉ 1 tab gửi

- Tab giữ Web Lock `bibo-canvas-outbox` là tab gửi. Tab đóng → khoá nhả → tab đang chờ nhận việc và gửi nốt mục còn lại.
- Tab không gửi vẫn ghi outbox bình thường, báo tab gửi qua tin `{ type: 'outbox', urgent }`. Tab gửi báo trạng thái đồng bộ cho tab khác qua `{ type: 'sync-status', phase }`.
- Không có Web Locks (mở dev qua IP LAN, không phải secure context) → mỗi tab tự gửi. Vẫn đúng nhờ server bỏ trùng theo `opId`, chỉ tốn request hơn.

### Xác nhận

1 transaction đọc-ghi outbox: mục có `opId` nằm trong `acceptedOpIds` → xoá. Mục có id trong `missingObjectIds` → đánh dấu `isNew` (giữ `opId`, server chưa ghi nhận). Còn lại giữ. Sửa tiếp trong lúc request bay thì `opId` đã đổi → mục không bị xoá nhầm.

### Trạng thái đồng bộ (`store/sync-status-store.ts`, hiện ở `BoardTitleRow`)

- `local` "Đã lưu trên máy" (còn mục chờ) / `synced` "Đã đồng bộ" (hết mục, hiện 2s rồi ẩn) / `unsynced` "Chưa đồng bộ" (offline hoặc đang thử lại, giữ tới khi gửi được).
- Thứ tự ưu tiên chữ ở tiêu đề: lỗi ghi máy ("Lưu lỗi", `20`) → trạng thái đồng bộ → trạng thái lưu máy.
- Bản build: luôn `idle`, chỉ còn trạng thái lưu máy.
- Key dịch: `CANVAS.HEADER.SYNC_LOCAL`, `SYNC_DONE`, `SYNC_PENDING`.

### Server giả (`dev/fake-api/`, chỉ dev)

- Plugin Vite `apply: 'serve'`, đường dẫn `/__fake-api`: `POST /apply`, `POST /config`, `GET /state`, `POST /reset`. Body tối đa 20MB.
- Lưu trong bộ nhớ tiến trình dev, tắt dev là mất. Không có đăng nhập; dev mở ra LAN nên máy cùng mạng gọi được.
- `/apply`: kiểm dạng cả request trước (sai 1 op → 400, không áp gì); bỏ `opId` đã nhận; create ghi nguyên object; patch áp từng trường lên bản đang có (2 patch khác trường không đè nhau); patch tới object không có → trả thiếu, không ghi nhận mã; delete xoá.
- Lệch phiên bản (`baseVersion` khác version server): CHỈ đếm, vẫn áp.
- Lỗi giả theo tỉ lệ: trả 500, không áp gì, không ghi nhận mã. Mất mạng giả nằm ở phía máy (cờ localStorage `bibo-dev-fake-offline`, mọi tab đọc chung).

### Bảng dev (`src/dev/OutboxSection.tsx`, `write-metrics.ts`)

Đo: số request (gấp, keepalive), object / request, thời gian, byte, lỗi, thử lại, trùng, lệch. Điều khiển: độ trễ (0 / 200ms / 1s / 3s), tỉ lệ lỗi (0 / 20% / 50%), mạng online / offline, "So với server" (object không còn chờ gửi phải khớp version + nội dung), "Làm mới", "Xoá server". Copy kết quả.

### Test tự động (`npm run test`)

`object-fields.test.ts`, `outbox-entry.test.ts`, `outbox-sender.test.ts` (đồng hồ giả), `dev/fake-api/server-core.test.ts`.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-SYNC-01` | Mục outbox chỉ ghi trong cùng transaction với object (`INV-DATA-02`), không ghi outbox ở chỗ khác | Không có thay đổi lưu máy mà không xếp gửi | Review |
| `INV-SYNC-02` | Chỉ xoá mục khi server trả đúng `opId` của mục đó; mỗi lần gộp phải đổi `opId` | Sửa trong lúc request bay không bị xoá nhầm; gửi lại không áp 2 lần | Test `outbox-entry`, `outbox-sender` |
| `INV-SYNC-03` | Gửi theo trường: patch chỉ mang trường đã đổi; `null` là giá trị, xoá khoá dùng `unset` | Request nhẹ; 2 thay đổi khác trường không đè nhau | Test `object-fields`, `server-core` |
| `INV-SYNC-04` | Cửa sổ có trần 1s tính từ mục đầu, không gia hạn, không debounce chờ ngừng gõ | Gõ liên tục vẫn gửi đều, server không tụt xa | Test `outbox-sender` |
| `INV-SYNC-05` | Mỗi lúc 1 request bay; lỗi thì giữ mục, chờ lâu dần 1s → 30s; gửi gấp không phá nhịp chờ thử lại | Không dội server lỗi, không mất thay đổi | Test `outbox-sender` |
| `INV-SYNC-06` | Keepalive lúc đóng tab không xoá mục | Không biết server nhận chưa; an toàn nằm ở outbox | Test `outbox-sender` |
| `INV-SYNC-07` | Mọi tab có thể ghi outbox, nhưng có Web Locks thì chỉ tab giữ `bibo-canvas-outbox` gửi | Không nhân số request | Review |
| `INV-SYNC-08` | Server bỏ trùng theo `opId` và báo `missingObjectIds` thay vì áp patch lên object không có | Gửi lại an toàn; object server chưa có được gửi lại dạng create | Test `server-core`. RPC thật phải giữ |
| `INV-SYNC-09` | Lớp gửi, server giả không vào bản build khi chưa có server thật (`OUTBOX_ENABLED`, import sau `import.meta.env.DEV`, plugin `apply: 'serve'`) | Bản build không có đích gửi, outbox chỉ dồn mãi | `INV-CORE-04` |
| `INV-SYNC-10` | Không báo "Đã đồng bộ" khi còn mục chờ hoặc đang offline | Chỗ Milanote làm sai (báo "Saved" khi offline) | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/tools/canvas/sync/protocol.ts` | Dạng gói, kiểm dạng, hằng `FAKE_API_PREFIX` |
| `src/tools/canvas/sync/object-fields.ts` | So / lấy / áp trường |
| `src/tools/canvas/sync/outbox-entry.ts` | Gộp mục, đổi mục sang gói, `newSyncId` |
| `src/tools/canvas/sync/outbox-sender.ts` | Nhịp gửi thuần (5 trạng thái) |
| `src/tools/canvas/sync/outbox-runtime.ts` | Web Lock, fetch, BroadcastChannel, mạng, keepalive |
| `src/tools/canvas/sync/outbox-signal.ts` | Cầu nối `api.ts` → lớp gửi (tránh import vòng) |
| `src/tools/canvas/sync/outbox-config.ts` | Cờ bật, cửa sổ, thời gian thử lại |
| `src/tools/canvas/api.ts` | `writeObjects` ghi mục, `getOutboxStore` (đọc / xác nhận) |
| `src/tools/canvas/store/sync-status-store.ts`, `components/BoardTitleRow.tsx` | Trạng thái đồng bộ |
| `dev/fake-api/server-core.ts`, `plugin.ts` | Server giả |
| `src/dev/OutboxSection.tsx`, `write-metrics.ts` | Bảng dev |

## Nguồn liên quan

- Spec `.kiro/specs/canvas-outbox/` (chờ test tay O2 + O5, xong thì vào legacy).
- Note `milanote-sync-architecture.md`: 2.1–2.2 (giữ / làm tốt hơn Milanote), 2.4a (khoá có hạn), 2.5 (quy tắc outbox), 2.6 (xung đột), 2.7 (3 luồng), 2.8 (Supabase), 2.11a (giới hạn gói).
- Sơ đồ `docs/sync-diagrams/` (vẽ lại 2026-10-13 với cửa sổ 1s).
- `docs/supabase-setup.md`.

## Câu còn mở

Chỗ hở đã biết:

- (2026-10-13) "Áp cả nhóm": spec muốn thao tác nhiều object được server áp cả cụm hoặc không gì. Hiện server giả chỉ đảm bảo cả request hợp lệ mới áp; patch thiếu object bị bỏ riêng; `groupId` bị đè khi gộp nên mất dấu cụm. Bạn chốt quyết cùng thiết kế RPC ở `canvas-sync`.
- (2026-10-13) Keepalive có thể thiếu thay đổi cuối (xem "Lớp gửi"). Bạn chốt giữ.
- (2026-10-13) Không giới hạn số mục mỗi request; offline lâu thì 1 request rất lớn, keepalive quá ~64KB bị từ chối. Cắt request (theo nhóm) để `canvas-sync`.

Việc của `canvas-sync` / `canvas-sharing` (chưa có code, hướng ở note):

- Thay server giả bằng RPC `apply_ops` (cùng dạng gói), gắn người dùng / token, đổi `OUTBOX_ENABLED`.
- Gửi board (tên, màu, cây cha con) và camera: hiện chỉ gửi object.
- Chiều nhận về: mở board hiện bản máy rồi nhận bản server, gộp theo `version`. IndexedDB đổi vai từ nguồn chuẩn thành bản trên máy.
- Xung đột (`baseVersion` khác server): bản thua thành note "bản xung đột" vào Unsort (note 2.6). Server giả hiện chỉ đếm.
- Realtime (Broadcast / Presence / Postgres Changes), khoá giữa người có hạn (30s / 5 phút, note 2.4a).
- Gửi chữ theo từng đoạn (dùng mã đoạn của `12`), hoặc Yjs cho kênh chữ (giai đoạn 2).
