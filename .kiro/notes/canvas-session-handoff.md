# Canvas — Handoff (việc đang dở + câu chờ chốt)

Gọn lại 2026-10-13. Bản đầy đủ cũ (nhật ký 09-18 → 10-13): `docs/legacy/canvas-session-handoff-2026-10-13.md`, chỉ tra khi cần lý do lịch sử.

## Luật dùng file này

- Chỉ ghi: việc đang dở, việc chờ bạn test, chỗ hở chưa sửa, câu chờ chốt.
- Không ghi nhật ký, không mô tả kiến trúc. App chạy thế nào: `docs/system/` (tra `00-map.md`). Vì sao quyết vậy: `docs/system/decisions.md`.
- Xong việc → xoá dòng đó. Bạn chốt 1 câu → sửa doc + ghi `decisions.md` + xoá dòng ở đây.
- Ghi lệch code → tin code, sửa dòng ở đây.

## Việc còn mở

### Chờ bạn test tay

- Touchpad tách khỏi chuột (2026-10-16, build + lint + test pass, chưa thử trình duyệt): TP1 = vuốt ngang rồi bẻ dọc không nhấc tay → nếu vẫn kẹt, log `deltaX` / `deltaY` ở Console xem trình duyệt có khoá trục không. TP2 = vuốt chậm → màn theo đúng ngón, không trễ. TP3 = vuốt tới rìa → lố, nhấc tay trượt về. TP4 = pinch chậm → điểm dưới 2 ngón đứng yên. TP5 = pinch nhanh → không nhảy nấc. TP6 = pinch qua 100% → khựng nhẹ, đẩy chút là qua. TP7 = pinch ở chỗ trống cạnh note → không bị hút về note. Chuột: M1 = lăn như cũ ở cả 3 mức tốc độ; M2 = Shift + lăn ngang; M3 = Ctrl + lăn theo nấc, mốc 100% như cũ; M4 = chuột lăn tự do (Logitech) không bị nhận nhầm touchpad. Chỉnh: `TOUCHPAD_SPEED_FACTOR` (`stores/canvas-settings-store.ts`), `PINCH_ZOOM_SPEED`, `PINCH_DETENT_LOG` (`engine/camera-engine.ts`), `TOUCHPAD_DELTA_MAX` (`lib/wheel-input.ts`).

- Xoá lẫn board (2026-10-13, MCP không mở được trình duyệt nên chưa thử): D1 = chọn 1 board tile + 1 note → Delete → dialog "Xoá nhiều mục" đếm board + object → Xoá → cả 2 mất. D2 = Ctrl+Z 1 lần → cả 2 về, vào board con thấy nội dung đủ. D3 = chọn 2 board tile → Delete → xoá cả 2 cây (trước đây chỉ xoá tile đầu).

