import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import { registerObjectType, type ObjectRendererProps } from '../../hooks/useObjectRegistry';
import type { NoteData } from '../../types';
import { applyResize, updateObjectData } from '../../engine/actions';
import { useObjectsStore } from '../../store/objects-store';
import { useCurrentBoardStore } from '../../store/current-board-store';
import { useInteractionStore } from '../../store/interaction-store';
import { useNoteEditorStore } from '../../store/note-editor-store';
import { parseNoteData } from '../../lib/note-data';
import { NOTE_SCHEMA_EXTENSIONS, sanitizeNoteHtml } from '../../lib/note-schema';
import { useCardClipper } from '../../hooks/useCardClipper';
import { CardClipperButton } from '../CardClipperButton';
import { ObjectShell } from './ObjectShell';
import { NoteElementActions, NoteEditingActions } from './NoteToolbar';
import { isImeComposing } from '@/lib/dom';

/** Padding dọc py-6 (24 trên + 24 dưới), xem NOTE_WRAPPER_CLASS.
 *  Empty note 68 = 1 dòng text-sm ~20 + padding dọc 48.
 *  Cộng vào scrollHeight content để ra geometry.height cuối. Đổi padding class
 *  thì cập nhật hằng này đồng bộ (chỉ tính dọc). */
const NOTE_VERTICAL_PADDING = 48;
/** Height tối thiểu = Milanote note rỗng (đo từ DOM `contain-intrinsic-size:
 *  338px 68px`). Không cho note nhỏ hơn 1 dòng. */
const NOTE_MIN_HEIGHT = 68;
/** Wrapper class chung view + editor. Padding px-5 py-6 khớp Milanote (ngang
 *  20 gọn, dọc 24 thở). `overflow-visible` để CardClipperButton absolute bên
 *  phải (right: -32px) không bị clip. */
const NOTE_WRAPPER_CLASS = 'relative h-full w-full overflow-visible px-5 py-6';

/**
 * Grow-only auto height (Milanote parity):
 *   - Đo scrollHeight (layout-based, không bị camera transform scale) + cộng
 *     padding wrapper → target height. Threshold >1px bỏ noise sub-pixel.
 *   - Chỉ GROW khi content vượt geometry hiện tại. Không shrink dưới current.
 *   - User kéo corner cao lên → geometry.height = value user set. Content
 *     nhỏ hơn giữ value đó (khoảng thở phía dưới). Content lớn hơn → grow theo.
 *   - User xoá content → giữ baseline user đã kéo, không shrink.
 *   - Muốn nhỏ lại → user kéo corner xuống manual.
 *   - applyResize silent (không push history) — auto-grow là visual sync,
 *     không phải user action.
 */
function syncHeightToContent(
  objectId: string,
  contentEl: HTMLElement,
  heightMode: NoteData['heightMode'],
): void {
  // Fixed mode: user đã kéo corner explicit set height. Content vượt → clip +
  // fade overlay (Milanote parity). KHÔNG grow. Xem CardContentWrapper.
  if (heightMode === 'fixed') return;
  // Đang resize: user drag corner. Skip để không fight update — sau drop
  // onResizeCommit set 'fixed' → RO sau đó luôn skip.
  if (useInteractionStore.getState().mode === 'resizing') return;

  const contentH = Math.max(NOTE_MIN_HEIGHT, contentEl.scrollHeight + NOTE_VERTICAL_PADDING);
  const cur = useObjectsStore.getState().objects.get(objectId);
  if (!cur) return;
  if (contentH <= cur.geometry.height + 1) return; // shrink hoặc equal → skip
  applyResize(objectId, { height: contentH });
}

/**
 * Setup ResizeObserver auto-grow height Note theo content. Dùng chung view
 * mode (ref = content div) + editor mode (ref = ProseMirror DOM).
 * Fire mọi layout change: body update, wrap khi width đổi, font load reflow,
 * undo/redo, ...
 */
