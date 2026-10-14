> LEGACY (chuyển 2026-10-13). Trạng thái hiện tại: `docs/system/01-core.md`. Spec này chỉ còn là lịch sử thay đổi.

# Thiết kế — bibo-foundation

**Trạng thái**: Đã duyệt

## Stack chốt

| Layer | Chọn | Lý do |
|---|---|---|
| Build | Vite 6 | HMR nhanh, đã proven với donor |
| Ngôn ngữ | TypeScript strict | Bắt lỗi sớm |
| UI | React 18 | Ecosystem, đã quen |
| Style | Tailwind 3 + CSS variables | Token-based từ đầu |
| Component | shadcn/ui (copy vào repo) | Sở hữu code, không blackbox |
| State UI | Zustand | Đơn giản, đã proven |
| State server | TanStack Query v5 | Cache + optimistic |
| Router | React Router v6 | Đơn giản, nested support |
| Lint | ESLint + typescript-eslint | Chuẩn |
| Format | Prettier | Chuẩn |
| Offline | vite-plugin-pwa 2.0.0 (Workbox), chỉ bản build app | Thêm 2026-10-12 (spec `app-offline`). Tự sinh service worker từ danh sách file build, có module đăng ký cho React, hỗ trợ Vite 6. Đỡ phải tự viết + tự giữ danh sách file cache |
| Backend | Supabase (Postgres + Realtime + Storage), project dữ liệu MỚI riêng cho bibo | Thêm 2026-10-13. Lý do + ánh xạ 3 luồng: `.kiro/notes/milanote-sync-architecture.md` mục 2.8, giới hạn gói: 2.11a. Ghi bền vững qua RPC HTTP (`apply_ops`), realtime qua Broadcast / Presence / Postgres Changes. Thư viện `@supabase/supabase-js` CHƯA cài: cài + ghim version ở Task 1 của `canvas-sync` (lần kiểm 2026-10-13: 2.117.3) |
| Auth | Đăng nhập ngay trong app (`app.`), dùng Supabase Auth qua `@supabase/supabase-js`. Không có service SSO riêng | Đổi 2026-10-13 (bạn chốt): sản phẩm chỉ có 2 phần, landing + app canvas, nên không cần SSO. Thay cho hướng `bibo-auth` (service Hono riêng) ghi trước đó cùng ngày. Đăng nhập Google làm sau, gọi Supabase OAuth thẳng từ app. Supabase Auth đặt ở project nào: CHƯA CHỐT |

**Không dùng**: Redux, MobX, styled-components, MUI, Ant Design.

## Cấu trúc repo

```
bibo/
├── AGENTS.md
├── .kiro/
├── docs/
│   ├── architecture.md
│   └── conventions.md
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes/
│   ├── tools/           — mỗi tool 1 folder
│   │   └── {tên}/       — route.tsx, api.ts, components/, lib/, types.ts
│   ├── components/
│   │   ├── ui/          — shadcn primitives
│   │   └── shared/      — LoadingState, EmptyState, ErrorState
│   ├── lib/
│   ├── stores/          — Zustand stores
│   ├── styles/
│   │   └── index.css    — Tailwind + CSS variables
│   └── types/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
├── .eslintrc.cjs
├── .prettierrc.json
└── .gitignore
```

## Token theme (map trong `tailwind.config.ts`)

```
--primary       -> bg-primary, text-primary
--foreground    -> text-foreground
--background    -> bg-background
--card          -> bg-card
--muted / --muted-foreground
--border / --input / --ring
--destructive   -> bg-destructive, text-destructive
--success       -> bg-success, text-success
--warning       -> bg-warning, text-warning
```

Dark/light mode qua attribute `data-theme="dark"` trên `<html>`.

## Luồng khởi động

1. `main.tsx` mount `QueryClientProvider` + `BrowserRouter`.
2. `App.tsx` khai báo route: `/` -> Landing placeholder, wildcard -> 404.
3. Landing render "bibo — foundation ready" + link giữ chỗ tới `/tools/...`.

## Backend + auth (chốt 2026-10-13)

- Thứ tự: `bibo-foundation` (lần này, chỉ ghi stack) → đăng nhập trong app → `canvas-sync` → `canvas-sharing`. Sửa 2026-10-13: bỏ `bibo-auth` (service SSO riêng), đăng nhập nằm trong app canvas.
- Phạm vi lần này: chỉ ghi stack + lý do. Không cài thư viện, không tạo client, không tạo `.env`. Khung project (client, biến môi trường) làm ở Task 1 của `canvas-sync`.
- Project dữ liệu: tạo MỚI, không dùng lại 2 project của donor. Bạn dùng nhiều project Supabase để tăng dung lượng. Chốt: board ở 1 project chính, chỉ file chia nhiều project, chuẩn bị sẵn để sau gán mỗi người vào 1 project (`docs/supabase-setup.md` mục "Chia nhiều project").
- Chống project Free bị tạm dừng: job định kỳ gọi `SELECT` thật tới từng project ĐỂ SAU, không chặn `bibo-auth` / `canvas-sync` (chi tiết `docs/supabase-setup.md`).
- Hướng dẫn dựng project: `docs/supabase-setup.md`.

## Quyết định đã hoãn

- Deploy target: chờ có gì để deploy.