- Undo theo board (2026-10-14, Kiro thử MCP U1 pass): U1 = tạo note ở Home → vào board con → Ctrl+Z / Ctrl+Shift+Z không đổi gì, nút Undo mờ → về Home → Ctrl+Z xoá note, Ctrl+Shift+Z trả lại. U2 (chưa thử) = kéo note vào tile board con → vào board con → Ctrl+Z không làm gì → về Home → Ctrl+Z note quay lại Home, board con không còn note trong Khay chờ. U3 (chưa thử) = xoá vùng chọn có tile + note → vào board khác → về → Ctrl+Z.
- Unsort vạch chèn đo thật (2026-10-14, Kiro thử MCP pass bằng sự kiện giả): S1 = Khay chờ có note ngắn + item cao, kéo chuột thật lên / xuống giữa các item → vạch nằm đúng khe gần con trỏ, thả vào đúng chỗ vạch. S2 = đổi Kích thước giao diện trong Cài đặt rồi làm lại S1.
- Kéo nhiều object (2026-10-14, Kiro thử MCP 2 note pass): K1 = chọn 3 object rời nhau → kéo → thấy cả 3 bay theo chuột, giữ khoảng cách → thả trên canvas đúng chỗ. K2 = kéo cụm qua board tile → số đếm cộng 3, thả → cả 3 vào Khay chờ board đó. K3 = kéo cụm vào thùng rác / ra header → không còn object nào biến mất giữa chừng.
- Card Clipper lúc sửa (2026-10-14, Kiro thử MCP pass): C1 = xem note thì không có nút; double-click sửa, con trỏ ở dòng nào nút ngang dòng đó, đổi dòng thì nút đi theo. C2 = hover nút to lên + mũi tên; lúc kéo note gốc vẫn ở chế độ sửa; thả ra canvas → dòng đó thành note mới, note mới đang sửa (con trỏ cuối chữ, chỉ note mới được chọn), gõ được ngay; note gốc không còn dòng đó. C3 = Esc rồi Ctrl+Z: lần 1 trả dòng đã cắt, lần 2 trả chữ gõ ở note gốc trước khi cắt. Alt lúc thả = sao chép, note mới cũng vào sửa, note gốc giữ nguyên chữ. (C2, C3 đổi 2026-10-14.)
- Cỡ chấm + góc resize (2026-10-14): Z1 = chọn 1 note, zoom 100% → chấm như cũ, góc resize to hơn trước (20px). Z2 = zoom nhỏ nhất → chấm, góc nhỏ đi nhưng dừng ở cỡ vẫn bấm được góc để kéo dãn. Z3 = zoom to nhất → to lên rồi dừng, không phình. Z4 = rê vào chấm → to lên thành nút tròn có mũi tên chéo, nhìn rõ ở cả 4 màu viền chọn và cả theme sáng / tối, con trỏ vẫn là con trỏ thường (không chữ thập); bấm / kéo / double-click chấm → note không bị kéo, không vào sửa, không mở khung chọn.
- Header đảo nổi (2026-10-14, spec `canvas-header-islands`, chưa ai thử): H1 = Cài đặt → Canvas → Kiểu header → Đảo nổi → canvas tràn màn, 3 đảo trên cùng; về "2 hàng" → y như cũ; F5 giữ lựa chọn; Đặt lại → 2 hàng. H2 = ở kiểu đảo, mọi nút chạy như cũ (Undo / Redo, Trợ giúp, Xuất, % zoom, avatar mở menu); chỉ 2 đảo (bỏ đảo giữa), tên board là mắt xích cuối breadcrumb, double-click vào sửa; đảo trái bó sát (không ô to rỗng); đảo phải "6 mục" là chữ xám, 1 vạch ngăn, "Chia sẻ" nổi xanh; nút Khay chờ cùng kiểu đảo.
- Trạng thái lưu + sửa tên (2026-10-14): L1 = chấm trạng thái lưu luôn hiện (kiểu đảo): sửa note thấy chấm vàng chớp nhẹ, lát sau xanh đứng yên; rê vào chấm thấy chữ. L2 = double-click tên board (kiểu đảo): chuyển xem ↔ sửa đảo KHÔNG nhảy rộng (ô = đúng bề rộng chữ lúc xem, đo DOM); gõ dài hơn chữ cuộn trong ô, ô không giãn. L3 = đang sửa tên, bấm ra canvas trống → tên được lưu + thoát sửa (trước đây không ăn). L4 = đang sửa tên, bấm nút khác trên header / Esc / Enter → vẫn lưu/huỷ đúng. H3 = thanh công cụ trái, nút + panel Khay chờ không đè đảo, ở cả 3 cỡ giao diện; kéo object vào đảo → con trỏ cấm, thả trả về chỗ cũ; bấm / kéo / lăn ở khoảng trống giữa các đảo vẫn là canvas. H4 = thu hẹp cửa sổ → breadcrumb ẩn bớt cấp, tên board cắt "…", cụm nút phải không mất; kiểu 2 hàng breadcrumb vẫn rút như cũ (Kiro đổi cách đo, cần thử cả 2 kiểu).
- Zoom touchpad + toạ độ dev (2026-10-15, chưa thử trình duyệt): T1 = pinch touchpad chậm → zoom đi từ từ qua 50, 60, 70%... không nhảy. T2 = pinch qua 100% → khựng lại, đẩy thêm chút mới qua; đổi chiều nhả ngay. T3 = Ctrl + lăn chuột thường vẫn theo nấc như cũ. T4 = bảng dev có dòng "chuột x, y / tâm x, y / %", cả lúc thu gọn; chuột ra ngoài canvas thì hiện "—". Chỉnh tốc độ: `PINCH_ZOOM_SPEED`, ngưỡng nhận touchpad `PINCH_DELTA_MAX` trong `engine/camera-engine.ts`.
- Đo Milanote bằng MCP (2026-10-15, cửa sổ 1266×522, vùng canvas 1195×470): canvas là ô cuộn thật (`.CanvasViewport` overflow auto, `.CanvasScrollArea` = "tài liệu" × zoom). Tài liệu ở toạ độ board từ (0, 0) tới (mép phải object xa nhất + 500, mép dưới xa nhất + 400), đo 2 lần khớp (1288×848, 1358×918). Kéo object lố sang trái / lên trên mốc ~50 → cả board dời theo cho object ≥ 50, thanh cuộn dịch theo (không có toạ độ âm). Zoom ≥ mức vừa: cuộn được đúng trong tài liệu × zoom (zoom in vào note giữa màn vẫn có chỗ kéo). Tài liệu × zoom nhỏ hơn màn: không cuộn. Trong lúc ở board, tài liệu chỉ giãn không co; vào lại board mới tính lại. Chưa rõ: cỡ tối thiểu của tài liệu (lần đo đầu ra 1266×478 = cỡ cửa sổ, không khớp công thức), vị trí tài liệu khi nhỏ hơn màn.
- Kéo màn ở mọi nơi (2026-10-15, chưa thử trình duyệt): G1 = giữ Space, bấm kéo bắt đầu trên header / toolbar trái / Khay chờ / bảng dev / trên note → màn trôi theo, note không bị chọn hay kéo. G2 = chuột giữa kéo, bắt đầu ở các chỗ trên → như G1. G3 = Ctrl + kéo bắt đầu trên note → kéo màn; Ctrl + click note không di chuyển → vẫn chọn thêm. G4 = đang kéo, đưa chuột ra header / ngoài cửa sổ rồi thả → vẫn kéo tới lúc thả, thả trên nút không bấm nhầm nút. G5 = gõ chữ trong note, nhấn Space → ra dấu cách, không kéo.
- `canvas-outbox`: O2 + O5 (kéo chuột thật, Copy số đo bảng dev). Spec `.kiro/specs/canvas-outbox/tasks.md`.
- `canvas-note-block-keys`: N1–N4 (`tasks.md` của spec).
- `version` (đã sửa 2026-10-13, Kiro test MCP pass V1–V3), thử lại nếu muốn: V1 = 2 tab, tab A sửa note 3 lần, tab B Ctrl+Z bước cũ → DevTools IndexedDB `bibo-canvas` / `objects`, version không lùi. V2 = 1 tab sửa → undo → redo, tăng đều.


