import { useEffect, useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Ban,
  Bold,
  Code2,
  FileText,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Lock,
  LockOpen,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Quote,
  Smile,
  Strikethrough,
  Tag,
  Type,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { ActionButton, PopupActionButton } from '../Toolbar';
import { ToolbarPopup } from '../ToolbarPopup';
import { ToolbarMenuDivider, ToolbarMenuItem } from '../ToolbarMenuItem';
import { CustomColorButton, SavedColorRow, Swatch, SwatchRow } from '../ColorSwatches';
import { useToolbarPopupClose } from '../../hooks/useToolbarPopupClose';
import {
  bringToFront,
  hasObjectPreview,
  previewObjectData,
  sendToBack,
  updateObjectData,
} from '../../engine/actions';
import type { CanvasObject } from '../../types';
import { parseNoteData } from '../../lib/note-data';
import { NOTE_BG_TRANSPARENT, sameColor, type NoteColorFields } from '../../lib/note-colors';
import {
  boardSwatchBackground,
  BOARD_DARK_COLORS,
  BOARD_LIGHT_COLORS,
  type BoardSwatch,
} from '../../lib/board-colors';
import { NOTE_TEXT_COLORS, NOTE_HIGHLIGHT_COLORS, type NoteSwatch } from '../../lib/note-text-colors';
import { useNoteEditorStore } from '../../store/note-editor-store';
import { useI18n, type MessageKey } from '@/lib/i18n';
import { editKeyHandler } from '@/lib/dom';

/**
 * Note-specific toolbar actions cho element + editing mode.
 *
 * Milanote parity — toolbar là "vùng đặc biệt": mọi click trong toolbar KHÔNG
 * làm mất text selection + editing state trong Note. 2 layer bảo vệ:
 *   1. Button text-format (onMouseDown preventDefault trong ActionButton):
 *      browser không transfer focus, editor không blur, ProseMirror giữ selection.
 *   2. Popup có input focus rời editor (Link URL input): onBlur handler trong
 *      NoteEditor guard `relatedTarget.closest('[data-canvas-overlay]')` → skip
 *      commit. Sau submit/cancel, chain command `.focus()` re-focus editor.
 *
 * Dismiss + Trash do Toolbar chung render.
 */

// ============================================================
// Element mode — Note (chọn, chưa sửa)
// ============================================================

export function NoteElementActions({ object }: { object: CanvasObject }) {
  const { t } = useI18n();
  return (
    <>
      <ColorButton selectedObject={object} />
      {/* Labels/Reactions/Comment chưa làm được → vô hiệu, tooltip báo lý do.
          Labels sắp làm (spec riêng), Reactions/Comment cần đăng nhập. */}
      <ActionButton icon={Tag} label={t('CANVAS.NOTE_TOOLBAR.LABELS')} disabled title={t('CANVAS.NOTE_TOOLBAR.SOON_LABELS')} />
      <ActionButton icon={Smile} label={t('CANVAS.NOTE_TOOLBAR.REACTIONS')} disabled title={t('CANVAS.NOTE_TOOLBAR.SOON_REACTIONS')} />
      <ActionButton icon={MessageSquare} label={t('CANVAS.NOTE_TOOLBAR.COMMENT')} disabled title={t('CANVAS.NOTE_TOOLBAR.SOON_COMMENT')} />
      <MoreButton selectedObject={object} />
    </>
  );
}

// ============================================================
// Editing mode — Note (Milanote rich text, wired qua note-editor-store)
// ============================================================

export function NoteEditingActions() {
  const { t } = useI18n();
  const editor = useNoteEditorStore((s) => s.activeEditor);
  // Tick mỗi transaction (doc + selection change) → refresh active state nút.
  const [, tick] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    editor.on('transaction', tick);
    return () => {
      editor.off('transaction', tick);
    };
  }, [editor]);

  // Editor chưa mount (<1 frame): render nothing, Dismiss phía trên vẫn work.
  if (!editor) return null;

  return (
    <>
      <TextStyleButton editor={editor} />
      <ActionButton
        icon={Bold}
        label={t('CANVAS.NOTE_TOOLBAR.BOLD')}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ActionButton
        icon={Italic}
        label={t('CANVAS.NOTE_TOOLBAR.ITALIC')}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ActionButton
        icon={List}
        label={t('CANVAS.NOTE_TOOLBAR.BULLET_LIST')}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ActionButton
        icon={ListOrdered}
        label={t('CANVAS.NOTE_TOOLBAR.NUMBERED_LIST')}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <LinkButton editor={editor} />
      <ActionButton
        icon={MessageSquare}
        label={t('CANVAS.NOTE_TOOLBAR.COMMENT')}
        disabled
        title={t('CANVAS.NOTE_TOOLBAR.SOON_COMMENT')}
      />
      <MoreEditingButton editor={editor} />
    </>
  );
}

