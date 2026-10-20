// ============================================================
// Popup chọn icon board (spec canvas-board-icon) — layout D'.
// ============================================================
//
// Bố cục: hàng trên (ô tìm / tiêu đề) + cột trái (nguồn, rồi danh mục) + vùng phải
// + hàng dưới (Bỏ biểu tượng). Hàng trên và hàng dưới LUÔN render, popup cao cố
// định → đổi Thư viện / Tự nhập hay chọn icon đầu tiên không làm nội dung nhảy.
//
// Thư viện mở ở mục Gợi ý (gần đây + theo tên board + phổ biến), không đổ cả bộ.
// Gõ tìm → lưới ảo hoá xuyên mọi danh mục.
//
// Lưới cần cả bộ lucide (qua lib/lucide-icons) + catalog → nặng. BoardToolbar nạp
// popup qua React.lazy nên phần này nằm trong chunk riêng, chỉ tải khi mở popup.
// ============================================================

import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getLucideIcon } from '../../lib/lucide-icons';
import { ToolbarPopup } from '../ToolbarPopup';
import { useToolbarPopupClose } from '../../hooks/useToolbarPopupClose';
import { setBoardIcon } from '../../engine/actions';
import { useBoardsStore } from '../../store/boards-store';
import { useIconRecentStore } from '../../store/icon-recent-store';
import { boardInkColor, resolveBoardColor } from '../../lib/board-colors';
import { useResolvedTheme } from '@/stores/theme-store';
import { recommendIcons } from '../../lib/icon-recommend';
import { BoardIconGlyph } from './BoardIconGlyph';
import {
  ICON_CATALOG,
  ICON_CATEGORY_IDS,
  type IconCatalogEntry,
  type IconCategoryId,
} from '../../lib/icon-catalog';
import { BOARD_ICON_TEXT_MAX, type BoardIcon } from '../../types';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { FOCUS_RING } from '@/lib/focus-ring';
import { OverlayScroll } from '@/components/shared';

type Source = 'library' | 'text';
type Section = 'recommended' | IconCategoryId;

/** Lưới 6 cột, ô 36px + gap 4px → hàng cao 40px (virtualizer dùng). */
const GRID_COLS = 6;
const ROW_HEIGHT = 40;

const CATEGORY_LABEL_KEY: Record<IconCategoryId, MessageKey> = {
  arrows: 'CANVAS.ICON_PICKER.CATEGORY.ARROWS',
  files: 'CANVAS.ICON_PICKER.CATEGORY.FILES',
  communication: 'CANVAS.ICON_PICKER.CATEGORY.COMMUNICATION',
  media: 'CANVAS.ICON_PICKER.CATEGORY.MEDIA',
  devices: 'CANVAS.ICON_PICKER.CATEGORY.DEVICES',
  weather: 'CANVAS.ICON_PICKER.CATEGORY.WEATHER',
  people: 'CANVAS.ICON_PICKER.CATEGORY.PEOPLE',
  commerce: 'CANVAS.ICON_PICKER.CATEGORY.COMMERCE',
  editing: 'CANVAS.ICON_PICKER.CATEGORY.EDITING',
  nature: 'CANVAS.ICON_PICKER.CATEGORY.NATURE',
  shapes: 'CANVAS.ICON_PICKER.CATEGORY.SHAPES',
  tools: 'CANVAS.ICON_PICKER.CATEGORY.TOOLS',
  other: 'CANVAS.ICON_PICKER.CATEGORY.OTHER',
};