### Hàng đợi ghi IndexedDB (chờ bạn quyết, chưa làm)

- `flush()` resolve cả khi còn mục ghi lỗi → nơi gọi không biết thành / bại. Đề xuất trả `drained` / `pending` + mốc thứ tự. Sửa ở `lib/write-queue.ts`.
- Thả nhiều item tách 2 lô (lô đầu 1 object): lần enqueue đầu kick ghi ngay. Sửa: hoãn tới cuối lượt chạy (microtask), không phải debounce.
- Kéo 1 item không ở trên cùng ghi 2 lần + 2 bước undo (`bringToFront` lúc bắt đầu + `commitMove` lúc thả, `useObjectDrag.ts`). Sửa đụng undo.
- Xoá board có board con không nằm trong 1 transaction (`deleteBoardCascade`): đóng tab giữa chừng có thể còn board thiếu object. Hướng: gom cả cây vào 1 lô (đụng `21`). Bạn chốt ghi hiện trạng 2026-10-13.

### Làm cùng `canvas-sync` (sau đăng nhập)

Thứ tự: đăng nhập trong app (Supabase Auth) → `canvas-sync` → `canvas-sharing`. Đọc `docs/system/21-server-sync.md` mục "Câu còn mở" + note `milanote-sync-architecture.md`, hướng dựng project `docs/supabase-setup.md`.

- Cột chủ sở hữu, bảng "board → project", client theo board.
- Gỡ nhãn tạm `OfflineBadge` (file + export `components/shared/index.ts` + 1 dòng `App.tsx`).
- `lib/idb.ts` chưa xử `onblocked`.
- `OUTBOX_ENABLED` đổi thành "đã đăng nhập + có Supabase", thay server giả bằng RPC; quyết "áp cả nhóm".

