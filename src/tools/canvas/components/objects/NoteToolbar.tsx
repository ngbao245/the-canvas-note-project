import { useEffect, useReducer, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Ban,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  MessageSquare,
  MoreHorizontal,
  Palette,
  Quote,
  Smile,
  Tag,
  Type,
} from 'lucide-react';
import { ActionButton } from '../Toolbar';
import { ToolbarPopup, useToolbarPopupClose } from '../ToolbarPopup';
import { updateObjectData } from '../../engine/actions';
import { noteDataSchema, type CanvasObject } from '../../types';
import { NOTE_COLOR_PALETTE } from '../../lib/note-colors';
import { useNoteEditorStore } from '../../store/note-editor-store';

/**
 * Note-specific toolbar actions cho element + editing mode.
 *
 * Milanote parity — toolbar là "vùng đặc biệt": mọi click trong toolbar KHÔNG
 * làm mất text selection + editing state trong Note. 2 layer bảo vệ:
 *   1. Button text-format (Bold/Italic/UL/OL/TextStyle/Link toggle):
 *      onMouseDown preventDefault → browser không transfer focus, editor
 *      không blur, ProseMirror giữ selection highlight visually.
 *   2. Popup có input focus rời editor (Link URL input, TextStyle list):
 *      focus SẼ chuyển vào input (không thể preventDefault vì user cần gõ).
 *      onBlur handler trong NoteEditor guard `relatedTarget.closest(
 *      '[data-canvas-overlay]')` → skip commit, giữ editing state. Sau khi
 *      submit/cancel popup, chain command dùng `.focus()` re-focus editor.
 *
 * Dismiss button không nằm ở đây — Toolbar tự render Dismiss chung cho mọi
 * type. Trash footer cũng chung.
 */

// ============================================================
// Element mode — Note
// ============================================================

export function NoteElementActions({ object }: { object: CanvasObject }) {
  return (
    <>
      <ColorButton selectedObject={object} />
      <ActionButton icon={Tag} label="Labels" />
      <ActionButton icon={Smile} label="Reactions" />
      <ActionButton icon={MessageSquare} label="Comment" />
      <ActionButton icon={MoreHorizontal} label="More" />
    </>
  );
}

// ============================================================
// Editing mode — Note (Milanote rich text, wired qua note-editor-store)
// ============================================================

export function NoteEditingActions() {
  const editor = useNoteEditorStore((s) => s.activeEditor);
  // Tick counter: mỗi transaction (doc change) và selectionUpdate (caret di
  // chuyển) → force re-render để `editor.isActive(...)` refresh cho highlight
  // button (active state). Không tick thì click Bold xong button không đổi màu
  // vì React không biết mark đã đổi.
  const [, tick] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!editor) return;
    // 'transaction' fire cho MỌI dispatch ProseMirror (doc change + selection
    // change). 'selectionUpdate' là subset của 'transaction' → redundant, chỉ
    // giữ 'transaction' đủ cover cả 2 case (Bold state khi caret vào đoạn đã
    // bold + doc thay đổi sau toggle).
    editor.on('transaction', tick);
    return () => {
      editor.off('transaction', tick);
    };
  }, [editor]);

  // Editor chưa mount (race giữa Toolbar render và NoteEditor mount effect):
  // render nothing, DismissButton phía trên vẫn work. Chỉ diễn ra <1 frame.
  if (!editor) return null;

  return (
    <>
      <TextStyleButton editor={editor} />
      <ActionButton
        icon={Bold}
        label="Đậm"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ActionButton
        icon={Italic}
        label="Nghiêng"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ActionButton
        icon={List}
        label="Bulleted list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ActionButton
        icon={ListOrdered}
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <LinkButton editor={editor} />
      <ActionButton icon={MessageSquare} label="Comment" />
      <ActionButton icon={MoreHorizontal} label="More" />
    </>
  );
}

// ============================================================
// TextStyle button + popup
// ============================================================

type TextStyleId = 'title' | 'heading' | 'subheading' | 'body' | 'quote';

interface TextStyleOption {
  id: TextStyleId;
  label: string;
  // Preview tag cho user thấy hình dáng. Không dùng `<h1>` thật để không lệ
  // thuộc kích thước heading, chỉ minh hoạ font-size/weight.
  previewClass: string;
  isActive: (editor: Editor) => boolean;
  apply: (editor: Editor) => void;
}

const TEXT_STYLE_OPTIONS: TextStyleOption[] = [
  {
    id: 'title',
    label: 'Title',
    previewClass: 'font-serif text-lg font-bold',
    isActive: (e) => e.isActive('heading', { level: 1 }),
    apply: (e) => e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading',
    label: 'Heading',
    previewClass: 'font-serif text-base font-semibold',
    isActive: (e) => e.isActive('heading', { level: 2 }),
    apply: (e) => e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'subheading',
    label: 'Subheading',
    previewClass: 'font-serif text-[13px] font-semibold',
    isActive: (e) => e.isActive('heading', { level: 3 }),
    apply: (e) => e.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'body',
    label: 'Body',
    previewClass: 'font-serif text-xs',
    // Body = paragraph. isActive('paragraph') vẫn true trong list item nếu
    // paragraph là child — chỉ đánh dấu active khi node ngoài cùng là paragraph
    // (không phải heading/quote/list). Đơn giản: paragraph active + không phải
    // heading/quote/list.
    isActive: (e) =>
      e.isActive('paragraph') &&
      !e.isActive('heading') &&
      !e.isActive('blockquote') &&
      !e.isActive('bulletList') &&
      !e.isActive('orderedList'),
    apply: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: 'quote',
    label: 'Quote',
    previewClass: 'font-serif text-xs italic',
    isActive: (e) => e.isActive('blockquote'),
    apply: (e) => e.chain().focus().toggleBlockquote().run(),
  },
];

function TextStyleButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ActionButton icon={Type} label="Text style" active={open} onClick={() => setOpen((o) => !o)} />
      {open ? (
        <TextStylePopup editor={editor} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function TextStylePopup({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const popupRef = useRef<HTMLDivElement>(null);
  useToolbarPopupClose({
    popupRef,
    anchorLabel: 'Text style',
    onClose,
    onRefocus: () => editor.chain().focus().run(),
  });

  return (
    <ToolbarPopup ref={popupRef} className="flex w-40 flex-col gap-0.5 p-1">
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
            className={`flex h-8 items-center rounded-md px-2 text-left transition-colors duration-[60ms] hover:bg-muted ${
              active ? 'bg-muted text-foreground' : 'text-muted-foreground'
            }`}
          >
            {opt.id === 'quote' ? (
              <Quote className="mr-2 h-3.5 w-3.5 shrink-0" />
            ) : null}
            <span className={opt.previewClass}>{opt.label}</span>
          </button>
        );
      })}
    </ToolbarPopup>
  );
}

// ============================================================
// Link button + popup
// ============================================================

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ActionButton
        icon={LinkIcon}
        label="Link"
        active={open || editor.isActive('link')}
        onClick={() => setOpen((o) => !o)}
      />
      {open ? (
        <LinkPopup editor={editor} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function LinkPopup({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const popupRef = useRef<HTMLDivElement>(null);
  const currentHref = (editor.getAttributes('link').href as string | undefined) ?? '';
  const [value, setValue] = useState(currentHref);
  const hasLink = Boolean(currentHref);
  // Selection empty + không có link cũ → không đủ context để wrap link (không
  // có text để phủ). User phải chọn text trước, hoặc caret trong link cũ để
  // đổi URL. Disable Save trong case này.
  const selectionEmpty = editor.state.selection.empty;
  const canSave = value.trim().length > 0 && (!selectionEmpty || hasLink);
  useToolbarPopupClose({
    popupRef,
    anchorLabel: 'Link',
    onClose,
    onRefocus: () => editor.chain().focus().run(),
  });

  const save = () => {
    const href = value.trim();
    if (!canSave) return;
    // extendMarkRange: nếu caret đang giữa link cũ, expand selection ra toàn
    // link text → user không cần bôi đen chính xác đoạn cũ mới đổi URL được.
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
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
        }}
        placeholder="https://..."
        autoFocus
        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
      <div className="flex gap-1">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="h-7 flex-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-colors duration-[60ms] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
        {hasLink ? (
          <button
            type="button"
            onClick={remove}
            className="h-7 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
          >
            Remove
          </button>
        ) : null}
        <button
          type="button"
          onClick={cancel}
          className="h-7 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </ToolbarPopup>
  );
}

// ============================================================
// Color button + popup (Note element mode)
// ============================================================

function ColorButton({ selectedObject }: { selectedObject: CanvasObject }) {
  const [open, setOpen] = useState(false);
  const parsed = noteDataSchema.safeParse(selectedObject.data);
  const currentColor = parsed.success ? parsed.data.color : null;

  const applyColor = (color: string | null) => {
    // Ensure data hợp lệ: nếu safeParse fail (data cũ bất thường), fill defaults
    // matching schema mới (drop title, body HTML).
    const base = parsed.success
      ? parsed.data
      : { body: '<p></p>', color: null, heightMode: 'auto' as const };
    updateObjectData(selectedObject.id, { ...base, color });
    setOpen(false);
  };

  return (
    <div className="relative">
      <ActionButton icon={Palette} label="Chọn màu" active={open} onClick={() => setOpen((o) => !o)} />
      {open ? (
        <ColorPopup
          currentColor={currentColor}
          onSelect={applyColor}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ColorPopup({
  currentColor,
  onSelect,
  onClose,
}: {
  currentColor: string | null;
  onSelect: (color: string | null) => void;
  onClose: () => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);
  // Element mode — không có editor active, không cần onRefocus.
  useToolbarPopupClose({ popupRef, anchorLabel: 'Chọn màu', onClose });

  return (
    <ToolbarPopup ref={popupRef} className="flex w-[104px] flex-col gap-2 p-2">
      <button
        type="button"
        onClick={() => onSelect(null)}
        title="Mặc định"
        aria-label="Mặc định"
        className={`flex h-8 w-full items-center justify-center gap-1 rounded-md border border-border text-xs text-muted-foreground transition-colors duration-[60ms] hover:bg-muted hover:text-foreground ${
          currentColor === null ? 'ring-2 ring-primary' : ''
        }`}
      >
        <Ban className="h-3.5 w-3.5" />
        <span>Default</span>
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        {NOTE_COLOR_PALETTE.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.hex)}
            title={c.label}
            aria-label={c.label}
            style={{ backgroundColor: c.hex }}
            className={`h-8 w-full rounded-md transition-transform duration-[60ms] hover:scale-105 ${
              currentColor === c.hex ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''
            }`}
          />
        ))}
      </div>
    </ToolbarPopup>
  );
}
