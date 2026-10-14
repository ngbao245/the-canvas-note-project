# 12 — Note

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: editor Tiptap của note, schema + lọc HTML, đọc `data` note (`parseNoteData`), toolbar chọn / sửa của note, popup dùng chung `ToolbarPopup` + `useToolbarPopupClose`, màu, `heightMode` (tự cao / cố định), tự lưu khi gõ + bước undo lúc thoát sửa, Esc / Ctrl+Enter, phần riêng note của khoá sửa giữa tab, mã khối `data-key`, Card Clipper.

Không gồm: khuôn loại object, sổ đăng ký, lọc khi dán nói chung (`11`). Chọn / kéo / resize / undo dùng chung (`10`). Hàng đợi ghi, kênh `text` / `props`, cơ chế khoá Web Locks giữa tab (`20`). Gửi `data.body` lên server (`21`).

## Hiện trạng

### Dữ liệu (`noteDataSchema` trong `types.ts`)

| Trường | Kiểu | Mặc định | Nghĩa |
|---|---|---|---|
| `body` | chuỗi HTML (Tiptap `getHTML()`) | `<p></p>` | Nội dung. Không bao giờ để chuỗi rỗng |
| `color` | hex hoặc `null` | `null` | Thanh màu trên đầu note. `null` = màu mặc định theo theme |
| `heightMode` | `auto` / `fixed` | `auto` | Xem "Chiều cao" |

- Note mới (`note-type.tsx`): 338 × 68, `{ body: '<p></p>', color: null, heightMode: 'auto' }`.
- Mọi chỗ đọc `data` note trong renderer, engine, dán, resize, nút màu đi qua `parseNoteData` (`lib/note-data.ts`), không đọc thô. (Nút màu đổi từ `safeParse` sang `parseNoteData` 2026-10-13: trước đó dữ liệu lạ làm ghi body rỗng, mất chữ.)
- `parseNoteData` chỉ điền mặc định: `body` không phải chuỗi hoặc rỗng → `<p></p>`, `color` không phải chuỗi → `null`, `heightMode` khác `'fixed'` → `'auto'`. `data` không phải object → note rỗng mặc định. Không chuyển dạng cũ (`title` + chữ thường) nữa (gỡ 2026-10-14, bạn chốt bỏ dữ liệu cũ); `body` giữ nguyên chuỗi, vào DOM vẫn qua `sanitizeNoteHtml`.

### Schema và lọc HTML (`lib/note-schema.ts`)

- `NOTE_SCHEMA_EXTENSIONS` là bộ extension duy nhất mô tả nội dung note: StarterKit (tắt Link có sẵn trong kit), Link cấu hình riêng, `NoteBlockKeys`.
- Link: `openOnClick: false` (click để đặt caret), `autolink`, `linkOnPaste`, gắn `rel="noopener noreferrer"` + `target="_blank"`. Href `javascript:` / `data:` bị extension bỏ mark, chỉ còn chữ.
- Editor dùng bộ này + 2 extension chỉ là UI: `NoteCommitKeys`, `Placeholder`. Hai cái này không đổi schema nên không vào bộ chung.
- `sanitizeNoteHtml(html)`: parse bằng `DOMParser` trên document tách rời → ProseMirror parse theo schema → serialize lại. Thứ gì schema không biết (script, `img onerror`, iframe, `style`, `onclick`...) bị bỏ. Kết quả rỗng → `<p></p>`.
- Bộ parse / serialize dựng 1 lần. Kết quả cache theo chuỗi vào, tối đa 300 mục, đầy thì xoá hết.
- Lọc ở 2 chỗ: `NoteView` trước `dangerouslySetInnerHTML` (chặn cả dữ liệu cũ trong IndexedDB) và `sanitizePastedData` khi dán (dữ liệu lưu xuống đã sạch). Editor không cần lọc vì Tiptap tự parse qua cùng schema.
- `data-key` nằm trong schema nên bộ lọc giữ mã khối.

### Hiển thị (`NoteObject.tsx`)

