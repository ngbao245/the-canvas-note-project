import { Fragment, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useI18n, type MessageKey } from '@/lib/i18n';
import {
  displayWays,
  ESCAPE_COMBO,
  formatCombo,
  GLOBAL_SHORTCUT_DEFS,
  useKeyboardPlatform,
  useShortcutLayer,
  type ShortcutDef,
} from '@/lib/shortcuts';
import type { KeyboardPlatform } from '@/stores/keyboard-platform-store';
import { trapTab } from '@/lib/dom';
import { EmptyState } from '@/components/shared';
import { CANVAS_SHORTCUT_DEFS, NOTE_TEXT_SHORTCUT_DEFS } from '@/tools/canvas/shortcuts';
import { useShortcutsModalStore } from '@/stores/shortcuts-modal-store';
import { useInterfaceScale } from '@/stores/interface-store';
import { ShortcutWays } from './ShortcutKeys';

/**
 * Modal phím tắt (Milanote ShortcutsModal). Mount 1 lần ở App, mở qua
 * useShortcutsModalStore: Trợ giúp → Phím tắt, hoặc phím `/`.
 *
 * Danh sách sinh từ bảng phím chung (ALL_DEFS), không chép tay: thêm/đổi phím trong
 * bảng là modal tự theo. Phím có `display` mới hiện; thứ tự trong nhóm = thứ tự khai báo.
 * Tool mới: thêm bảng defs của tool vào ALL_DEFS.
 *
 * Bố cục: cột trái = nhóm (bấm → cuộn tới), cột phải = 1 danh sách cuộn liền,
 * nhóm đang xem được tô ở cột trái. Màn hẹp ẩn cột trái.
 * Mở là focus ô tìm. Gõ `/` trong ô ra ký tự (lớp global không chạy khi đang gõ),
 * Esc xoá chữ trước rồi mới đóng.
 * Lớp overlay chặn: phím canvas không chạy ngầm sau modal.
 */

const ALL_DEFS = {
  ...CANVAS_SHORTCUT_DEFS,
  ...NOTE_TEXT_SHORTCUT_DEFS,
  ...GLOBAL_SHORTCUT_DEFS,
};
type ShortcutId = keyof typeof ALL_DEFS;

const ESSENTIAL = 'SHORTCUTS.GROUP.ESSENTIAL';

/** Nhóm "Thường dùng": lấy lại dòng từ nhóm gốc, không khai báo trùng. */
const ESSENTIAL_IDS: readonly ShortcutId[] = [
  'canvas.edit-selected',
  'canvas.pan',
  'canvas.zoom-wheel',
  'canvas.undo',
  'canvas.duplicate',
  'canvas.delete',
  'canvas.toggle-select',
  'canvas.to-unsort',
  'app.open-shortcuts',
];

// Thứ tự theo Milanote. Milanote có thêm "Drawing" — bibo chưa có vẽ tay nên chưa có nhóm này.
const GROUP_ORDER: readonly MessageKey[] = [
  ESSENTIAL,
  'SHORTCUTS.GROUP.BASICS',
  'SHORTCUTS.GROUP.TEXT',
  'SHORTCUTS.GROUP.MARKDOWN',
  'SHORTCUTS.GROUP.NAVIGATION',
  'SHORTCUTS.GROUP.APPEARANCE',
  'SHORTCUTS.GROUP.ZOOM',
];

const GROUP_HINTS: Partial<Record<MessageKey, MessageKey>> = {
  'SHORTCUTS.GROUP.TEXT': 'SHORTCUTS.GROUP_HINT.TEXT',
};

interface Row {
  id: string;
  labelKey: MessageKey;
  def: ShortcutDef;
}

function toRow(id: string, def: ShortcutDef): Row[] {
  return def.display ? [{ id, labelKey: def.display.labelKey, def }] : [];
}

const GROUPS: { key: MessageKey; rows: Row[] }[] = GROUP_ORDER.map((key) => ({
  key,
  rows:
    key === ESSENTIAL
      ? ESSENTIAL_IDS.flatMap((id) => toRow(id, ALL_DEFS[id]))
      : Object.entries(ALL_DEFS).flatMap(([id, def]: [string, ShortcutDef]) =>
          def.display?.groupKey === key ? toRow(id, def) : [],
        ),
})).filter((g) => g.rows.length > 0);

