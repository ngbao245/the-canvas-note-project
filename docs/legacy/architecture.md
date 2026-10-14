> LEGACY (chuyển 2026-10-13). Có chỗ đã lệch code. Trạng thái hiện tại: `docs/system/` (tra `00-map.md`). Phần chưa có doc mới vẫn tra ở đây khi viết phần đó.

# Kiến trúc — bibo

Đang chuyển dần sang `docs/system/`. Còn lại ở đây: Theme (chờ `02`), Outbox (chờ `21`), bảng tài liệu theo tool (chờ `00`). Khi cả 3 có doc mới thì chuyển file này vào `docs/legacy/`.

## Stack

> Mục này đã chuyển sang `docs/system/01-core.md` (2026-10-13). Phần dưới không cập nhật nữa.

- Vite 6 + TypeScript strict (mode `noEmit`, build qua `tsc -b && vite build`)
- React 18 + React Router v6
- Tailwind 3 + shadcn/ui (copy vào `src/components/ui/`, không dùng như package)
- Zustand (state UI) + TanStack Query v5 (state server)
- `vite-plugin-pwa` 2.0.0 (Workbox): service worker cho bản build app, xem mục "Mở app khi offline"

## Cấu trúc folder

> Mục này đã chuyển sang `docs/system/01-core.md` (2026-10-13). Phần dưới không cập nhật nữa.

```
bibo/
├── AGENTS.md               — chỉ dẫn cho AI agent (Kiro)
├── .kiro/                  — steering + spec + settings cho Kiro
├── dev/
│   └── fake-api/           — server giả cho outbox, plugin Vite chỉ chạy ở `npm run dev` (spec canvas-outbox)
├── docs/                   — tài liệu
├── public/                 — static asset
├── src/
│   ├── main.tsx            — entry: mount QueryClientProvider + App
│   ├── App.tsx             — BrowserRouter + Routes
│   ├── dev/                — bảng công cụ dev (đổi ngôn ngữ / Win-Mac, đo ghi + outbox). Chỉ dev, lazy sau cờ DEV
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
│   │   (canvas có thêm `sync/`: outbox, lớp gửi, hợp đồng gửi — xem mục "Outbox")
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
├── tsconfig.node.json      — cho vite.config.ts, vitest.config.ts, dev/
├── vite.config.ts
├── vitest.config.ts        — test (`npm run test`), chỉ quét src/ + dev/
├── tailwind.config.ts
├── postcss.config.js
├── eslint.config.js        — ESLint 9 flat config
└── .prettierrc.json
```

## Convention tool mới

> Mục này đã chuyển sang `docs/system/01-core.md` (2026-10-13). Phần dưới không cập nhật nữa.

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

> Mục này đã chuyển sang `docs/system/01-core.md` (2026-10-13). Phần dưới không cập nhật nữa.

1. `index.html` load `/src/main.tsx`.
2. `main.tsx` mount:
   - `QueryClient` (TanStack Query)
   - `QueryClientProvider`
   - `<App />` bên trong
3. `App.tsx` mount `BrowserRouter` với `Routes`:
   - `/` và `*` → chuyển sang `/canvas`
   - `/canvas`, `/canvas/:boardId` → canvas thật (lazy)

## 2 bản build (landing và app ở 2 domain)

> Mục này đã chuyển sang `docs/system/01-core.md` (2026-10-13). Phần dưới không cập nhật nữa.

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

> Mục này đã chuyển sang `docs/system/01-core.md` (2026-10-13). Phần dưới không cập nhật nữa.

- Chỉ bản build app có service worker (`VitePWA` trong `vite.config.ts`). Dev (`npm run dev`) và landing không có.
- Build sinh `dist/sw.js`: tải trước mọi file build (html, js, css, svg, png, ico, woff2). Mọi đường dẫn mở trang trả `index.html` từ cache → link board sâu mở được khi offline.
- Font Google: cache lúc dùng (`google-fonts-css` cập nhật nền, `google-fonts-files` ưu tiên cache, giữ 1 năm, tối đa 30 file). Font chỉ vào cache khi trang thật sự dùng tới (VD có note chứa chữ).
- Dữ liệu board vẫn ở IndexedDB `bibo-canvas`, service worker không đụng. Cache Storage chỉ chứa file app.
- Lần mở đầu tiên service worker cài xong nhưng chưa điều khiển trang; từ lần tải lại sau mới phục vụ từ cache.
- Bản mới: `src/lib/pwa/index.ts` đăng ký (`registerType: 'prompt'`), tab hỏi bản mới khi quay lại tab và mỗi 1 giờ. Có bản mới → `UpdateBanner` hiện "Có bản mới" + "Tải lại" + "Để sau". Không tự tải lại.
- `OfflineBadge` là nhãn TẠM "Đang offline" theo sự kiện `online` / `offline`. Gỡ khi `canvas-sync` xử lý ngầm: xoá file + dòng export trong `components/shared/index.ts` + 1 dòng trong `App.tsx`.
- Thử: `npm run build` rồi `npx vite preview --port 5181 --strictPort`. Đổi cổng cũ dùng preview sang dev thì Unregister service worker trong DevTools trước.