- `NoteRenderer`: bọc `ObjectShell` (`variant="card"`, thanh màu theo `color`). Đang sửa → `NoteEditor`, không → `NoteView`.
- Khung: `px-5 py-6` (dọc 48 tổng). Chữ dùng chung 1 class `NOTE_CONTENT_CLASS` cho cả xem lẫn sửa, nên đổi chế độ không nhảy layout: `text-sm`, `leading-relaxed`, `break-words whitespace-pre-wrap`, đoạn liền nhau cách 10px, font serif, kiểu riêng cho `h1-3`, list, quote, code, link.
- `select-text` đặt trên vùng chữ (canvas gốc là `select-none`, Safari cần mở lại).
- Mỗi đoạn `p` đang có viền `outline-primary/40` (xem "Câu còn mở").

### Chiều cao (`heightMode`)

- `auto`: `ResizeObserver` đo `scrollHeight` vùng chữ + 48 → chiều cao cần. Chỉ TĂNG khi cần lớn hơn hiện tại quá 1px, không bao giờ tự co. Tối thiểu 68. Ghi bằng `applyResize` (không vào undo). Bỏ qua lúc đang resize.
- `fixed`: không tự tăng. Chữ vượt khung → cắt + lớp mờ cao 32px ở đáy (`FadeOverlay`, `pointer-events-none`).
- Chuyển `auto` → `fixed`: `onResizeCommit` của loại note, chạy sau khi kéo góc có đổi rộng hoặc cao. Gọi `updateObjectData` → thêm 1 bước undo riêng sau bước resize (xem "Câu còn mở").
- Không có đường về `auto` (Milanote cũng không có).
- Kéo góc ở chế độ `fixed` được nhỏ tới `MIN_OBJECT_SIZE` của `SelectionBox`, không bị chặn ở 68.

### Sửa, tự lưu, undo

- Vào sửa: double-click (caret đặt đúng điểm click qua `editingClickPoint` + `posAtCoords`), hoặc phím vào sửa object đang chọn (caret cuối). Note đang khoá ở tab khác → báo `CANVAS.NOTE_LOCK.BUSY`, không mở editor.
- Mỗi lần editor đổi nội dung: `setNoteBodySilently` ghi `body` vào store + hàng đợi kênh `text`, không debounce, không thêm undo. Gộp vào `data` hiện tại nên màu / `heightMode` đổi trong lúc sửa không bị mất.
- Chữ "trước" của bước undo chụp lúc mở editor. Lần cấp mã khối cho note cũ (đổi không vào lịch sử) được coi là "trước", nên mở rồi thoát không gõ thì không có bước undo.
- Thoát sửa: `commitNoteBodyEdit(before, after)` thêm đúng 1 bước "Edit note" nếu chữ khác, rồi `repo.flush()`. Undo / redo chỉ đổi `body`.
- Editor bị gỡ mà chưa thoát đàng hoàng (đổi board, note bị xoá, tab khác giành khoá): cleanup vẫn ghi bước undo nếu có đổi. Có cờ `committedRef` để Esc rồi gỡ không ghi 2 lần.
- Blur không phải lúc nào cũng là thoát:
  - 250ms đầu sau khi mở: bỏ qua (chuỗi double-click làm editor chớp mất focus).
  - `document.hasFocus()` false (đổi tab / cửa sổ): giữ chế độ sửa và giữ khoá.
  - Focus chuyển vào phần tử trong `[data-canvas-overlay]` (toolbar, popup): giữ chế độ sửa.
  - Còn lại: lưu + thoát.
- Thoát sửa chỉ xoá `editingId`, giữ chọn → toolbar về chế độ chọn (thoát 2 tầng, phần chung ở `10`).

### Phím trong editor (`lib/note-commit-keys.ts`)

- Khai qua `addKeyboardShortcuts` của Tiptap, `priority` 1000 (chạy trước HardBreak, nên Mod-Enter không chèn `<br>`). Đang ghép chữ (Telex, IME) ProseMirror tự bỏ qua.
- Esc: lưu + thoát. Enter: Tiptap thêm đoạn như thường.
- `Mod-Enter` + `Ctrl-Enter` (Mac nhận cả Cmd lẫn Ctrl): lưu + thoát, rồi `createNoteBelow` và vào sửa note mới (caret cuối).
- Ctrl+Enter khi 1 note đang chọn mà chưa sửa: phím `canvas.new-note-below` (`useCanvasKeys.ts`) làm như trên.
- `createNoteBelow`: cùng cạnh trái, cạnh trên = đáy note cũ + 16, kích thước / dữ liệu mặc định, qua `createObjectAt` (1 bước undo, nằm trên cùng). Note đang ở Unsort → không tạo.