/** Chữ thường, bỏ dấu tiếng Việt: gõ "xoa" vẫn khớp "Xoá". */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

/** Tên các phím của dòng ("Ctrl D", "Shift Delete") để tìm được theo phím. Bỏ phần chuột. */
function rowKeysText(def: ShortcutDef, platform: KeyboardPlatform): string {
  return displayWays(def)
    .flatMap((way) =>
      way.flatMap((tok) => ('combo' in tok ? [formatCombo(tok.combo, platform)] : [])),
    )
    .join(' ');
}

export function ShortcutsModal() {
  const open = useShortcutsModalStore((s) => s.open);
  return open ? <ShortcutsDialog /> : null;
}

/** Tách khỏi ShortcutsModal: mount khi mở → effect focus / trả focus gắn theo vòng đời. */
function ShortcutsDialog() {
  const close = useShortcutsModalStore((s) => s.close);
  const uiScale = useInterfaceScale();
  const platform = useKeyboardPlatform();
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<MessageKey, HTMLElement>());
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<MessageKey>(GROUPS[0]?.key ?? ESSENTIAL);

  // Lọc theo tên thao tác + tên nhóm + tên phím, mọi từ gõ vào đều phải có.
  // Đang tìm thì ẩn "Thường dùng": dòng ở đó lặp lại dòng của nhóm gốc.
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const visibleGroups =
    terms.length === 0
      ? GROUPS
      : GROUPS.filter((g) => g.key !== ESSENTIAL)
          .map((g) => ({
            key: g.key,
            rows: g.rows.filter((row) => {
              const hay = normalize(`${t(row.labelKey)} ${t(g.key)} ${rowKeysText(row.def, platform)}`);
              return terms.every((term) => hay.includes(term));
            }),
          }))
          .filter((g) => g.rows.length > 0);
  const visibleKeys = new Set(visibleGroups.map((g) => g.key));
  // Nhóm đang tô bị lọc mất → tô nhóm đầu còn kết quả.
  const shownActive = visibleKeys.has(active) ? active : visibleGroups[0]?.key;

  useEffect(() => {
    // Nhớ chỗ focus cũ (nút Trợ giúp) để trả lại khi đóng. Mở là gõ tìm được ngay.
    const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchRef.current?.focus();
    return () => prevFocus?.focus();
  }, []);

  const onQueryChange = (value: string) => {
    setQuery(value);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  useShortcutLayer(
    'overlay',
    [
      // Ô tìm có chữ: Esc xoá chữ trước, Esc lần 2 mới đóng modal.
      {
        id: 'shortcuts-modal.close',
        combos: [ESCAPE_COMBO],
        run: () => {
          if (query) {
            onQueryChange('');
            searchRef.current?.focus();
          } else close();
        },
      },
      // Không consume: trapTab tự preventDefault khi cần xoay vòng.
      {
        id: 'shortcuts-modal.trap-tab',
        combos: [{ shift: 'any', key: 'Tab' }],
        consume: false,
        run: (e) => {
          trapTab(e, dialogRef.current);
        },
      },
    ],
    { blocking: true },
  );

  const scrollToGroup = (key: MessageKey) => {
    const el = sectionRefs.current.get(key);
    if (!el) return;
    scrollRef.current?.scrollTo({ top: el.offsetTop });
    setActive(key);
  };

  // Nhóm đang xem = nhóm cuối cùng có tiêu đề đã cuộn qua mép trên. Cuộn hết đáy → nhóm cuối
  // (nhóm cuối ngắn không bao giờ chạm mép trên).
  const onScroll = () => {
    const box = scrollRef.current;
    if (!box) return;
    let current = visibleGroups[0]?.key ?? ESSENTIAL;
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
    for (const g of visibleGroups) {
      const el = sectionRefs.current.get(g.key);
      if (el && (atBottom || el.offsetTop <= box.scrollTop + 16)) current = g.key;
    }
    setActive((prev) => (prev === current ? prev : current));
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      // mousedown đúng nền (không phải đang kéo bôi chữ trong modal rồi thả ra ngoài) → đóng.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        // Kích thước giao diện: zoom cả khung, bù vw/vh để không tràn màn hình.
        style={{
          zoom: uiScale,
          width: `min(880px, calc(92vw / ${uiScale}))`,
          height: `min(640px, calc(85vh / ${uiScale}))`,
        }}
        className="flex flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-elevation-2"
      >
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border pl-5 pr-3">
          <h2 id="shortcuts-title" className="text-sm font-semibold">
            {t('SHORTCUTS.TITLE')}
          </h2>
          <label className="relative ml-auto w-64">
            <span className="sr-only">{t('SHORTCUTS.SEARCH')}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('SHORTCUTS.SEARCH_PLACEHOLDER')}
              aria-controls="shortcuts-list"
              autoComplete="off"
              spellCheck={false}
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <button
            type="button"
            onClick={close}
            title={t('COMMON.WITH_SHORTCUT', {
              label: t('SHORTCUTS.CLOSE'),
              keys: formatCombo(ESCAPE_COMBO, platform),
            })}
            aria-label={t('SHORTCUTS.CLOSE')}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <nav
            aria-label={t('SHORTCUTS.NAV')}
            // Rộng cố định để đổi vi/en không làm 2 cột nhảy. 240px vừa câu mẹo dài nhất
            // (vi ~235px, en ~194px). Đổi câu mẹo / thêm ngôn ngữ thì đo lại.
            className="hidden w-60 shrink-0 flex-col justify-between border-r border-border p-2 sm:flex"
          >
            <ul className="flex flex-col gap-0.5">
              {/* Giữ đủ nhóm khi tìm (cột trái không nhảy), nhóm không có kết quả thì mờ. */}
              {GROUPS.map((g) => {
                const hasRows = visibleKeys.has(g.key);
                const isActive = hasRows && shownActive === g.key;
                return (
                  <li key={g.key}>
                    <button
                      type="button"
                      disabled={!hasRows}
                      onClick={() => scrollToGroup(g.key)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-40 ${
                        isActive
                          ? 'cursor-pointer bg-primary-soft text-primary'
                          : 'cursor-pointer text-muted-foreground enabled:hover:bg-muted enabled:hover:text-foreground'
                      }`}
                    >
                      {t(g.key)}
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* 1 dòng, không xuống hàng: dòng rộng nhất cột trái, quyết con số w-60 ở trên. */}
            <p className="flex items-center gap-1 whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
              {t('SHORTCUTS.TIP_PREFIX')}
              <ShortcutWays def={GLOBAL_SHORTCUT_DEFS['app.open-shortcuts']} />
              {t('SHORTCUTS.TIP_SUFFIX')}
            </p>
          </nav>

          <div
            id="shortcuts-list"
            ref={scrollRef}
            onScroll={onScroll}
            className="relative min-w-0 flex-1 overflow-y-auto px-5 pb-6"
          >
            {visibleGroups.length === 0 ? (
              <EmptyState
                compact
                icon={Search}
                title={t('SHORTCUTS.NO_RESULTS', { query: query.trim() })}
                className="pt-12"
              />
            ) : null}
            {visibleGroups.map((g) => {
              const hint = GROUP_HINTS[g.key];
              return (
                <section
                  key={g.key}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(g.key, el);
                    else sectionRefs.current.delete(g.key);
                  }}
                  aria-labelledby={`shortcut-group-${g.key}`}
                  className="pt-5"
                >
                  <h3
                    id={`shortcut-group-${g.key}`}
                    className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {t(g.key)}
                  </h3>
                  {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{t(hint)}</p> : null}
                  <dl className="mt-1">
                    {g.rows.map((row, i) => {
                      // Tiêu đề con khi đổi subgroup (VD Markdown: "Gõ ở đầu dòng mới").
                      const sub = row.def.display?.subgroupKey;
                      const showSub = sub && sub !== g.rows[i - 1]?.def.display?.subgroupKey;
                      return (
                        <Fragment key={row.id}>
                          {showSub ? (
                            <div
                              role="presentation"
                              className="pb-1 pt-4 text-xs font-medium text-muted-foreground first:pt-1"
                            >
                              {t(sub)}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-4 border-b border-border py-2.5 last:border-0">
                            <dt className="min-w-0 flex-1 text-sm">{t(row.labelKey)}</dt>
                            <dd className="shrink-0">
                              <ShortcutWays def={row.def} />
                            </dd>
                          </div>
                        </Fragment>
                      );
                    })}
                  </dl>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
