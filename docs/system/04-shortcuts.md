# 04 — Phím tắt và modal phím tắt

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: bộ điều phối phím `src/lib/shortcuts/`, lớp phím, bảng phím (dữ liệu) và nơi gắn hành động, sổ đăng ký qua `register-tools.ts`, Kiểu bàn phím (Win / Mac), hiển thị nhãn phím, modal phím tắt, nhóm "Thường dùng", bảng phím canvas.

Không gồm: cách viết từng dòng (khai báo combo, `key` / `code`, hiển thị): `.kiro/steering/shortcuts.md` + `coding-style.md` mục "Phím tắt". Phím trong editor note (Ctrl+Enter, Esc thoát sửa): `12`. Mục Kiểu bàn phím trong Cài đặt: `05`.

## Hiện trạng

### Bộ điều phối (`dispatcher.ts`)

- 1 listener `keydown` + `keyup` ở `window`, pha capture, cộng `blur`. `App.tsx` gọi `useShortcutDispatcher()` đúng 1 lần; landing cũng gọi 1 lần cho canvas thử.
- Đang gõ IME (tiếng Việt Telex, tiếng Nhật) → bỏ qua hết.
- Duyệt lớp theo loại: `global` → `overlay` → `panel` → `tool`. Cùng loại: lớp đăng ký sau chạy trước (popup mở sau đóng trước).
- Trong 1 lớp: phím đầu tiên khớp tổ hợp + `when()` đúng + `run()` không trả `false` thì xong, dừng duyệt. Mặc định `preventDefault` + `stopPropagation` (`consume: false` để tắt).
- Lớp `blocking` (modal, dialog xác nhận) chặn mọi lớp bên dưới nó; lớp `global` nằm trên nên vẫn chạy.
- Focus ở ô gõ chữ: chỉ lớp `overlay` chạy (trừ phím có `allowInEditable`). Lớp tool / panel bỏ qua → Tiptap, ô nhập tự nhận phím.
- Phím giữ (có `release`): nhớ theo `e.code`, gọi `release` khi thả phím, khi cửa sổ mất focus, hoặc khi lớp bị gỡ (Space kéo màn hình).
- Bản dev: báo `console.warn` khi trùng tổ hợp trong cùng loại lớp hoặc trùng lớp global (bỏ qua overlay).

### So khớp (`combo.ts`)

- Ctrl và Cmd gộp thành `mod`. Phím bổ trợ không ghi = phải KHÔNG giữ. `shift: 'any'` = có hay không đều được.
- `key` 1 ký tự so không phân biệt hoa / thường (Caps Lock không lệch). `code` so phím vật lý.
- Tổ hợp có `pointer` hoặc chỉ có phím bổ trợ: không bao giờ khớp, chỉ để hiển thị.
- `alias: true`: cách nhận thay thế, không hiện trong bảng (VD phím vật lý `Comma` cho `<`).
- `bindShortcuts(defs, handlers)`: ghép bảng dữ liệu với hành động theo id. Mỗi nơi chỉ truyền phần id của mình; id sai thì `tsc` báo.

### Đăng ký lớp (`useShortcutLayer.ts`)

| Hook | Dùng cho |
|---|---|
| `useShortcutLayer(kind, shortcuts, { enabled, blocking })` | Lớp bất kỳ. Đọc mảng mới nhất qua ref, không gỡ / gắn lại mỗi render |
| `useEscapeLayer(onClose, { enabled })` | Popup, menu: chỉ Esc, chạy cả khi đang gõ trong popup |
| `useModalLayer(onClose, ref, { enabled })` | Modal: Esc + giữ Tab xoay vòng trong `ref`, `blocking` |
| `registerLayer(kind, getShortcuts)` | Gọi tay ngoài hook (`usePointerInteraction` đăng ký Space) |

### Sổ đăng ký (`registry.ts`) và `register-tools.ts`

- Bảng phím của tool là dữ liệu thuần (`src/tools/canvas/shortcuts.ts`, không import store) để code dùng chung đọc được mà không kéo code canvas vào bundle chính.
- `register-tools.ts` gọi `registerShortcutDefs(CANVAS_SHORTCUT_DEFS)` + `(NOTE_TEXT_SHORTCUT_DEFS)` 1 lần lúc khởi động. Thứ tự đăng ký = thứ tự trong modal.
- Code dùng chung lấy 1 phím: `getShortcutDef(id)` (VD Cài đặt → Canvas lấy `canvas.zoom-wheel`). Phím toàn app thì import thẳng `GLOBAL_SHORTCUT_DEFS`.
- Canvas thử trên landing dùng bảng riêng `DEMO_SHORTCUT_DEFS`, không vào sổ.

