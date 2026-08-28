# Convention code — bibo

Rule viết code cụ thể. Rule tổng ở `.kiro/steering/core.md`.

## TypeScript

- Strict mode bật hết (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noUncheckedSideEffectImports`).
- Cấm `any`. Cần thì dùng `unknown` rồi narrow.
- Prefer `type` cho object shape, `interface` khi cần extend/merge.

Ví dụ đúng:
```ts
function parse(input: unknown): Result {
  if (typeof input !== 'string') throw new Error('input phải là string');
  return doStuff(input);
}
```

Ví dụ sai:
```ts
function parse(input: any): any {
  return input.toString();
}
```

## Import và alias

- `@/` trỏ `src/`. Luôn dùng thay relative dài (`../../..`).
- Import order: 3rd-party trước → alias `@/` sau → relative sau cùng.

```ts
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { helper } from './helper';
```

## Naming

- Component: `PascalCase.tsx` (`Landing.tsx`, `LoadingState.tsx`).
- Util / lib: `kebab-case.ts` (`use-debounce.ts`, `format-date.ts`).
- Route: `PascalCase.tsx`, đặt trong `src/routes/` hoặc `src/tools/{tool}/route.tsx`.
- Type file: `types.ts`.
- Barrel: `index.ts`.

## Component

- Export default cho route/page component.
- Export named cho reusable component.
- Prefer function component + hooks. Không dùng class component.
- Props type inline nếu ngắn, extract ra `interface Props` nếu > 3 field.

## Hook

- Custom hook prefix `use`: `useDebounce`, `useLocalStorage`.
- Deps array của `useEffect` / `useCallback` / `useMemo` phải đầy đủ (ESLint đã check).
- Chỉ dùng `useCallback` / `useMemo` khi có lý do rõ (deps của effect khác, hoặc ref pass xuống memoized child).

## Style và theme

Dùng token, không hardcode màu Tailwind palette:

Đúng: `bg-primary`, `text-foreground`, `border-border`, `bg-success/10 text-success`.  
Sai: `bg-blue-500`, `text-slate-100`, `bg-green-500`.

Opacity dùng modifier: `bg-primary/50` (đã cấu hình `<alpha-value>` trong Tailwind config).

## Log

Cấm `console.log` trong commit. Chỉ `console.warn` / `console.error` khi cần, kèm comment disable ESLint:

```ts
// eslint-disable-next-line no-console
console.error('Không kết nối được server', error);
```

## Component state UI (Loading/Empty/Error)

Dùng shared component thay vì tự viết:

```tsx
import { LoadingState, EmptyState, ErrorState } from '@/components/shared';

if (isLoading) return <LoadingState variant="skeleton" count={5} />;
if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
if (!data.length) return <EmptyState icon={FileText} title="Chưa có gì" />;
```

## State

- **UI local**: `useState`.
- **UI global**: Zustand store trong `src/stores/`.
- **Server data**: TanStack Query. Không cache thủ công.
- **Form**: `useState` cho form nhỏ, `react-hook-form` cho form phức tạp (cài khi cần).

## Router

React Router v6. Lazy load tool để code-split:

```tsx
const Landing = lazy(() => import('@/routes/Landing'));
```

Wrap `<Suspense>` ở cấp `App.tsx`.

## Icon

Chỉ dùng `lucide-react`. Không dùng emoji làm icon. Không mix icon set khác.

Size chuẩn: `h-4 w-4` (small), `h-5 w-5` (medium), `h-6 w-6` (large).

## Fetch và error

- Đặt logic fetch trong `api.ts` của tool.
- Return `useQuery` / `useMutation` hook.
- Component chỉ consume, không tự `fetch`.

## Build và lint

- Build: `npm run build 2>&1 | tail -c 4000`.
- Lint: `npm run lint 2>&1 | tail -c 4000`.
- Prettier tự chạy khi save trong VS Code (cài extension).
