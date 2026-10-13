# Yêu cầu — bibo-foundation

**Trạng thái**: Đã duyệt  
**Cập nhật cuối**: 2026-10-13 (thêm Supabase + `bibo-auth` vào stack, chỉ ghi, không có task code)

## Mục tiêu

Dựng nền tảng repo `bibo` sạch, chạy được, sẵn sàng cho các tool port dần từ donor `bibo-hub` sang. Nền tảng không mang nợ kỹ thuật của donor.

## User stories

### US-1: App scaffold chạy được
Là dev, tôi muốn có repo React + Vite + TypeScript strict + Tailwind + shadcn/ui chạy `npm run dev` và `npm run build` được, để có nền code các tool sau.

**Điều kiện chấp nhận**:
- Cho repo trống, khi chạy `npm install && npm run build`, thì build pass không lỗi.
- Cho app chạy `npm run dev`, khi mở browser, thì thấy trang landing placeholder "bibo".
- Cho `tsconfig.json`, khi bật strict, thì không có `any` ngầm, không unused locals.

### US-2: Theme dùng token
Là dev, tôi muốn theme dùng CSS variables ngay từ đầu, để không phải refactor lại sau.

**Điều kiện chấp nhận**:
- Cho `src/styles/index.css`, khi định nghĩa token (primary, foreground, background, border, destructive, success, warning), thì Tailwind config map đúng qua `tailwind.config.ts`.
- Cho class `bg-primary`, khi render, thì đọc CSS variable, không đọc màu Tailwind cứng.

### US-3: State và data layer sẵn sàng
Là dev, tôi muốn Zustand (state UI) và TanStack Query v5 (state server) cài sẵn, để tool đầu tiên có pattern nhất quán.

**Điều kiện chấp nhận**:
- Cho `package.json`, khi cài, thì `zustand` và `@tanstack/react-query` có version cố định.
- Cho app khởi động, khi mở React DevTools, thì thấy `QueryClientProvider` active.

### US-4: Convention folder cho tool
Là dev, tôi muốn convention `src/tools/{tên}/` có sẵn trong doc, để tool đầu tiên có chỗ đặt rõ ràng.

**Điều kiện chấp nhận**:
- Cho `docs/architecture.md`, khi đọc, thì thấy cấu trúc folder + convention `src/tools/{tên}/{route.tsx, api.ts, components/, lib/, types.ts}`.

### US-5: Lint và format sẵn sàng
Là dev, tôi muốn ESLint + Prettier cài sẵn, để commit đầu tiên đã sạch.

**Điều kiện chấp nhận**:
- Cho `npm run lint`, khi chạy, thì pass 0 lỗi trên code nền.
- Cho file `.ts/.tsx`, khi save trong VS Code với format-on-save, thì Prettier apply.

## Phân loại

**Phải có**: US-1, US-2, US-3, US-4, US-5.  
**Nên có**: chưa có gì thêm ở phase 1.

## Ngoài phạm vi

- Bất kỳ tool cụ thể nào (Notes, Reader, Canvas...). Foundation chỉ là khung.
- Cài và dựng khung backend. Stack đã chốt 2026-10-13 (Supabase, auth qua `bibo-auth`, xem `design.md`), phần code làm ở `canvas-sync`.
- CI, Storybook, E2E. Dịp sau.