### Kiểu bàn phím (`platform.ts`, `pointer.ts`, `stores/keyboard-platform-store.ts`)

- Lựa chọn `auto` | `macos` | `windows-linux`, lưu `bibo-keyboard-platform`, mặc định `auto`. Giá trị lạ trong localStorage coi như `auto`.
- `auto`: nhận máy Apple qua `userAgentData.platform` → `navigator.platform` → `userAgent`. iPad tính là Apple. Nhớ kết quả 1 lần mỗi phiên.
- Chỉ quyết 2 việc: nhãn phím chính (⌘ hay Ctrl) và phím giữ khi click / kéo (`isPrimaryModifier`: Cmd trên Mac, Ctrl nơi khác). Bắt phím bàn phím vẫn nhận cả Ctrl lẫn Cmd.
- Mac: Ctrl + click là chuột phải → handler chọn / kéo bỏ qua (`isMacSecondaryClick`). Lăn chuột zoom nhận cả Ctrl lẫn Cmd (`isZoomWheel`) vì pinch trackpad gửi `ctrlKey`.
- `getKeyboardPlatform()` đọc lúc sự kiện; `useKeyboardPlatform()` dùng trong render để đổi nhãn ngay.

### Hiển thị phím (`format.ts`, `components/shortcuts/ShortcutKeys.tsx`)

- `comboKeyLabels` / `formatCombo`: Mac hiện `⌘`, nơi khác `Ctrl`. Shift, Alt, Enter, Backspace giữ tên chữ ở cả 2 OS. Esc, Space, `[` `]` `,` `.` có tên riêng. Tên phím không dịch.
- `shortcutKeys(def, platform)`: tổ hợp chính (bỏ `alias`) dạng chữ, để chèn vào tooltip: `t('COMMON.WITH_SHORTCUT', { label, keys })`.
- `displayWays(def)`: các cách bấm; có `display.ways` thì dùng nguyên (chữ nối "giữ", "khi kéo", "gõ ... rồi", icon chuột), không thì sinh từ `combos`.
- `<ShortcutWays def>`: vẽ mọi cách, ngăn bằng `|` (trình đọc màn hình đọc "hoặc"). `<Kbd>` có `select-none`; ⌘ vẽ bằng icon lucide `Command` để cùng cỡ trên Windows.

### Modal phím tắt (`components/shortcuts/ShortcutsModal.tsx`, `stores/shortcuts-modal-store.ts`)

- Mount 1 lần ở `App`. Mở bằng Trợ giúp → Phím tắt (`HelpMenu.tsx`) hoặc phím `/`. Bấm `/` lần nữa thì đóng. Cài đặt đang mở thì `/` không mở chồng. Store không persist.
- Danh sách dựng lúc mở từ sổ + `GLOBAL_SHORTCUT_DEFS`: chỉ phím có `display`. Nhóm theo `GROUP_ORDER`: Thường dùng, Cơ bản, Định dạng chữ, Markdown, Di chuyển, Giao diện, Thu phóng.
- "Thường dùng": phím có `display.essential`, sắp theo số (nhỏ trước). Phím `/` là 100, luôn cuối. Dòng vẫn hiện ở nhóm gốc.
- `subgroupKey`: tiêu đề con (Markdown: "Gõ ở đầu dòng mới"), gom các dòng liền nhau cùng key.
- 2 cột: trái là nhóm (bấm → cuộn tới, nhóm đang xem được tô, màn hẹp ẩn), phải là 1 danh sách cuộn liền. Cột trái cuối có mẹo "Bấm [/] ...".
- Ô tìm: focus khi mở. Lọc theo tên thao tác + tên nhóm + tên phím, bỏ dấu tiếng Việt, mọi từ phải có. Đang tìm thì ẩn "Thường dùng". Không có kết quả: `EmptyState`. Esc xoá chữ trước, lần 2 mới đóng.
- `useModalLayer`: phím canvas không chạy ngầm. Đóng thì trả focus về chỗ cũ. Theo Kích thước giao diện (CSS `zoom`).

### Phím toàn app (`global-shortcuts.ts`, lớp `global`)

| Phím | Việc |
|---|---|
| `/` | Mở / đóng modal phím tắt |
| Ctrl+Shift+D | Đổi sáng / tối (đè phím "đánh dấu tất cả tab" của trình duyệt) |
| Ctrl+Shift+< / > | Kích thước giao diện nhỏ / to 1 mức |

