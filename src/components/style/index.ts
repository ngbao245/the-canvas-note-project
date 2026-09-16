/**
 * Lớp vỏ component đọc phong cách hiển thị từ useUiStyleStore.
 * Đây là nơi nơi dùng nên import Button/Card/Badge cho toàn app, thay vì import trực tiếp
 * drawably hoặc shadcn — để đổi phong cách một chỗ, toàn app đổi theo.
 *
 * Danh sách drawably có (dựng vỏ dần khi tool thật cần):
 *   Đã có: Button, Card, Badge
 *   Còn: Input, Checkbox, Toggle, Radio, Select, Textarea, List, Tabs, Tooltip, Alert, Kbd, Arrow
 */

export { Button } from './Button';
export { Card } from './Card';
export { Badge } from './Badge';
