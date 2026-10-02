# Yêu cầu — bibo-auth

**Trạng thái**: Nháp  
**Cập nhật cuối**: 2026-09-28

## Mục tiêu

Dựng một auth service độc lập (`bibo-auth`) làm trung tâm xác thực cho toàn bộ hệ sinh thái bibo. Các app (bibo-hub, canvas, và các app tương lai) đều redirect sang đây để đăng nhập — user chỉ cần đăng nhập một lần (SSO). Supabase project auth hiện có (`fghrcpfxgdfibascmase`) làm backend lưu user/session.

## User stories

### US-1: Đăng nhập SSO từ app consumer

Là **user của app consumer (VD canvas)**, tôi muốn **click "Đăng nhập" và được redirect sang bibo-auth** để **đăng nhập một lần rồi quay về app mà không cần login lại ở các app khác**.

**Điều kiện chấp nhận**:
- Cho app đã đăng ký (có `client_id`), khi user chưa có session, thì redirect về `bibo-auth/authorize?client_id=...&redirect_uri=...&state=...&code_challenge=...`.
- Cho `bibo-auth/authorize`, khi user chưa login, thì hiển thị login page.
- Cho `bibo-auth/authorize`, khi user đã có SSO session cookie hợp lệ, thì redirect về `redirect_uri?code=...` mà không hỏi login lại.
- Cho login thành công, khi auth service set SSO session cookie, thì cookie là `httpOnly`, `Secure`, `SameSite=Lax`, expire 7 ngày.

### US-2: Exchange code lấy token

Là **app consumer**, tôi muốn **exchange authorization code lấy access_token** để **gọi API và verify user identity**.

**Điều kiện chấp nhận**:
- Cho `POST /token` với `code` + `code_verifier` (PKCE) hợp lệ, khi code chưa hết hạn (5 phút), thì trả `{ access_token, token_type, expires_in, refresh_token, id_token }`.
- Cho code đã dùng hoặc expired, khi gọi `/token`, thì trả lỗi `invalid_grant`.
- Cho `redirect_uri` không khớp app registry, khi gọi `/token`, thì trả lỗi `invalid_client`.
- `access_token` là Supabase JWT — app consumer dùng trực tiếp với Supabase client.

### US-3: Lấy thông tin user (userinfo)

Là **app consumer**, tôi muốn **gọi GET /userinfo với access_token** để **biết user là ai, role gì, được dùng tool gì**.

**Điều kiện chấp nhận**:
- Cho `GET /userinfo` với bearer token hợp lệ, thì trả `{ sub, username, role, allowed_tools, avatar_url }`.
- Cho token expired hoặc invalid, thì trả `401`.

### US-4: Refresh token

Là **app consumer**, tôi muốn **dùng refresh_token để lấy access_token mới** để **user không bị đăng xuất khi token hết hạn**.

**Điều kiện chấp nhận**:
- Cho `POST /token` với `grant_type=refresh_token` và refresh_token hợp lệ, thì trả token mới.
- Cho refresh_token đã revoke hoặc expired, thì trả `invalid_grant`.

### US-5: Đăng nhập bằng username hoặc email

Là **user**, tôi muốn **đăng nhập bằng username hoặc email** để **không cần nhớ email hệ thống sinh ra**.

**Điều kiện chấp nhận**:
- Cho input có `@`, khi submit, thì dùng trực tiếp làm email.
- Cho input không có `@`, khi submit, thì gọi `lookup-username` Edge Function để resolve thành email.
- Cho login fail, thì hiển thị "Sai thông tin đăng nhập" (generic, không phân biệt sai username hay sai password).

### US-6: Đăng xuất

Là **user**, tôi muốn **đăng xuất** để **clear session trên auth service và tất cả app liên quan**.

**Điều kiện chấp nhận**:
- Cho `GET /logout?post_logout_redirect_uri=...`, khi gọi, thì clear SSO session cookie + Supabase session + redirect về URI đã đăng ký.
- Cho app consumer gọi logout, thì user không còn session ở auth service — mở app khác sẽ bị redirect về login.

### US-7: Xem và cập nhật profile (self-service)

Là **user**, tôi muốn **xem profile và đổi email/avatar** để **cập nhật thông tin cá nhân**.

**Điều kiện chấp nhận**:
- Cho route `/account`, khi đã login, thì hiển thị username, role, allowed_tools, avatar.
- Cho form đổi email, khi submit email mới hợp lệ, thì Supabase gửi confirmation email.
- Cho avatar picker, khi chọn preset, thì update `profiles.avatar_url` và reflect ngay.

### US-8: Admin tạo / xoá user

Là **admin**, tôi muốn **tạo và xoá user qua admin UI** để **quản lý ai có quyền truy cập hệ thống**.

**Điều kiện chấp nhận**:
- Cho route `/admin/users`, khi là admin, thì thấy list user với role, username, last_login_at.
- Cho form tạo user, khi submit username + password + role hợp lệ, thì gọi `create-user` Edge Function.
- Cho nút xoá, khi confirm, thì gọi `delete-user` Edge Function. Không xoá được chính mình.
- Cho non-admin, khi truy cập `/admin`, thì redirect về `/account`.

### US-9: App registry — admin đăng ký app consumer

Là **admin**, tôi muốn **đăng ký app consumer** để **cấp `client_id` và kiểm soát `redirect_uri` whitelist**.

**Điều kiện chấp nhận**:
- Cho form tạo app, khi submit `name` + `redirect_uris[]` hợp lệ, thì tạo record trong `oauth_clients` table với `client_id` sinh tự động.
- Cho app đã tạo, khi admin xem, thì thấy `client_id`, `name`, `redirect_uris`, `created_at`.
- Cho `redirect_uri` không nằm trong whitelist, khi `/authorize` gọi, thì trả error `invalid_redirect_uri`.

### US-10: Verify token (app consumer không dùng OIDC)

Là **app consumer dạng backend/simple**, tôi muốn **gọi POST /verify với token** để **biết token có hợp lệ không và user là ai, không cần implement full OIDC flow**.

**Điều kiện chấp nhận**:
- Cho `POST /verify` với valid bearer token, thì trả `{ valid: true, sub, username, role, allowed_tools }`.
- Cho token expired/invalid, thì trả `{ valid: false }` (không throw 401 để app dễ handle).

## Phân loại

**Phải có (Phase 1)**:
US-1, US-2, US-3, US-4, US-5, US-6, US-7, US-8, US-9, US-10

**Nên có (Phase 2 trở đi)**:
- Forgot password / reset qua email
- Two-factor auth (TOTP)
- Audit log (ai login, khi nào, từ đâu)
- Webhook notify app khi user bị xoá / role thay đổi
- Bulk invite link (expire sau X ngày)
- Suspend / unsuspend tài khoản
- Impersonate user (admin only, có audit)
- Session management UI (list session, revoke)

## Ngoài phạm vi (Phase 1)

- Social login (Google, GitHub)
- Multi-tenant (organization)
- Billing / subscription
- Machine-to-machine token (client_credentials grant)
- Admin role ở cấp per-app (app-level admin khác system admin)
