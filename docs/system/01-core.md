# 01 — Lõi app: stack, 2 bản build, folder, ranh giới import

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: stack, lệnh chạy, 2 bản build (app / landing), luồng khởi động, cấu trúc folder, ranh giới import, alias, công cụ chỉ có ở dev, mở app khi offline.

Không gồm: theme / chuyển động / lớp z (`02`), lưu trên máy (`20`), outbox gửi server (`21`), landing chi tiết (`30`). Luật viết code từng dòng: `.kiro/steering/coding-style.md`.

## Hiện trạng

### Stack

Bảng dưới là nguồn chuẩn của stack (chuyển từ spec `bibo-foundation` 2026-10-13). `core.md` mục "Stack đã chốt" là bản tóm tắt. Số phiên bản: xem `package.json`.

| Lớp | Chọn | Lý do |
|---|---|---|
| Build | Vite 6 | HMR nhanh, đã dùng ở donor |
| Ngôn ngữ | TypeScript strict | Bắt lỗi sớm |
| UI | React 18 | Đã quen, nhiều thư viện |
| Style | Tailwind 3 + CSS variables | Token theme từ đầu |
| Component | shadcn/ui (copy vào repo) | Sở hữu code, sửa được |
| State UI | Zustand | Đơn giản |
| State server | TanStack Query v5 | Cache + cập nhật trước khi server trả lời |
| Router | React Router v6 | Đơn giản, có route lồng |
| Lint / format | ESLint 9 + typescript-eslint, Prettier | Chuẩn |
| Offline | `vite-plugin-pwa` (Workbox), chỉ bản build app | Tự sinh service worker từ danh sách file build, không phải tự giữ danh sách cache (thêm 2026-10-12) |
| Backend | Supabase (Postgres + Realtime + Storage), project dữ liệu MỚI riêng cho bibo | Lý do: note `milanote-sync-architecture.md` mục 2.8, giới hạn gói 2.11a. Ghi bền vững qua RPC HTTP (`apply_ops`), realtime qua Broadcast / Presence / Postgres Changes. `@supabase/supabase-js` CHƯA cài, cài + ghim ở Task 1 `canvas-sync`. Board ở 1 project chính, file chia nhiều project (`docs/supabase-setup.md`) |
| Đăng nhập | Ngay trong app (`app.`), Supabase Auth. Không có service SSO riêng | Sản phẩm chỉ có landing + app canvas (chốt 2026-10-13). Google làm sau, gọi Supabase OAuth thẳng. Supabase Auth đặt ở project nào: CHƯA CHỐT |
| Deploy | Chưa quyết | Chờ có gì để deploy |

Không dùng: Redux, MobX, styled-components, MUI, Ant Design.

Thư viện ngoài stack đang dùng: Tiptap (editor note, `12`), Zod (kiểm dữ liệu), `drawably` (phong cách vẽ tay cho `components/style/`), `lucide-react` (icon), `@tanstack/react-virtual` (lưới ảo hoá popup icon board). Chỉ dùng khi dev: `lucide-static` (nguồn tag cho script `gen:icon-catalog`).

Gói ghim đúng bản (không dùng `^`): `vite-plugin-pwa`, `vitest`, `@tiptap/extension-unique-id`. Đây là các gói thêm gần đây, theo luật thêm thư viện là ghim bản. Gói cũ hơn còn `^`, chưa chốt có ghim lại không. Nâng bản gói đã ghim phải làm có chủ ý.

### Lệnh

| Lệnh | Việc |
|---|---|
| `npm run dev` | App dev, cổng 3000, mở ra LAN (`host: true`). Có bảng dev + server giả |
| `npm run dev:landing` | Landing dev, cổng 3001 |
| `npm run build` | `tsc -b` rồi build app → `dist/` (có service worker) |
| `npm run build:landing` | `tsc -b` rồi build landing → `dist-landing/` |
| `npm run preview:offline` | Build app rồi preview cổng 4173 (`--strictPort`). Dùng để thử service worker |
| `npm run preview` / `preview:landing` | Preview bản đã build, không build lại |
| `npm run lint` | ESLint 9 flat config, cả repo |
| `npm run test` | Vitest 1 lượt, chỉ `src/**/*.test.ts` + `dev/**/*.test.ts`, môi trường `node` |

