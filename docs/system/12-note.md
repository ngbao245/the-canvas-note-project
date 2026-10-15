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
| `color` | hex hoặc `null` | `null` | Thanh màu trên đầu note (tab Top strip). `null` = không có thanh (bỏ thanh xanh mặc định 2026-10-14, bạn chốt) |
| `background` | hex, `'transparent'` hoặc `null` | `null` | Nền cả note (tab Background). `null` = nền card, `'transparent'` = không nền, không bóng (2026-10-15) |
| `textColor` | hex hoặc `null` | `null` | Màu chữ đi kèm khi chọn ô cặp "A". Chọn màu nền khác / không màu thì về `null` (2026-10-15) |
| `heightMode` | `auto` / `fixed` | `auto` | Xem "Chiều cao" |
| `locked` | boolean | `false` | Khoá vị trí (More → Lock Position). `true` = không kéo di chuyển, không kéo góc đổi cỡ. Vẫn chọn / mở sửa / đổi màu được (2026-10-14) |

- Note mới (`note-type.tsx`): 338 × 68, `{ body: '<p></p>', color: null, heightMode: 'auto' }`.
- Mọi chỗ đọc `data` note trong renderer, engine, dán, resize, nút màu đi qua `parseNoteData` (`lib/note-data.ts`), không đọc thô. (Nút màu đổi từ `safeParse` sang `parseNoteData` 2026-10-13: trước đó dữ liệu lạ làm ghi body rỗng, mất chữ.)
- `parseNoteData` chỉ điền mặc định: `body` không phải chuỗi hoặc rỗng → `<p></p>`, `color` không phải chuỗi → `null`, `heightMode` khác `'fixed'` → `'auto'`, `locked` khác `true` → `false`. `data` không phải object → note rỗng mặc định.
- `isObjectLocked(type, data)` (`lib/note-data.ts`): type khác `note` → luôn false; note → đọc `locked`. Hook kéo (`useObjectDrag`) + lớp vẽ (`ObjectsLayer`) dùng để chặn di chuyển / ẩn góc resize. Không chuyển dạng cũ (`title` + chữ thường) nữa (gỡ 2026-10-14, bạn chốt bỏ dữ liệu cũ); `body` giữ nguyên chuỗi, vào DOM vẫn qua `sanitizeNoteHtml`.

### Schema và lọc HTML (`lib/note-schema.ts`)

- `NOTE_SCHEMA_EXTENSIONS` là bộ extension duy nhất mô tả nội dung note: StarterKit (tắt Link có sẵn trong kit), Link cấu hình riêng, `TextStyle` + `Color` (màu chữ), `Highlight` (tô nền, multicolor), `TextAlign` (căn lề heading + paragraph), `NoteParagraphVariant` (Small text + Callout), `NoteBlockKeys`.
- StarterKit v3 đã gồm Underline + Strike + Code inline + Link + ListKeymap. Underline / Strike / Code dùng thẳng từ kit, chỉ nối nút trong toolbar More (lúc sửa). Chỉ tắt Link trong kit để dùng bản cấu hình riêng.
- Link: `openOnClick: false` (click để đặt caret), `autolink`, `linkOnPaste`, gắn `rel="noopener noreferrer"` + `target="_blank"`. Href `javascript:` / `data:` bị extension bỏ mark, chỉ còn chữ.
- Màu chữ + tô nền lưu trong body HTML dưới dạng mark (`<span style="color">`, `<mark data-color style="background-color">`), KHÔNG thêm trường data. Hex là data color (hard-code OK). Palette ở `lib/note-text-colors.ts` (5 màu chữ + 5 màu nền, kèm "mặc định" / "không nền").
- Small text + Callout: thuộc tính `variant` trên `paragraph` (`data-variant="small" | "callout"`), không thêm node mới (`lib/note-paragraph-variant.ts`, lệnh `setParagraphVariant`). Nằm trong schema → bộ lọc giữ. Hiển thị qua CSS trong `NOTE_CONTENT_CLASS`.
- Editor dùng bộ này + 2 extension chỉ là UI: `NoteCommitKeys`, `Placeholder`. Hai cái này không đổi schema nên không vào bộ chung.
- `sanitizeNoteHtml(html)`: parse bằng `DOMParser` trên document tách rời → ProseMirror parse theo schema → serialize lại. Thứ gì schema không biết (script, `img onerror`, iframe, `style`, `onclick`...) bị bỏ. Kết quả rỗng → `<p></p>`.
- Bộ parse / serialize dựng 1 lần. Kết quả cache theo chuỗi vào, tối đa 300 mục, đầy thì xoá hết.
- Lọc ở 2 chỗ: `NoteView` trước `dangerouslySetInnerHTML` (chặn cả dữ liệu cũ trong IndexedDB) và `sanitizePastedData` khi dán (dữ liệu lưu xuống đã sạch). Editor không cần lọc vì Tiptap tự parse qua cùng schema.
- `data-key` nằm trong schema nên bộ lọc giữ mã khối.