export default function BoardIconPopup({
  boardId,
  anchorLabel,
  onClose,
}: {
  boardId: string;
  anchorLabel: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  // anchorLabel trùng aria-label nút mở (tránh click nút đóng rồi mở lại).
  useToolbarPopupClose({ popupRef, anchorLabel, onClose });

  const board = useBoardsStore((s) => s.boards.get(boardId));
  const currentIcon = board?.icon ?? null;
  const theme = useResolvedTheme();
  // Hex thật của nền (đổi 'theme' ra trắng / đen) cho xem trước ký tự.
  const boardColor = resolveBoardColor(board?.color ?? '#71717a', theme);
  const pushRecent = useIconRecentStore((s) => s.push);
  const [source, setSource] = useState<Source>(currentIcon?.kind === 'text' ? 'text' : 'library');
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<Section>('recommended');
  const searching = query.trim() !== '';

  // Chọn icon không đóng popup (giống popup Màu). Mỗi lần đổi thật = 1 bước undo.
  const pick = (icon: BoardIcon | null) => {
    setBoardIcon(boardId, icon);
    if (icon?.kind === 'lucide') pushRecent(icon.value);
  };

  const selectSection = (next: Section) => {
    setSection(next);
    setQuery('');
  };

  return (
    <ToolbarPopup ref={popupRef} className="flex h-[420px] w-[440px] flex-col">
      {/* Hàng trên: cố định h-12 cho cả 2 nguồn. */}
      <div className="flex h-12 shrink-0 items-center border-b border-border px-2">
        {source === 'library' ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('CANVAS.ICON_PICKER.SEARCH_PLACEHOLDER')}
            aria-label={t('CANVAS.ICON_PICKER.SEARCH_PLACEHOLDER')}
            className={`h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground placeholder:text-muted-foreground ${FOCUS_RING}`}
          />
        ) : (
          <span className="select-none px-1 text-sm font-medium text-foreground">
            {t('CANVAS.ICON_PICKER.SOURCE_TEXT')}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Cột trái: nguồn, rồi danh mục (chỉ Thư viện). Không kiêm lịch sử tìm kiếm. */}
        <nav className="no-scrollbar flex w-36 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-2">
          <SideButton
            label={t('CANVAS.ICON_PICKER.SOURCE_LIBRARY')}
            active={source === 'library'}
            onClick={() => setSource('library')}
          />
          <SideButton
            label={t('CANVAS.ICON_PICKER.SOURCE_TEXT')}
            active={source === 'text'}
            onClick={() => setSource('text')}
          />
          <SideButton
            label={t('CANVAS.ICON_PICKER.SOURCE_UPLOAD')}
            disabled
            title={t('CANVAS.ICON_PICKER.UPLOAD_SOON')}
          />
          {source === 'library' ? (
            <>
              <div className="my-1.5 border-t border-border" />
              <span className="select-none px-2.5 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {t('CANVAS.ICON_PICKER.GROUP_CATEGORY')}
              </span>
              <SideButton
                label={t('CANVAS.ICON_PICKER.CATEGORY.RECOMMENDED')}
                active={section === 'recommended' && !searching}
                onClick={() => selectSection('recommended')}
              />
              {ICON_CATEGORY_IDS.map((id) => (
                <SideButton
                  key={id}
                  label={t(CATEGORY_LABEL_KEY[id])}
                  active={section === id && !searching}
                  onClick={() => selectSection(id)}
                />
              ))}
            </>
          ) : null}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col">
          {source === 'text' ? (
            <TextSource
              current={currentIcon}
              boardColor={boardColor}
              inkColor={boardInkColor(boardColor)}
              onPick={pick}
            />
          ) : !searching && section === 'recommended' ? (
            <RecommendedView boardName={board?.name ?? ''} current={currentIcon} onPick={pick} />
          ) : (
            <IconGrid query={query} section={section} current={currentIcon} onPick={pick} />
          )}
        </div>
      </div>

      {/* Hàng dưới luôn có (mờ khi chưa có icon) → chọn icon đầu tiên không đẩy lưới. */}
      <div className="shrink-0 border-t border-border p-1.5">
        <button
          type="button"
          onClick={currentIcon ? () => pick(null) : undefined}
          aria-disabled={currentIcon ? undefined : true}
          className={`flex h-8 w-full items-center justify-center rounded-md text-xs text-muted-foreground transition-colors duration-fast ${
            currentIcon ? 'hover:bg-muted hover:text-foreground' : 'opacity-40'
          }`}
        >
          {t('CANVAS.ICON_PICKER.REMOVE')}
        </button>
      </div>
    </ToolbarPopup>
  );
}

// ============================================================
// Cột trái
// ============================================================

