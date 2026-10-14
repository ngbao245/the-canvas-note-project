> LEGACY (chuyển 2026-10-13). Trạng thái hiện tại: `docs/system/01-core.md`. Spec này chỉ còn là lịch sử thay đổi.

# Task — Mở app khi offline

**Trạng thái**: Xong (2026-10-12, bạn test tay pass). Đã duyệt 2026-10-12 ( 3 câu đã chốt: 1A thanh báo bản mới, 2B nhãn offline tạm, 3A cài như app để sau). Task 1 kèm bỏ `include` trỏ sang donor trong `tsconfig.app.json` (bạn chốt 2026-10-12).

## Phase 1: Service worker + bản mới

- [x] Task 1: Sửa `bibo-foundation` + cài + cấu hình plugin (xong 2026-10-12: `vite-plugin-pwa` 2.0.0 ghim cứng, peer có Vite 6; build sinh `dist/sw.js` 18 mục tải trước gồm `index.html`; landing không có `sw.js`)
  - File: `.kiro/specs/bibo-foundation/design.md` (thêm dòng "Offline | vite-plugin-pwa (Workbox)" vào bảng Stack chốt + lý do), `package.json` (ghim version), `vite.config.ts`, `tsconfig.app.json` (kiểu của plugin), `.kiro/steering/core.md` mục Stack đã chốt (thêm 1 dòng).
  - Verify: `npm run build` sinh `dist/sw.js` + danh sách tải trước có `index.html`, JS, CSS; `npm run dev` không sinh service worker; build landing không có `sw.js`.

- [x] Task 2: Đăng ký service worker + thanh báo bản mới + nhãn "Đang offline" tạm (US-4) (xong 2026-10-12: `src/lib/pwa/index.ts`, `UpdateBanner.tsx`, `OfflineBadge.tsx`; Kiro thử MCP pass G1, G2, G5, G6, G8, font vào cache)
  - File: `src/lib/pwa/` (mới), `src/components/shared/` (thanh báo, mới), `src/App.tsx`, `src/lib/i18n/locales/vi.json` + `en.json`.
  - Verify: `npm run build` + `npm run preview` → DevTools Application → Service workers thấy đang chạy; build lại bản khác + tải lại trang → thanh báo hiện; bấm "Tải lại" → bản mới chạy.

- [x] Task 3: Test offline + cập nhật tài liệu (xong 2026-10-12, bạn test tay pass)
  - File: `docs/architecture.md` (mục service worker), `.kiro/notes/milanote-sync-architecture.md` (mục 2.2 dòng offline, 2.10 bước 6, 2.11: ghi đã làm), `.kiro/notes/canvas-session-handoff.md` (mục "Việc còn mở"), `AGENTS.md` + `core.md` (trạng thái).
  - Verify: test tay G1-G8 dưới đây pass.

### Test tay (bạn chạy, trên `npm run build` + `npm run preview`)

Lưu ý: lần mở đầu service worker chỉ cài, chưa điều khiển trang. Online phải tải lại 1 lần nữa (F5) trước khi thử offline. Font chỉ vào cache khi trang có note chứa chữ.

- G1. Mở `/canvas` khi online 1 lần. DevTools → Network → Offline → F5 → app mở, thấy đúng board.
- G2. Vẫn offline: mở tab mới dán link 1 board con (`/canvas/{id}/{slug}`) → mở đúng board đó.
- G3. Vẫn offline: tạo / sửa / kéo note, F5 → còn nguyên.
- G4. Vẫn offline: font tiêu đề (Fraunces) hiển thị giống lúc online.
- G5. Build bản khác (đổi 1 chữ bất kỳ), chạy lại preview, mở tab app cũ → thanh báo "Có bản mới". Không bấm → app vẫn chạy, không tự tải lại.
- G6. Bấm "Tải lại" → thấy chữ vừa đổi, dữ liệu board còn.
- G7. Thanh báo: Tab tới nút, Enter bấm được; giao diện sáng / tối đều đọc rõ.
- G9. Bật Offline trong DevTools → nhãn "Đang offline" hiện; tắt Offline → nhãn biến mất.
- G8. `npm run dev` → DevTools → Application → Service workers trống (nếu còn service worker từ preview cùng cổng thì Unregister trước khi thử).

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
