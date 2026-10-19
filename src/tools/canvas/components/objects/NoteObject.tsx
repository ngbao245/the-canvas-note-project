import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import Placeholder from '@tiptap/extension-placeholder';
import type { ObjectRendererProps } from '../../hooks/useObjectRegistry';
import type { NoteData } from '../../types';
import {
  applyResize,
  commitNoteBodyEdit,
  createNoteBelow,
  setNoteBodySilently,
} from '../../engine/actions';
import { getCanvasRepository } from '../../api';
import { useObjectsStore } from '../../store/objects-store';
import { useCurrentBoardStore } from '../../store/current-board-store';
import { useInteractionStore } from '../../store/interaction-store';
import { useNoteEditorStore } from '../../store/note-editor-store';
import { parseNoteData } from '../../lib/note-data';
import { noteInkColor } from '../../lib/note-colors';
import { NOTE_SCHEMA_EXTENSIONS, sanitizeNoteHtml } from '../../lib/note-schema';
import { useCardClipper } from '../../hooks/useCardClipper';
import { CardClipperButton } from '../CardClipperButton';
import { ObjectShell } from './ObjectShell';
import { NoteCommitKeys } from '../../lib/note-commit-keys';
import { useSelectionStore } from '../../store/selection-store';
import { useI18n } from '@/lib/i18n';

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

/** Cao note vừa khít chữ (gồm padding dọc), không thấp hơn note rỗng 1 dòng. */
function contentHeight(contentEl: HTMLElement): number {
  return Math.max(NOTE_MIN_HEIGHT, contentEl.scrollHeight + NOTE_VERTICAL_PADDING);
}

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

  const contentH = contentHeight(contentEl);
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
    // Bỏ contentRef: là ref object ổn định, `.current` đổi không làm re-run.
    // Lúc ref trỏ sang DOM mới (editor mount) thì extraDep báo để chạy lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, heightMode, extraDep]);
}

/**
 * Note fixed lúc sửa: đo chiều cao chữ, báo vào `editingHeight` để lớp vẽ cho
 * note dài ra (Enter / chữ tràn dòng → thấy ngay, không gõ vào vùng mờ). Chỉ để
 * vẽ: không ghi geometry, không vào undo, thoát sửa là về cao đã lưu (bạn chốt
 * 2026-10-15). Note auto không cần (useNoteAutoGrow đã nới geometry).
 */
