import { createContext } from 'react';
import type { Presence } from '@/lib/motion';

/**
 * Trạng thái vào / ra của popup toolbar, do `PopupActionButton` cấp (1 chỗ phủ mọi
 * popup). `ToolbarPopup` gắn vào lớp chạy hiệu ứng; `useToolbarPopupClose` gỡ
 * Esc + click ngoài ngay khi bắt đầu đóng. Không có provider → popup chỉ có hiệu
 * ứng vào, đóng là mất ngay (như trước).
 */
export const ToolbarPopupPresence = createContext<Presence | null>(null);
