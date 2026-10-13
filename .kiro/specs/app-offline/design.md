# Thiết kế — Mở app khi offline

**Trạng thái**: Đã duyệt (2026-10-12, theo 3 câu đã chốt: 1A, 2B, 3A)

## Màn hình / luồng

Không có màn hình mới. Thêm 1 thanh báo nhỏ khi có bản mới.

Luồng lần đầu (online):
1. Mở app → trang tải như bình thường.
2. Sau khi tải xong, service worker cài đặt, tải trước (precache) mọi file của bản build: `index.html`, JS, CSS, ảnh tĩnh.
3. Từ lần mở sau, kể cả offline, trang và file lấy từ cache.

Luồng mở app khi offline:
1. Trình duyệt xin trang `/canvas/...` → service worker trả `index.html` từ cache (mọi đường dẫn điều hướng của app đều trả `index.html`, router React lo phần còn lại).
2. JS / CSS lấy từ cache. Font Google lấy từ cache chạy lúc dùng (runtime cache).
3. App đọc dữ liệu board từ IndexedDB `bibo-canvas` như hiện tại.

Luồng bản mới (câu chốt 1 = A):
1. Deploy bản mới → lần mở / lần kiểm tra sau, service worker mới tải xong file mới, ở trạng thái chờ.
2. App hiện thanh báo ở góc dưới: "Có bản mới" + nút "Tải lại" (+ nút đóng).
3. Bấm "Tải lại" → service worker mới kích hoạt, trang tải lại, chạy bản mới.
4. Không bấm → vẫn chạy bản cũ tới khi đóng hết tab.

Nhãn "Đang offline" (tạm, câu chốt 2 = B):
- Theo sự kiện `online` / `offline` của trình duyệt. Mất mạng → nhãn nhỏ góc dưới; có mạng → ẩn.
- 1 component riêng, gắn 1 chỗ trong `App.tsx`, có comment "TẠM: gỡ khi `canvas-sync` xử lý ngầm". Chữ qua i18n, màu token `warning`.

## Thư viện và cấu hình

- `vite-plugin-pwa` (Workbox, chế độ tự sinh service worker). Hỗ trợ Vite 6 từ v0.21.1 ([change log](https://vite-pwa-org.netlify.app/guide/change-log)). Lúc cài: chạy `npm view vite-plugin-pwa version`, ghim đúng version (không `^`), kiểm `peerDependencies` có Vite 6.
- Chỉ thêm vào `vite.config.ts` (app). Không đụng `vite.landing.config.ts`.
- Kiểu cập nhật: báo người dùng (prompt), không tự tải lại.
- Tải trước: mọi file build (html, js, css, svg, png, ico, woff2). Chunk lớn nhất hiện ~600kb, dưới giới hạn mặc định của Workbox (2MB), không cần nâng.
- Điều hướng: mọi đường dẫn điều hướng trả `index.html` (để link board sâu mở được khi offline).
- Cache lúc dùng cho font: CSS của `fonts.googleapis.com` (dùng bản cache, cập nhật nền) và file font `fonts.gstatic.com` (ưu tiên cache, giữ lâu, giới hạn số mục). Font được import trong `src/styles/index.css`.
- Dev: tắt service worker ở `npm run dev`. Thử bằng `npm run build` + `npm run preview`.
- Đăng ký: module ảo của plugin cho React, trả trạng thái "cần tải lại". Thêm khai báo kiểu của plugin vào tsconfig.

## Chỗ đặt code

- Đăng ký + trạng thái: `src/lib/pwa/` (dùng chung toàn app, không thuộc tool nào).
- Thanh báo: component trong `src/components/shared/` (dùng token theme, i18n, `FOCUS_RING`, không màu cứng). Gắn 1 lần trong `App.tsx`.
- Chữ: key mới vùng `COMMON` trong `vi.json` + `en.json`.
- Theo luật lint: `src/lib/`, `src/components/` không import `src/tools/`.

## Dữ liệu

- Không đổi IndexedDB `bibo-canvas`.
- Cache Storage: cache tải trước của Workbox + 2 cache font. Workbox có thể tạo IndexedDB `workbox-expiration` cho cache có giới hạn (giống Milanote, mục 1.5 của note). Bình thường, không phải lỗi.

## Tương tác với tool khác

- Canvas không đổi gì. Hàng đợi ghi, khoá giữa tab, BroadcastChannel chạy như cũ (không phụ thuộc mạng).
- Landing demo: không bị ảnh hưởng (build riêng).

## Điều kiện biên

- Lần đầu mở app khi offline (chưa từng có cache): không làm được gì, trình duyệt báo lỗi. Chấp nhận.
- Người dùng xoá dữ liệu trình duyệt: mất cả cache lẫn IndexedDB. Chấp nhận.
- Mở nhiều tab, có bản mới: thanh báo hiện ở mọi tab. Bấm "Tải lại" ở 1 tab thì service worker mới kích hoạt; tab khác vẫn chạy JS cũ tới khi tải lại. Chấp nhận (dữ liệu nằm ở IndexedDB chung, phiên bản database không đổi).
- Bản mới nâng phiên bản IndexedDB: chưa xảy ra trong spec này. Khi `canvas-sync` thêm store outbox thì phải xử `onblocked` (đã ghi ngoài phạm vi).

## Quyết định đã hoãn

- Header 3 trạng thái, gỡ nhãn offline tạm, xử lý ngầm: `canvas-sync`.
- Manifest + icon cài như app.
- Cache ảnh user: khi có object ảnh.
