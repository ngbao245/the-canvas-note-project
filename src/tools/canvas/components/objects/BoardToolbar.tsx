import { lazy, Suspense, useRef } from 'react';
import { useHref } from 'react-router-dom';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  CopyPlus,
  ExternalLink,
  LayoutTemplate,
  Link as LinkIcon,
  Lock,
  LockOpen,
  MoreHorizontal,
  Shapes,
  TextCursorInput,
} from 'lucide-react';
import { ActionButton, PopupActionButton } from '../Toolbar';
import { ToolbarPopup } from '../ToolbarPopup';
import { ToolbarMenuDivider, ToolbarMenuItem } from '../ToolbarMenuItem';
import { CustomColorButton, SavedColorRow, Swatch, SwatchRow } from '../ColorSwatches';
import { useToolbarPopupClose } from '../../hooks/useToolbarPopupClose';
import {
  bringToFront,
  sendToBack,
  previewBoardColor,
  setBoardColor,
  updateObjectData,
} from '../../engine/actions';
import { boardDataSchema, type BoardData, type BoardIcon, type CanvasObject } from '../../types';
import { BoardIconGlyph } from './BoardIconGlyph';
import { useBoardsStore } from '../../store/boards-store';
import { useInteractionStore } from '../../store/interaction-store';
import { showNotice } from '../../store/notice-store';
import {
  BOARD_DARK_COLORS,
  BOARD_DEFAULT_COLOR,
  BOARD_LIGHT_COLORS,
  BOARD_COLOR_THEME,
  BOARD_THEME_SWATCH_BACKGROUND,
  boardSwatchBackground,
  resolveBoardColor,
} from '../../lib/board-colors';
import { useResolvedTheme } from '@/stores/theme-store';
import { sameColor } from '../../lib/note-colors';
import { useI18n } from '@/lib/i18n';

// Popup icon nặng (cả bộ lucide + catalog) → chunk riêng, tải khi mở lần đầu.
const BoardIconPopup = lazy(() => import('./BoardIconPopup'));

/**
 * Toolbar lúc chọn 1 board tile (Milanote parity, đo MCP 2026-10-15):
 * Color, Icon, Rename, More. Board không có chế độ sửa riêng trên toolbar: Rename
 * chỉ mở ô sửa tên ngay dưới tile, toolbar giữ nguyên.
 *
 * Dismiss + Trash do Toolbar chung render.
 */

export function BoardElementActions({ object }: { object: CanvasObject }) {
  const { t } = useI18n();
  const parsed = boardDataSchema.safeParse(object.data);
  const data: BoardData = parsed.success ? parsed.data : { linkedBoardId: '', locked: false };
  const board = useBoardsStore((s) => s.boards.get(data.linkedBoardId));
  const renaming = useInteractionStore((s) => s.editingId === object.id);

  return (
    <>
      {board ? <BoardColorButton boardId={board.id} color={board.color} /> : null}
      {board ? <BoardIconButton boardId={board.id} icon={board.icon ?? null} /> : null}
      <ActionButton
        icon={TextCursorInput}
        label={t('CANVAS.BOARD_TOOLBAR.RENAME')}
        active={renaming}
        onClick={() => useInteractionStore.getState().setEditingId(object.id, null)}
      />
      <BoardMoreButton object={object} data={data} />
    </>
  );
}

// ============================================================
// Color
// ============================================================

function BoardColorButton({ boardId, color }: { boardId: string; color: string }) {
  const { t } = useI18n();
  const theme = useResolvedTheme();
  return (
    <PopupActionButton
      icon={Shapes}
      // Icon nút = khối màu hiện tại của board (Milanote), chữ đen thì chia chéo như ô popup.
      iconNode={
        <span
          aria-hidden="true"
          className="h-4 w-5 rounded-[3px] border border-border"
          style={{ background: boardSwatchBackground(resolveBoardColor(color, theme)) }}
        />
      }
      label={t('CANVAS.NOTE_COLOR.PICK')}
      renderPopup={(close) => <BoardColorPopup boardId={boardId} color={color} onClose={close} />}
    />
  );
}