function useEditingExpand(
  objectId: string,
  contentRef: { current: HTMLElement | null },
  heightMode: NoteData['heightMode'],
  // Deps thêm để chạy lại khi editor mount xong (contentRef trỏ ProseMirror DOM).
  extraDep?: unknown,
): void {
  useEffect(() => {
    const el = contentRef.current;
    if (!el || heightMode !== 'fixed') return;
    const { setEditingHeight } = useInteractionStore.getState();
    const measure = () => setEditingHeight(objectId, contentHeight(el));
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => {
      ro.disconnect();
      // Gỡ chiều cao tạm của chính note này (setEditingHeight tự bỏ qua nếu
      // đã sang sửa note khác).
      setEditingHeight(objectId, null);
    };
    // Bỏ contentRef: ref object ổn định, extraDep báo khi DOM đổi.
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
    // Bỏ wrapperRef / contentRef: ref object ổn định, extraDep báo khi DOM đổi.
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
        // Theo nền note nếu có màu (ObjectShell đặt --object-surface).
        background: 'linear-gradient(to bottom, transparent 0%, var(--object-surface, var(--card)) 100%)',
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
 *   - Data: `body: string` chứa HTML (Tiptap `.getHTML()`), đọc qua
 *     `lib/note-data.ts::parseNoteData`.
 *
 * Edit flow: double-click → editingId set → editor focus. Mỗi lần gõ tự lưu
 * (store + hàng đợi, không undo). Thoát sửa (blur / Esc) ghi đúng 1 bước undo.
 * Ctrl+Enter: thoát sửa + tạo note mới bên dưới rồi sửa note đó.
 *
 * Placeholder styling ở `src/styles/index.css` (`.tiptap p.is-editor-empty…`).
 */
export function NoteRenderer({ object, isSelected, isEditing, onEditEnd }: ObjectRendererProps) {
  const data = parseNoteData(object.data);
  // Đang kéo góc note này (resize chỉ khi chọn 1 object). Note auto chưa có
  // overflow-hidden → kéo lùn thì chữ tràn ra ngoài khung, trông như note đứng
  // yên tới lúc thả. Cắt ngay trong lúc kéo như note fixed.
  // isSelected đưa vào selector: note không chọn luôn nhận false → không render lại
  // mọi note lúc bắt đầu / thả resize.
  const resizing = useInteractionStore((s) => isSelected && s.mode === 'resizing');
  const clip = data.heightMode === 'fixed' || resizing;

  return (
    <ObjectShell
      selected={isSelected}
      editing={isEditing}
      variant="card"
      colorBarStyle={data.color ? { backgroundColor: data.color } : undefined}
      surfaceColor={data.background}
      // Tính 1 chỗ cho cả xem lẫn sửa → đổi chế độ không nhảy màu chữ.
      inkColor={noteInkColor(data)}
    >
      {isEditing ? (
        <NoteEditor initial={data} objectId={object.id} onEditEnd={onEditEnd} />
      ) : (
        <NoteView data={data} objectId={object.id} clip={clip} />
      )}
    </ObjectShell>
  );
}

// Content class chung cho view + editor để paragraph/heading style nhất quán.
// Arbitrary variants Tailwind áp cho child tag (Tiptap output HTML raw). Muốn
// đổi tone chữ note thì sửa ở đây, cả 2 mode auto follow.
const NOTE_CONTENT_CLASS =
  // Màu chữ: mực theo nền note (ObjectShell đặt --object-ink), không có thì token
  // foreground. `--note-ink` để các kiểu phụ (small, callout, code) tính màu từ
  // mực note chứ không từ theme → note nền đậm / sáng đều đọc được.
  'tiptap text-sm leading-relaxed [--note-ink:var(--object-ink,var(--foreground))] text-[color:var(--note-ink)] ' +
  // Wrap behavior đồng bộ editor + view. ProseMirror mặc định có
  // `white-space: pre-wrap` + `word-wrap: break-word`. View mode HTML thuần
  // không có → text dài không space (URL, chuỗi ký tự) sẽ tràn ngang khỏi
  // border. Áp break-words + whitespace-pre-wrap cho cả 2 mode.
  'break-words whitespace-pre-wrap ' +
  // Paragraph spacing 10px giữa các p liền nhau (Milanote parity —
  // `--element-paragraph-spacing-default: 1rem` = 10px với root 10px).
  // Base p margin 0, chỉ p+p có mt để tránh margin collapse + first p không
  // đẩy top khỏi padding wrapper. Thân note dùng sans mặc định (Inter), chỉ
  // heading mới font-serif (Fraunces) để tạo điểm nhấn.
  '[&_p]:my-0 [&_p+p]:mt-[10px] ' +
  '[&_h1]:my-2 [&_h1]:font-serif [&_h1]:text-lg [&_h1]:font-bold [&_h1]:leading-tight ' +
  '[&_h2]:my-2 [&_h2]:font-serif [&_h2]:text-base [&_h2]:font-semibold ' +
  '[&_h3]:my-2 [&_h3]:font-serif [&_h3]:text-[15px] [&_h3]:font-semibold ' +
  // Link: primary + underline (extension-link, openOnClick=false trong edit).
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 ' +
  '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 ' +
  '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic ' +
  '[&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_s]:line-through ' +
  // Code trong dòng (<code>). Code block (<pre>) có nền + font mono riêng. Nền =
  // mực note pha nhạt (không dùng bg-muted: note nền đậm ra chữ trắng trên hộp sáng).
  '[&_code]:rounded [&_code]:bg-[color:color-mix(in_srgb,var(--note-ink)_12%,transparent)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs ' +
  '[&_pre]:my-2 [&_pre]:rounded [&_pre]:bg-[color:color-mix(in_srgb,var(--note-ink)_10%,transparent)] [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-snug ' +
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 ' +
  // Highlight (<mark>): màu nền do inline style (data color), chỉ cần giữ chữ
  // màu foreground (mark mặc định trình duyệt là nền vàng + chữ đen).
  '[&_mark]:rounded [&_mark]:px-0.5 ' +
  // Small text + Callout (paragraph data-variant). Small = chữ nhỏ hơn, mực note
  // đục 70%. Callout = nền mực note pha nhạt + viền trái primary, như hộp ghi chú
  // Milanote. Note không màu: mực = foreground → trông như màu theme cũ.
  "[&_p[data-variant='small']]:text-xs [&_p[data-variant='small']]:text-[color:color-mix(in_srgb,var(--note-ink)_70%,transparent)] " +
  "[&_p[data-variant='callout']]:my-2 [&_p[data-variant='callout']]:rounded [&_p[data-variant='callout']]:border-l-2 [&_p[data-variant='callout']]:border-primary [&_p[data-variant='callout']]:bg-[color:color-mix(in_srgb,var(--note-ink)_10%,transparent)] [&_p[data-variant='callout']]:px-3 [&_p[data-variant='callout']]:py-2";

function NoteView({ data, objectId, clip }: { data: NoteData; objectId: string; clip: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  // clip: note fixed, hoặc đang bị kéo góc (xem NoteRenderer).
  const overflow = useContentOverflow(innerRef, contentRef, data.body);
  // Card Clipper chỉ có lúc sửa (NoteEditor), giống Milanote.
  // Lọc HTML trước khi nhét vào DOM: body có thể đến từ clipboard hoặc data cũ
  // trong IndexedDB, không tin được. Editor mode không cần — Tiptap tự parse
  // qua cùng schema.
  const safeBody = useMemo(() => sanitizeNoteHtml(data.body), [data.body]);

  useNoteAutoGrow(objectId, contentRef, data.heightMode);

  return (
    <div ref={wrapperRef} className={NOTE_WRAPPER_CLASS}>
      <div ref={innerRef} className={`relative h-full w-full ${clip ? 'overflow-hidden' : ''}`}>
        <div
          ref={contentRef}
          // Xem (không sửa): chữ không bôi đen được, thừa hưởng select-none của
          // CanvasSurface. Muốn chọn chữ thì double-click vào sửa (bạn chốt
          // 2026-10-14, giống Milanote). select-text chỉ mở lại ở editor.
          className={NOTE_CONTENT_CLASS}
          dangerouslySetInnerHTML={{ __html: safeBody }}
        />
        {clip && overflow ? <FadeOverlay /> : null}
      </div>
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
  const { t } = useI18n();
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Ref content root (Tiptap ProseMirror div). Init sau khi editor mount qua effect.
  const contentRootRef = useRef<HTMLElement | null>(null);
  // Track body hiện tại cho CardClipperButton (extract paragraph khi drag start).
  // Sync qua Tiptap update.
  const [currentBody, setCurrentBody] = useState(initial.body);
  const boardId = useCurrentBoardStore((s) => s.currentBoardId);

  // `initial` đổi theo store mỗi lần tự lưu → chụp chữ lúc vào sửa 1 lần để làm
  // "trước" của bước undo.
  const startBodyRef = useRef(initial.body);
  const latestBodyRef = useRef(initial.body);
  // Đã có thay đổi từ người dùng (không phải lần cấp mã khối lúc mở).
  const userEditedRef = useRef(false);
  // Đã ghi bước undo của lần sửa này (Esc rồi blur lúc unmount không ghi 2 lần).
  const committedRef = useRef(false);
  // Bỏ qua blur ngay sau mount: chuỗi double-click phát pointer event làm editor
  // chớp mất focus khi vừa mount → không được coi là "đóng".
  const readyRef = useRef(false);
  // Gán sau khi commitAndClose được khai báo (bên dưới). Extension chỉ gọi lúc bấm phím.
  const commitRef = useRef<() => void>(() => {});
  const commitAndNewRef = useRef<() => void>(() => {});

  const editor = useEditor({
    // Schema chung với bộ lọc HTML (lib/note-schema.ts). Placeholder + phím lưu
    // chỉ là UI, không đổi schema nên thêm riêng ở đây.
    extensions: [
      ...NOTE_SCHEMA_EXTENSIONS,
      NoteCommitKeys.configure({
        onCommit: () => commitRef.current(),
        onCommitAndNew: () => commitAndNewRef.current(),
      }),
      Placeholder.configure({
        placeholder: t('CANVAS.NOTE_TOOLBAR.PLACEHOLDER'),
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
        // select-text: Safari không cho chọn chữ trong contenteditable khi tổ
        // tiên là user-select:none (CanvasSurface). Chỉ editor mode cần, view
        // mode để chặn chọn theo vùng canvas.
        class: `${NOTE_CONTENT_CLASS} select-text outline-none`,
      },
    },
    onUpdate: ({ editor: ed, transaction }) => {
      latestBodyRef.current = ed.getHTML();
      // Note cũ chưa có mã khối: lúc mở, extension cấp mã bằng 1 lần đổi không vào
      // lịch sử undo. Coi bản đã có mã là "trước khi sửa" → mở rồi thoát không gõ
      // thì không ghi bước undo thừa. Vẫn tự lưu bên dưới để mã xuống máy.
      if (!userEditedRef.current && transaction.getMeta('addToHistory') === false) {
        startBodyRef.current = latestBodyRef.current;
      } else {
        userEditedRef.current = true;
      }
      // Tự lưu ngay (hàng đợi gom, không debounce), không thêm bước undo.
      setNoteBodySilently(objectId, latestBodyRef.current);
      // Sync state → CardClipperButton nhận sourceBody hiện tại (paragraph mới
      // gõ có thể clip ngay, không cần chờ commit).
      setCurrentBody(latestBodyRef.current);
    },
    onBlur: ({ event }) => {
      if (!readyRef.current) return;
      // Đổi tab / cửa sổ khác cũng làm editor blur. Đó không phải "click ra
      // ngoài": giữ chế độ sửa (và khoá giữa tab). Chữ vẫn tự lưu, ẩn tab thì đẩy gấp.
      if (!document.hasFocus()) return;
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

  // Nút Card Clipper ngang khối đang có con trỏ gõ.
  const clipper = useCardClipper(editor, wrapperRef);

  // Card Clipper lúc đang sửa. Trước khi cắt: chốt chữ đã gõ thành 1 bước undo riêng,
  // để bước cắt đoạn đứng sau nó.
  const beforeClip = () => {
    if (startBodyRef.current !== latestBodyRef.current) {
      commitNoteBodyEdit(objectId, startBodyRef.current, latestBodyRef.current);
      startBodyRef.current = latestBodyRef.current;
    }
  };
  // Sau khi thả: chuyển sang sửa note mới (bạn chốt 2026-10-14). Note gốc đã chốt ở
  // beforeClip, store đã bỏ khối cắt → đánh dấu xong để lúc editor này bị gỡ không
  // ghi lại body cũ (còn khối đã cắt) đè lên. onEditEnd của note gốc tự bỏ qua khi
  // editingId đã sang note khác.
  const afterClip = (newId: string | null) => {
    if (!newId) {
      // Khối đã bị xoá trước lúc thả → không tạo gì, sửa tiếp note gốc.
      editor?.view.focus();
      return;
    }
    committedRef.current = true;
    useSelectionStore.getState().select(newId);
    // Không có điểm click → editor note mới đặt con trỏ cuối chữ.
    useInteractionStore.getState().setEditingId(newId, null);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      readyRef.current = true;
    }, 250);
    return () => clearTimeout(t);
  }, []);

  // Ghi bước undo của lần sửa này (nếu có đổi) + đẩy hàng đợi. Chữ đã nằm trong
  // store nhờ tự lưu. Không đóng editor.
  const commitEdit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    commitNoteBodyEdit(objectId, startBodyRef.current, latestBodyRef.current || '<p></p>');
    void getCanvasRepository().flush();
  };

  const commitAndClose = () => {
    commitEdit();
    onEditEnd();
  };

  const commitAndNew = () => {
    commitAndClose();
    const next = createNoteBelow(objectId);
    if (next) useInteractionStore.getState().setEditingId(next.id, null);
  };

  // NoteCommitKeys gọi bản mới nhất qua ref.
  commitRef.current = commitAndClose;
  commitAndNewRef.current = commitAndNew;

  // Editor bị gỡ mà chưa thoát sửa đàng hoàng (đổi board, note bị xoá, tab khác
  // giành khoá): vẫn ghi bước undo nếu có đổi. Không set committedRef ở đây: React
  // StrictMode chạy cleanup giả lúc mount, lúc đó chữ chưa đổi nên không ghi gì.
  useEffect(
    () => () => {
      if (committedRef.current) return;
      commitNoteBodyEdit(objectId, startBodyRef.current, latestBodyRef.current || '<p></p>');
    },
    [objectId],
  );

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
  // Fixed: không cắt chữ lúc sửa, note tạm dài ra theo chữ (không lưu).
  useEditingExpand(objectId, contentRootRef, initial.heightMode, editor);

  // Lúc sửa luôn thấy hết chữ (cả note fixed) → không overflow-hidden, không lớp mờ.
  // Thoát sửa → NoteView cắt + mờ lại theo cao đã lưu.
  return (
    <div ref={wrapperRef} className={NOTE_WRAPPER_CLASS}>
      <div className="relative h-full w-full">
        <EditorContent editor={editor} className="h-full" />
      </div>
      {clipper ? (
        <CardClipperButton
          sourceId={objectId}
          target={{ key: clipper.key, index: clipper.index }}
          top={clipper.top}
          sourceBody={currentBody}
          sourceColors={{
            color: initial.color,
            background: initial.background,
            textColor: initial.textColor,
          }}
          boardId={boardId}
          onBeforeClip={beforeClip}
          onAfterClip={afterClip}
        />
      ) : null}
    </div>
  );
}