### Phím canvas chính (`src/tools/canvas/shortcuts.ts`)

Hành động gắn ở: `hooks/useCanvasKeys.ts` (phần lớn, lớp tool), `CanvasApp.tsx` (Delete, Ctrl+Shift+U lớp tool; Esc đóng Unsort lớp panel), `usePointerInteraction.ts` (Space), `UnsortPanel.tsx` (Ctrl+A trong Unsort, lớp panel). Cột "TD" = thứ tự trong "Thường dùng".

| Phím | Việc | TD |
|---|---|---|
| Enter / double-click | Sửa object đang chọn | 1 |
| Ctrl + kéo / giữ Space + kéo / kéo chuột giữa | Kéo màn hình | 2 |
| Ctrl + lăn chuột | Thu phóng (xử ở `CanvasSurface`) | 3 |
| Ctrl+Z · Ctrl+Shift+Z / Ctrl+Y | Hoàn tác · Làm lại | 4 · — |
| Ctrl+C / X / V | Chép / cắt / dán object (không có object chọn → để trình duyệt chép chữ) | — |
| Ctrl+D | Nhân đôi (không chọn gì → để trình duyệt) | 5 |
| Delete / Backspace | Xoá (board / nhiều object thì hỏi xác nhận) | 6 |
| Shift + click / Ctrl + click | Chọn thêm / bỏ chọn | 7 |
| Ctrl+Shift+U | Đưa vào Unsort | 8 |
| Ctrl+Enter | 1 note đang chọn: tạo note bên dưới + vào sửa (hiện chung dòng `note.new-below`) | — |
| Ctrl+A · Esc | Chọn tất cả trên canvas · Bỏ chọn | — |
| Kéo vùng trống · Shift + kéo | Chọn vùng · chọn thêm | — |
| F · 0 hoặc Ctrl+0 | Vừa nội dung · Đặt lại góc nhìn | — |
| Ctrl++ / Ctrl+- | Phóng to / thu nhỏ quanh tâm màn hình | — |
| Ctrl+] / [ · Ctrl+Shift+] / [ | Lên / xuống 1 lớp · lên trên cùng / xuống dưới cùng | — |
| Esc (Unsort mở) | Đóng Unsort, lần sau mới bỏ chọn | — |
| Shift + lăn chuột · double-click board | Cuộn ngang · Vào board | — |

Bảng `NOTE_TEXT_SHORTCUT_DEFS` chỉ để hiển thị (Tiptap tự xử khi đang sửa): đậm, nghiêng, gạch chân, gạch ngang, code, tiêu đề 1-3, danh sách, trích dẫn, khối code, và nhóm Markdown gõ đầu dòng (`#`, `*`, `1.`, `>`, ` ``` `, `---`).

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-KEY-01` | Chỉ 1 bộ điều phối mỗi bản build; cấm `addEventListener('keydown')` trên `window` / `document`. Phím Tiptap qua `addKeyboardShortcuts`, ô nhập dùng `onKeyDown` tại chỗ | 1 chỗ quyết thứ tự, 1 lần bấm = 1 việc | Review + `coding-style.md` |
| `INV-KEY-02` | Thứ tự lớp `global` → `overlay` (mở sau trước) → `panel` → `tool`; lớp `blocking` chặn phía dưới | Esc đóng popup trên cùng trước, phím canvas không chạy sau modal | Code `dispatcher.ts` |
| `INV-KEY-03` | Lớp tool / panel không chạy khi focus ở ô gõ chữ; bỏ qua khi đang gõ IME | Gõ F / 0 / Delete trong note không đụng canvas, bỏ dấu tiếng Việt không bị nuốt | Code `dispatcher.ts` |
| `INV-KEY-04` | Bảng phím của tool chỉ là dữ liệu (không import store); hành động đọc state bằng `getState()` lúc bấm; nối vào sổ chỉ qua `register-tools.ts` | Modal / Cài đặt không kéo code tool vào bundle chính, không import `src/tools/` (`INV-CORE-02`, `03`) | Lint + review |
| `INV-KEY-05` | Hiển thị phím chỉ qua `ShortcutWays` / `shortcutKeys` / `formatCombo` với `useKeyboardPlatform()`; không tự viết `<Kbd>Ctrl</Kbd>`, không tính nhãn ở cấp module | Đổi phím hoặc Kiểu bàn phím thì mọi chỗ tự theo | Review |
| `INV-KEY-06` | Bắt phím bàn phím nhận cả Ctrl lẫn Cmd; Kiểu bàn phím chỉ quyết nhãn và phím giữ khi click / kéo; zoom lăn chuột nhận cả 2 | Mac: Ctrl + click là chuột phải; pinch gửi `ctrlKey` | Code `combo.ts`, `pointer.ts` |
| `INV-KEY-07` | Chữ cái dùng `key`, phím đổi ký tự khi giữ Shift dùng `code`; phím bổ trợ không ghi = không giữ | Caps Lock / bố cục bàn phím không làm lệch | Review |
| `INV-KEY-08` | Ctrl/Cmd + `[` `]` (có / không Shift) luôn bị nuốt trên canvas, kể cả khi không chọn gì | Trên Mac là Back / Forward, lọt xuống là rời canvas | Code `useCanvasKeys.ts` (`stack`) |
| `INV-KEY-09` | Dòng chỉ hiển thị (`combos: []` + `display.ways`, hoặc `pointer`) chỉ ghi khi đã thử thấy chạy | Bảng phím không được hứa thao tác không có | Review |
| `INV-KEY-10` | Modal dùng `useModalLayer`; popup chỉ cần Esc dùng `useEscapeLayer`; dialog cần thêm phím dùng lớp `overlay` có `blocking` | Esc không lọt xuống canvas, Tab không thoát khỏi modal | Review |
| `INV-KEY-11` | Nhóm "Thường dùng" khai bằng `display.essential` trong bảng của nơi sở hữu; modal không giữ danh sách id | Thêm phím không phải sửa modal | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `src/lib/shortcuts/dispatcher.ts` | Bộ điều phối, lớp, phím giữ, báo trùng |
| `src/lib/shortcuts/types.ts`, `combo.ts` | Kiểu dữ liệu, so khớp, `bindShortcuts` |
| `src/lib/shortcuts/useShortcutLayer.ts` | Hook đăng ký lớp, Esc, modal |
| `src/lib/shortcuts/registry.ts` | Sổ bảng phím của tool |
| `src/lib/shortcuts/format.ts`, `platform.ts`, `pointer.ts` | Nhãn phím, Kiểu bàn phím, phím giữ khi click |
| `src/lib/shortcuts/global-shortcuts.ts` | Phím toàn app |
| `src/register-tools.ts` | Đăng ký bảng phím canvas |
| `src/tools/canvas/shortcuts.ts` | Bảng phím canvas + note (dữ liệu) |
| `src/tools/canvas/hooks/useCanvasKeys.ts`, `components/CanvasApp.tsx`, `hooks/usePointerInteraction.ts`, `components/UnsortPanel.tsx` | Gắn hành động phím canvas |
| `src/components/shortcuts/ShortcutsModal.tsx`, `ShortcutKeys.tsx` | Modal phím tắt, `Kbd`, `ShortcutWays` |
| `src/stores/shortcuts-modal-store.ts`, `keyboard-platform-store.ts` | Mở modal, Kiểu bàn phím |

## Nguồn liên quan

- Luật viết: `.kiro/steering/shortcuts.md`, `.kiro/steering/coding-style.md` mục "Phím tắt".
- Spec cũ (lịch sử): `docs/legacy/specs/shortcuts/` (bộ điều phối, US-7..9 macOS), `docs/legacy/specs/shortcuts-modal/`.

## Câu còn mở

- (2026-10-13) Spec cũ `shortcuts-modal` US-6 ghi Mac hiện ⌘ ⌥ ⇧ (rê chuột ra "Option"). Code chỉ đổi Ctrl → ⌘, Shift / Alt giữ tên chữ ở cả 2 OS; `steering/shortcuts.md` ghi giống code. Chờ bạn chốt (nếu giữ như code thì chỉ cần xác nhận).
- (2026-10-13) Spec cũ `shortcuts-modal` US-5 ghi nhóm Markdown có `-` hoặc `*`, `**chữ**`, `*chữ*`. Bảng code chỉ hiện `*` (comment: `-` `+` vẫn chạy) và không có dòng `**chữ**` / `*chữ*`. Chờ bạn chốt có thêm dòng không.
- (2026-10-13) Spec cũ `shortcuts-modal` để "Tìm kiếm trong modal" ngoài phạm vi; `backlog.md` còn dòng "trạng thái không tìm thấy khi tìm phím". Code đã có ô tìm + `EmptyState` khi không có kết quả. Chờ bạn chốt xoá dòng backlog.