### Hiển thị (`NoteObject.tsx`)

- `NoteRenderer`: bọc `ObjectShell` (`variant="card"`, thanh màu theo `color`). Đang sửa → `NoteEditor`, không → `NoteView`.
- Khung: `px-5 py-6` (dọc 48 tổng). Chữ dùng chung 1 class `NOTE_CONTENT_CLASS` cho cả xem lẫn sửa, nên đổi chế độ không nhảy layout: `text-sm`, `leading-relaxed`, `break-words whitespace-pre-wrap`, đoạn liền nhau cách 10px, font serif, kiểu riêng cho `h1-3`, list, quote, code trong dòng (`code`), code block (`pre`), gạch chân (`u`), gạch ngang (`s`), tô nền (`mark`), Small text (`p[data-variant=small]`), Callout (`p[data-variant=callout]`), link. Màu chữ + màu nền là inline style trên mark nên tự áp, không cần class.
- `select-text` chỉ đặt ở editor mode (contenteditable), không ở view mode. Xem note (không sửa) thì chữ không bôi đen được, thừa hưởng `select-none` của `CanvasSurface`; muốn chọn chữ phải double-click vào sửa (bạn chốt 2026-10-14, giống Milanote). Trước đó `select-text` đặt chung cho cả 2 mode nên chữ lúc xem cũng chọn được. Safari cần `select-text` cho contenteditable khi tổ tiên là `select-none`.
- Đoạn `p` không có viền (viền thử `outline-primary/40` đã gỡ 2026-10-14, bạn chốt).

### Chiều cao (`heightMode`)

- `auto`: `ResizeObserver` đo `scrollHeight` vùng chữ + 48 → chiều cao cần. Chỉ TĂNG khi cần lớn hơn hiện tại quá 1px, không bao giờ tự co. Tối thiểu 68. Ghi bằng `applyResize` (không vào undo). Bỏ qua lúc đang resize.
- `fixed`: không tự tăng. Chữ vượt khung → cắt + lớp mờ cao 32px ở đáy (`FadeOverlay`, `pointer-events-none`).
- Chuyển `auto` → `fixed`: `onResizeCommit` của loại note trả `extra` (apply/undo/redo thao tác trên data silent), `SelectionBox` truyền vào `commitResize` để GỘP đổi `heightMode` vào CÙNG bước undo với resize. Ctrl+Z 1 lần trả cả cỡ lẫn `heightMode` (sửa 2026-10-14: trước là 2 bước riêng).
- Không có đường về `auto` (Milanote cũng không có).
- Kéo góc note (cả `auto` lẫn `fixed`) chặn tối thiểu 68 chiều cao qua `minSize: { height: 68 }` trong định nghĩa loại; `SelectionBox` đọc `def.minSize` khi kéo. Bằng với note tự cao 1 dòng, không bị bóp dẹt hơn (sửa 2026-10-14).

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

| Chế độ | Nút | Trạng thái |
|---|---|---|
| Chọn (`NoteElementActions`) | Màu, Labels, Reactions, Comment, More | Màu + More nối thật. Labels / Reactions / Comment vô hiệu (mờ, `aria-disabled`, tooltip báo lý do): Labels sắp làm, Reactions / Comment cần đăng nhập |
| Sửa (`NoteEditingActions`) | Text style, Đậm, Nghiêng, Bulleted list, Numbered list, Link, Comment, More | Tất cả nối thật trừ Comment (vô hiệu). More lúc sửa mở menu định dạng bổ sung |

