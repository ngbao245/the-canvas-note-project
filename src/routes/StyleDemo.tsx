import { Moon, Sun, FileText, Search } from 'lucide-react';
import { Button, Card, Badge } from '@/components/style';
import {
  Skeleton,
  LoadingState,
  EmptyState,
  ErrorState,
} from '@/components/shared';
import { useUiStyleStore } from '@/stores/ui-style-store';
import { useResolvedTheme, useThemeStore } from '@/stores/theme-store';

/**
 * Trang demo phong cách hiển thị nội bộ.
 * Route: /thu/style-demo
 *
 * Bày các vỏ Button/Card/Badge + toggle phong cách (hand/flat) + toggle theme (dark/light)
 * để đối chiếu trực quan bộ token và cấu trúc lớp vỏ.
 */
export default function StyleDemo() {
  const uiStyle = useUiStyleStore((s) => s.style);
  const toggleStyle = useUiStyleStore((s) => s.toggle);
  const theme = useResolvedTheme();
  const toggleTheme = useThemeStore((s) => s.toggle);
  const isDark = theme === 'dark';

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        {/* Header + toggles */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Style Demo</h1>
            <p className="text-sm text-muted-foreground">
              Đối chiếu phong cách vẽ tay và phẳng trên cùng bộ token
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleStyle}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted"
            >
              Phong cách: <b>{uiStyle === 'hand' ? 'vẽ tay' : 'phẳng'}</b>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-md border border-border bg-card hover:bg-muted"
              aria-label="Đổi theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Section: Button */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-subtle-foreground">
            Button
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Mặc định</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </section>

        {/* Section: Card */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-subtle-foreground">
            Card
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card>
              <div className="p-4">
                <h3 className="mb-1 font-semibold">Canvas trực quan</h3>
                <p className="text-sm text-muted-foreground">
                  Kéo thả note, bảng, ảnh lên mặt phẳng.
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-4">
                <h3 className="mb-1 font-semibold">Truy nguồn gốc</h3>
                <p className="text-sm text-muted-foreground">
                  Mỗi object biết mình từ file, trang nào.
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Section: Badge */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-subtle-foreground">
            Badge
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>default</Badge>
            <Badge tone="primary">primary</Badge>
            <Badge tone="success">success</Badge>
            <Badge tone="warning">warning</Badge>
            <Badge tone="destructive">destructive</Badge>
            <Badge scribble>scribble</Badge>
          </div>
        </section>

        {/* Section: Skeleton */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-subtle-foreground">
            Skeleton
          </h2>
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </section>

        {/* Section: LoadingState */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-subtle-foreground">
            LoadingState
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <div className="mb-2 text-xs text-muted-foreground">variant=skeleton</div>
              <LoadingState variant="skeleton" count={3} />
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="mb-2 text-xs text-muted-foreground">variant=inline</div>
              <LoadingState variant="inline" label="Đang lưu" />
            </div>
            <div className="rounded-md border border-border p-3">
              <div className="mb-2 text-xs text-muted-foreground">variant=default</div>
              <LoadingState label="Đang tải..." />
            </div>
          </div>
        </section>

        {/* Section: EmptyState */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-subtle-foreground">
            EmptyState
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border">
              <EmptyState
                icon={FileText}
                title="Chưa có note nào"
                description="Tạo note đầu tiên để bắt đầu."
                action={<Button>Tạo note</Button>}
              />
            </div>
            <div className="rounded-md border border-border">
              <EmptyState
                compact
                icon={Search}
                title="Không có kết quả"
                description="Thử từ khoá khác."
              />
            </div>
          </div>
        </section>

        {/* Section: ErrorState */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-subtle-foreground">
            ErrorState
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border">
              <ErrorState
                message="Không load được dữ liệu từ server."
                onRetry={() => alert('retry')}
              />
            </div>
            <div className="flex items-center rounded-md border border-border p-3">
              <ErrorState
                compact
                message="Không load được ảnh"
                onRetry={() => alert('retry')}
              />
            </div>
          </div>
        </section>

        {/* Hint */}
        <footer className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
          Đổi phong cách để thấy vỏ chuyển giữa drawably (vẽ tay) và shadcn/HTML (phẳng). Đổi theme
          để xem bộ token dark/light. Cấu trúc chuẩn bị sẵn cho theme mới (tím, cute) — thêm khối{' '}
          <code>[data-theme='ten']</code> trong <code>src/styles/index.css</code>.
        </footer>
      </div>
    </main>
  );
}