## Outbox gửi server (spec `canvas-outbox`, hiện chỉ dev)

```
thao tác → hàng đợi ghi → 1 transaction IndexedDB: object + mục outbox
        → lớp gửi (1 tab giữ Web Lock): cửa sổ 1s → đọc hết outbox → 1 request
        → server giả `/__fake-api/apply`: bỏ mã trùng, áp cả lô → client xoá mục có mã khớp
```

- Database `bibo-canvas` phiên bản 3: thêm store `outbox` (khoá `objectId`, mỗi object tối đa 1 mục). Sửa nhiều lần trước khi gửi → gộp, hợp các trường đã đổi, giữ `baseVersion`, đổi `opId`.
- Gửi theo trường: `create` (server chưa có, nguyên object) / `patch` (chỉ trường đã đổi: `geometry`, `data.body`, `data.color`...) / `delete`. Trường đổi tính lúc ghi bằng cách so với bản cũ trong cùng transaction. Server báo thiếu object → client gửi lại `create`.
- `src/tools/canvas/sync/`: `protocol.ts` (dạng gói, dùng chung với server giả), `object-fields.ts` (so / lấy / áp trường), `outbox-entry.ts` (gộp mục), `outbox-sender.ts` (nhịp gửi thuần: gom, gửi gấp, thử lại 1s→30s, offline), `outbox-runtime.ts` (IndexedDB + fetch + Web Lock + BroadcastChannel), `outbox-signal.ts` (api.ts báo có mục mới), `outbox-config.ts`.
- Bật ở dev (`OUTBOX_ENABLED = import.meta.env.DEV`). Bản build: không ghi outbox, không có lớp gửi, không có `/__fake-api`. `canvas-sync` đổi cờ thành "đã đăng nhập + có Supabase", thay server giả bằng RPC.
- Gửi gấp: mọi `repo.flush()` (thoát sửa note, đổi board, ẩn tab). Đóng tab: request keepalive, không xoá mục; lần mở sau gửi lại, server bỏ trùng.
- Trạng thái đồng bộ ở hàng tiêu đề board: "Đã lưu trên máy / Đã đồng bộ / Chưa đồng bộ" (`store/sync-status-store.ts`). Tab không gửi nhận trạng thái qua BroadcastChannel.
- Server giả (`dev/fake-api/`): lưu trong bộ nhớ tiến trình dev, tắt dev là mất. Không có đăng nhập; dev mở ra mạng LAN (`host: true`) nên máy cùng mạng gọi được. Bảng dev chỉnh độ trễ, tỉ lệ lỗi, mất mạng giả, so dữ liệu máy với server.
- Test: `npm run test` (vitest 4.1.10). Test thuần cho gộp mục, nhịp gửi (đồng hồ giả), server giả.

## Alias

> Mục này đã chuyển sang `docs/system/01-core.md` (2026-10-13). Phần dưới không cập nhật nữa.

`@/` trỏ `src/`. Cấu hình ở 2 chỗ:

- `vite.config.ts` — cho runtime bundler
- `tsconfig.app.json` (paths) — cho TS type check

## Tài liệu theo tool/domain

Doc canonical cho từng tool/domain. Đọc trước khi sửa tool tương ứng.

| Domain | Spec | Doc |
|---|---|---|
| Canvas | `.kiro/specs/canvas/` | `docs/canvas.md` |
| Design system | `.kiro/specs/design-system/` | `.kiro/notes/design-system.md` |
| Landing + canvas thử | `.kiro/specs/canvas-landing-demo/` | `docs/system/01-core.md` (2 bản build, folder) |