Output dài thì chặn: `npm run build 2>&1 | Select-Object -Last 15`.

### 2 bản build

| | App (domain `app.`) | Landing (domain gốc) |
|---|---|---|
| HTML | `index.html` | `landing.html` (build xong đổi tên thành `index.html`) |
| Entry | `src/main.tsx` → `src/App.tsx` | `src/routes/landing/main.tsx` → `LandingRoot.tsx` |
| Config | `vite.config.ts` | `vite.landing.config.ts` |
| Có | Router, TanStack Query, service worker, server giả (dev), bảng dev (dev) | Không router, không TanStack Query, không service worker |

- 2 domain là 2 origin: IndexedDB, localStorage, BroadcastChannel tách hẳn. Landing không đọc / ghi được dữ liệu canvas.
- Link landing → app đọc `VITE_APP_URL` lúc build landing (`src/routes/landing/app-url.ts`). Thiếu thì trỏ `http://localhost:3000`, build có cảnh báo.
- Landing luôn theme sáng; ngôn ngữ dùng store ngôn ngữ chung nhưng vì khác origin nên không thấy lựa chọn của app.
- Bản build app chia chunk: `react-vendor` (react, react-dom, router) và `vendor` (zustand, query, clsx, tailwind-merge, cva). Mỗi route lazy là 1 chunk riêng. `lucide-react` cố ý không nằm trong `vendor`: popup icon board import cả bộ icon, gom vào vendor thì cả bộ tải ngay lúc mở app. Bộ đầy đủ chỉ được import ở `src/tools/canvas/lib/lucide-icons.ts` (nạp qua lazy), không import từ code chạy ngay.

### Luồng khởi động app

1. `index.html` nạp `src/main.tsx`.
2. `main.tsx` nạp CSS: `drawably/style.css` TRƯỚC, `styles/index.css` SAU (để token của app đè được). Tạo `QueryClient`, render `StrictMode` → `QueryClientProvider` → `App`.
3. `App.tsx` import `@/register-tools` đầu tiên: tool đăng ký bảng phím + hàm đếm dữ liệu vào sổ ở `src/lib/`.
4. `App` gắn lên `<html>`: `data-ui-style`, `data-theme` (đã giải "theo hệ thống"), `lang`.
5. Gọi `registerPwa()` (chỉ chạy ở bản build).
6. Bật bộ điều phối phím duy nhất + lớp phím `global` (`04`).
7. Chặn zoom cả trang khi pinch trackpad: `wheel` có `ctrlKey` bị `preventDefault` ở pha capture trên `window`. Canvas tự xử zoom camera bằng listener riêng.
8. Router:
   - `/` và `*` → chuyển sang `/canvas`.
   - `/canvas`, `/canvas/:boardId`, `/canvas/:boardId/:slug` → canvas (lazy).
9. Luôn mount ngoài router: `SettingsModal`, `ShortcutsModal`, `UpdateBanner`, `OfflineBadge` (tạm), `DevPanel` (chỉ dev).

Landing: `main.tsx` nạp CSS cùng thứ tự, `LandingRoot` gắn `lang`, ép theme sáng, bật bộ điều phối phím (cho canvas thử).

### Cấu trúc folder

