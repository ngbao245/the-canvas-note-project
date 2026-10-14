# Task — Outbox + server giả (canvas-outbox)

**Trạng thái**: Đã code xong 2026-10-13 (bạn duyệt + bảo làm hết 1 lượt). Build, lint, 26 test pass. Chờ bạn test tay theo mã case trong chat.

## Phase 1: Outbox trên máy

- [x] Task 1: Cài vitest + logic gộp mục outbox (thuần) + test
  - `vitest` 4.1.10 (cố định), `vitest.config.ts` chỉ quét `src/` + `dev/`, lệnh `npm run test`.
  - `src/tools/canvas/sync/outbox-entry.ts` + test.

- [x] Task 2: Store outbox + ghi cùng transaction với object
  - `api.ts`: database phiên bản 3, store `outbox`; `writeObjects` ghi object + mục trong 1 transaction khi bật; `getOutboxStore()`.

## Phase 2: Gửi đi

- [x] Task 3: Server giả (plugin Vite chỉ dev) + test
  - `dev/fake-api/server-core.ts` (thuần) + `plugin.ts` (`apply: 'serve'`). Đã gọi thử HTTP: áp, bỏ trùng, config, state, reset, body sai → 400. `dist/` không có `__fake-api`.

- [x] Task 4: Lớp gửi + test
  - `sync/outbox-sender.ts` (thuần) + `sync/outbox-runtime.ts` (IndexedDB, fetch, Web Lock, BroadcastChannel, keepalive). Nạp bằng `import()` sau cờ DEV trong `useCanvasPersistence`. Gửi gấp qua `repo.flush()`.

## Phase 3: Hiển thị + đo

- [x] Task 5: Trạng thái đồng bộ ở hàng tiêu đề board
  - `store/sync-status-store.ts`, `BoardTitleRow`, key `CANVAS.HEADER.SYNC_*` (vi + en).

- [x] Task 6: Mục Outbox trong bảng dev + cập nhật doc
  - `src/dev/OutboxSection.tsx`, `fake-api-client.ts`, số outbox trong `write-metrics.ts` (dùng chung Phiên / Liên tục + Copy).
  - Doc: `docs/legacy/architecture.md` mục "Outbox", handoff canvas, note kiến trúc 2.9.

## Kiểm trên trình duyệt (Kiro qua Chrome DevTools MCP, 2026-10-13, dev cổng 3011)

Thao tác bằng script gọi thẳng repository (nhịp chính xác), không kéo chuột thật.

- O1: 5 object trong ~1s → 1 request. O3: 100 lần ghi chữ trong 10s → 10 request. O4: `flush()` → request đi ngay (<150ms).
- O6: "So với server" khớp 6/6. O7: lỗi 50% → server lỗi 4 lần, thấy "Chưa đồng bộ"; về 0% → hết chờ gửi, khớp.
- O8: offline → 0 request, 3 mục chờ, "Chưa đồng bộ"; online → 1 request gồm cả 3. O9: trễ 3s, sửa lúc đang bay → sau request đầu còn 1 mục, server nhận bản cuối, khớp.
- O10: offline, đóng tab, mở lại → còn 2 mục; online → server áp 2, không trùng, khớp.
- O11: sửa rồi rời trang sau 50ms → thay đổi đã lên server trước khi mở lại, không mất, không trùng.
- O12: 2 tab, sửa ở tab không giữ khoá → tab kia gửi, tab sửa 0 request nhưng vẫn thấy trạng thái. O13: đóng tab gửi → tab còn lại nhận khoá, tự gửi.
- O14: `npm run build` + preview → ghi object bình thường, outbox 0 mục, không bảng dev, 0 lần gọi `/__fake-api`.
- Chưa thử: O2 (kéo chuột thật, so số với lần đo A), O5 (kéo 20 item bằng chuột). Logic giống O1, cần bạn test tay để có số so.

## Phase 4: Gửi theo trường (bổ sung 2026-10-13)

- [x] Task 7: Patch theo trường thay cho gửi nguyên object
  - `sync/object-fields.ts` (so trường, lấy trường, áp patch) + test; `outbox-entry.ts` (`fields`, `isNew`, create / patch / delete); `protocol.ts` (gói 3 loại, `missingObjectIds`); `api.ts` (đọc bản cũ cùng transaction, ack chuyển mục thiếu sang create); server giả áp theo trường; bảng dev đo byte.
  - Verify: 43 test pass, build + lint pass. Chrome (MCP, dev cổng 3011):
    - P1 server trống, sửa object cũ → patch → server báo thiếu → tự gửi lại create, hết chờ gửi.
    - P2 note ~8KB chữ, chỉ kéo → patch chỉ có `geometry`, không mang chữ: 410B so với 8432B khi gửi chữ.
    - P3 đổi màu + sửa chữ trong 1 cửa sổ → 1 request, patch có `data.body` + `data.color`.
    - P4 đổi màu về mặc định → server giữ `color: null`.
    - P5 xoá rồi ghi lại trước khi gửi → 1 `create`.
    - 2 thay đổi khác trường từ 2 client không đè nhau: test tự động server giả (chưa có 2 client thật).

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[x] npm run build pass
[x] npm run lint pass (1 warning shadcn đã biết)
[x] npm run test pass (26)
[x] Không có console.log mới
[x] tasks.md task này đã [x]
[x] Nếu đổi behavior: doc/spec liên quan đã update
```