function SideButton({
  label,
  active,
  onClick,
  disabled,
  title,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
      aria-pressed={active}
      title={title ?? label}
      className={`h-8 shrink-0 truncate rounded-md px-2.5 text-left text-xs transition-colors duration-fast ${
        disabled
          ? 'text-muted-foreground opacity-40'
          : active
            ? 'bg-muted font-medium text-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}

// ============================================================
// Gợi ý (gần đây + theo tên board + phổ biến)
// ============================================================

function RecommendedView({
  boardName,
  current,
  onPick,
}: {
  boardName: string;
  current: BoardIcon | null;
  onPick: (icon: BoardIcon) => void;
}) {
  const { t } = useI18n();
  const recentNames = useIconRecentStore((s) => s.names);
  const rec = useMemo(() => recommendIcons(boardName, recentNames), [boardName, recentNames]);
  const currentName = current?.kind === 'lucide' ? current.value : null;

  const sections: { key: string; labelKey: MessageKey; items: IconCatalogEntry[] }[] = [
    { key: 'recent', labelKey: 'CANVAS.ICON_PICKER.SECTION_RECENT', items: rec.recent },
    { key: 'name', labelKey: 'CANVAS.ICON_PICKER.SECTION_BY_NAME', items: rec.byName },
    { key: 'popular', labelKey: 'CANVAS.ICON_PICKER.SECTION_POPULAR', items: rec.popular },
  ];

  // Ít icon (tối đa ~70) → không cần ảo hoá.
  return (
    <OverlayScroll className="min-h-0 flex-1" viewportClassName="p-2">
      {sections
        .filter((s) => s.items.length > 0)
        .map((s) => (
          <section key={s.key} className="mb-3 last:mb-0">
            <h3 className="select-none px-0.5 pb-1.5 text-[11px] font-medium text-muted-foreground">
              {t(s.labelKey)}
            </h3>
            <div className="grid grid-cols-6 gap-1">
              {s.items.map((entry) => (
                <IconCell
                  key={entry.n}
                  entry={entry}
                  active={entry.n === currentName}
                  onClick={() => onPick({ kind: 'lucide', value: entry.n })}
                />
              ))}
            </div>
          </section>
        ))}
    </OverlayScroll>
  );
}

// ============================================================
// Lưới icon lucide (ảo hoá) — danh mục hoặc kết quả tìm
// ============================================================

function IconGrid({
  query,
  section,
  current,
  onPick,
}: {
  query: string;
  section: Section;
  current: BoardIcon | null;
  onPick: (icon: BoardIcon) => void;
}) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => filterIcons(query, section), [query, section]);
  const rowCount = Math.ceil(items.length / GRID_COLS);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
        {t('CANVAS.ICON_PICKER.NO_RESULTS')}
      </div>
    );
  }

  const currentName = current?.kind === 'lucide' ? current.value : null;

  return (
    <OverlayScroll ref={scrollRef} className="min-h-0 flex-1" viewportClassName="p-2">
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const rowItems = items.slice(row.index * GRID_COLS, row.index * GRID_COLS + GRID_COLS);
          return (
            <div
              key={row.key}
              className="absolute left-0 top-0 grid w-full grid-cols-6 gap-1"
              style={{ height: ROW_HEIGHT, transform: `translateY(${row.start}px)` }}
            >
              {rowItems.map((entry) => (
                <IconCell
                  key={entry.n}
                  entry={entry}
                  active={entry.n === currentName}
                  onClick={() => onPick({ kind: 'lucide', value: entry.n })}
                />
              ))}
            </div>
          );
        })}
      </div>
    </OverlayScroll>
  );
}

function IconCell({
  entry,
  active,
  onClick,
}: {
  entry: IconCatalogEntry;
  active: boolean;
  onClick: () => void;
}) {
  const Comp = getLucideIcon(entry.p);
  if (!Comp) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={entry.n}
      aria-label={entry.n}
      aria-pressed={active}
      className={`grid h-9 w-full place-items-center rounded-md border transition-colors duration-fast ${FOCUS_RING} ${
        active
          ? 'border-primary bg-primary/10 text-foreground'
          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Comp className="h-5 w-5" strokeWidth={2} />
    </button>
  );
}

// Đang tìm → lọc xuyên mọi danh mục theo tên + tag. Không tìm → theo danh mục.
function filterIcons(query: string, section: Section): IconCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (q !== '')
    return ICON_CATALOG.filter((e) => e.n.includes(q) || e.t.some((tag) => tag.includes(q)));
  if (section === 'recommended') return [];
  return ICON_CATALOG.filter((e) => e.c === section);
}

// ============================================================
// Tự nhập ký tự
// ============================================================

function TextSource({
  current,
  boardColor,
  inkColor,
  onPick,
}: {
  current: BoardIcon | null;
  boardColor: string;
  /** Màu chữ xem trước = màu icon thật trên tile (trắng / đen theo nền board). */
  inkColor: string;
  onPick: (icon: BoardIcon) => void;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(current?.kind === 'text' ? current.value : '');
  const trimmed = value.trim();

  const apply = () => {
    if (trimmed !== '') onPick({ kind: 'text', value: trimmed });
  };

  return (
    <OverlayScroll
      className="min-h-0 flex-1"
      viewportClassName="flex flex-col items-center gap-3 p-4"
    >
      <span className="select-none self-start text-xs text-muted-foreground">
        {t('CANVAS.ICON_PICKER.TEXT_PREVIEW')}
      </span>
      {/* Xem trước mô phỏng khối vuông board tile (nền = màu board). */}
      <div
        className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: boardColor }}
      >
        {trimmed !== '' ? (
          <BoardIconGlyph icon={{ kind: 'text', value: trimmed }} color={inkColor} />
        ) : null}
      </div>
      <label className="flex w-full flex-col gap-1 text-xs text-muted-foreground">
        {t('CANVAS.ICON_PICKER.TEXT_LABEL', { max: BOARD_ICON_TEXT_MAX })}
        <input
          autoFocus
          value={value}
          // Cắt theo ký tự hiển thị (emoji 2 code unit vẫn tính 1).
          onChange={(e) =>
            setValue(Array.from(e.target.value).slice(0, BOARD_ICON_TEXT_MAX).join(''))
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) apply();
          }}
          placeholder={t('CANVAS.ICON_PICKER.TEXT_PLACEHOLDER')}
          className={`h-9 rounded-md border border-border bg-background px-2 text-center text-base text-foreground placeholder:text-muted-foreground ${FOCUS_RING}`}
        />
      </label>
      <button
        type="button"
        onClick={apply}
        disabled={trimmed === ''}
        className="h-8 w-full shrink-0 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-opacity duration-fast hover:opacity-90 disabled:opacity-40"
      >
        {t('CANVAS.ICON_PICKER.TEXT_APPLY')}
      </button>
    </OverlayScroll>
  );
}