function BoardColorPopup({
  boardId,
  color,
  onClose,
}: {
  boardId: string;
  color: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  // anchorLabel trùng aria-label nút mở.
  useToolbarPopupClose({ popupRef, anchorLabel: t('CANVAS.NOTE_COLOR.PICK'), onClose });

  // Chọn màu không đóng popup (Milanote). Mỗi lần đổi thật = 1 bước undo. Màu chữ /
  // icon tự tính theo nền nên mọi ô (có sẵn hay tuỳ chỉnh) áp giống nhau.
  const pick = (hex: string) => setBoardColor(boardId, hex);
  const presetActive = (hex: string) => sameColor(color, hex);

  return (
    <ToolbarPopup ref={popupRef} className="flex w-[188px] flex-col">
      {/* Phần 1 — ô Theo giao diện (trắng / đen theo theme), ô Mặc định, rồi màu nền đậm. */}
      <SwatchRow>
        <Swatch
          label={t('CANVAS.BOARD_TOOLBAR.THEME_COLOR')}
          active={color === BOARD_COLOR_THEME}
          onClick={() => pick(BOARD_COLOR_THEME)}
          className="border border-border"
          style={{ background: BOARD_THEME_SWATCH_BACKGROUND }}
        />
        <Swatch
          label={t('CANVAS.BOARD_TOOLBAR.DEFAULT_COLOR')}
          active={presetActive(BOARD_DEFAULT_COLOR)}
          onClick={() => pick(BOARD_DEFAULT_COLOR)}
          style={{ backgroundColor: BOARD_DEFAULT_COLOR }}
        />
        {BOARD_DARK_COLORS.map((s) => (
          <Swatch
            key={s.hex}
            label={s.labelKey ? t(s.labelKey) : s.hex}
            active={presetActive(s.hex)}
            onClick={() => pick(s.hex)}
            style={{ backgroundColor: s.hex }}
          />
        ))}
      </SwatchRow>
      {/* Phần 2 — nền sáng (icon/chữ đen): ô chia chéo nền / chữ. */}
      <SwatchRow divided>
        {BOARD_LIGHT_COLORS.map((s) => (
          <Swatch
            key={s.hex}
            label={s.labelKey ? t(s.labelKey) : s.hex}
            active={presetActive(s.hex)}
            onClick={() => pick(s.hex)}
            style={{ background: boardSwatchBackground(s.hex) }}
          />
        ))}
      </SwatchRow>
      {/* Phần 3 — màu tuỳ chỉnh đã lưu (chung mọi loại object) + nút chọn màu mới.
          Màu ra chữ đen cũng vẽ chia chéo như phần 2. */}
      <SavedColorRow
        value={color}
        onPick={pick}
        renderSwatch={(hex, active) => (
          <Swatch
            label={hex}
            active={active}
            onClick={() => pick(hex)}
            style={{ background: boardSwatchBackground(hex) }}
          />
        )}
      />
      <CustomColorButton
        label={t('CANVAS.NOTE_COLOR.CUSTOM')}
        value={color}
        onPick={pick}
        onPreview={(hex) => previewBoardColor(boardId, hex)}
      />
    </ToolbarPopup>
  );
}

// ============================================================
// Icon (spec canvas-board-icon)
// ============================================================

function BoardIconButton({ boardId, icon }: { boardId: string; icon: BoardIcon | null }) {
  const { t } = useI18n();
  const label = t('CANVAS.ICON_PICKER.PICK');
  return (
    <PopupActionButton
      icon={Shapes}
      // Board đã có icon → nút hiện chính icon đó; chưa có → Shapes trung tính.
      iconNode={
        icon ? (
          <span className="grid h-5 w-5 place-items-center">
            <BoardIconGlyph icon={icon} color="currentColor" iconClass="h-5 w-5" textClass="text-xs font-semibold" />
          </span>
        ) : undefined
      }
      label={label}
      renderPopup={(close) => (
        // Fallback rỗng: popup tải lần đầu rất nhanh, không chèn spinner nháy.
        <Suspense fallback={null}>
          <BoardIconPopup boardId={boardId} anchorLabel={label} onClose={close} />
        </Suspense>
      )}
    />
  );
}

// ============================================================
// More
// ============================================================

function BoardMoreButton({ object, data }: { object: CanvasObject; data: BoardData }) {
  const { t } = useI18n();
  return (
    <PopupActionButton
      icon={MoreHorizontal}
      label={t('CANVAS.NOTE_TOOLBAR.MORE')}
      renderPopup={(close) => <BoardMorePopup object={object} data={data} onClose={close} />}
    />
  );
}

function BoardMorePopup({
  object,
  data,
  onClose,
}: {
  object: CanvasObject;
  data: BoardData;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  useToolbarPopupClose({ popupRef, anchorLabel: t('CANVAS.NOTE_TOOLBAR.MORE'), onClose });
  // useHref gắn basename của router (nếu có) → link mở đúng app.
  const href = useHref(`/canvas/${data.linkedBoardId}`);
  const hasBoard = data.linkedBoardId !== '';
  const absoluteUrl = new URL(href, window.location.origin).toString();

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const openNewTab = () => {
    window.open(absoluteUrl, '_blank', 'noopener');
  };
  const copyLink = () => {
    navigator.clipboard.writeText(absoluteUrl).then(
      () => showNotice('CANVAS.BOARD_TOOLBAR.LINK_COPIED'),
      () => showNotice('CANVAS.BOARD_TOOLBAR.LINK_COPY_FAILED'),
    );
  };
  const toggleLock = () => updateObjectData(object.id, { ...data, locked: !data.locked });

  return (
    <ToolbarPopup ref={popupRef} className="flex w-56 flex-col gap-0.5 p-1">
      <ToolbarMenuItem
        icon={ExternalLink}
        label={t('CANVAS.BOARD_TOOLBAR.MENU.OPEN_NEW_TAB')}
        onClick={run(openNewTab)}
        disabled={!hasBoard}
      />
      <ToolbarMenuItem
        icon={CopyPlus}
        label={t('CANVAS.BOARD_TOOLBAR.MENU.CREATE_SHORTCUT')}
        disabled
        title={t('CANVAS.BOARD_TOOLBAR.MENU.SHORTCUT_SOON')}
      />
      <ToolbarMenuItem
        icon={LinkIcon}
        label={t('CANVAS.BOARD_TOOLBAR.MENU.COPY_LINK')}
        onClick={run(copyLink)}
        disabled={!hasBoard}
      />
      <ToolbarMenuItem
        icon={LayoutTemplate}
        label={t('CANVAS.BOARD_TOOLBAR.MENU.CONVERT_TO_TEMPLATE')}
        disabled
        title={t('CANVAS.BOARD_TOOLBAR.MENU.TEMPLATE_SOON')}
      />
      <ToolbarMenuDivider />
      <ToolbarMenuItem
        icon={data.locked ? LockOpen : Lock}
        label={t(
          data.locked
            ? 'CANVAS.NOTE_TOOLBAR.MENU.UNLOCK_POSITION'
            : 'CANVAS.NOTE_TOOLBAR.MENU.LOCK_POSITION',
        )}
        onClick={run(toggleLock)}
      />
      <ToolbarMenuDivider />
      <ToolbarMenuItem
        icon={ArrowUpToLine}
        label={t('CANVAS.NOTE_TOOLBAR.MENU.BRING_TO_FRONT')}
        onClick={run(() => bringToFront(object.id))}
      />
      <ToolbarMenuItem
        icon={ArrowDownToLine}
        label={t('CANVAS.NOTE_TOOLBAR.MENU.SEND_TO_BACK')}
        onClick={run(() => sendToBack(object.id))}
      />
    </ToolbarPopup>
  );
}
