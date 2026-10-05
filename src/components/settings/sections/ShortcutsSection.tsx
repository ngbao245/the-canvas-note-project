import { useI18n, type MessageKey } from '@/lib/i18n';
import { Section } from '../SettingsBlocks';

/**
 * Cài đặt → Phím tắt: danh sách chỉ xem.
 *
 * Nguồn: useCanvasKeys, useDeleteKey, usePointerInteraction (Space), CanvasApp
 * (Ctrl+Shift+U, Esc đóng Unsort). Thêm/đổi phím ở các file đó thì sửa danh sách
 * này cùng lúc, không thì lệch nhau.
 *
 * Hằng số ngoài component → lưu key dịch, dịch lúc render. Tên phím (Ctrl, Shift, Delete)
 * là chuỗi thường, giữ nguyên mọi ngôn ngữ; phần chữ lẫn trong tổ hợp (vd "kéo chuột")
 * là object `{ labelKey }` để còn dịch được.
 */

type KeyPart = string | { labelKey: MessageKey };

interface Shortcut {
  labelKey: MessageKey;
  /** Mỗi phần tử là 1 tổ hợp; nhiều phần tử = các cách bấm thay thế. */
  keys: KeyPart[][];
}

const DRAG: KeyPart = { labelKey: 'SETTINGS.SHORTCUTS.DRAG' };

const GROUPS: { titleKey: MessageKey; items: Shortcut[] }[] = [
  {
    titleKey: 'SETTINGS.SHORTCUTS.GROUP.EDIT',
    items: [
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.UNDO', keys: [['Ctrl', 'Z']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.REDO', keys: [['Ctrl', 'Shift', 'Z'], ['Ctrl', 'Y']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.COPY', keys: [['Ctrl', 'C']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.CUT', keys: [['Ctrl', 'X']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.PASTE', keys: [['Ctrl', 'V']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.DUPLICATE', keys: [['Ctrl', 'D']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.DELETE', keys: [['Delete'], ['Backspace']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.EDIT_SELECTED', keys: [['Enter']] },
    ],
  },
  {
    titleKey: 'SETTINGS.SHORTCUTS.GROUP.SELECT',
    items: [
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.SELECT_ALL', keys: [['Ctrl', 'A']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.DESELECT', keys: [['Esc']] },
    ],
  },
  {
    titleKey: 'SETTINGS.SHORTCUTS.GROUP.VIEW',
    items: [
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.FIT', keys: [['F']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.RESET_VIEW', keys: [['0'], ['Ctrl', '0']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.ZOOM_IN', keys: [['Ctrl', '+']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.ZOOM_OUT', keys: [['Ctrl', '-']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.PAN', keys: [['Space', DRAG]] },
    ],
  },
  {
    titleKey: 'SETTINGS.SHORTCUTS.GROUP.LAYER',
    items: [
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.LAYER_UP', keys: [['Ctrl', ']']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.LAYER_DOWN', keys: [['Ctrl', '[']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.LAYER_TOP', keys: [['Ctrl', 'Shift', ']']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.LAYER_BOTTOM', keys: [['Ctrl', 'Shift', '[']] },
    ],
  },
  {
    titleKey: 'SETTINGS.SHORTCUTS.GROUP.UNSORT',
    items: [
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.TO_UNSORT', keys: [['Ctrl', 'Shift', 'U']] },
      { labelKey: 'SETTINGS.SHORTCUTS.ACTION.CLOSE_UNSORT', keys: [['Esc']] },
    ],
  },
];

/** Id ổn định cho React key, không phụ thuộc chữ đã dịch. */
function partId(part: KeyPart): string {
  return typeof part === 'string' ? part : part.labelKey;
}

export function ShortcutsSection({ title, description }: { title: string; description: string }) {
  const { t } = useI18n();
  return (
    <Section title={title} description={description}>
      <div className="flex flex-col gap-6">
        {GROUPS.map((group) => (
          <div key={group.titleKey}>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t(group.titleKey)}
            </h3>
            <dl>
              {group.items.map((item) => (
                <div
                  key={item.labelKey}
                  className="flex items-center gap-4 border-b border-border py-2.5 last:border-0"
                >
                  <dt className="min-w-0 flex-1 text-sm">{t(item.labelKey)}</dt>
                  <dd className="flex shrink-0 items-center gap-2">
                    {item.keys.map((combo, i) => (
                      <span key={combo.map(partId).join('+')} className="flex items-center gap-2">
                        {i > 0 ? (
                          <span className="text-xs text-muted-foreground">{t('COMMON.OR')}</span>
                        ) : null}
                        <KeyCombo combo={combo} />
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Section>
  );
}

function KeyCombo({ combo }: { combo: KeyPart[] }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-1">
      {combo.map((part) => (
        <kbd
          key={partId(part)}
          className="min-w-[1.5rem] rounded border border-border bg-muted px-1.5 py-0.5 text-center font-sans text-[11px] text-foreground"
        >
          {typeof part === 'string' ? part : t(part.labelKey)}
        </kbd>
      ))}
    </span>
  );
}
