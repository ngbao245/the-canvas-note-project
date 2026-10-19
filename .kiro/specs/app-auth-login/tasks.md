# Task — Login modal (UI shell)

**Trạng thái**: Chờ duyệt

## Phase 1: Nền tảng (store + chữ dịch)

- [ ] Task 1: Store mở/đóng modal + cờ đăng nhập giả
  - File: `src/stores/auth-modal-store.ts` (mở/đóng), `src/stores/auth-store.ts` (cờ đã đăng nhập giả)
  - Nội dung: Zustand store cho trạng thái mở modal (open/close/isOpen) và store cờ "đã đăng nhập (giả)". Quyết persist localStorage hay không ở đây (ghi comment lý do).
  - Verify: getDiagnostics sạch, import thử trong một component tạm không lỗi type.

- [ ] Task 2: Chữ dịch vùng ACCOUNT cho modal
  - File: `src/lib/i18n/locales/vi.json`, `src/lib/i18n/locales/en.json`
  - Nội dung: thêm key dưới `ACCOUNT.LOGIN.*` cho tiêu đề, mô tả, nhãn email/mật khẩu, placeholder, chữ nút đăng nhập, nút Google, "hoặc", nút hiện/ẩn mật khẩu, lỗi kiểm tra tại chỗ (email trống/sai dạng, mật khẩu trống), lỗi mẫu nhánh thất bại, nhãn nút gạt dev.
  - Verify: getDiagnostics sạch (en đủ key, không lỗi tại `messages.ts`).

## Phase 2: Modal UI + luồng giả lập

- [ ] Task 3: Component modal đăng nhập (layout + ô nhập + nút)
  - File: `src/components/account/LoginModal.tsx` (và icon Google nếu cần `src/components/account/GoogleIcon.tsx`)
  - Nội dung: dựng layout theo design (tiêu đề, nút Google, gạch ngăn "hoặc", ô email, ô mật khẩu có nút hiện/ẩn, nút đăng nhập, vùng lỗi chung, nút đóng). Dùng token theme, lucide, bộ dịch, modal layer sẵn có (Esc + bẫy tiêu điểm). Chưa có logic submit, chỉ UI tĩnh + đóng/mở qua store.
  - Verify: mount tạm, mở modal thấy đủ thành phần, Esc/nền mờ/nút X đóng được, đổi VI/EN chữ đổi theo.

- [ ] Task 4: Kiểm tra tại chỗ + luồng submit giả lập + nút gạt dev
  - File: `src/components/account/LoginModal.tsx` (bổ sung logic), có thể tách `src/lib/account/validate-login.ts` cho hàm kiểm email/mật khẩu
  - Nội dung: kiểm tra tại chỗ (email dạng, ô trống) báo lỗi dưới ô; submit (email/mật khẩu + Google) → khoá form, loading ~1s → theo nhánh (thành công: set cờ store + đóng; thất bại: hiện lỗi chung + mở khoá). Nút gạt chọn nhánh chỉ hiện ở dev, bản build mặc định thành công.
  - Verify: build pass; test tay nhánh thành công, nhánh thất bại, lỗi kiểm tra tại chỗ, loading khoá form.

## Phase 3: Gắn vào app + route dev

- [ ] Task 5: Mount modal ở App + route dev trống
  - File: `src/App.tsx` (mount `<LoginModal />` cạnh các modal khác + thêm route dev), `src/routes/LoginDev.tsx` (nền trống + mở modal sẵn + nút mở lại)
  - Nội dung: thêm route dev (ví dụ `/login`) lazy load trang nền trống mở modal sẵn; mount modal toàn app qua store. Route dev chỉ để test, không ảnh hưởng điều hướng canvas mặc định.
  - Verify: build pass + lint pass; vào route dev thấy modal trên nền trống, đóng rồi mở lại được; vào `/canvas` vẫn như cũ, không thấy modal.

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass (cuối phase)
[ ] npm run lint pass (cuối phase)
[ ] Không có console.log mới
[ ] Chữ UI qua bộ dịch (vi + en đủ key)
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior: doc/spec liên quan đã update
```
