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

## Quyết định đã hoãn

- Backend (Supabase / self-hosted / khác): chờ tool đầu tiên cần persist.
- Auth: chờ tool đầu tiên cần.
- Deploy target: chờ có gì để deploy.