### Note: tạm đủ chức năng (bạn chốt 2026-10-15)

Không thêm tính năng note cho tới khi có backend. Chỉ sửa lỗi theo 3 cụm test tay bên dưới. Việc kế: đăng nhập trong app (Supabase Auth) → `canvas-sync`.

### Chờ bạn test tay — note fixed lúc sửa + min width + font (Kiro làm 2026-10-15, diagnostics sạch, CHƯA build)

- F1: kéo góc 1 note cho thấp hơn chữ (thấy lớp mờ) → double-click sửa → note dài ra hiện hết chữ, không mờ; Enter vài lần → dài thêm ngay.
- F2: gõ 1 dòng dài cho tràn sang dòng mới → note dài theo.
- F3: Esc / click ra ngoài → note thụt về đúng cao đã kéo, chữ thừa bị cắt + mờ lại. Ctrl+Z không có bước "đổi cỡ" thừa.
- F4: đang sửa note đã dài ra, kéo góc → bắt đầu từ khung đang thấy (không nhảy lên). Thả → note thành cao mới; Ctrl+Z trả về cao cũ.
- F5: note chưa từng kéo góc (auto) → sửa, Enter vài lần cho note dài ra → thoát → note GIỮ cao đã dãn (đã lưu), F5 lại vẫn cao vậy.
- W1: kéo góc note hẹp hết cỡ → dừng ở 160px rộng (trước co tới 40). Note mới từ toolbar rộng 300.
- T1: thân note Inter, heading (Title / Heading / Subheading) Fraunces, code block JetBrains Mono; tên board header 2 hàng Fraunces 24px, hàng header không cao lên.

### Chờ bạn test tay — toolbar board tile (Kiro làm 2026-10-15, build + lint pass)

Đo Milanote: chọn board → Color, Icon, Rename, More. Kiro đã thử MCP: đổi màu + Ctrl+Z, khoá chặn kéo / mở khoá kéo được, Đổi tên chọn hết chữ + Esc huỷ.

- BT1: chọn board tile → toolbar có Màu (icon = màu board), Biểu tượng (bấm được, xem BI1), Đổi tên, Thêm.
- BT2: Màu → popup 3 phần (spec `canvas-board-color-polish`): phần 1 Mặc định + màu nền đậm, phần 2 màu nền sáng (ô chia chéo: nửa màu nền, nửa màu chữ đen), phần 3 custom đã lưu (màu sáng cũng chia chéo) + nút Màu tuỳ chỉnh; chọn → khối vuông đổi, popup vẫn mở, ô đang chọn có viền; Ctrl+Z 1 lần trả màu cũ; F5 giữ màu; vào board con thấy breadcrumb / tile cha đúng màu.
- BT8 (sửa 2026-10-16, bạn chốt chữ luôn tự tính theo nền): chọn màu tuỳ chỉnh sáng → icon/chữ đen, ô chia chéo; màu tuỳ chỉnh đậm → trắng, ô trơn. Không còn nhấp đúp. Mở bảng màu tuỳ chỉnh, kéo chọn màu rồi bấm ra ngoài → màu vẫn áp (1 bước undo), ô thêm vào phần 3. Trong lúc kéo, khối vuông board / nền + chữ note đổi màu ngay; chốt xong Ctrl+Z 1 lần về đúng màu trước khi mở bảng màu (board và note, cả tab Thanh trên).
- NC1 (note, 2026-10-16): popup Màu note tab Nền: phần 1 = không màu + ô "Theo giao diện" (chia chéo trắng/đen, lưu `background = 'theme'`) + màu ra chữ trắng (ô trơn) + trong suốt; phần 2 = màu ra chữ đen (ô chia chéo); phần 3 = màu tuỳ chỉnh đã lưu; không còn hàng cặp "A" và hàng gợi ý.
 Xám: giao diện sáng nằm phần 2, giao diện tối nằm phần 1. Tab Thanh trên chia y hệt (ô kiểu thanh). Note cũ đã tô cặp "A" vẫn giữ màu chữ cũ cho tới khi chọn màu khác.