// ============================================================
// TextStyle button + popup (kiểu khối + màu chữ + tô nền)
// ============================================================

interface TextStyleOption {
  id: string;
  labelKey: MessageKey;
  // Preview tag cho user thấy hình dáng, không dùng tag thật để không lệ thuộc size.
  previewClass: string;
  withQuoteIcon?: boolean;
  isActive: (editor: Editor) => boolean;
  apply: (editor: Editor) => void;
}

const TEXT_STYLE_OPTIONS: TextStyleOption[] = [
  {
    id: 'title',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.TITLE',
    previewClass: 'font-serif text-lg font-bold',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    apply: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.HEADING',
    previewClass: 'font-serif text-base font-semibold',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    apply: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'subheading',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.SUBHEADING',
    previewClass: 'font-serif text-[13px] font-semibold',
    isActive: (e) => e.isActive('heading', { level: 3 }),
    apply: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'body',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.BODY',
    previewClass: 'font-serif text-xs',
    // Body = paragraph thường (không variant), không heading/quote/list/code.
    isActive: (e) =>
      e.isActive('paragraph', { variant: null }) &&
      !e.isActive('heading') &&
      !e.isActive('blockquote') &&
      !e.isActive('bulletList') &&
      !e.isActive('orderedList') &&
      !e.isActive('codeBlock'),
    apply: (e) => e.chain().focus().setParagraphVariant(null).run(),
  },
  {
    id: 'small',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.SMALL',
    previewClass: 'font-serif text-[10px]',
    // Small text = paragraph với data-variant='small' (xem note-paragraph-variant).
    isActive: (e) => e.isActive('paragraph', { variant: 'small' }),
    apply: (e) => e.chain().focus().setParagraphVariant('small').run(),
  },
  {
    id: 'codeBlock',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.CODE_BLOCK',
    previewClass: 'font-mono text-xs',
    isActive: (e) => e.isActive('codeBlock'),
    apply: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'callout',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.CALLOUT',
    previewClass: 'font-serif text-xs',
    // Callout = paragraph với data-variant='callout' (nền + viền trái, xem CSS).
    isActive: (e) => e.isActive('paragraph', { variant: 'callout' }),
    apply: (e) => e.chain().focus().setParagraphVariant('callout').run(),
  },
  {
    id: 'quote',
    labelKey: 'CANVAS.NOTE_TOOLBAR.STYLE.QUOTE',
    previewClass: 'font-serif text-xs italic',
    withQuoteIcon: true,
    isActive: (e) => e.isActive('blockquote'),
    apply: (e) => e.chain().focus().toggleBlockquote().run(),
  },
];