function useNoteAutoGrow(
  objectId: string,
  contentRef: { current: HTMLElement | null },
  heightMode: NoteData['heightMode'],
  // Deps thêm để re-run khi editor mount xong (contentRef trỏ ProseMirror DOM).
  extraDep?: unknown,
): void {
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => syncHeightToContent(objectId, el, heightMode);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure(); // initial
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, heightMode, extraDep]);
}

/**
 * Detect content overflow (contentEl.scrollHeight > wrapper.clientHeight) qua
 * ResizeObserver + measure. Return true nếu content bị clip → renderer show
 * fade overlay. Chỉ có ý nghĩa khi wrapper `overflow-hidden` (fixed mode).
 */
function useContentOverflow(
  wrapperRef: { current: HTMLElement | null },
  contentRef: { current: HTMLElement | null },
  extraDep?: unknown,
): boolean {
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const wrap = wrapperRef.current;
    const cont = contentRef.current;
    if (!wrap || !cont) return;
    const check = () => setOverflow(cont.scrollHeight > wrap.clientHeight + 1);
    const ro = new ResizeObserver(check);
    ro.observe(wrap);
    ro.observe(cont);
    check();
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraDep]);
  return overflow;
}

/**
 * Fade overlay bottom — Milanote "sương mờ" hint content bị clip trong fixed
 * mode. Gradient từ transparent → card bg, absolute h-8 (32px) bottom.
 * pointer-events-none để không cản click content.
 */
function FadeOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
      style={{
        background:
          'linear-gradient(to bottom, transparent 0%, var(--card) 100%)',
      }}
    />
  );
}

/**
 * Note — Milanote parity rich text qua Tiptap.
 *
 *   - Mỗi Enter = paragraph mới (`<p>`), không xuống dòng trong 1 paragraph.
 *     StarterKit paragraph node default.
 *   - Heading/bold/italic/list/link: user chọn qua toolbar editing mode
 *     (NoteToolbar.tsx, editor bridge qua note-editor-store).
 *   - Data: `body: string` chứa HTML (Tiptap `.getHTML()`). Migration từ shape
 *     cũ (title + plain text body) qua `lib/note-data.ts::parseNoteData`.
 *
 * Edit flow: double-click → editingId set → editor focus, commit khi blur /
 * Escape / Ctrl+Enter (undo-able qua updateObjectData).
 *
 * Placeholder styling ở `src/styles/index.css` (`.tiptap p.is-editor-empty…`).
 */
function NoteRenderer({ object, isSelected, isEditing, onEditEnd }: ObjectRendererProps) {
  const data = parseNoteData(object.data);

  return (
    <ObjectShell
      selected={isSelected}
      editing={isEditing}
      variant="card"
      colorBarStyle={data.color ? { backgroundColor: data.color } : undefined}
    >
      {isEditing ? (
        <NoteEditor initial={data} objectId={object.id} onEditEnd={onEditEnd} />
      ) : (
        <NoteView data={data} objectId={object.id} />
      )}
    </ObjectShell>
  );
}

