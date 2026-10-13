import { useQuery } from '@tanstack/react-query';
import { ErrorState, Skeleton } from '@/components/shared';
import { useI18n } from '@/lib/i18n';
import { countData } from '@/lib/data-stats';
import { Row, Section, SoonBadge } from '../SettingsBlocks';

/**
 * Cài đặt → Dữ liệu: chỉ xem (quyết định 2026-10-05).
 *   - Board / Object: hàm đếm do Canvas đăng ký (`src/register-tools.ts`), tự tải module
 *     canvas lúc cần nên modal Cài đặt không kéo code canvas vào bundle chính.
 *   - Dung lượng: ước tính của trình duyệt cho cả origin (navigator.storage.estimate).
 * Sao lưu: export chính lâu dài ở backend → "Sắp có".
 */

interface DataStats {
  boards: number;
  objects: number;
  /** null khi trình duyệt không hỗ trợ ước tính. */
  usageBytes: number | null;
}

async function loadStats(): Promise<DataStats> {
  const [counts, estimate] = await Promise.all([
    countData(),
    navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve(null),
  ]);
  return { ...counts, usageBytes: estimate?.usage ?? null };
}

/**
 * Đơn vị B/KB/MB giữ nguyên mọi ngôn ngữ. KB/MB luôn 1 chữ số thập phân như trước khi có i18n,
 * chỉ dấu thập phân theo ngôn ngữ (vi 1,0 KB, en 1.0 KB).
 */
function formatBytes(
  bytes: number,
  formatNumber: (value: number, fractionDigits?: number) => string,
): string {
  if (bytes < 1024) return `${formatNumber(bytes)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, 1)} KB`;
  return `${formatNumber(bytes / (1024 * 1024), 1)} MB`;
}

export function DataSection({ title, description }: { title: string; description: string }) {
  const { t, formatNumber } = useI18n();
  // staleTime 0 + refetchOnMount: mở mục là đếm lại, số luôn theo canvas mới nhất.
  const query = useQuery({ queryKey: ['settings', 'data-stats'], queryFn: loadStats, staleTime: 0 });

  if (query.isError) {
    return (
      <Section title={title} description={description}>
        <ErrorState
          compact
          message={query.error instanceof Error ? query.error.message : t('SETTINGS.DATA.READ_ERROR')}
          onRetry={() => void query.refetch()}
        />
      </Section>
    );
  }

  const stats = query.data;
  const usage =
    stats?.usageBytes == null ? t('COMMON.UNKNOWN') : formatBytes(stats.usageBytes, formatNumber);

  // Số đếm qua formatNumber (theo ngôn ngữ), không gọi toLocaleString('vi-VN') cứng.
  return (
    <Section title={title} description={description}>
      <Row title={t('SETTINGS.DATA.BOARDS.TITLE')} description={t('SETTINGS.DATA.BOARDS.DESCRIPTION')}>
        <StatValue value={stats ? formatNumber(stats.boards) : undefined} />
      </Row>
      <Row title={t('SETTINGS.DATA.OBJECTS.TITLE')} description={t('SETTINGS.DATA.OBJECTS.DESCRIPTION')}>
        <StatValue value={stats ? formatNumber(stats.objects) : undefined} />
      </Row>
      <Row title={t('SETTINGS.DATA.USAGE.TITLE')} description={t('SETTINGS.DATA.USAGE.DESCRIPTION')}>
        <StatValue value={stats ? usage : undefined} />
      </Row>
      <Row title={t('SETTINGS.DATA.BACKUP.TITLE')} description={t('SETTINGS.DATA.BACKUP.DESCRIPTION')}>
        <SoonBadge />
      </Row>
    </Section>
  );
}

/** Chưa có số → skeleton cùng cỡ chữ số (text-sm ~ h-4), không nhảy layout khi số về. */
function StatValue({ value }: { value: string | undefined }) {
  if (value === undefined) return <Skeleton className="h-4 w-14" />;
  return <span className="text-sm tabular-nums text-foreground">{value}</span>;
}