```
bibo/
├── dev/fake-api/        — server giả cho outbox, plugin Vite chỉ ở `npm run dev` (`21`)
├── docs/system/         — doc hệ thống (file này). docs/legacy/: doc cũ, không cập nhật
├── public/
├── src/
│   ├── main.tsx, App.tsx — entry app
│   ├── register-tools.ts — chỗ duy nhất nối tool vào phần chung
│   ├── tools/{tên}/      — mỗi tool 1 folder. Hiện chỉ có canvas
│   ├── routes/landing/   — bản build landing (`30`). demo/: canvas thử độc lập
│   ├── components/
│   │   ├── ui/           — shadcn gốc, không sửa
│   │   ├── style/        — Button/Card/Badge đổi giữa shadcn và drawably theo data-ui-style. Nơi dùng import từ đây
│   │   ├── shared/       — Loading/Empty/Error/Skeleton, UpdateBanner, OfflineBadge
│   │   ├── settings/     — modal Cài đặt + các mục (`05`)
│   │   └── shortcuts/    — modal phím tắt (`04`)
│   ├── lib/              — code dùng chung: i18n/, shortcuts/, pwa/, data-stats, cursor-override, css-token, dom, focus-ring, utils
│   ├── stores/           — Zustand toàn app: theme, ui-style, interface, canvas-settings, keyboard-platform, 2 store mở modal
│   ├── styles/index.css  — Tailwind + token theme (`02`)
│   ├── dev/              — bảng công cụ dev (chỉ dev)
│   ├── experiments/      — trang thử, đã gỡ khỏi router (xem "Câu còn mở")
│   └── routes/StyleDemo.tsx — như trên
├── index.html, landing.html
├── vite.config.ts, vite.landing.config.ts, vitest.config.ts
├── tsconfig.json (gốc) → tsconfig.app.json (src/) + tsconfig.node.json (config + dev/)
├── tailwind.config.ts, postcss.config.js, eslint.config.js, .prettierrc.json
```

### Folder 1 tool

```
src/tools/{tên}/
  route.tsx     — page, export default, App.tsx import lazy
  api.ts        — kho dữ liệu / adapter
  types.ts      — Zod schema + type
  shortcuts.ts  — bảng phím, chỉ là dữ liệu (register-tools.ts import, không kéo UI vào bundle chính)
  components/ hooks/ engine/ lib/ store/
```

Canvas có thêm `sync/` (outbox, `21`). Không có barrel `index.ts`: import thẳng file cụ thể.

### Alias `@/`

`@/` trỏ `src/`, khai ở 4 chỗ: `vite.config.ts`, `vite.landing.config.ts`, `vitest.config.ts`, `tsconfig.app.json` (`paths`). Code trong `dev/` dùng đường dẫn tương đối (`../../src/...`) vì `tsconfig.node.json` không có alias.

### Công cụ chỉ có ở dev

- `src/dev/` (bảng dev, spec `dev-panel`): đổi ngôn ngữ, kiểu bàn phím Win/Mac, đo hàng đợi ghi, chỉnh server giả. `App.tsx` lazy-load sau `import.meta.env.DEV`, bản build bỏ hẳn nhánh này. Chữ trong bảng dev cố ý không qua bộ dịch.
- `dev/fake-api/` (spec `canvas-outbox`): plugin Vite `apply: 'serve'`, đường dẫn `/__fake-api/*`. Dữ liệu trong bộ nhớ, tắt dev là mất. Không có đăng nhập; dev mở ra LAN nên máy cùng mạng gọi được.

### Mở app khi offline (spec `app-offline`)

