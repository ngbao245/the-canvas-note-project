import { create } from 'zustand';
import type { MessageKey } from '@/lib/i18n/messages';

/**
 * Thông báo ngắn trên canvas (VD "note đang được sửa ở tab khác"). Lưu KEY dịch,
 * dịch lúc render. `seq` tăng mỗi lần báo để báo lại cùng câu vẫn đặt lại hẹn giờ ẩn.
 */
interface NoticeState {
  key: MessageKey | null;
  seq: number;
}

export const useNoticeStore = create<NoticeState>(() => ({ key: null, seq: 0 }));

export function showNotice(key: MessageKey): void {
  useNoticeStore.setState((s) => ({ key, seq: s.seq + 1 }));
}

export function hideNotice(): void {
  useNoticeStore.setState({ key: null });
}
