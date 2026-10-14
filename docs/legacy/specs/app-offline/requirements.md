> LEGACY (chuyển 2026-10-13). Trạng thái hiện tại: `docs/system/01-core.md`. Spec này chỉ còn là lịch sử thay đổi.

# Yêu cầu — Mở app khi offline (service worker)

**Trạng thái**: Đã duyệt (2026-10-12)  
**Cập nhật cuối**: 2026-10-12

## Mục tiêu

Hiện tại tab đang mở mà mất mạng thì app vẫn chạy (JS đã nạp, dữ liệu nằm ở IndexedDB `bibo-canvas`). Nhưng F5 hoặc mở tab mới khi offline thì trình duyệt báo `ERR_INTERNET_DISCONNECTED`, giống Milanote (`.kiro/notes/milanote-sync-architecture.md` mục 1.6).

Spec này thêm service worker cache cả trang HTML (app shell) + JS + CSS + font, để offline vẫn mở được app và sửa board từ dữ liệu trên máy. Đây là 1 điểm "làm tốt hơn Milanote" ở mục 2.2 của note. Chưa có backend, nên spec không đụng đồng bộ.

## Bối cảnh đã chốt (không hỏi lại)

- Thứ tự (bạn chốt 2026-10-12): `canvas-storage-v2` xong → spec này → rồi mới backend.
- Dữ liệu board nằm ở IndexedDB `bibo-canvas` (spec `canvas-storage-v2`). File app nằm ở Cache Storage, do service worker quản lý. 2 thứ tách nhau.
- Không cần `idb-keyval` (Workbox tự quản IndexedDB sổ hạn dùng của nó).
- Thêm thư viện → phải sửa spec `bibo-foundation` trước (luật trong `core.md`).

## Câu cần chốt (hỏi bạn ở đầu session làm spec này)

1. Khi có bản build mới:
   - A) Hiện thanh báo "Có bản mới" + nút "Tải lại", bạn bấm mới tải lại.
   - B) Tự tải lại ngay khi bản mới sẵn sàng (có thể tải lại giữa lúc đang gõ).
   - C) Không báo, lần mở app sau tự dùng bản mới.
   - Kiro nghiêng A: không bị tải lại bất ngờ, mà vẫn biết có bản mới.
   - ĐÃ CHỐT (bạn, 2026-10-12): A.
2. Báo trạng thái offline trên giao diện:
   - A) Chưa báo gì, chỉ cần chạy được. Header 3 trạng thái để `canvas-sync`.
   - B) Thêm nhãn nhỏ "Đang offline" ngay bây giờ.
   - Kiro nghiêng A: chưa có backend thì offline không làm mất gì, nhãn sẽ phải làm lại khi có header 3 trạng thái.
   - ĐÃ CHỐT (bạn, 2026-10-12): B, nhưng là nhãn TẠM để thử trong lúc phát triển. Sau này (khi có backend) bạn muốn xử lý ngầm, không hiện nhãn. Nhãn phải gỡ được dễ (1 component, 1 chỗ gắn). Còn mở: "xử lý ngầm" có mâu thuẫn với header 3 trạng thái đã chốt ở note mục 2.2 không — chốt khi viết `canvas-sync`.
3. Cho cài như app (manifest, icon, nút "Cài đặt ứng dụng" của trình duyệt):
   - A) Chưa, để sau (cần thiết kế icon).
   - B) Có, manifest tối thiểu + icon tạm.
   - Kiro nghiêng A: không cần cho mục tiêu offline.
   - ĐÃ CHỐT (bạn, 2026-10-12): A, để sau. Đã ghi vào handoff "Việc còn mở" (làm khi có icon chính thức).

Bạn chọn khác thì sửa spec trước, rồi mới code.

## User stories

### US-1: F5 / mở tab mới khi offline vẫn vào được app
Là **người dùng**, tôi muốn **mở lại bibo khi mất mạng** để **tiếp tục xem và sửa board trên máy**.

**Điều kiện chấp nhận**:
- Cho đã mở app ít nhất 1 lần khi có mạng, khi offline rồi F5 trang `/canvas`, thì app mở bình thường, thấy đúng board và dữ liệu đã lưu.
- Cho offline, khi mở thẳng link board sâu (`/canvas/{boardId}` hoặc `/canvas/{boardId}/{slug}`) ở tab mới, thì app mở đúng board đó.
- Cho offline, khi tạo / sửa / kéo note rồi F5 (vẫn offline), thì thay đổi còn nguyên (IndexedDB như hiện tại).
- Cho offline, khi mở app, thì font hiển thị giống lúc online (font Google đã cache).

### US-2: Bản mới không kẹt bản cũ
Là **người dùng**, tôi muốn **biết có bản mới và tải lại khi mình muốn** để **không kẹt mãi ở bản cũ mà cũng không bị tải lại giữa lúc gõ**.

**Điều kiện chấp nhận** (theo câu chốt 1 = A):
- Cho đang mở app, khi có bản build mới được deploy và service worker tải xong, thì hiện thanh báo "Có bản mới" + nút "Tải lại".
- Cho thanh báo đang hiện, khi bấm "Tải lại", thì app chạy bản mới, dữ liệu board còn nguyên.
- Cho thanh báo đang hiện, khi không bấm, thì app vẫn chạy bản cũ bình thường, không tự tải lại.
- Cho thanh báo, khi dùng bàn phím / trình đọc màn hình, thì nút bấm được bằng Tab + Enter và chữ được đọc ra.

### US-3: Không làm phiền lúc phát triển
Là **dev**, tôi muốn **service worker không chạy ở `npm run dev`** để **HMR không bị cache cũ chặn**.

**Điều kiện chấp nhận**:
- Cho chạy `npm run dev`, khi mở app, thì không có service worker nào được đăng ký.
- Cho chạy `npm run build` + `npm run preview`, khi mở app, thì service worker được đăng ký.
- Cho bản landing (`landing.html`, `vite.landing.config.ts`), khi build, thì không có service worker (landing là domain riêng).

### US-4: Nhãn "Đang offline" tạm thời (câu chốt 2)
Là **dev đang thử offline**, tôi muốn **thấy rõ app đang mất mạng** để **biết mình đang thử đúng tình huống**.

**Điều kiện chấp nhận**:
- Cho mất mạng (DevTools Offline hoặc rút mạng), khi đang dùng app, thì hiện nhãn nhỏ "Đang offline".
- Cho có mạng lại, khi trình duyệt báo online, thì nhãn biến mất.
- Nhãn nằm trong 1 component, gắn 1 chỗ, gỡ không đụng code khác.

## Phân loại

**Phải có**: US-1, US-2, US-3, US-4  
**Nên có**: không có

## Ngoài phạm vi

- Header 3 trạng thái đồng bộ, outbox, gửi server, cách xử lý ngầm khi có backend (spec `canvas-sync`).
- Manifest + icon, cài như app (câu chốt 3).
- Cache ảnh user (chưa có object ảnh; làm cùng `canvas-content-objects` Task 5-6).
- Xử lý `onblocked` khi nâng phiên bản IndexedDB (review 2026-10-12, làm cùng `canvas-sync` khi thêm store outbox).