- **More lúc chọn** (`MorePopup`): Convert to Document (vô hiệu, mờ — chưa có loại Document), Lock / Unlock Position (toggle `locked`), Bring to Front, Send to Back (gọi `bringToFront` / `sendToBack` sẵn có).
- **More lúc sửa** (`MoreEditingPopup`, Milanote parity): Code trong dòng (`toggleCode`), Gạch chân (`toggleUnderline`), Gạch ngang (`toggleStrike`), Căn trái / giữa / phải (`setTextAlign`). Mỗi mục có trạng thái bật. Nút giữ `onMouseDown preventDefault` qua `ActionButton` để không mất chế độ sửa.
- **Text style mở rộng** (`TextStylePopup`): 3 nhóm cuộn dọc —
  - Kiểu khối: Title (`h1`), Heading (`h2`), Subheading (`h3`), Body (đoạn thường), Small text (`variant=small`), Code block (`codeBlock`), Callout (`variant=callout`), Quote (`blockquote`).
  - Màu chữ: mặc định + 5 màu (`setColor` / `unsetColor`).
  - Tô nền: không nền + 5 màu (`toggleHighlight` / `unsetHighlight`).

- Nút định dạng chỉ nằm trong toolbox dọc, không có thanh nổi trên note / khi bôi đen chữ (bạn chốt 2026-10-15, lý do ở `decisions.md`).
- Editor đến toolbar qua `note-editor-store` (`activeEditor`, 1 editor mỗi lúc). `NoteEditor` đặt khi mount, gỡ khi unmount (chỉ gỡ nếu store còn trỏ đúng editor đó). Editor chưa kịp đặt → nhóm nút sửa không vẽ.
- Toolbar nghe sự kiện `transaction` của editor để vẽ lại trạng thái bật (`isActive`).
- Text style: Title (`h1`), Heading (`h2`), Subheading (`h3`), Body (đoạn), Quote (blockquote).
- Link: ô URL. Lưu chỉ được khi có chữ đang chọn hoặc caret nằm trong link cũ; `extendMarkRange('link')` nên không cần bôi đen đúng link cũ. Có link → thêm nút Remove. Enter = lưu.
- Màu (spec `canvas-note-color`, parity Milanote đo 2026-10-15): popup 2 tab, mở luôn ở Background. Rộng 188px, 5 ô 1 hàng, ô 28×24 khe 6px (nhỏ hơn ô Milanote 36×30, bạn chốt 2026-10-15). 2 tab chồng cùng 1 ô lưới, tab ẩn `invisible` nên popup luôn cao bằng tab dài nhất, đổi tab không co giãn / nhảy vị trí.
  - Background: không màu + 11 màu chuẩn (`NOTE_STANDARD_COLORS`) + trong suốt; hàng cặp nền + chữ "A" (`NOTE_COLOR_PAIRS`); hàng 7 màu gợi ý (`NOTE_SUGGESTED_COLORS`); Custom color.
  - Top strip: bỏ màu (gạch chéo `destructive`) + 11 màu chuẩn; hàng gợi ý; Custom color. Không có trong suốt, không có hàng "A".
  - Màu chuẩn dùng chung 2 theme (trừ xám); cặp "A" và gợi ý mỗi theme 1 bộ (`useResolvedTheme`).
  - Chọn màu không đóng popup. Mỗi lần đổi thật = 1 bước undo (`updateObjectData`); chọn lại đúng màu đang áp thì không ghi bước.
  - Custom color = `<input type="color">` gốc, chỉ ghi khi sự kiện `change` (không theo `input`, kéo trong bảng màu không đẻ nhiều bước undo).
  - Chữ note: `textColor` → tự tương phản theo độ sáng nền (`noteInkColor`, ngưỡng 0.6) → màu chữ theme. `ObjectShell` đặt biến `--object-ink` / `--object-surface`, chữ (xem + sửa) và lớp mờ cuối note đọc biến đó. Mark màu chữ trong body vẫn thắng.
  - Icon nút Màu vẽ màu hiện tại (nền + thanh + "A"), note không màu giữ icon Palette.
  - Lưu hex, không lưu id màu (`INV-NOTE-17`). Tên màu chuẩn lưu key dịch; ô cặp / gợi ý dùng mã hex làm tooltip.
  - Tách đoạn (Card Clipper) và dán giữ đủ 3 trường màu.