- BT7 (cùng spec, 2026-10-16): ô đầu popup Màu board "Theo giao diện" (chia chéo trắng / đen) → nền board trắng ở giao diện sáng, đen ở giao diện tối; đổi giao diện thì tile, nút Màu, breadcrumb đổi theo; icon tự động vẫn tương phản (đen trên trắng, trắng trên đen). F5 giữ.
- BT6 (spec `canvas-board-color-polish`, Kiro làm 2026-10-16): chọn 1 màu Màu tuỳ chỉnh → màu đó thêm vào phần 3, F5 vẫn còn, chọn trùng không nhân đôi ô, tối đa 5 ô. Dùng chung mọi loại object: chọn custom ở note (tab Nền hoặc Thanh trên) → mở màu board vẫn thấy màu đó, và ngược lại. Màu custom lưu ở bản trước (key `bibo-board-color-recent`) không mang sang.
- BI-COLOR (sửa 2026-10-16): popup icon KHÔNG còn khu chỉnh màu. Icon trắng khi chọn ô màu trơn (phần 1), đen khi chọn ô chia chéo (phần 2); nền "Theo giao diện" → icon đen ở giao diện sáng, trắng ở giao diện tối.
- BT3: Đổi tên → ô tên dưới tile chọn hết chữ, gõ + Enter lưu, Esc huỷ; toolbar KHÔNG đổi sang bộ nút chữ (trước đây double-click tên board hiện bộ nút B / I giả).
- BT4: Thêm → Mở trong tab mới mở đúng board; Sao chép liên kết → notice "Đã sao chép", dán ra trình duyệt vào đúng board; Khoá vị trí → kéo tile không đi, menu thành Mở khoá, F5 giữ; Đưa lên / xuống đổi lớp. Tạo lối tắt, Chuyển thành mẫu mờ.
- BT5: popup Màu note vẫn như cũ (Kiro tách ô màu ra `ColorSwatches.tsx`), nút "Màu tuỳ chỉnh…" 1 dòng.

Chưa làm: dòng "Created by you". Màu gợi ý board chỉ đo theme tối, theme sáng dùng chung.

### Chờ bạn test tay — icon board tile (spec `canvas-board-icon`, Kiro làm 2026-10-16, build + lint + test pass)

- BI1: chọn board tile → bấm Biểu tượng → popup mở cạnh toolbar: ô tìm trên cùng, cột trái (Thư viện / Tự nhập / Tải ảnh mờ, rồi danh mục), lưới icon bên phải. Lần đầu mở có thể chậm nhẹ (tải chunk icon).
- BI2: mở popup → mục Gợi ý (không còn "Tất cả"): Dùng gần đây (icon vừa chọn) / Theo tên board (đặt tên board "Music" → icon nhạc) / Phổ biến. Chọn danh mục → lưới lọc, cuộn mượt. Gõ "trash" → ra icon thùng rác, gõ chữ vô nghĩa → "Không tìm thấy biểu tượng". Gõ tìm thì danh mục bỏ đánh dấu. Danh mục trong cột trái không dính sát nhau.
- BI7 (sửa 2026-10-16): mọi popup toolbar (Màu, Biểu tượng, Thêm của board; các popup note) căn mép trên ngang đầu toolbar, mũi tên vẫn trỏ vào nút.
- BI8 (sửa 2026-10-16): chuyển Thư viện ↔ Tự nhập, hay chọn icon đầu tiên, popup không đổi chiều cao, nội dung không thụt lên xuống.
- BI3: bấm 1 icon → hiện giữa khối vuông tile, popup vẫn mở, ô đó có viền primary; nút Biểu tượng trên toolbar đổi thành chính icon đó. Ctrl+Z 1 lần trả icon cũ.
- BI4: Tự nhập → gõ quá 2 ký tự không nhận; xem trước đúng màu board; Enter hoặc "Dùng ký tự này" → chữ hiện giữa khối vuông. Ô rỗng thì nút mờ.
- BI5: "Bỏ biểu tượng" (luôn hiện, mờ khi chưa có icon) → khối vuông chỉ còn màu. F5 giữ icon. Đổi màu board sáng (vàng) / tối (xám đậm) → icon tự đổi mực tối / sáng, vẫn đọc được.
- BI6: Esc / bấm ra ngoài đóng popup; bấm lại nút Biểu tượng cũng đóng (không mở lại ngay).

