# Kiến trúc — bibo

Bản mô tả nhanh cấu trúc code. Cập nhật khi thêm folder mới trong `src/`.

## Stack

- Vite 6 + TypeScript strict (mode `noEmit`, build qua `tsc -b && vite build`)
- React 18 + React Router v6
- Tailwind 3 + shadcn/ui (copy vào `src/components/ui/`, không dùng như package)
- Zustand (state UI) + TanStack Query v5 (state server)

## Cấu trúc folder

```
bibo/
├── AGENTS.md               — chỉ dẫn cho AI agent (Kiro)
├── .kiro/                  — steering + spec + settings cho Kiro
├── docs/                   — tài liệu
├── public/                 — static asset
├── src/
│   ├── main.tsx            — entry: mount QueryClientProvider + App
│   ├── App.tsx             — BrowserRouter + Routes
│   ├── routes/             — page component cấp cao (Landing, ...)
│   ├── tools/              — mỗi tool 1 folder
│   │   └── {tên-tool}/
│   │       ├── route.tsx   — component page của tool
│   │       ├── api.ts      — fetch/mutation
│   │       ├── types.ts    — type domain của tool
│   │       ├── components/
│   │       └── lib/
│   ├── components/
│   │   ├── ui/             — shadcn primitives (button, input, card, ...)
│   │   └── shared/         — LoadingState, EmptyState, ErrorState
│   ├── lib/                — util dùng chung (utils.ts, ...)
│   ├── stores/             — Zustand stores
│   ├── styles/
│   │   └── index.css       — Tailwind + CSS variables theme
│   └── types/              — type global
├── index.html
├── package.json
├── tsconfig.json           — root, reference app + node
├── tsconfig.app.json       — cho src/
├── tsconfig.node.json      — cho vite.config.ts
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js        — ESLint 9 flat config
└── .prettierrc.json
```

## Convention tool mới

Tool mới đặt trong `src/tools/{tên-tool}/`:

- `route.tsx` — component page export default. Import lazy trong `App.tsx` để code-split.
- `api.ts` — hook TanStack Query hoặc fetch client.
- `types.ts` — type domain của tool.
- `components/` — component riêng của tool.
- `lib/` — util riêng của tool.

Import từ ngoài vào tool phải qua barrel `index.ts` (nếu có) hoặc file cụ thể.

## Theme và token

CSS variables trong `src/styles/index.css`. Có 2 mode qua `[data-theme="dark"]` trên `<html>`.

Token: `background`, `foreground`, `primary`, `card`, `muted`, `border`, `input`, `ring`, `destructive`, `success`, `warning` (mỗi cái có `-foreground` cặp).

Map vào Tailwind qua `tailwind.config.ts` với format `hsl(var(--x) / <alpha-value>)` để hỗ trợ opacity modifier (`bg-primary/50`).

## Luồng khởi động

1. `index.html` load `/src/main.tsx`.
2. `main.tsx` mount:
   - `QueryClient` (TanStack Query)
   - `QueryClientProvider`
   - `<App />` bên trong
3. `App.tsx` mount `BrowserRouter` với `Routes`:
   - `/` → `Landing`
   - `*` → `Landing` (tạm, sẽ đổi thành 404 sau)
4. Router match và render component tương ứng.

## Alias

`@/` trỏ `src/`. Cấu hình ở 2 chỗ:

- `vite.config.ts` — cho runtime bundler
- `tsconfig.app.json` (paths) — cho TS type check

## Tài liệu theo tool/domain

Doc canonical cho từng tool/domain. Đọc trước khi sửa tool tương ứng.

| Domain | Spec | Doc |
|---|---|---|
| Canvas | `.kiro/specs/canvas/` | `docs/canvas.md` |
| Design system | `.kiro/specs/design-system/` | `.kiro/notes/design-system.md` |
