# Tasks — bibo-auth

**Trạng thái**: Chờ duyệt

---

## Phase 1: Project scaffold + Supabase setup

- [x] Task 1: Khởi tạo project bibo-auth
  - Tạo folder `bibo-auth/` ngoài `bibo/` (cùng level với `bibo-hub/`)
  - Vite 6 + TypeScript strict + React 18 + Tailwind 3 + shadcn/ui
  - Hono làm API server (serve cùng port hoặc port riêng)
  - Copy `authClient.ts`, `authStore.ts`, `shared/` components, shadcn components cần từ bibo-hub
  - File: `bibo-auth/package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `src/main.tsx`, `src/App.tsx`
  - Verify: `npm run build` pass, `npm run dev` mở được localhost

- [x] Task 2: Migration — tạo bảng OAuth
  - Tạo migration SQL cho Supabase auth project: `oauth_clients` + `auth_codes`
  - RLS: `oauth_clients` chỉ admin đọc/ghi, `auth_codes` chỉ service role
  - File: `bibo-auth/supabase/migrations/20260928000000_oauth_tables.sql`
  - Verify: chạy migration trên Supabase project, 2 table tạo được, RLS đúng

---

## Phase 2: Core auth + SSO cookie

- [x] Task 3: SSO cookie lib
  - `src/lib/sso-cookie.ts`: sign + verify JWT nhỏ (`{ sub, iat, exp }`) bằng `SSO_SECRET`
  - Dùng `jose` library (lightweight, Edge compatible)
  - Export: `createSsoCookie(userId)` → cookie string, `verifySsoCookie(cookieStr)` → userId | null
  - File: `bibo-auth/src/lib/sso-cookie.ts`
  - Verify: getDiagnostics clean, unit test manual: sign → verify → đúng userId

- [x] Task 4: PKCE lib
  - `src/lib/pkce.ts`: verify `code_challenge` vs `code_verifier`
  - `verifyPkce(verifier, challenge)` → boolean. Algorithm: `base64url(sha256(verifier)) === challenge`
  - File: `bibo-auth/src/lib/pkce.ts`
  - Verify: getDiagnostics clean

- [x] Task 5: OAuth clients lib (CRUD oauth_clients table)
  - `src/lib/oauth-clients.ts`: `getClient(clientId)`, `listClients()`, `createClient(name, redirectUris)`, `deleteClient(id)`
  - `validateRedirectUri(clientId, uri)` → boolean
  - File: `bibo-auth/src/lib/oauth-clients.ts`
  - Verify: getDiagnostics clean

---

## Phase 3: OIDC API endpoints (Hono server)

- [x] Task 6: Hono server setup + GET /authorize
  - Setup Hono app tại `server/index.ts`
  - `GET /authorize`: validate params → check SSO cookie → sinh auth_code hoặc redirect login
  - File: `bibo-auth/server/index.ts`, `bibo-auth/server/routes/authorize.ts`
  - Verify: curl test — không có cookie → redirect `/login`, có cookie hợp lệ → redirect với code

- [x] Task 7: POST /token
  - `grant_type=authorization_code`: verify code + PKCE → exchange Supabase session → trả tokens
  - `grant_type=refresh_token`: dùng Supabase `refreshSession()` → trả tokens mới
  - File: `bibo-auth/server/routes/token.ts`
  - Verify: curl test full flow (authorize → get code → POST /token → nhận access_token)

- [x] Task 8: GET /userinfo + POST /verify + GET /logout
  - `/userinfo`: verify bearer token qua Supabase → trả profile
  - `/verify`: same nhưng trả `{ valid: bool, ...profile }`
  - `/logout`: clear SSO cookie + revoke Supabase session + redirect
  - File: `bibo-auth/server/routes/userinfo.ts`, `verify.ts`, `logout.ts`
  - Verify: getDiagnostics clean, curl /userinfo với valid token → trả đúng profile

- [x] Task 9: GET /.well-known/openid-configuration
  - Static JSON response với đúng URLs
  - File: `bibo-auth/server/routes/well-known.ts`
  - Verify: GET request trả JSON đúng format

---

## Phase 4: React UI — Login + Account

- [x] Task 10: Login page
  - Copy + adapt `Login.tsx` từ bibo-hub
  - Thêm logic: nếu có `_auth` query param (encoded authorize params) → sau login redirect tiếp về `/authorize?...`
  - Nếu không có `_auth` → redirect về `/account`
  - File: `bibo-auth/src/routes/Login.tsx`
  - Verify: npm run build pass, mở `/login` → form hiện đúng, login → redirect về /account

- [x] Task 11: Account page — tab Profile
  - Copy + adapt `Account.tsx` + `ProfileTab.tsx` + `AvatarPicker` từ bibo-hub
  - Route `/account` (AuthGuard — chưa login redirect về `/login`)
  - Chỉ tab Profile (phase 1)
  - File: `bibo-auth/src/routes/Account.tsx`, `bibo-auth/src/components/ProfileTab.tsx`
  - Verify: npm run build pass, đăng nhập → `/account` hiện đúng username/role/avatar

---

## Phase 5: React UI — Admin

- [x] Task 12: Admin layout + User Management
  - Copy + adapt `UserManagementTab` + `CreateUserDialog` + `EditPermissionDialog` từ bibo-hub
  - Route `/admin/users` (guard: chỉ admin, non-admin redirect `/account`)
  - Sidebar đơn giản: Users | Apps
  - File: `bibo-auth/src/routes/admin/Users.tsx`, `bibo-auth/src/components/admin/AdminLayout.tsx`
  - Verify: npm run build pass, admin login → `/admin/users` hiện list, tạo user được

- [x] Task 13: Admin App Registry
  - `/admin/apps`: list oauth_clients, form tạo app (name + redirect_uris), nút xoá, copy client_id
  - Dùng `oauth-clients.ts` lib đã có
  - File: `bibo-auth/src/routes/admin/Apps.tsx`
  - Verify: tạo app → client_id sinh ra → hiện trong list

---

## Phase 6: Integration test + .env + README

- [x] Task 14: End-to-end flow test + README
  - `.env.example` với tất cả required env vars
  - `README.md`: hướng dẫn setup, run, deploy, cách app consumer tích hợp (với code snippet)
  - Manual test: canvas (hoặc simple HTML page) làm consumer → full SSO flow authorize → token → userinfo
  - File: `bibo-auth/.env.example`, `bibo-auth/README.md`
  - Verify: full flow chạy được local, README đủ để người khác setup

---

## Định nghĩa "xong" (paste khi báo task hoàn thành)

```
[ ] npm run build pass
[ ] npm run lint pass
[ ] Không có console.log mới
[ ] tasks.md task này đã [x]
[ ] Nếu đổi behavior/AC: spec liên quan đã update
[ ] Source copy từ bibo-hub đã note file nguồn
```

---

## Env vars cần có

```
VITE_SUPABASE_AUTH_URL=
VITE_SUPABASE_AUTH_ANON_KEY=
SSO_SECRET=                    # random 32+ char, sign SSO cookie
SSO_COOKIE_DOMAIN=             # VD .bibo.app hoặc localhost
APP_BASE_URL=                  # VD https://auth.bibo.app
```