### Giữ trạng thái sửa khi bấm toolbar

Hai lớp, thiếu 1 lớp là thoát sửa (và thoát 2 tầng dồn thành 1):

1. `ActionButton` có `onMouseDown preventDefault` → trình duyệt không chuyển focus, editor không blur, vùng chọn chữ giữ nguyên. Nút trong popup Text style cũng vậy. `DismissButton` cố ý không chặn (bấm là thoát sửa).
2. Popup có ô nhập (Link) hoặc lấy focus: nằm trong `<ToolbarPopup>` (có `data-canvas-overlay`). `onBlur` của editor bỏ qua khi focus sang overlay. Lệnh của popup chạy `chain().focus()` nên focus về editor.

### Popup dùng chung

- `ToolbarPopup` (`components/ToolbarPopup.tsx`): render qua portal ra `body`, `position: fixed`, `z-toolbar`, gắn `data-canvas-overlay`. Lý do portal: list toolbar `overflow-y-auto` ép `overflow-x` thành `auto` → popup đặt cạnh phải bị cắt. Vị trí đo theo rect phần tử cha bọc nút mở: mặc định bên phải nút, căn mép trên nút; sát mép phải mà bên trái đủ chỗ thì lật trái; luôn kẹp trong viewport (lề 8px), cao hơn viewport thì giới hạn chiều cao + cuộn. Có mũi tên SVG trỏ tâm dọc nút (không vượt góc bo). Đo lại khi popup đổi cỡ, cửa sổ resize, vùng cuộn toolbar cuộn. 2 lớp: lớp ngoài chứa mũi tên (không overflow), lớp trong mang `className` của caller (nền card, viền, bóng). `forwardRef` trỏ lớp ngoài cho hook đóng.
- `useToolbarPopupClose({ popupRef, anchorLabel, onClose, onRefocus })`:
  - Esc qua `useEscapeLayer`: chỉ đóng popup, không lọt xuống canvas (bỏ chọn) hay editor (thoát sửa). Gọi `onRefocus` nếu có.
  - `pointerdown` (pha capture) ngoài popup → đóng. Bỏ qua khi trúng nút mở, tìm bằng `[aria-label="{anchorLabel}"]`, vì nút tự bật / tắt qua state.
  - Callback giữ trong ref: popup sửa vẽ lại mỗi transaction, không gỡ / gắn listener liên tục.
- `anchorLabel` phải trùng `aria-label` của nút mở, dùng cùng key dịch: Màu `CANVAS.NOTE_COLOR.PICK`, Text style `CANVAS.NOTE_TOOLBAR.TEXT_STYLE`, Link `CANVAS.NOTE_TOOLBAR.LINK`, More `CANVAS.NOTE_TOOLBAR.MORE` (2026-10-14, trước là chữ cứng).

### Khoá sửa: phần riêng note

Cơ chế khoá theo người chọn ở `20`. Phần note:

- Double-click note khoá ở tab khác: báo bận, không mở editor (`ObjectsLayer`).
- Đổi tab không thoát sửa, không nhả khoá (xem blur ở trên). Chữ vẫn tự lưu; ẩn tab thì hàng đợi đẩy gấp (`20`).
- Tab khác giành quyền (nút ×): editor bị gỡ, cleanup ghi bước undo; chữ không mất vì đã tự lưu.
- Card Clipper chỉ có trong editor, mà note khoá ở tab khác thì không mở được editor → không cắt đè chữ tab kia.

### Mã khối (`lib/note-block-keys.ts`)