- Chỉ bản build app có service worker (`VitePWA` trong `vite.config.ts`). Dev và landing không có.
- Tải trước mọi file build (`html, js, css, svg, png, ico, woff2`). Mọi đường dẫn mở trang trả `index.html` từ cache → link board sâu mở được khi offline.
- Font Google cache lúc dùng: CSS cập nhật nền, file font ưu tiên cache (1 năm, tối đa 30 file).
- Service worker không đụng IndexedDB. Cache Storage chỉ chứa file app.
- Lần mở đầu service worker cài xong nhưng chưa điều khiển trang; từ lần tải lại sau mới phục vụ từ cache.
- Bản mới (`src/lib/pwa/index.ts`, `registerType: 'prompt'`): hỏi khi quay lại tab và mỗi 1 giờ (bỏ qua khi offline). Có bản mới → `UpdateBanner` "Tải lại" / "Để sau". Không tự tải lại.
- `OfflineBadge` là nhãn TẠM theo sự kiện `online` / `offline`. Gỡ ở `canvas-sync`: xoá file + dòng export ở `components/shared/index.ts` + 1 dòng `App.tsx`.
- Thử: `npm run preview:offline`. Từng dùng cổng khác cho preview / dev thì Unregister service worker cũ trong DevTools trước.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-CORE-01` | `src/routes/landing/` không import `src/tools/` (cả import tĩnh lẫn `import()`) | Landing là bản build + domain riêng, canvas thử phải độc lập canvas thật | Lint (error) |
| `INV-CORE-02` | `src/lib/`, `src/components/` không import `src/tools/` | Để gom phần chung thành package riêng sau này | Lint (error) |
| `INV-CORE-03` | Code chạy ở bản build nối tool vào phần chung CHỈ qua `src/register-tools.ts`; file này được `App.tsx` import đầu tiên | Sổ phím / sổ đếm phải có trước khi UI đọc | Review |
| `INV-CORE-04` | Code chỉ dev (`src/dev/`, `dev/fake-api/`) được import thẳng tool, nhưng không được lọt vào bản build: `DevPanel` sau `import.meta.env.DEV`, server giả `apply: 'serve'` | Bản build không có công cụ dev, không có `/__fake-api` | Review. Kiểm: `dist/` không có chuỗi `__fake-api` |
| `INV-CORE-05` | Service worker chỉ có ở bản build app, không tự tải lại, không đụng IndexedDB | Tải lại giữa lúc gõ làm mất chữ; dữ liệu do `20` quản | Config `vite.config.ts` + review |
| `INV-CORE-06` | Landing không dùng dữ liệu app (khác origin) | 2 domain không chung storage | Thiết kế (không có cách đọc chéo) |
| `INV-CORE-07` | Đổi alias `@/` phải sửa đủ 4 chỗ | Thiếu 1 chỗ: test / landing / tsc báo lỗi khác nhau, khó dò | Build + test |
| `INV-CORE-08` | Đổi stack (thêm / bỏ thư viện lớn, đổi backend) phải sửa bảng Stack trong file này trước, rồi `core.md` | Stack đã chốt với bạn | Review |
| `INV-CORE-09` | `drawably/style.css` nạp trước `styles/index.css` ở cả 2 entry | Token app phải đè được style drawably | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `package.json` | Lệnh, phiên bản thư viện |
| `vite.config.ts` | Build app: alias, cổng, chia chunk, PWA, plugin server giả |
| `vite.landing.config.ts` | Build landing: đổi tên HTML, `VITE_APP_URL`, cổng 3001 |
| `vitest.config.ts` | Test: không nạp PWA / server giả, chỉ quét `src/` + `dev/` |
| `eslint.config.js` | Luật lint + 2 ranh giới import (`INV-CORE-01`, `02`) |
| `tsconfig.app.json` / `tsconfig.node.json` | Strict cho `src/` / cho config + `dev/` |
| `src/main.tsx`, `src/App.tsx` | Khởi động app, router, modal toàn app |
| `src/register-tools.ts` | Nối tool vào sổ phím + sổ đếm dữ liệu |
| `src/routes/landing/main.tsx`, `LandingRoot.tsx` | Khởi động landing |
| `src/lib/pwa/index.ts` | Đăng ký service worker, trạng thái "có bản mới" |
| `src/dev/DevPanel.tsx` | Khung bảng dev, thêm mục bằng mảng `SECTIONS` |
| `dev/fake-api/plugin.ts` | Gắn server giả vào dev server |

## Nguồn liên quan

- Spec đang mở: `canvas-landing-demo`, `canvas-outbox`.
- Spec cũ (lịch sử): `docs/legacy/specs/bibo-foundation/`, `app-offline/`, `dev-panel/` (dev-panel có kế hoạch đo hàng đợi ghi).
- Steering: `.kiro/steering/core.md`, `.kiro/steering/coding-style.md`.
- Doc cũ: `docs/legacy/conventions.md`. `docs/legacy/architecture.md`.

## Câu còn mở

- (2026-10-13) Trang thử `/thu/*` đã gỡ khỏi router, file còn trong `src/experiments/` và `src/routes/StyleDemo.tsx`. Bạn đánh giá sau: `.kiro/notes/backlog.md`.
