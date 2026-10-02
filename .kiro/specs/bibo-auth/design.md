# Thiết kế — bibo-auth

**Trạng thái**: Nháp

---

## Tổng quan kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        bibo-auth service                        │
│                                                                 │
│  React SPA (Vite)          API Layer (Hono / Edge Functions)    │
│  ┌──────────────────┐      ┌──────────────────────────────────┐ │
│  │ /login           │      │ GET  /authorize                  │ │
│  │ /account         │      │ POST /token                      │ │
│  │ /admin/users     │      │ GET  /userinfo                   │ │
│  │ /admin/apps      │      │ POST /verify                     │ │
│  └──────────────────┘      │ GET  /logout                     │ │
│                            │ GET  /.well-known/openid-config  │ │
│                            └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  Supabase Auth project          oauth_clients table
  (user, session, profile)       (bibo-auth Supabase hoặc
                                  bibo-hub Supabase — xem note)
```

**Note về database**: `oauth_clients` và `auth_codes` table cần lưu đâu đó. Hai lựa chọn:
- Dùng chung Supabase auth project hiện có (`fghrcpfxgdfibascmase`) — đơn giản nhất.
- Tạo Supabase project thứ 3 riêng cho bibo-auth — isolation tốt hơn, tốn thêm free tier.

**Phase 1 chọn**: dùng chung Supabase auth project hiện có (thêm bảng mới vào). Tách project là quyết định hoãn.

---

## Màn hình

### 1. Login page (`/login` hoặc `/authorize` khi chưa có session)

Hiển thị khi user chưa login và có request `/authorize` từ app consumer (hoặc truy cập trực tiếp).

- Input: email hoặc username
- Input: password
- Button: Đăng nhập
- Nếu có `?app_name=` query param (truyền từ authorize): hiển thị "Đăng nhập để truy cập **{app_name}**"
- Error inline (không dùng toast — login page không mount toast provider)
- Sau login thành công: nếu có pending authorize request → redirect tiếp. Nếu không → về `/account`.

Copy từ bibo-hub: `src/routes/Login.tsx` — chỉnh lại phần redirect logic.

### 2. Account page (`/account`)

User xem và sửa profile cá nhân. Yêu cầu đã login (AuthGuard).

Tab structure:
- **Profile**: username (read-only), role (read-only), allowed_tools (read-only), email (editable), avatar picker
- **Sessions**: list session đang active, nút revoke từng session (Phase 2)
- **Apps**: list app đã authorize, nút revoke từng app (Phase 2)

Phase 1 chỉ cần tab Profile.

Copy từ bibo-hub: `src/routes/Account.tsx` + `src/components/setting/ProfileTab.tsx` + `src/api/avatars.ts`.

### 3. Admin — User Management (`/admin/users`)

Admin quản lý user. Non-admin redirect về `/account`.

- Header: tiêu đề + nút "Tạo user"
- Table: role, username, last_login_at, created_at, action (Edit permissions | Xoá)
- Dialog tạo user: username, password, role, allowed_tools
- Dialog edit permissions: role, allowed_tools

Copy từ bibo-hub: `src/components/setting/UserManagementTab.tsx` + `CreateUserDialog` + `EditPermissionDialog`.

### 4. Admin — App Registry (`/admin/apps`)

Admin quản lý app consumer đã đăng ký.

- List: tên app, client_id, redirect_uris, created_at
- Form tạo app: name, redirect_uris (textarea, mỗi dòng 1 URI)
- Nút copy `client_id`
- Nút xoá app

### 5. Admin layout (`/admin/*`)

Sidebar đơn giản:
- Users
- Apps

Header: "bibo-auth Admin" + link về `/account`.

---

## API Endpoints

### `GET /authorize`

Bắt đầu OAuth2 Authorization Code + PKCE flow.

Query params:
- `response_type=code` (bắt buộc)
- `client_id` (bắt buộc)
- `redirect_uri` (bắt buộc, phải có trong whitelist)
- `state` (bắt buộc, app tự sinh để chống CSRF)
- `code_challenge` (bắt buộc, PKCE)
- `code_challenge_method=S256` (bắt buộc)
- `scope=openid profile` (optional, default `openid profile`)

Logic:
1. Validate `client_id` + `redirect_uri` vs `oauth_clients` table.
2. Nếu SSO session cookie hợp lệ → sinh `auth_code`, redirect về `redirect_uri?code=...&state=...`.
3. Nếu chưa có session → redirect về `/login?authorize_params=...` (encode params để sau login redirect tiếp).

### `POST /token`

Exchange code hoặc refresh token.

Body (form-urlencoded):
- `grant_type`: `authorization_code` hoặc `refresh_token`
- Nếu `authorization_code`: `code`, `redirect_uri`, `client_id`, `code_verifier`
- Nếu `refresh_token`: `refresh_token`, `client_id`

Response:
```json
{
  "access_token": "<supabase_jwt>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "<supabase_refresh_token>",
  "id_token": "<jwt_with_profile>"
}
```

`access_token` = Supabase JWT → app consumer dùng thẳng với `supabase.auth.setSession()` hoặc gọi Supabase API.

### `GET /userinfo`

Trả profile user. Header: `Authorization: Bearer <access_token>`.

Response:
```json
{
  "sub": "<user_id>",
  "username": "baobibo",
  "role": "admin",
  "allowed_tools": ["canvas", "notes"],
  "avatar_url": "avatars/preset-1.png"
}
```

### `POST /verify`

Verify token, không cần implement full OIDC. Dùng cho app đơn giản.

Body: `{ "token": "<access_token>" }`

Response:
```json
{ "valid": true, "sub": "...", "username": "...", "role": "...", "allowed_tools": [...] }
```
hoặc `{ "valid": false }`.

### `GET /logout`

Query: `post_logout_redirect_uri` (optional, phải có trong whitelist của client).

Logic: clear SSO session cookie + revoke Supabase session + redirect.

### `GET /.well-known/openid-configuration`

OIDC discovery document — cho app consumer biết endpoint nào làm gì.

```json
{
  "issuer": "https://auth.bibo.app",
  "authorization_endpoint": "https://auth.bibo.app/authorize",
  "token_endpoint": "https://auth.bibo.app/token",
  "userinfo_endpoint": "https://auth.bibo.app/userinfo",
  "jwks_uri": "https://auth.bibo.app/.well-known/jwks.json"
}
```

---

## Database schema (thêm vào Supabase auth project)

### `oauth_clients`

```sql
id          uuid primary key default gen_random_uuid()
name        text not null
client_id   text not null unique  -- sinh random, VD "ca_abc123"
redirect_uris  text[] not null    -- whitelist URI
created_at  timestamptz default now()
```

RLS: chỉ admin đọc/ghi.

### `auth_codes`

```sql
id              uuid primary key default gen_random_uuid()
code            text not null unique   -- random 32 bytes, URL-safe base64
client_id       text not null
user_id         uuid not null references auth.users
redirect_uri    text not null
code_challenge  text not null          -- S256 hash của code_verifier
expires_at      timestamptz not null   -- now() + 5 minutes
used_at         timestamptz            -- null = chưa dùng
created_at      timestamptz default now()
```

Cleanup: cron job xoá record expired sau 1 ngày (Supabase pg_cron hoặc edge function trigger).

---

## SSO Session

- Cookie name: `bibo_sso`
- Giá trị: signed JWT nhỏ chứa `{ sub: user_id, iat, exp }` — sign bằng `SSO_SECRET` env var
- `httpOnly: true`, `Secure: true` (production), `SameSite: Lax`
- Expire: 7 ngày
- Lưu: không cần table — stateless (verify bằng signature). Logout = set cookie expire ngay lập tức.

Khi user login thành công qua Supabase → tạo SSO cookie → Supabase session lưu riêng trong localStorage của bibo-auth app.

---

## Luồng SSO đầy đủ

```
[App canvas]
  1. User click "Đăng nhập"
  2. Canvas redirect: GET bibo-auth/authorize?client_id=ca_xxx&redirect_uri=http://canvas/callback&state=random&code_challenge=S256hash&code_challenge_method=S256

[bibo-auth /authorize]
  3. Validate client_id + redirect_uri
  4. Check cookie "bibo_sso"
     - Có → verify signature → sinh auth_code → redirect về canvas/callback?code=xyz&state=random
     - Không → redirect về /login?_auth=<encoded_authorize_params>

[bibo-auth /login]
  5. User nhập username/password
  6. Supabase signInWithPassword → session
  7. Set cookie "bibo_sso"
  8. Redirect về /authorize?... (lấy từ _auth param)
  9. /authorize sinh auth_code → redirect về canvas/callback?code=xyz&state=random

[App canvas /callback]
  10. Verify state param (chống CSRF)
  11. POST bibo-auth/token { code, redirect_uri, client_id, code_verifier }
  12. bibo-auth verify PKCE: sha256(code_verifier) === code_challenge
  13. Trả { access_token (Supabase JWT), refresh_token, id_token }
  14. Canvas lưu token, gọi Supabase với token đó
```

---

## Cấu trúc project

```
bibo-auth/                        ← folder riêng, ngoài bibo/
├── src/
│   ├── api/                      ← OIDC endpoints (Hono hoặc Express)
│   │   ├── authorize.ts
│   │   ├── token.ts
│   │   ├── userinfo.ts
│   │   ├── verify.ts
│   │   ├── logout.ts
│   │   └── well-known.ts
│   ├── lib/
│   │   ├── authClient.ts         ← copy từ bibo-hub
│   │   ├── sso-cookie.ts         ← sign/verify SSO cookie
│   │   ├── pkce.ts               ← verify code_challenge
│   │   └── oauth-clients.ts     ← CRUD oauth_clients table
│   ├── stores/
│   │   └── authStore.ts          ← copy từ bibo-hub
│   ├── components/
│   │   └── shared/               ← copy từ bibo-hub
│   ├── routes/
│   │   ├── Login.tsx             ← copy + adapt từ bibo-hub
│   │   ├── Account.tsx           ← copy + adapt từ bibo-hub
│   │   └── admin/
│   │       ├── Users.tsx         ← copy từ bibo-hub UserManagementTab
│   │       └── Apps.tsx          ← mới
│   ├── App.tsx
│   └── main.tsx
├── server/                       ← API server (Node hoặc deploy as Edge Functions)
│   └── index.ts
├── supabase/
│   └── migrations/
│       └── 20260928000000_oauth_tables.sql
├── package.json
├── vite.config.ts
└── .env.example
```

**API server chọn**: Hono (lightweight, chạy được cả Node và Edge). Dùng `hono/cookie` để handle SSO cookie.

---

## Điều kiện biên

- `redirect_uri` không trong whitelist → trang lỗi (không redirect — chống open redirect attack).
- `code` đã dùng (replay attack) → `invalid_grant`, mark code là `used_at`.
- `code` expired (> 5 phút) → `invalid_grant`.
- PKCE fail (`sha256(verifier) !== challenge`) → `invalid_grant`.
- SSO cookie expire → user thấy login page lại (seamless nếu cookie còn hợp lệ).
- Non-admin truy cập `/admin/*` → redirect về `/account`.

## Quyết định đã hoãn

- Tạo Supabase project riêng cho bibo-auth hay dùng chung project auth của bibo-hub.
- `id_token` format đầy đủ (hiện tại đơn giản, sau có thể chuẩn OIDC `iss/aud/nonce`).
- Rate limiting endpoint `/authorize` và `/token`.
- Deploy target: Vercel Edge / Cloudflare Workers / VPS Node.
- JWKS endpoint (`/well-known/jwks.json`) — cần khi app consumer muốn verify id_token offline.