- Extension `UniqueID`, thuộc tính `key` → HTML `data-key="..."`, giống `attrs.key` của Milanote.
- Khối có mã: `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `horizontalRule`. Phần trong dòng (đậm, link) không có.
- Mã 8 ký tự chữ + số từ `crypto.getRandomValues`. Chỉ cần không trùng trong 1 note. Nhân bản / dán note giữ nguyên mã.
- Extension tự cấp mã cho khối mới, Enter tách đoạn, dán, kéo thả trong editor (bỏ mã cũ, cấp lại). Lần cấp cho note cũ không vào lịch sử undo.
- Note chưa từng mở sửa thì chưa có mã. Mã chỉ có khi mở editor.
- `findBlockIndex(keys, { key, index })`: có `key` → tìm theo mã, không thấy trả -1 (KHÔNG lấy khối cùng vị trí). Không có `key` → theo vị trí.
- Mã chưa dùng khi gửi server (`21` gửi cả `data.body`).

### Card Clipper

- Chỉ hiện lúc sửa note (`NoteEditor`), ngang khối đang có con trỏ gõ: sửa dòng nào thì kéo dòng đó (giống Milanote, bạn chốt 2026-10-14; trước hiện theo hover cả lúc xem). `useCardClipper(editor, wrapperRef)` tính lại mỗi transaction: khối cấp ngoài cùng chứa `selection.$from`, trả `{ index, key, top }` (top px layout, đã chia zoom). Chọn cả note → ẩn.
- Nút nằm ngoài cạnh phải (cách 8px), khung `ObjectShell` không `overflow-hidden` để không bị cắt. Hover: to lên 1.1 + hiện mũi tên (`ArrowRight`).
- Bấm nút không lấy focus (`preventDefault` ở `pointerdown` + `mousedown`): editor không blur, vẫn ở chế độ sửa note gốc trong lúc kéo.
- Thả: trước khi cắt, chữ đã gõ ở note gốc được chốt thành 1 bước "Edit note". Sau khi tạo note mới, chế độ sửa chuyển sang note mới (chỉ note mới được chọn, con trỏ cuối chữ), cả khi cắt lẫn sao chép (bạn chốt 2026-10-14, giống Milanote; thay bản trước: giữ sửa note gốc, con trỏ về cuối dòng trên). Editor note gốc được đánh dấu đã chốt nên lúc gỡ không ghi lại body cũ đè lên bản đã cắt. Khối đã mất lúc thả → không tạo gì, vẫn sửa note gốc. Sau khi thoát sửa, Ctrl+Z lần 1 trả đoạn đã cắt, lần 2 trả chữ đã gõ trước đó.
- `CardClipperButton`: bấm không kéo = không làm gì. Kéo quá 5px → hiện bản xem trước note mới (`FloatingObjectPreview`, kích thước mặc định, tâm dưới con trỏ), vùng thả sai → con trỏ `not-allowed`.
- Thả trên mặt canvas → `clipParagraphToNewNote`. Thả chỗ khác (overlay, Unsort, thùng rác, ngoài canvas) → huỷ im lặng.
- Mặc định cắt; giữ Alt lúc thả = sao chép.
- Khối được chụp lúc bấm (mã + vị trí), rồi tìm lại theo mã trong `body` HIỆN TẠI lúc thả. Đổi vị trí vẫn đúng; bị xoá thì huỷ.
- Note mới: body = HTML khối đó (`extractBlockHtml`), màu theo note gốc, `heightMode: 'auto'`, tâm tại điểm thả, nằm trên cùng, được chọn và vào chế độ sửa.
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
| `INV-NOTE-06` | Kéo góc note (có đổi kích thước) → `heightMode: 'fixed'` qua `onResizeCommit`, GỘP vào cùng bước undo với resize (trả `extra`, không push riêng). Tối thiểu 68 chiều cao cả 2 mode qua `minSize` | Sau khi người dùng tự đặt cỡ, note không tự giãn đè lên; Ctrl+Z 1 lần trả cả cỡ lẫn mode; note fixed không dẹt hơn note auto | Review, test tay Z-note |
| `INV-NOTE-18` | Note `locked` (More → Lock Position): hook kéo + resize bỏ qua (không di chuyển, ẩn góc kéo). Kéo cụm có note khoá → note khoá đứng yên, object khác vẫn kéo. Vẫn chọn / sửa / đổi màu được. Đọc qua `isObjectLocked` | Giống Milanote Lock Position; không khoá luôn việc sửa chữ | Review |
| `INV-NOTE-19` | Màu chữ / tô nền / căn lề / Small / Callout là mark / attribute trong `body` HTML, extension nằm trong `NOTE_SCHEMA_EXTENSIONS` → bộ lọc giữ. KHÔNG thêm trường data cho chúng | Đổi 1 nguồn (schema) là cả editor lẫn bộ lọc theo; xem lại note sau F5 không mất định dạng | Review (`INV-NOTE-02`) |
| `INV-NOTE-07` | Gõ chữ ghi ngay (`setNoteBodySilently`, kênh `text`, không debounce, không undo); thoát sửa ghi đúng 1 bước undo nếu chữ khác; editor bị gỡ giữa chừng vẫn ghi bước đó | Không mất chữ khi F5 / đóng tab; Ctrl+Z lùi cả 1 lần sửa | Review (`INV-DATA-10`) |
| `INV-NOTE-08` | Lần cấp mã khối cho note cũ không tính là sửa: không thêm bước undo | Mở rồi thoát không gõ thì lịch sử không đổi | Review, test tay N3 |
| `INV-NOTE-09` | Blur không thoát sửa khi: 250ms đầu, tab / cửa sổ mất focus, focus sang `[data-canvas-overlay]` | Double-click, đổi tab, bấm toolbar không làm mất chế độ sửa và khoá | Review |
| `INV-NOTE-10` | Nút của toolbar sửa có `onMouseDown preventDefault` (trừ Dismiss); popup lấy focus phải nằm trong `<ToolbarPopup>` (có `data-canvas-overlay`) và trả focus về editor khi xong | Thiếu 1 lớp → thoát sửa, thoát 2 tầng dồn thành 1 | Review |
| `INV-NOTE-11` | `anchorLabel` của `useToolbarPopupClose` trùng `aria-label` nút mở; dịch nút thì dùng cùng key | Lệch thì bấm nút mở bị đóng rồi mở lại | Review (`coding-style.md` mục i18n) |
| `INV-NOTE-12` | Phím trong editor khai qua extension (`NoteCommitKeys`, priority trên HardBreak), không gắn `keydown` tay. Enter giữ nghĩa thêm đoạn | Không chèn `<br>` trước khi lưu; không phá ghép chữ tiếng Việt | Review (`coding-style.md` mục phím tắt) |
| `INV-NOTE-13` | Mỗi lúc 1 editor trong `note-editor-store`; chỉ gỡ khi store còn trỏ đúng editor đó | Toolbar không mất editor của note vừa mở | Review |
| `INV-NOTE-14` | Mã khối chỉ cần duy nhất trong 1 note; tìm khối có mã mà không thấy thì huỷ, không lấy khối cùng vị trí | Không cắt nhầm đoạn khi nội dung vừa đổi | Test `note-block-keys` |
| `INV-NOTE-15` | Card Clipper chỉ có lúc sửa, theo khối đang gõ; mặc định cắt, Alt = sao chép; tìm khối lại lúc thả; tạo + bỏ khối 1 bước undo; chỉ thả trên mặt canvas | Giống Milanote | Review, test tay C1–C3 |
| `INV-NOTE-16` | Nút Card Clipper không lấy focus; cắt lúc đang sửa phải chốt chữ đã gõ trước và nạp lại editor sau | Không thoát sửa giữa chừng; gõ tiếp không ghi đè bản đã cắt | Review |
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
| `src/tools/canvas/lib/note-colors.ts` | Bảng màu note (chuẩn, cặp "A", gợi ý), `noteInkColor`, `sameColor` |
| `src/tools/canvas/lib/note-text-colors.ts` | Bảng màu chữ (5) + tô nền (5) trong Text style |
| `src/tools/canvas/lib/note-paragraph-variant.ts` | Extension Small text + Callout (`data-variant`) |
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

- (2026-10-13) `title` / `aria-label` của Card Clipper chưa qua bộ dịch (phần còn lại của toolbar note đã dịch 2026-10-14). Thuộc việc `i18n`.
- (2026-10-14) Small text + Callout render bằng CSS trên `data-variant`. Nếu sau này cần phân biệt sâu hơn (VD Callout có icon) thì nâng thành node riêng. Hiện đủ parity Milanote.
- (2026-10-14) Convert to Document là nút vô hiệu (chưa có loại object Document). Labels vô hiệu (tách spec riêng sau). Reactions / Comment vô hiệu tới khi có đăng nhập + `canvas-sharing`.
- Gửi theo từng đoạn dùng mã khối, ghép bản sửa 2 người: việc của `canvas-sync` (`21`).
