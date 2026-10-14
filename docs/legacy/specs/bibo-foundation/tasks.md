> LEGACY (chuyển 2026-10-13). Trạng thái hiện tại: `docs/system/01-core.md`. Spec này chỉ còn là lịch sử thay đổi.

# Task — bibo-foundation

**Trạng thái**: Đã duyệt, sẵn sàng Builder

## Ghi chú thay đổi so với design

- ESLint 9 dùng flat config `eslint.config.js` (bắt buộc), không dùng `.eslintrc.cjs`.
- CSS import trong `main.tsx` dùng relative path `./styles/index.css` thay vì alias `@/`, do TS strict cần `vite/client` types cho alias asset import.

## Phase 1: Khung repo

- [x] Task 1: `package.json` + cài deps
- [x] Task 2: Vite + TS config
- [x] Task 3: Tailwind + token theme
- [x] Task 4: Lint + format (ESLint 9 flat config + Prettier)

## Phase 2: Khung app

- [x] Task 5: Entry và provider (QueryClientProvider + BrowserRouter)
- [x] Task 6: shadcn base (Button, Input, Card, `cn` helper)
- [x] Task 7: Shared state (LoadingState, EmptyState, ErrorState)

## Phase 3: Doc nền tảng

- [x] Task 8: `docs/architecture.md`
- [x] Task 9: `docs/conventions.md`

## Phase 4: Verify cuối

- [x] Task 10: Fresh clone smoke test — build + lint pass

## Kết quả build cuối

- `npm run build`: pass, 215 kB JS (69 kB gzip) + 12 kB CSS (3 kB gzip)
- `npm run lint`: 0 error, 1 warning (fast-refresh trong `button.tsx` — pattern shadcn chuẩn)