Ghi chú: danh mục suy từ tag, nhóm "Khác" còn ~450 icon. "Theo tên board" chỉ khớp từ tiếng Anh (tag lucide tiếng Anh), tên board tiếng Việt thường ra rỗng và nhóm đó tự ẩn. Icon lucide trên tile cần tải chunk icon (~730 KB, lazy) lần đầu: offline vẫn có vì service worker precache.

### Chờ bạn test tay — popup toolbar note (Kiro làm 2026-10-15, build + lint pass)

`ToolbarPopup` render qua portal (fix popup bị cắt), có mũi tên trỏ tâm nút mở, tự kẹp trong viewport (lật trái nếu sát mép phải, cao quá thì cuộn), đo lại khi resize / cuộn toolbar / popup đổi cỡ. Áp chung cho Màu, Thêm, Text style, Link. Kiro đã thử MCP: Màu, Thêm (viewport thấp 420px → popup đẩy lên, mũi tên vẫn trỏ nút), Text style.

- P1: chọn note, mở Màu / Thêm → popup hiện đủ, mũi tên trỏ đúng nút.
- P2: sửa note, mở Text style / Link / Thêm → như P1; cuộn trong Text style không cắt mũi tên.
- P3: thu nhỏ cửa sổ (thấp) rồi mở Thêm → popup không tràn mép dưới.
- P4: click ngoài / Esc / bấm lại nút → popup đóng như cũ.

### Chờ bạn test tay — popup Màu note (spec `canvas-note-color`, Kiro làm 2026-10-15, build + lint + test pass)

Kiro đã thử MCP: nền cyan → chữ tự tối; thêm thanh đỏ → cả 2 cùng hiện; ô "A" đổi cả nền lẫn chữ; Ctrl+Z lùi 1 bước, popup vẫn mở; Custom color nền tối → chữ sáng; F5 giữ màu; lúc sửa chữ cùng màu lúc xem.

- CC1 (đã đổi 2026-10-16, xem NC1): chọn note → Màu → mở ở tab Nền.
- CC2: chọn màu → popup không đóng, ô vừa chọn có viền; đổi tab vẫn mở.
- CC3: ô Trong suốt → note thấy lưới phía sau, không bóng, chữ đọc được.
- CC4: Màu tuỳ chỉnh → bảng màu trình duyệt → chọn xong áp đúng tab; kéo trong bảng rồi chốt chỉ 1 bước undo.
- CC5: icon nút Màu vẽ đúng nền + thanh (+ "A"); bỏ hết màu → icon Palette.
- CC6: đổi theme sáng / tối → note đã tô giữ hex.
- CC7: Card Clipper tách đoạn từ note có nền + thanh → note mới cùng màu; Ctrl+C / Ctrl+V note → giữ màu.
- CC8: note đã tô màu chữ trong Text style → vẫn thắng màu chữ tự tính theo nền.

Chưa kiểm: Khay chờ (Unsort) chưa vẽ nền màu note (item chỉ hiện chữ, không đụng).

### Chờ bạn test tay — Hoàn thiện note (spec `canvas-note-complete`, Kiro làm 2026-10-14, build + lint pass)

Spec: `.kiro/specs/canvas-note-complete/`. Code xong hết, chưa test tay. Các case:

- NC1 (dọn nợ undo kéo góc): note tự cao, kéo góc 1 phát → Ctrl+Z 1 lần trả về đúng cỡ cũ + về lại tự cao (không còn 2 bước).
- NC2 (min 68): note đã cố định, kéo góc thu nhỏ → chiều cao dừng ở 68, không dẹt hơn.
- NC3 (dịch): đổi ngôn ngữ VI/EN → mọi nhãn toolbar note (chọn + sửa), tên kiểu chữ, nút Lưu/Gỡ/Huỷ của Link, placeholder đổi theo. Click nút Text style / Link / More vẫn đóng popup đúng.
- NC4 (Text style mở rộng): sửa note, mở Text style → chọn Small text / Code block / Callout thấy đổi; chọn màu chữ (5 màu) + tô nền (5 màu) thấy đổi; F5 giữ nguyên; thoát sửa (xem) vẫn hiển thị đúng định dạng.
- NC5 (More lúc sửa): mở More trong lúc sửa → Code trong dòng, Gạch chân, Gạch ngang, Căn trái/giữa/phải chạy đúng, nút sáng khi đang áp; không mất chế độ sửa khi bấm.
- NC6 (More lúc chọn): chọn note (không sửa), mở More → Bring to Front đưa note lên trên note khác, Send to Back xuống dưới; Lock Position → không kéo di chuyển / không kéo góc được nữa, menu đổi thành Unlock; F5 giữ khoá; Convert to Document mờ, bấm không được.
- NC7 (kéo cụm có note khoá): chọn nhiều object trong đó có 1 note khoá → kéo cụm → note khoá đứng yên, các object khác đi theo.
- NC8 (vô hiệu): nút Labels / Reactions / Comment mờ, rê chuột thấy tooltip, bấm không làm gì.