### Toolbar của note (`NoteToolbar.tsx`)

Toolbar chung (`Toolbar.tsx`) đọc `renderElementActions` / `renderEditingActions` của loại (`11`). Nút Dismiss + thùng rác là của toolbar chung.

| Chế độ | Nút | Đã nối |
|---|---|---|
| Chọn (`NoteElementActions`) | Màu, Labels, Reactions, Comment, More | Chỉ Màu |
| Sửa (`NoteEditingActions`) | Text style, Đậm, Nghiêng, Bulleted list, Numbered list, Link, Comment, More | Trừ Comment, More |

- Editor đến toolbar qua `note-editor-store` (`activeEditor`, 1 editor mỗi lúc). `NoteEditor` đặt khi mount, gỡ khi unmount (chỉ gỡ nếu store còn trỏ đúng editor đó). Editor chưa kịp đặt → nhóm nút sửa không vẽ.
- Toolbar nghe sự kiện `transaction` của editor để vẽ lại trạng thái bật (`isActive`).
- Text style: Title (`h1`), Heading (`h2`), Subheading (`h3`), Body (đoạn), Quote (blockquote).
- Link: ô URL. Lưu chỉ được khi có chữ đang chọn hoặc caret nằm trong link cũ; `extendMarkRange('link')` nên không cần bôi đen đúng link cũ. Có link → thêm nút Remove. Enter = lưu.
- Màu: `null` (mặc định) + 6 màu trong `NOTE_COLOR_PALETTE` (`lib/note-colors.ts`). Lưu hex, không lưu id màu. Tên màu lưu dạng key dịch, dịch lúc vẽ. Đổi màu qua `updateObjectData` (1 bước undo).

### Giữ trạng thái sửa khi bấm toolbar

Hai lớp, thiếu 1 lớp là thoát sửa (và thoát 2 tầng dồn thành 1):

1. `ActionButton` có `onMouseDown preventDefault` → trình duyệt không chuyển focus, editor không blur, vùng chọn chữ giữ nguyên. Nút trong popup Text style cũng vậy. `DismissButton` cố ý không chặn (bấm là thoát sửa).
2. Popup có ô nhập (Link) hoặc lấy focus: nằm trong `<ToolbarPopup>` (có `data-canvas-overlay`). `onBlur` của editor bỏ qua khi focus sang overlay. Lệnh của popup chạy `chain().focus()` nên focus về editor.

### Popup dùng chung

- `ToolbarPopup` (`components/ToolbarPopup.tsx`): khung `absolute left-full ml-2`, nền card, viền, bóng, `z-toolbar`, gắn `data-canvas-overlay`. `forwardRef` cho hook đóng.
- `useToolbarPopupClose({ popupRef, anchorLabel, onClose, onRefocus })`:
  - Esc qua `useEscapeLayer`: chỉ đóng popup, không lọt xuống canvas (bỏ chọn) hay editor (thoát sửa). Gọi `onRefocus` nếu có.
  - `pointerdown` (pha capture) ngoài popup → đóng. Bỏ qua khi trúng nút mở, tìm bằng `[aria-label="{anchorLabel}"]`, vì nút tự bật / tắt qua state.
  - Callback giữ trong ref: popup sửa vẽ lại mỗi transaction, không gỡ / gắn listener liên tục.
- `anchorLabel` phải trùng `aria-label` của nút mở. Màu dùng cùng key `CANVAS.NOTE_COLOR.PICK` cho cả 2. Text style / Link đang là chữ cứng trùng nhau.

### Khoá sửa: phần riêng note

Cơ chế khoá theo người chọn ở `20`. Phần note:

- Double-click note khoá ở tab khác: báo bận, không mở editor (`ObjectsLayer`).
- Đổi tab không thoát sửa, không nhả khoá (xem blur ở trên). Chữ vẫn tự lưu; ẩn tab thì hàng đợi đẩy gấp (`20`).
- Tab khác giành quyền (nút ×): editor bị gỡ, cleanup ghi bước undo; chữ không mất vì đã tự lưu.
- `NoteView` ẩn nút Card Clipper khi note khoá ở tab khác (cắt đoạn sẽ ghi đè chữ tab kia).

### Mã khối (`lib/note-block-keys.ts`)