// Content class chung cho view + editor để paragraph/heading style nhất quán.
// Arbitrary variants Tailwind áp cho child tag (Tiptap output HTML raw). Muốn
// đổi tone chữ note thì sửa ở đây, cả 2 mode auto follow.
const NOTE_CONTENT_CLASS =
  'tiptap text-sm leading-relaxed text-foreground ' +
  // Wrap behavior đồng bộ editor + view. ProseMirror mặc định có
  // `white-space: pre-wrap` + `word-wrap: break-word`. View mode HTML thuần
  // không có → text dài không space (URL, chuỗi ký tự) sẽ tràn ngang khỏi
  // border. Áp break-words + whitespace-pre-wrap cho cả 2 mode.
  'break-words whitespace-pre-wrap ' +
  // Paragraph spacing 10px giữa các p liền nhau (Milanote parity —
  // `--element-paragraph-spacing-default: 1rem` = 10px với root 10px).
  // Base p margin 0, chỉ p+p có mt để tránh margin collapse + first p không
  // đẩy top khỏi padding wrapper.
  '[&_p]:my-0 [&_p+p]:mt-[10px] [&_p]:font-serif ' +
  // Outline subtle mỗi paragraph để user thấy rõ ranh giới từng item. Dùng
  // token theme `border` (tự follow light/dark), outline không chiếm layout.
  '[&_p]:outline [&_p]:outline-1 [&_p]:outline-primary/40 ' +
  '[&_h1]:my-2 [&_h1]:font-serif [&_h1]:text-lg [&_h1]:font-bold [&_h1]:leading-tight ' +
  '[&_h2]:my-2 [&_h2]:font-serif [&_h2]:text-base [&_h2]:font-semibold ' +
  '[&_h3]:my-2 [&_h3]:font-serif [&_h3]:text-[15px] [&_h3]:font-semibold ' +
  // Link: primary + underline (extension-link, openOnClick=false trong edit).
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 ' +
  '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic ' +
  '[&_strong]:font-semibold [&_em]:italic ' +
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs';

