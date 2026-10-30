/**
 * Hệ chuyển động dùng chung (spec motion-system). 3 nhóm, 3 cơ chế:
 *   - Vào / ra: `usePresence` + `data-motion` (preset ở src/styles/motion.css).
 *   - Tương tác: hằng class `PRESSABLE_MOTION`, `HOVER_MOTION`, `ROW_MOTION`.
 *   - Liên tục (canvas): vòng rAF riêng, đọc token bằng `readCssToken`, kiểm
 *     `prefersReducedMotion()`.
 */
export {
  usePresence,
  type Presence,
  type PresenceProps,
  type PresenceState,
} from './usePresence';
export { prefersReducedMotion } from './reduced-motion';
export { PRESSABLE_MOTION, HOVER_MOTION, ROW_MOTION } from './interaction';