- Extension `UniqueID`, thuộc tính `key` → HTML `data-key="..."`, giống `attrs.key` của Milanote.
- Khối có mã: `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `horizontalRule`. Phần trong dòng (đậm, link) không có.
- Mã 8 ký tự chữ + số từ `crypto.getRandomValues`. Chỉ cần không trùng trong 1 note. Nhân bản / dán note giữ nguyên mã.
- Extension tự cấp mã cho khối mới, Enter tách đoạn, dán, kéo thả trong editor (bỏ mã cũ, cấp lại). Lần cấp cho note cũ không vào lịch sử undo.
- Note chưa từng mở sửa thì chưa có mã. Mã chỉ có khi mở editor.
- `findBlockIndex(keys, { key, index })`: có `key` → tìm theo mã, không thấy trả -1 (KHÔNG lấy khối cùng vị trí). Không có `key` → theo vị trí.
- Mã chưa dùng khi gửi server (`21` gửi cả `data.body`).

### Card Clipper

- `useCardClipper(wrapperRef, contentRootRef)`: nghe `pointermove` / `pointerleave` trên khung note, tìm khối cấp ngoài cùng dưới con trỏ, trả `{ index, key, top }`. Con trỏ trên chính nút → giữ nguyên. Ở vùng đệm trong khung → giữ nguyên; ra khỏi khung → ẩn.
- Có ở cả `NoteView` (vùng chữ HTML) lẫn `NoteEditor` (`editor.view.dom`). Nút nằm ngoài cạnh phải (`right: -32`), khung note `overflow-visible` để không bị cắt.
- `CardClipperButton`: bấm không kéo = không làm gì. Kéo quá 5px → hiện bản xem trước note mới (`FloatingObjectPreview`, kích thước mặc định, tâm dưới con trỏ), vùng thả sai → con trỏ `not-allowed`.
- Thả trên mặt canvas → `clipParagraphToNewNote`. Thả chỗ khác (overlay, Unsort, thùng rác, ngoài canvas) → huỷ im lặng.
- Mặc định cắt; giữ Alt lúc thả = sao chép.
- Khối được chụp lúc bấm (mã + vị trí), rồi tìm lại theo mã trong `body` HIỆN TẠI lúc thả. Đổi vị trí vẫn đúng; bị xoá thì huỷ.
- Note mới: body = HTML khối đó (`extractBlockHtml`), màu theo note gốc, `heightMode: 'auto'`, tâm tại điểm thả, nằm trên cùng, được chọn.
- Cắt: note gốc bỏ khối (`removeBlock`, rỗng → `<p></p>`), giữ nguyên các trường khác (`heightMode`, màu).
- Cả thao tác (tạo + bỏ khối) là 1 bước undo.
- Tách HTML dùng `<template>`, không gắn vào document chính.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-NOTE-01` | `body` là HTML Tiptap theo `NOTE_SCHEMA_EXTENSIONS`, không phải text + `\n`. Không bao giờ để `body` rỗng (`<p></p>`) | Editor, bộ lọc, Card Clipper, mã khối cùng hiểu 1 dạng | Review |
| `INV-NOTE-02` | `NOTE_SCHEMA_EXTENSIONS` là bộ extension duy nhất cho cả editor lẫn `sanitizeNoteHtml`. Thêm extension có node / mark / thuộc tính thì thêm vào đây; extension chỉ là UI thì thêm riêng ở editor | Bộ lọc không xoá thứ editor tạo ra, editor không hiện thứ bộ lọc chặn | Review |
| `INV-NOTE-03` | HTML note chỉ vào DOM sau `sanitizeNoteHtml` (`NoteView`); dán đi qua `sanitizePastedData` của note. Bộ lọc parse trên document tách rời | Chặn XSS từ clipboard và dữ liệu cũ (phần chung: `INV-OBJ-03`..`05`) | Review |
| `INV-NOTE-04` | Đọc `data` note qua `parseNoteData`; ghi lại thì gộp `{ ...data, trường đổi }`, không ghi lại chỉ vài trường | Đã từng mất `heightMode` khi cắt đoạn | Review |
| `INV-NOTE-05` | `auto` chỉ tự tăng, không tự co; tối thiểu 68; ghi không vào undo; bỏ qua khi đang resize. `fixed` không tự tăng, chữ vượt thì cắt + lớp mờ | Giống Milanote; khoảng trống người dùng kéo ra được giữ | Review |
| `INV-NOTE-06` | Kéo góc note (có đổi kích thước) → `heightMode: 'fixed'` qua `onResizeCommit` | Sau khi người dùng tự đặt cỡ, note không tự giãn đè lên | Review |
| `INV-NOTE-07` | Gõ chữ ghi ngay (`setNoteBodySilently`, kênh `text`, không debounce, không undo); thoát sửa ghi đúng 1 bước undo nếu chữ khác; editor bị gỡ giữa chừng vẫn ghi bước đó | Không mất chữ khi F5 / đóng tab; Ctrl+Z lùi cả 1 lần sửa | Review (`INV-DATA-10`) |
| `INV-NOTE-08` | Lần cấp mã khối cho note cũ không tính là sửa: không thêm bước undo | Mở rồi thoát không gõ thì lịch sử không đổi | Review, test tay N3 |
| `INV-NOTE-09` | Blur không thoát sửa khi: 250ms đầu, tab / cửa sổ mất focus, focus sang `[data-canvas-overlay]` | Double-click, đổi tab, bấm toolbar không làm mất chế độ sửa và khoá | Review |
| `INV-NOTE-10` | Nút của toolbar sửa có `onMouseDown preventDefault` (trừ Dismiss); popup lấy focus phải nằm trong `<ToolbarPopup>` (có `data-canvas-overlay`) và trả focus về editor khi xong | Thiếu 1 lớp → thoát sửa, thoát 2 tầng dồn thành 1 | Review |
| `INV-NOTE-11` | `anchorLabel` của `useToolbarPopupClose` trùng `aria-label` nút mở; dịch nút thì dùng cùng key | Lệch thì bấm nút mở bị đóng rồi mở lại | Review (`coding-style.md` mục i18n) |
| `INV-NOTE-12` | Phím trong editor khai qua extension (`NoteCommitKeys`, priority trên HardBreak), không gắn `keydown` tay. Enter giữ nghĩa thêm đoạn | Không chèn `<br>` trước khi lưu; không phá ghép chữ tiếng Việt | Review (`coding-style.md` mục phím tắt) |
| `INV-NOTE-13` | Mỗi lúc 1 editor trong `note-editor-store`; chỉ gỡ khi store còn trỏ đúng editor đó | Toolbar không mất editor của note vừa mở | Review |
| `INV-NOTE-14` | Mã khối chỉ cần duy nhất trong 1 note; tìm khối có mã mà không thấy thì huỷ, không lấy khối cùng vị trí | Không cắt nhầm đoạn khi nội dung vừa đổi | Test `note-block-keys` |
| `INV-NOTE-15` | Card Clipper có ở cả xem lẫn sửa; mặc định cắt, Alt = sao chép; tìm khối lại lúc thả; cả thao tác 1 bước undo; chỉ thả trên mặt canvas | Giống Milanote | Review, test tay N1, N2, N4 |
| `INV-NOTE-16` | Không hiện Card Clipper trên note đang khoá ở tab khác | Cắt đoạn sẽ ghi đè chữ tab kia | Review |
| `INV-NOTE-17` | Màu note lưu hex (hoặc `null`), không lưu id bảng màu; tên màu lưu key dịch | Đổi bảng màu không đổi màu note cũ; đổi ngôn ngữ cập nhật tên | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/tools/canvas/components/objects/note-type.tsx` | Định nghĩa loại: cỡ mặc định, `defaultData`, lọc khi dán, `onResizeCommit`, nút toolbar |
| `src/tools/canvas/components/objects/NoteObject.tsx` | `NoteRenderer`, `NoteView`, `NoteEditor`, tự cao, lớp mờ, tự lưu, blur, Ctrl+Enter |
| `src/tools/canvas/components/objects/NoteToolbar.tsx` | Nút chọn / sửa, popup Text style, Link, Màu |
| `src/tools/canvas/components/ToolbarPopup.tsx` | Khung popup dùng chung, `data-canvas-overlay` |
| `src/tools/canvas/hooks/useToolbarPopupClose.ts` | Đóng popup: Esc, click ngoài, bỏ qua nút mở |
| `src/tools/canvas/components/Toolbar.tsx` | `ActionButton` (`onMouseDown preventDefault`), `DismissButton` |
| `src/tools/canvas/store/note-editor-store.ts` | Đưa editor đang mở sang toolbar |
| `src/tools/canvas/lib/note-schema.ts` | `NOTE_SCHEMA_EXTENSIONS`, `sanitizeNoteHtml` |
| `src/tools/canvas/lib/note-data.ts` | `parseNoteData` (điền mặc định) |
| `src/tools/canvas/lib/note-colors.ts` | Bảng 6 màu |
| `src/tools/canvas/lib/note-commit-keys.ts` | Esc, Mod-Enter trong editor |
| `src/tools/canvas/lib/note-block-keys.ts` | Extension mã khối, `newBlockKey`, `findBlockIndex` |
| `src/tools/canvas/lib/note-clip.ts` | `extractBlockHtml`, `removeBlock` |
| `src/tools/canvas/hooks/useCardClipper.ts` | Tìm khối dưới con trỏ |
| `src/tools/canvas/components/CardClipperButton.tsx` | Nút kéo, bản xem trước, thả |
| `src/tools/canvas/engine/actions.ts` | `setNoteBodySilently`, `commitNoteBodyEdit`, `createNoteBelow`, `clipParagraphToNewNote` |
| `src/tools/canvas/hooks/useCanvasKeys.ts` | `canvas.new-note-below` khi note đang chọn |
| `src/tools/canvas/types.ts` | `noteDataSchema` |

## Nguồn liên quan

- Spec `.kiro/specs/canvas-note-block-keys/` (chờ test tay N1–N4, xong thì vào legacy).
- Spec cũ: `docs/legacy/specs/canvas-note-autosave/` (tự lưu, undo gộp, khoá giữa tab, Ctrl+Enter).
- Note `milanote-sync-architecture.md` mục 1.3 (`attrs.key`), 2.6 (ghép bản sửa theo đoạn).
- `.kiro/steering/shortcuts.md` (khai báo phím), `coding-style.md` (i18n, `anchorLabel`, chọn chữ).

## Câu còn mở

- (2026-10-13) Kéo góc note `auto` lần đầu tạo 2 bước undo (resize + "Edit object" đổi `heightMode`). Ctrl+Z lần 1 chỉ trả về `auto`, cỡ vẫn giữ. Chờ bạn chốt có gộp thành 1 bước không.
- (2026-10-13) Ở `fixed`, kéo góc nhỏ được tới `MIN_OBJECT_SIZE`, dưới 68. Handoff ghi "tối thiểu 68" (code chỉ áp 68 cho tự cao). Chờ bạn chốt.
- (2026-10-13) Mỗi đoạn `p` có viền 1px; comment ngay trên ghi "dùng token `border`". Trước khi sửa độ mờ (`02`), class `outline-primary/40` không ra CSS nên viền lấy màu chữ; từ 2026-10-13 viền là `primary` mờ 40%. Chưa rõ viền này cố ý hay còn sót khi thử. Chờ bạn chốt: giữ / đổi sang `border` / bỏ.
- (2026-10-14, Kiro thử MCP bằng chuột thật) Card Clipper trong lúc sửa: bấm nút → editor blur (nút không chặn focus, không nằm trong overlay) → thoát sửa ngay, ghi bước undo sửa chữ. `NoteEditor` bị gỡ nên nút của nó cũng bị gỡ giữa lúc kéo: listener trên `window` vẫn chạy nên thả vẫn cắt đúng đoạn (tìm theo mã trong `body` mới), nhưng bản xem trước không hiện (`setPreview` của component đã gỡ). Không bị ghi đè chữ vì editor đã đóng trước khi cắt. Chờ bạn chốt hướng sửa.
- (2026-10-13) Chữ UI chưa qua bộ dịch: placeholder "Bắt đầu gõ...", nhãn nút toolbar note (Đậm, Nghiêng, Bulleted list, Text style, Link, Labels...), tên kiểu chữ, nút Save / Remove / Cancel của Link, `title` / `aria-label` của Card Clipper. Khi dịch Text style / Link phải đổi `anchorLabel` cùng key (`INV-NOTE-11`). Thuộc việc `i18n`.
- (2026-10-13) Labels, Reactions, Comment, More trên toolbar note là nút giữ chỗ, bấm không có gì.
- Gửi theo từng đoạn dùng mã khối, ghép bản sửa 2 người: việc của `canvas-sync` (`21`).