### Chờ bạn test tay — dọn code + sửa kéo màn / chữ note màu (Kiro làm 2026-10-19, build + lint + test pass)

Đợt dọn trùng lặp (gộp mục menu, nút mở popup, hàm độ sáng màu, mặc định NoteData) không đổi giao diện, chỉ cần soi lại nhanh các popup Màu / More / Text style / Link của note + board.

- R1 (kéo màn + link): note có link, bấm chuột giữa lên chữ link, kéo màn rồi thả trên link → không mở tab mới. Bấm chuột giữa lên link (không kéo) vẫn mở tab như thường.
- R2 (kẹt kéo): giữ chuột giữa kéo màn, Alt+Tab sang cửa sổ khác rồi thả, quay lại → con trỏ không kẹt `grabbing`, rê chuột màn không chạy theo.
- R3 (Small / Callout / code trên note màu): note nền đậm (nâu, tím) và note nền sáng (vàng, cyan), mỗi note có Small text, Callout, code trong dòng, khối code → đọc rõ ở cả theme sáng lẫn tối. Note không màu trông như cũ.
- R4 (More note): "Đưa lên trên cùng" / "Đưa xuống dưới cùng" có icon mũi tên như More của board. More lúc sửa: rê chuột mục thì chữ sáng lên.
- R5 (board tile): dưới tên board hiện "N thẻ" (vi) / "N card(s)" (en), đổi theo ngôn ngữ.
- R6 (màu tuỳ chỉnh): note + board, mở Màu tuỳ chỉnh, kéo trong bảng màu (object đổi màu ngay), bấm OK → giữ màu; Ctrl+Z 1 lần về màu trước khi mở bảng. Phần logic có test `engine/color-preview.test.ts`.
- R7 (popup theo Kích thước giao diện): Cài đặt → Kích thước giao diện nhỏ / lớn, mở popup Màu / More / Text style / Link / Icon → popup to nhỏ cùng tỉ lệ với toolbar, mũi tên vẫn chỉ đúng nút, không tràn mép màn.
- R8 (cuộn popup): thu cửa sổ thấp (~300px), mở popup Màu note, cuộn trong popup → cuộn mượt, không nhảy về đầu.

### Đang dở (không chặn việc trên)

- `i18n` Task 5-7: phần lớn chữ cứng note toolbar đã dịch trong đợt `canvas-note-complete` (2026-10-14). Còn `title` / `aria-label` Card Clipper. Kiro rà nốt. ("N cards" + aria-label board tile đã dịch 2026-10-19.)

- Tính năng chưa làm: `canvas-backlog.md`. Ngoài canvas: `backlog.md`.

### Đo Milanote — toolbar note (2026-10-14, qua MCP)

Để làm spec `canvas-note-complete`. Milanote dùng project riêng của bạn, đã đăng nhập trong Chrome debug.