function TextStyleButton({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  return (
    <PopupActionButton
      icon={Type}
      label={t('CANVAS.NOTE_TOOLBAR.TEXT_STYLE')}
      renderPopup={(close) => <TextStylePopup editor={editor} onClose={close} />}
    />
  );
}

function TextStylePopup({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  useToolbarPopupClose({
    popupRef,
    anchorLabel: t('CANVAS.NOTE_TOOLBAR.TEXT_STYLE'),
    onClose,
    onRefocus: () => editor.chain().focus().run(),
  });

  const currentColor = (editor.getAttributes('textStyle').color as string | undefined) ?? null;
  const currentHighlight = (editor.getAttributes('highlight').color as string | undefined) ?? null;

  const applyColor = (hex: string | null) => {
    if (hex) editor.chain().focus().setColor(hex).run();
    else editor.chain().focus().unsetColor().run();
  };
  const applyHighlight = (hex: string | null) => {
    if (hex) editor.chain().focus().toggleHighlight({ color: hex }).run();
    else editor.chain().focus().unsetHighlight().run();
  };

  return (
    <ToolbarPopup ref={popupRef} className="flex max-h-[70vh] w-52 flex-col gap-2 overflow-y-auto p-1">
      {/* Nhóm kiểu khối */}
      <div className="flex flex-col gap-0.5">
        {TEXT_STYLE_OPTIONS.map((opt) => {
          const active = opt.isActive(editor);
          return (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                opt.apply(editor);
                onClose();
              }}
              className={`flex h-8 items-center rounded-md px-2 text-left transition-colors duration-fast hover:bg-muted ${
                active ? 'bg-muted text-foreground' : 'text-muted-foreground'
              }`}
            >
              {opt.withQuoteIcon ? <Quote className="mr-2 h-3.5 w-3.5 shrink-0" /> : null}
              <span className={opt.previewClass}>{t(opt.labelKey)}</span>
            </button>
          );
        })}
      </div>

      <MarkSwatchGroup
        title={t('CANVAS.NOTE_TOOLBAR.STYLE.COLOR')}
        swatches={NOTE_TEXT_COLORS}
        current={currentColor}
        onPick={applyColor}
        faceStyle={(hex) => ({ color: hex ?? 'var(--foreground)' })}
      />
      <MarkSwatchGroup
        title={t('CANVAS.NOTE_TOOLBAR.STYLE.HIGHLIGHT')}
        swatches={NOTE_HIGHLIGHT_COLORS}
        current={currentHighlight}
        onPick={applyHighlight}
        clearAsIcon
        // Nền tô là màu nhạt (data) → chữ mẫu tối cố định cho đọc được.
        faceStyle={(hex) => (hex ? { backgroundColor: hex, color: '#1f2937' } : undefined)}
      />
    </ToolbarPopup>
  );
}

