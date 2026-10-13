# Tasks — bibo-auth

**Trạng thái**: Phase 1-6 xong ở chế độ giả. Phase 7 chờ bạn duyệt (2026-10-13).

> Ghi chú 2026-10-13 (Kiro kiểm máy): code ở `D:\develop\Side\bibo-hub\bibo-auth\` (viết 2026-09-28). Task 1-14 tick nhưng chỉ đúng ở chế độ giả (`.env` đang `BIBO_AUTH_MOCK=true`). Chế độ thật thiếu 3 chỗ, xem `design.md` mục "Lỗ hổng ở chế độ thật". `AGENTS.md` trong `bibo-auth` mục "Handoff notes" đã cũ.

---

## Phase 7: Chạy thật với Supabase (phase 1 tối thiểu, mở khoá `canvas-sync`)

Thứ tự: 15 → 16 → 17 → 18 → 19 → 20. Task 15, 18 bạn làm trên dashboard, Kiro hướng dẫn và kiểm kết quả.

- [ ] Task 15: Dựng 2 project mới + khoá ký (bạn làm)
  - `docs/supabase-setup.md` bước 1-3: tạo project auth MỚI + project dữ liệu MỚI (Singapore), `npx supabase login`, sinh khoá ES256.
  - Cất mật khẩu database + khoá riêng ngoài repo.
  - Verify: bạn báo project ref + URL của 2 project. Kiro kiểm `bibo\` và `bibo-auth\` không chứa khoá riêng.

- [ ] Task 16: Schema project auth mới
  - Kiro viết migration tạo `profiles` + trigger tạo dòng khi có user mới, chạy trước migration OAuth. Sửa header migration OAuth (bỏ project ref cũ).
    - Đã viết 2026-10-13: `20260927000000_profiles.sql` (bảng + `is_admin()` + policy đọc + trigger), `20261013000000_revoke_user_sessions.sql` (cho `/logout`, chỉ service_role gọi). Header OAuth đã sửa, seed `test-client` thêm `demo-app.html`. Chưa chạy trên project nào. Chưa kiểm: quyền xoá `auth.sessions` của owner hàm.
  - Bạn chạy 2 migration (SQL Editor hoặc `npx supabase db push`).
  - Thêm 1 client cho bibo bằng SQL, `redirect_uri` = trang callback dev của bibo.
  - Tạo 1 user test trên dashboard, đặt `role = 'admin'` trong `profiles`.
  - `.env` của `bibo-auth` đổi sang URL + key của project auth mới (bạn tự điền, Kiro không đọc giá trị).
  - Verify: `SELECT` thấy `profiles`, `oauth_clients`, `auth_codes`, RLS bật; user test có dòng `profiles`.

- [ ] Task 17: Sửa 3 lỗ hổng chế độ thật
  - Endpoint server nhận access token sau đăng nhập → kiểm với project auth → đặt cookie `bibo_sso`.
  - Login chế độ thật gọi endpoint đó, rồi chuyển cả trang tới `/authorize` của server.
  - `/token` dùng `token_hash` khi đổi magic link lấy session.
  - Thống nhất cổng API giữa `.env.example` và README.
  - File: `bibo-auth/server/routes/*`, `bibo-auth/server/index.ts`, `bibo-auth/src/routes/Login.tsx`, `.env.example`.
  - Tiến độ 2026-10-13: CODE XONG, chưa tick vì chưa chạy thật (chờ Task 15-16). Đã làm:
    - `server/routes/session.ts` mới (`POST /session`: kiểm token bằng `getUser`, chỉ nhận origin SPA, đặt cookie). `server/index.ts` đăng ký + thêm origin SPA vào CORS.
    - `server/lib/env-urls.ts` mới: tách `APP_BASE_URL` (server, 5180) và `AUTH_UI_URL` (SPA, 5174). Trước đó `/authorize` đẩy về `/login` trên cổng server (lỗi thứ 4, Kiro thấy khi sửa).
    - `Login.tsx`: gọi `/session` rồi chuyển cả trang về `/authorize`; phiên hết thì bỏ phiên local và hiện lại form; bỏ `as any`; nhãn "Email" (username để sau).
    - `token.ts`: `verifyOtp({ token_hash, type: 'magiclink' })`.
    - `logout.ts`: kiểm `post_logout_redirect_uri` theo `client_id` (chống chuyển hướng mở, US-6); thu hồi phiên qua hàm SQL `revoke_user_sessions` vì `auth.admin.signOut` nhận JWT chứ không nhận user id (lỗi thứ 5, trước đó thất bại im lặng).
    - `sso-cookie.ts`: bỏ `Domain=localhost`.
    - Cổng thống nhất 5180 (`.env.example`, README, Login). `test/demo-app.html` gửi `client_id` khi đăng xuất. Sửa 1 lỗi lint cũ ở `mock-handlers.ts`.
    - Đã kiểm ở chế độ giả bằng curl: `/authorize` không cookie → `localhost:5174/login?_auth=...`; có cookie → về app kèm `code`; `/logout` URI lạ → 400, đúng client → về URI đó. Build + lint pass (0 lỗi, 9 cảnh báo cũ).
  - Verify: tắt chế độ giả, `test/demo-app.html` chạy hết authorize → token → làm mới token → đăng xuất; đăng nhập 1 lần, mở authorize lần 2 không hỏi mật khẩu (US-1, 2, 4, 6). Build + lint pass.

- [ ] Task 18: Nhập khoá chung + tắt đăng ký (bạn làm)
  - `docs/supabase-setup.md` bước 4 cho project auth rồi project dữ liệu (mỗi lần đổi khoá chờ ~5 phút). Bước 5 cho project dữ liệu.
  - Verify: đăng nhập lại qua Task 17, header token mới có `kid` của khoá chung; gọi đăng ký ở project dữ liệu bị từ chối.

- [ ] Task 19: Kiểm token chéo (US-11, bước 6)
  - Tạo tạm hàm SQL trả `auth.uid()` ở project dữ liệu, gọi bằng token từ `/token`.
  - Pass: ghi kết quả vào `docs/supabase-setup.md` bước 6, xoá hàm tạm.
  - Fail (401 vì `iss` hoặc lý do khác): dừng, ghi lỗi, cùng bạn chọn dự phòng trước khi viết `canvas-sync`.
  - Verify: trả đúng id user; token hết hạn / sai khoá bị 401.

- [ ] Task 20: Cập nhật tài liệu
  - `bibo-auth/AGENTS.md` (handoff), `bibo-auth/README.md` (cổng, cách chạy thật), `bibo\.kiro\notes\next-session-prompt.md` chỉ sang `canvas-sync`.
  - Verify: tài liệu khớp code, không còn ghi "Task 3+ chưa làm".

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