- Toolbar lúc CHỌN note: Color, Labels, Reactions, Comment, More (...), Trash. (Trash là nút chung đáy thanh trái.)
- Toolbar lúc SỬA note: Text style, B (đậm), I (nghiêng), Bulleted list, Numbered list, Comment, More (...).
- Menu More LÚC SỬA (sửa lại 2026-10-14, lượt trước xem thiếu): mở ra 5 định dạng chữ nữa — Code inline `</>`, Underline (U, gạch chân), Strikethrough (S, gạch ngang), Align (căn lề), Link. VẬY Milanote CÓ gạch ngang + gạch chân + code inline, chỉ là giấu trong More, không phải nút ngoài. Vẫn KHÔNG có checklist/ô tick.
- Card Clipper (icon 3 gạch cạnh phải note) hiện lúc sửa, ngang dòng có con trỏ — bibo đã có.
- Menu More (lúc CHỌN note): Convert to Document, Lock Position, Bring to Front, Send to Back, + dòng "Created by you N days ago". KHÔNG có Nhân bản/Copy/Xoá trong More (xoá qua Trash, nhân bản qua Ctrl+D/clipboard).
- Toolbar TẠO object của board (khi không chọn gì): Note, Link, Board, More(...), Add image, Upload, Draw. Nút Trash mở popup "Deleted by me / Deleted by others" (khớp backlog thùng rác bibo).
- Popup Text style (nút chữ T có chấm màu): mở ra 3 nhóm
  - Kiểu khối: Large heading (Ctrl+Shift+1), Normal heading (Ctrl+Shift+2), Normal text (mặc định), Small text (Ctrl+Shift+9), Code block (Ctrl+>), Callout (Ctrl+Shift+6, icon tam giác vàng), Quote block (Ctrl+").
  - Color (màu chữ): 6 ô — mặc định (đen/trắng theo nền), xanh dương, xanh lá, cam, đỏ, xám.
  - Highlight (tô nền): 6 ô — không nền, xanh dương nhạt, xanh lá nhạt, vàng, hồng, xám.
- Chốt lại so với dự tính ban đầu:
  - KHÔNG làm strikethrough, KHÔNG làm checklist (Milanote note không có — đúng tinh thần "giống Milanote trước").
  - Màu chữ + Highlight nằm TRONG popup Text style, không phải nút riêng.
  - More KHÔNG chứa Nhân bản/Copy/Xoá.

### Nhỏ, để sau

- Font app, lazy chunk Tiptap (route chunk ~580kb).
- `aria-label` nút Unsort lúc đang tải vẫn đọc "0".

## Luật cứng

Đã chuyển hết vào `docs/system/` (2026-10-13): `10` (`INV-CANVAS-*`), `11` (`INV-OBJ-*`), `12` (`INV-NOTE-*`), `20` (`INV-DATA-11`). Luật cứng mới chưa có chỗ trong doc thì ghi tạm ở đây.

## Câu chờ bạn chốt trong doc

Chi tiết ở mục "Câu còn mở" của từng phần. Ưu tiên theo mức ảnh hưởng:

- Lỗi thật:
- Hành vi cần quyết:

  - `02`: vệt shimmer trắng trên nền sáng; `active:cursor-grabbing` thừa; luật modal vào `02` hay `05`.
  - `05`: chặn giá trị lạ trong localStorage.
  - `30`: chặn Ctrl + lăn trên landing; dịch title `landing.html`.
- Chỉ cần xác nhận (code đã đổi so với spec cũ):
  - `02`: theme mặc định sáng, phong cách mặc định phẳng.
  - `03`: bỏ vùng `ACCOUNT` khỏi danh sách trong `coding-style.md`.
  - `04`: Mac chỉ đổi Ctrl → ⌘; dòng Markdown chỉ `*`; xoá dòng backlog "không tìm thấy" (đã có).
  - `05`: dòng backlog Chia sẻ / Xuất thuộc header canvas, không phải Cài đặt.
  - `10`: lăn = pan, resize 1 góc, URL chỉ id (xoá được `lib/slug.ts`), tab Unsort ẩn khi panel mở.
  - `30`: card demo dùng thẳng `DrawablyCard`; landing luôn sáng; landing là bản build riêng.

## Chờ test: thanh cuộn tự vẽ (2026-10-19)

- SB1: Cài đặt, Phím tắt, Unsort, popup icon, popup Text style → không còn mũi tên, tay cuộn mờ khi rảnh, hiện khi rê / cuộn, kéo được.
- SB2: Phím tắt → bấm nhóm trái cuộn tới đúng, nhóm đang xem tô theo vị trí cuộn. Unsort → kéo sắp xếp, vạch chèn đúng chỗ, chọn vùng vẫn chạy.
- SB3: canvas có nhiều note, zoom vào → hiện tay cuộn dọc / ngang khi pan; kéo tay cuộn → màn dời theo, không lố; zoom ra vừa màn → tay cuộn ẩn.
- SB4: đổi màu ở `--scrollbar-thumb` (index.css) → cả 3 loại thanh cuộn đổi theo, sáng / tối riêng.