/** Nhóm ô màu trong Text style (màu chữ / tô nền). Ô `hex: null` = bỏ màu. */
function MarkSwatchGroup({
  title,
  swatches,
  current,
  onPick,
  faceStyle,
  clearAsIcon,
}: {
  title: string;
  swatches: readonly NoteSwatch[];
  current: string | null;
  onPick: (hex: string | null) => void;
  faceStyle: (hex: string | null) => CSSProperties | undefined;
  /** Ô bỏ màu vẽ dấu cấm (tô nền). Thiếu → chữ A màu mặc định (màu chữ). */
  clearAsIcon?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="border-t border-border pt-2">
      <div className="px-1 pb-1 text-[10px] font-medium uppercase text-muted-foreground">{title}</div>
      <div className="flex gap-1 px-1">
        {swatches.map((c) => {
          const label = t(c.labelKey);
          return (
            <button
              key={c.id}
              type="button"
              // Giữ focus editor → lệnh màu áp đúng vùng chữ đang chọn.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(c.hex)}
              title={label}
              aria-label={label}
              aria-pressed={c.hex === current}
              className={`grid h-7 w-7 place-items-center rounded-md border text-sm font-semibold text-foreground transition-transform duration-fast hover:scale-105 ${
                c.hex === current ? 'border-primary ring-1 ring-primary' : 'border-border'
              }`}
              style={faceStyle(c.hex)}
            >
              {c.hex === null && clearAsIcon ? <Ban className="h-3.5 w-3.5" /> : 'A'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// More button lúc SỬA — Underline, Strike, Code, Align (Milanote parity)
// ============================================================

function MoreEditingButton({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  return (
    <PopupActionButton
      icon={MoreHorizontal}
      label={t('CANVAS.NOTE_TOOLBAR.MORE')}
      renderPopup={(close) => <MoreEditingPopup editor={editor} onClose={close} />}
    />
  );
}

function MoreEditingPopup({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  useToolbarPopupClose({
    popupRef,
    anchorLabel: t('CANVAS.NOTE_TOOLBAR.MORE'),
    onClose,
    onRefocus: () => editor.chain().focus().run(),
  });

  const align = (side: 'left' | 'center' | 'right') => editor.chain().focus().setTextAlign(side).run();

  return (
    <ToolbarPopup ref={popupRef} className="flex w-44 flex-col gap-0.5 p-1">
      <ToolbarMenuItem
        icon={Code2}
        label={t('CANVAS.NOTE_TOOLBAR.CODE')}
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />
      <ToolbarMenuItem
        icon={UnderlineIcon}
        label={t('CANVAS.NOTE_TOOLBAR.UNDERLINE')}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />
      <ToolbarMenuItem
        icon={Strikethrough}
        label={t('CANVAS.NOTE_TOOLBAR.STRIKE')}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      />
      <ToolbarMenuDivider />
      <ToolbarMenuItem
        icon={AlignLeft}
        label={t('CANVAS.NOTE_TOOLBAR.ALIGN_LEFT')}
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => align('left')}
      />
      <ToolbarMenuItem
        icon={AlignCenter}
        label={t('CANVAS.NOTE_TOOLBAR.ALIGN_CENTER')}
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => align('center')}
      />
      <ToolbarMenuItem
        icon={AlignRight}
        label={t('CANVAS.NOTE_TOOLBAR.ALIGN_RIGHT')}
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => align('right')}
      />
    </ToolbarPopup>
  );
}

// ============================================================
// More button lúc CHỌN — Lock/Front/Back/Convert (Milanote parity)
// ============================================================

function MoreButton({ selectedObject }: { selectedObject: CanvasObject }) {
  const { t } = useI18n();
  return (
    <PopupActionButton
      icon={MoreHorizontal}
      label={t('CANVAS.NOTE_TOOLBAR.MORE')}
      renderPopup={(close) => <MorePopup selectedObject={selectedObject} onClose={close} />}
    />
  );
}

function MorePopup({
  selectedObject,
  onClose,
}: {
  selectedObject: CanvasObject;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  useToolbarPopupClose({ popupRef, anchorLabel: t('CANVAS.NOTE_TOOLBAR.MORE'), onClose });

  const parsed = parseNoteData(selectedObject.data);
  const locked = parsed.locked;

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <ToolbarPopup ref={popupRef} className="flex w-48 flex-col gap-0.5 p-1">
      <ToolbarMenuItem
        icon={FileText}
        label={t('CANVAS.NOTE_TOOLBAR.MENU.CONVERT_TO_DOCUMENT')}
        disabled
        title={t('CANVAS.NOTE_TOOLBAR.MENU.CONVERT_SOON')}
      />
      <ToolbarMenuItem
        icon={locked ? LockOpen : Lock}
        label={t(
          locked ? 'CANVAS.NOTE_TOOLBAR.MENU.UNLOCK_POSITION' : 'CANVAS.NOTE_TOOLBAR.MENU.LOCK_POSITION',
        )}
        onClick={run(() => updateObjectData(selectedObject.id, { ...parsed, locked: !locked }))}
      />
      {/* Cùng icon với More của board. */}
      <ToolbarMenuItem
        icon={ArrowUpToLine}
        label={t('CANVAS.NOTE_TOOLBAR.MENU.BRING_TO_FRONT')}
        onClick={run(() => bringToFront(selectedObject.id))}
      />
      <ToolbarMenuItem
        icon={ArrowDownToLine}
        label={t('CANVAS.NOTE_TOOLBAR.MENU.SEND_TO_BACK')}
        onClick={run(() => sendToBack(selectedObject.id))}
      />
    </ToolbarPopup>
  );
}

// ============================================================
// Link button + popup
// ============================================================

function LinkButton({ editor }: { editor: Editor }) {
  const { t } = useI18n();
  return (
    <PopupActionButton
      icon={LinkIcon}
      label={t('CANVAS.NOTE_TOOLBAR.LINK')}
      active={editor.isActive('link')}
      renderPopup={(close) => <LinkPopup editor={editor} onClose={close} />}
    />
  );
}

function LinkPopup({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { t } = useI18n();
  const popupRef = useRef<HTMLDivElement>(null);
  const currentHref = (editor.getAttributes('link').href as string | undefined) ?? '';
  const [value, setValue] = useState(currentHref);
  const hasLink = Boolean(currentHref);
  // Selection empty + không có link cũ → không đủ context để wrap link.
  const selectionEmpty = editor.state.selection.empty;
  const canSave = value.trim().length > 0 && (!selectionEmpty || hasLink);
  useToolbarPopupClose({
    popupRef,
    anchorLabel: t('CANVAS.NOTE_TOOLBAR.LINK'),
    onClose,
    onRefocus: () => editor.chain().focus().run(),
  });

  const save = () => {
    const href = value.trim();
    if (!canSave) return;
    // extendMarkRange: caret trong link cũ → expand selection toàn link text.
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    onClose();
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    onClose();
  };

  const cancel = () => {
    onClose();
    editor.chain().focus().run();
  };

  return (
    <ToolbarPopup ref={popupRef} className="flex w-56 flex-col gap-2 p-2">
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={editKeyHandler({ onCommit: save })}
        placeholder="https://..."
        autoFocus
        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="h-7 flex-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-colors duration-fast hover:bg-primary/90 disabled:opacity-40"
        >
          {t('CANVAS.NOTE_TOOLBAR.LINK_SAVE')}
        </button>
        {hasLink ? (
          <button
            type="button"
            onClick={remove}
            className="h-7 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
          >
            {t('CANVAS.NOTE_TOOLBAR.LINK_REMOVE')}
          </button>
        ) : null}
        <button
          type="button"
          onClick={cancel}
          className="h-7 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
        >
          {t('CANVAS.NOTE_TOOLBAR.LINK_CANCEL')}
        </button>
      </div>
    </ToolbarPopup>
  );
}

// ============================================================
// Color button + popup (Note element mode, spec canvas-note-color)
// 2 tab: Background (nền cả note) / Top strip (thanh trên đầu). Parity Milanote.
// ============================================================

type ColorTab = 'background' | 'strip';

function ColorButton({ selectedObject }: { selectedObject: CanvasObject }) {
  const { t } = useI18n();
  const parsed = parseNoteData(selectedObject.data);

  // Chọn màu KHÔNG đóng popup (Milanote). Mỗi lần đổi thật = 1 bước undo.
  const apply = (fields: Partial<NoteColorFields>) => {
    const next = { ...parsed, ...fields };
    const same =
      sameColor(next.color, parsed.color) &&
      sameColor(next.background, parsed.background) &&
      sameColor(next.textColor, parsed.textColor);
    // Đang xem trước: `parsed` là màu xem trước, trùng vẫn phải ghi (so bản gốc trong action).
    if (same && !hasObjectPreview(selectedObject.id)) return;
    updateObjectData(selectedObject.id, next);
  };
  const preview = (fields: Partial<NoteColorFields>) =>
    previewObjectData(selectedObject.id, { ...parsed, ...fields });

  const hasColor = Boolean(parsed.color || parsed.background || parsed.textColor);

  return (
    <PopupActionButton
      icon={Palette}
      iconNode={hasColor ? <ColorPreviewIcon fields={parsed} /> : undefined}
      label={t('CANVAS.NOTE_COLOR.PICK')}
      renderPopup={(close) => (
        <ColorPopup fields={parsed} onApply={apply} onPreview={preview} onClose={close} />
      )}
    />
  );
}

/** Icon nút Màu vẽ lại màu hiện tại của note: nền + thanh (+ chữ "A" nếu có màu chữ đi kèm). */
function ColorPreviewIcon({ fields }: { fields: NoteColorFields }) {
  const transparent = fields.background === NOTE_BG_TRANSPARENT;
  return (
    <span
      aria-hidden="true"
      className={`relative grid h-4 w-5 place-items-center overflow-hidden rounded-[2px] border border-border ${
        fields.background && !transparent ? '' : 'bg-card'
      }`}
      style={fields.background && !transparent ? { backgroundColor: fields.background } : undefined}
    >
      {fields.color ? (
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: fields.color }} />
      ) : null}
      {fields.textColor ? (
        <span className="text-[10px] font-semibold leading-none" style={{ color: fields.textColor }}>
          A
        </span>
      ) : null}
    </span>
  );
}

function ColorPopup({
  fields,
  onApply,
  onPreview,
  onClose,
}: {
  fields: NoteColorFields;
  onApply: (fields: Partial<NoteColorFields>) => void;
  /** Kéo trong bảng màu tuỳ chỉnh: đổi ngay, không lưu, không undo. */
  onPreview: (fields: Partial<NoteColorFields>) => void;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  // Mở popup luôn ở tab Background (Milanote).
  const [tab, setTab] = useState<ColorTab>('background');
  // anchorLabel phải TRÙNG aria-label nút mở (dùng cùng key CANVAS.NOTE_COLOR.PICK).
  useToolbarPopupClose({ popupRef, anchorLabel: t('CANVAS.NOTE_COLOR.PICK'), onClose });

  const isBg = tab === 'background';
  // Màu thường (chuẩn, gợi ý, tự chọn) theo tab. Nền: bỏ màu chữ đi kèm.
  const applyPlain = (mode: ColorTab, hex: string | null) =>
    mode === 'background' ? onApply({ background: hex, textColor: null }) : onApply({ color: hex });
  const isPlainActive = (mode: ColorTab, hex: string | null) =>
    mode === 'background'
      ? sameColor(fields.background, hex) && fields.textColor === null
      : sameColor(fields.color, hex);

  // Chữ note luôn tự tính theo nền (bạn chốt 2026-10-16): dùng chung 2 hàng 10 ô với
  // board — phần ra chữ trắng (ô trơn) và phần ra chữ đen (ô chia chéo).
  const renderStandard = (mode: ColorTab, list: readonly BoardSwatch[]) =>
    list.map((s) => (
      <PlainSwatch
        key={s.hex}
        hex={s.hex}
        label={s.labelKey ? t(s.labelKey) : s.hex}
        mode={mode}
        active={isPlainActive(mode, s.hex)}
        onClick={() => applyPlain(mode, s.hex)}
      />
    ));

  const renderPanel = (mode: ColorTab) => {
    const bg = mode === 'background';
    return (
      <>
        <SwatchRow>
          {bg ? (
            <Swatch
              label={t('CANVAS.NOTE_COLOR.NONE')}
              active={fields.background === null && fields.textColor === null}
              onClick={() => onApply({ background: null, textColor: null })}
              className="border border-border bg-card"
            />
          ) : (
            <Swatch
              label={t('CANVAS.NOTE_COLOR.REMOVE')}
              active={fields.color === null}
              onClick={() => onApply({ color: null })}
              className="border border-border bg-card"
              // Gạch chéo đỏ = bỏ màu (Milanote).
              style={{
                backgroundImage:
                  'linear-gradient(to top right, transparent calc(50% - 1px), var(--destructive) calc(50% - 1px), var(--destructive) calc(50% + 1px), transparent calc(50% + 1px))',
              }}
            />
          )}
          {renderStandard(mode, BOARD_DARK_COLORS)}
          {bg ? (
            <Swatch
              label={t('CANVAS.NOTE_COLOR.TRANSPARENT')}
              active={fields.background === NOTE_BG_TRANSPARENT}
              onClick={() => onApply({ background: NOTE_BG_TRANSPARENT, textColor: null })}
              className="border border-border"
              // Ô caro = trong suốt.
              style={{
                background:
                  'repeating-conic-gradient(var(--muted) 0 25%, transparent 0 50%) 0 0 / 10px 10px',
              }}
            />
          ) : null}
        </SwatchRow>

        {/* Phần 2 — màu ra chữ đen. */}
        <SwatchRow divided>{renderStandard(mode, BOARD_LIGHT_COLORS)}</SwatchRow>

        {/* Phần 3 — màu tuỳ chỉnh đã lưu, chung với board. */}
        <SavedColorRow
          value={bg ? fields.background : fields.color}
          onPick={(hex) => applyPlain(mode, hex)}
          renderSwatch={(hex) => (
            <PlainSwatch
              hex={hex}
              label={hex}
              mode={mode}
              active={isPlainActive(mode, hex)}
              onClick={() => applyPlain(mode, hex)}
            />
          )}
        />
      </>
    );
  };

  // Rộng = 10 ô 24px + 9 khe 4px + lề 2×12px.
  return (
    <ToolbarPopup ref={popupRef} className="flex w-[188px] flex-col">
      <div className="grid grid-cols-2 gap-1 p-3 pb-2" role="tablist">
        <ColorTabButton
          active={isBg}
          onClick={() => setTab('background')}
          label={t('CANVAS.NOTE_COLOR.TAB_BACKGROUND')}
          icon={<span className="h-4 w-5 rounded-[2px] bg-muted-foreground" />}
        />
        <ColorTabButton
          active={!isBg}
          onClick={() => setTab('strip')}
          label={t('CANVAS.NOTE_COLOR.TAB_TOP_STRIP')}
          icon={
            <span className="h-4 w-5 rounded-[2px] border-[1.5px] border-muted-foreground border-t-[4px]" />
          }
        />
      </div>

      {/* 2 tab chồng cùng 1 ô lưới, tab ẩn dùng `invisible` (vẫn chiếm chỗ): popup luôn
          cao bằng tab dài nhất → đổi tab không co giãn, không bị đẩy lên / xuống. */}
      <div className="grid">
        {(['background', 'strip'] as const).map((mode) => (
          <div
            key={mode}
            role="tabpanel"
            aria-hidden={tab !== mode || undefined}
            className={`[grid-area:1/1] flex flex-col ${tab === mode ? '' : 'invisible'}`}
          >
            {renderPanel(mode)}
          </div>
        ))}
      </div>

      <CustomColorButton
        label={t('CANVAS.NOTE_COLOR.CUSTOM')}
        value={(isBg ? fields.background : fields.color) ?? '#ffffff'}
        onPick={(hex) => applyPlain(tab, hex)}
        onPreview={(hex) => onPreview(isBg ? { background: hex, textColor: null } : { color: hex })}
      />
    </ToolbarPopup>
  );
}

function ColorTabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition-colors duration-fast ${
        active ? 'bg-muted text-foreground' : 'text-muted-foreground opacity-60 hover:opacity-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/** Ô màu thường: tab nền tô kín; tab thanh vẽ khung card + thanh màu trên đầu. */
function PlainSwatch({
  hex,
  label,
  mode,
  active,
  onClick,
}: {
  hex: string;
  label: string;
  mode: ColorTab;
  active: boolean;
  onClick: () => void;
}) {
  if (mode === 'background') {
    // Nền ra chữ đen vẽ chia chéo (nửa nền, nửa mực đen), như popup Màu board.
    return <Swatch label={label} active={active} onClick={onClick} style={{ background: boardSwatchBackground(hex) }} />;
  }
  return (
    <Swatch label={label} active={active} onClick={onClick} className="overflow-hidden border border-border bg-card">
      <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: hex }} />
    </Swatch>
  );
}