function NoteView({ data, objectId }: { data: NoteData; objectId: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const clipper = useCardClipper(wrapperRef, contentRef);
  const boardId = useCurrentBoardStore((s) => s.currentBoardId);
  const isFixed = data.heightMode === 'fixed';
  const overflow = useContentOverflow(innerRef, contentRef, data.body);
  // Lọc HTML trước khi nhét vào DOM: body có thể đến từ clipboard hoặc data cũ
  // trong IndexedDB, không tin được. Editor mode không cần — Tiptap tự parse
  // qua cùng schema.
  const safeBody = useMemo(() => sanitizeNoteHtml(data.body), [data.body]);

  useNoteAutoGrow(objectId, contentRef, data.heightMode);

  return (
    <div ref={wrapperRef} className={NOTE_WRAPPER_CLASS}>
      <div
        ref={innerRef}
        className={`relative h-full w-full ${isFixed ? 'overflow-hidden' : ''}`}
      >
        <div
          ref={contentRef}
          className={NOTE_CONTENT_CLASS}
          dangerouslySetInnerHTML={{ __html: safeBody }}
        />
        {isFixed && overflow ? <FadeOverlay /> : null}
      </div>
      {clipper ? (
        <CardClipperButton
          sourceId={objectId}
          paragraphIndex={clipper.index}
          top={clipper.top}
          sourceBody={data.body}
          sourceColor={data.color}
          boardId={boardId}
        />
      ) : null}
    </div>
  );
}

function NoteEditor({
  initial,
  objectId,
  onEditEnd,
}: {
  initial: NoteData;
  objectId: string;
  onEditEnd: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Ref content root (Tiptap ProseMirror div). Init sau khi editor mount qua effect.
  const contentRootRef = useRef<HTMLElement | null>(null);
  // Track body hiện tại cho CardClipperButton (extract paragraph khi drag start).
  // Sync qua Tiptap update.
  const [currentBody, setCurrentBody] = useState(initial.body);
  const clipper = useCardClipper(wrapperRef, contentRootRef);
  const boardId = useCurrentBoardStore((s) => s.currentBoardId);

  const latestBodyRef = useRef(initial.body);
  // Bỏ qua blur ngay sau mount: chuỗi double-click phát pointer event làm editor
  // chớp mất focus khi vừa mount → không được coi là "đóng".
  const readyRef = useRef(false);

  const editor = useEditor({
    // Schema chung với bộ lọc HTML (lib/note-schema.ts). Placeholder chỉ là UI,
    // không đổi schema nên thêm riêng ở đây.
    extensions: [
      ...NOTE_SCHEMA_EXTENSIONS,
      Placeholder.configure({
        placeholder: 'Bắt đầu gõ...',
        // Chỉ show placeholder khi editor rỗng hoàn toàn (không phải khi paragraph
        // empty giữa nội dung khác).
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
    ],
    content: initial.body,
    // KHÔNG dùng autofocus config Tiptap — mount effect dưới sẽ đặt caret
    // tại vị trí click (Milanote parity). Fallback focus end nếu không có
    // click point (VD trigger edit từ keyboard shortcut sau này).
    autofocus: false,
    editorProps: {
      attributes: {
        // Bỏ `min-h-full` — không đồng bộ với view mode (view không có), gây
        // scrollHeight khác nhau giữa 2 mode. Khi switch editor → view, RO
        // measure khác nhau → visual shift. Cả 2 mode giờ chỉ size theo
        // content thật, height do wrapper (geometry.height) quyết định.
        class: `${NOTE_CONTENT_CLASS} outline-none`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      latestBodyRef.current = ed.getHTML();
      // Sync state → CardClipperButton nhận sourceBody hiện tại (paragraph mới
      // gõ có thể clip ngay, không cần chờ commit).
      setCurrentBody(latestBodyRef.current);
    },
    onBlur: ({ event }) => {
      if (!readyRef.current) return;
      // Milanote parity: mọi thao tác trong toolbar hoặc popup phụ trợ (Link
      // input, TextStyle dropdown) là "vùng đặc biệt" — click vào đây KHÔNG
      // được coi là thoát edit. Guard bằng data-canvas-overlay: Toolbar +
      // ColorPopup + LinkPopup + TextStylePopup đều gắn attr này. relatedTarget
      // = element mới focus. Closest trong overlay → skip commit, giữ editing.
      // Với text-format button (Bold/Italic/UL/OL) đã có onMouseDown
      // preventDefault ở NoteToolbar → onBlur không fire; guard này bảo vệ
      // popup có input focus rời editor (Link URL input, TextStyle list).
      const related = event.relatedTarget;
      if (related instanceof HTMLElement && related.closest('[data-canvas-overlay]')) {
        return;
      }
      commitAndClose();
    },
  });

  useEffect(() => {
    const t = setTimeout(() => {
      readyRef.current = true;
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const commitAndClose = () => {
    // Nếu editor bị destroy (unmount race), fallback initial body.
    // Giữ heightMode + color từ initial snapshot (chỉ body thay đổi trong edit).
    updateObjectData(objectId, {
      body: latestBodyRef.current || '<p></p>',
      color: initial.color,
      heightMode: initial.heightMode,
    });
    onEditEnd();
  };

  // Keyboard: Escape / Ctrl+Enter commit + đóng. Enter thường để Tiptap tạo
  // paragraph mới (default StarterKit behavior).
  // Capture phase: chạy TRƯỚC keydown của ProseMirror. Tiptap HardBreak gắn sẵn
  // Mod-Enter = xuống dòng mềm; nếu để bubble thì `<br>` đã chèn trước khi commit.
  // preventDefault ở đây → ProseMirror thấy defaultPrevented nên bỏ qua phím.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isImeComposing(e)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        commitAndClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        commitAndClose();
      }
    };
    dom.addEventListener('keydown', onKeyDown, true);
    return () => dom.removeEventListener('keydown', onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Bridge editor instance ra note-editor-store để NoteEditingActions (toolbar
  // screen-space overlay) subscribe được. Set khi mount, clear khi unmount.
  // Không dùng ref/context vì 2 subtree song song (ObjectsLayer vs Toolbar).
  useEffect(() => {
    if (!editor) return;
    useNoteEditorStore.getState().setActiveEditor(editor);
    return () => {
      // Chỉ clear nếu store vẫn trỏ editor này (tránh race khi note khác đã set
      // activeEditor trước khi note cũ unmount — không xảy ra theo interaction-
      // store editingId single-value, nhưng defensive).
      if (useNoteEditorStore.getState().activeEditor === editor) {
        useNoteEditorStore.getState().setActiveEditor(null);
      }
    };
  }, [editor]);

  // Setup khi editor mount xong: (1) cache ProseMirror DOM cho useCardClipper +
  // useNoteAutoGrow đọc, (2) đặt caret tại vị trí double-click (Milanote parity —
  // peek editingClickPoint snapshot 1 lần, không subscribe reactive; miss → fallback
  // focus end). Cleanup null contentRootRef khi unmount.
  useEffect(() => {
    if (!editor) return;
    contentRootRef.current = editor.view.dom as HTMLElement;

    const clickPoint = useInteractionStore.getState().editingClickPoint;
    const hit = clickPoint
      ? editor.view.posAtCoords({ left: clickPoint.x, top: clickPoint.y })
      : null;
    if (hit) editor.chain().focus().setTextSelection(hit.pos).run();
    else editor.commands.focus('end');

    return () => {
      contentRootRef.current = null;
    };
  }, [editor]);

  // Auto-grow theo content ProseMirror. Skip khi heightMode='fixed'. RO catch
  // mọi layout change (Enter, delete, wrap khi width đổi, undo/redo, font load).
  useNoteAutoGrow(objectId, contentRootRef, initial.heightMode, editor);

  const innerRef = useRef<HTMLDivElement>(null);
  const isFixed = initial.heightMode === 'fixed';
  const overflow = useContentOverflow(innerRef, contentRootRef, currentBody);

  return (
    <div ref={wrapperRef} className={NOTE_WRAPPER_CLASS}>
      <div
        ref={innerRef}
        className={`relative h-full w-full ${isFixed ? 'overflow-hidden' : ''}`}
      >
        <EditorContent editor={editor} className="h-full" />
        {isFixed && overflow ? <FadeOverlay /> : null}
      </div>
      {clipper ? (
        <CardClipperButton
          sourceId={objectId}
          paragraphIndex={clipper.index}
          top={clipper.top}
          sourceBody={currentBody}
          sourceColor={initial.color}
          boardId={boardId}
        />
      ) : null}
    </div>
  );
}

registerObjectType({
  type: 'note',
  renderer: NoteRenderer,
  // Milanote parity: width 338, height 68 (đo từ DOM Milanote `contain-intrinsic-size:
  // 338px 68px` cho note rỗng). Height auto-grow theo content qua RO trong renderer.
  defaultGeometry: { width: 338, height: 68, rotation: 0, zIndex: 0 },
  defaultData: (): NoteData => ({ body: '<p></p>', color: null, heightMode: 'auto' }),
  label: 'Note',
  showInToolbar: true,
  // Kéo corner đổi cả width + height. Note mới heightMode='auto' → RO grow
  // theo content. Sau khi user kéo corner → chuyển 'fixed', RO ngừng grow,
  // content vượt geometry → clip + fade overlay.
  // Data từ clipboard: chuẩn hoá shape qua parseNoteData rồi lọc body HTML.
  sanitizePastedData: (data) => {
    const parsed = parseNoteData(data);
    return { ...parsed, body: sanitizeNoteHtml(parsed.body) };
  },
  onResizeCommit: (objectId) => {
    // User kéo corner Note (bất kỳ dim) → lock heightMode='fixed'. Milanote
    // parity: sau explicit resize, note giữ user set, không auto grow lại.
    // Đọc data hiện tại qua parseNoteData để giữ body/color/... trong shape
    // chuẩn Zod (schema có default cover trường thiếu).
    const cur = useObjectsStore.getState().objects.get(objectId);
    if (!cur) return;
    const parsed = parseNoteData(cur.data);
    if (parsed.heightMode === 'fixed') return; // đã fixed, skip
    updateObjectData(objectId, { ...parsed, heightMode: 'fixed' });
  },
  // Per-type toolbar tree (Milanote parity): Note có cây chức năng riêng khác
  // Task/Link/Image. Toolbar generic lookup registry, không hard-code Note.
  renderElementActions: (object) => <NoteElementActions object={object} />,
  renderEditingActions: () => <NoteEditingActions />,
});
