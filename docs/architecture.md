# Kiến trúc — bibo

Bản mô tả nhanh cấu trúc code. Cập nhật khi thêm folder mới trong `src/`.

## Stack

- Vite 6 + TypeScript strict (mode `noEmit`, build qua `tsc -b && vite build`)
- React 18 + React Router v6
- Tailwind 3 + shadcn/ui (copy vào `src/components/ui/`, không dùng như package)
- Zustand (state UI) + TanStack Query v5 (state server)
- `vite-plugin-pwa` 2.0.0 (Workbox): service worker cho bản build app, xem mục "Mở app khi offline"

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
│   ├── routes/             — page component cấp cao
│   │   └── landing/        — landing `/` (spec canvas-landing-demo)
│   │       ├── main.tsx    — entry bản build landing (không nằm trong App.tsx)
│   │       ├── LandingPage.tsx, DemoFrame.tsx (khung thử nghỉ / bật / nhả)
│   │       ├── demo/       — canvas mini độc lập, tải lazy. Cấm import src/tools/canvas/
│   │       └── sketch/     — phần ký họa: sketch.css (màu cứng, ngoại lệ) + section
│   ├── tools/              — mỗi tool 1 folder
│   │   └── {tên-tool}/
│   │       ├── route.tsx   — component page của tool
│   │       ├── api.ts      — fetch/mutation
│   │       ├── types.ts    — type domain của tool
│   │       ├── components/
│   │       └── lib/
│   ├── components/
│   │   ├── ui/             — shadcn primitives (button, input, card, ...)
│   │   └── shared/         — LoadingState, EmptyState, ErrorState, UpdateBanner, OfflineBadge (tạm)
│   ├── lib/                — util dùng chung (utils.ts, ...)
│   │   └── pwa/            — đăng ký service worker + trạng thái "có bản mới"
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
   - `/` và `*` → chuyển sang `/canvas`
   - `/canvas`, `/canvas/:boardId` → canvas thật (lazy)

## 2 bản build (landing và app ở 2 domain)

| | App (`app.` domain) | Landing (domain gốc) |
|---|---|---|
| Entry | `index.html` → `src/main.tsx` → `App.tsx` | `landing.html` → `src/routes/landing/main.tsx` |
| Config | `vite.config.ts` | `vite.landing.config.ts` |
| Dev | `npm run dev` (cổng 3000) | `npm run dev:landing` (cổng 3001) |
| Build | `npm run build` → `dist/` | `npm run build:landing` → `dist-landing/` |

- Hai domain là 2 origin: IndexedDB, localStorage, kênh giữa tab tách hẳn. Landing không thể đọc / ghi dữ liệu canvas.
- Link từ landing sang app đọc `VITE_APP_URL` lúc build landing (vd `https://app.canvasnote.xxx`). Thiếu thì trỏ `http://localhost:3000`.
- Landing luôn theme sáng, ngôn ngữ đọc theo trình duyệt (không dùng chung lựa chọn với app vì khác origin).
- Code chung (`lib/i18n`, `lib/shortcuts`, `components/shared`, token CSS) dùng chung trong 1 repo, mỗi bản build tự lấy phần cần.
- Ranh giới do ESLint giữ (`eslint.config.js`), để sau này tách monorepo dễ:
  - `src/routes/landing/` không import `src/tools/` (error).
  - `src/lib/`, `src/components/` không import ngược `src/tools/` (error). Tool cần hiện ở phần chung (bảng phím tắt, số liệu Cài đặt) thì đăng ký vào sổ ở `src/lib/` (`registerShortcutDefs`, `registerDataCounter`) trong `src/register-tools.ts` — file duy nhất nối tool với phần chung, `App.tsx` import đầu tiên.
4. Router match và render component tương ứng.

## Mở app khi offline (service worker, spec `app-offline`)

- Chỉ bản build app có service worker (`VitePWA` trong `vite.config.ts`). Dev (`npm run dev`) và landing không có.
- Build sinh `dist/sw.js`: tải trước mọi file build (html, js, css, svg, png, ico, woff2). Mọi đường dẫn mở trang trả `index.html` từ cache → link board sâu mở được khi offline.
- Font Google: cache lúc dùng (`google-fonts-css` cập nhật nền, `google-fonts-files` ưu tiên cache, giữ 1 năm, tối đa 30 file). Font chỉ vào cache khi trang thật sự dùng tới (VD có note chứa chữ).
- Dữ liệu board vẫn ở IndexedDB `bibo-canvas`, service worker không đụng. Cache Storage chỉ chứa file app.
- Lần mở đầu tiên service worker cài xong nhưng chưa điều khiển trang; từ lần tải lại sau mới phục vụ từ cache.
- Bản mới: `src/lib/pwa/index.ts` đăng ký (`registerType: 'prompt'`), tab hỏi bản mới khi quay lại tab và mỗi 1 giờ. Có bản mới → `UpdateBanner` hiện "Có bản mới" + "Tải lại" + "Để sau". Không tự tải lại.
- `OfflineBadge` là nhãn TẠM "Đang offline" theo sự kiện `online` / `offline`. Gỡ khi `canvas-sync` xử lý ngầm: xoá file + dòng export trong `components/shared/index.ts` + 1 dòng trong `App.tsx`.
- Thử: `npm run build` rồi `npx vite preview --port 5181 --strictPort`. Đổi cổng cũ dùng preview sang dev thì Unregister service worker trong DevTools trước.

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
| Landing + canvas thử | `.kiro/specs/canvas-landing-demo/` | `docs/architecture.md` (mục folder) |
