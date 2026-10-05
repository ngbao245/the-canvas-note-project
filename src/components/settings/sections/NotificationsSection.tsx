import { useI18n, type MessageKey } from '@/lib/i18n';
import { Row, Section, SoonBadge } from '../SettingsBlocks';

/**
 * Cài đặt → Email và thông báo: vỏ giao diện (2026-10-05).
 * Chưa có backend để gửi email, chưa có cộng tác / plugin để báo → mọi dòng "Sắp có".
 * Khi có backend: mỗi dòng thành Switch, lưu theo tài khoản (không lưu localStorage).
 */

// Hằng số ngoài component → lưu key, dịch lúc render. React key dùng `id`, không dùng chữ đã dịch.
const ITEMS: { id: string; titleKey: MessageKey; descriptionKey: MessageKey }[] = [
  {
    id: 'digest',
    titleKey: 'SETTINGS.NOTIFICATIONS.DIGEST.TITLE',
    descriptionKey: 'SETTINGS.NOTIFICATIONS.DIGEST.DESCRIPTION',
  },
  {
    id: 'mention',
    titleKey: 'SETTINGS.NOTIFICATIONS.MENTION.TITLE',
    descriptionKey: 'SETTINGS.NOTIFICATIONS.MENTION.DESCRIPTION',
  },
  {
    id: 'invite',
    titleKey: 'SETTINGS.NOTIFICATIONS.INVITE.TITLE',
    descriptionKey: 'SETTINGS.NOTIFICATIONS.INVITE.DESCRIPTION',
  },
  {
    id: 'news',
    titleKey: 'SETTINGS.NOTIFICATIONS.NEWS.TITLE',
    descriptionKey: 'SETTINGS.NOTIFICATIONS.NEWS.DESCRIPTION',
  },
];

export function NotificationsSection({ title, description }: { title: string; description: string }) {
  const { t } = useI18n();
  return (
    <Section title={title} description={description}>
      {ITEMS.map((item) => (
        <Row key={item.id} title={t(item.titleKey)} description={t(item.descriptionKey)}>
          <SoonBadge />
        </Row>
      ))}
    </Section>
  );
}
