# 30 — Landing: trang giới thiệu + canvas thử

Cập nhật: 2026-10-13 · Đối chiếu code: 2026-10-13

## Phạm vi

Gồm: cấu trúc trang landing, phong cách ký họa (màu cứng), khung canvas thử (`DemoFrame`), canvas mini (`demo/`), link sang app, ngôn ngữ, theme, phím tắt trong canvas thử.

Không gồm: 2 bản build, entry, cổng dev, `VITE_APP_URL` lúc build (`01` mục "2 bản build"). Canvas thật (`10`, `11`, `12`). Bộ điều phối phím (`04`).

## Hiện trạng

### Khởi động

`landing.html` → `main.tsx` (nạp `drawably/style.css` trước `styles/index.css`) → `LandingRoot`:

- Gắn `lang` theo store ngôn ngữ chung (`useLocaleStore`). Khác origin với app nên không thấy lựa chọn ngôn ngữ của app.
- Ép theme sáng 1 lần (`applyThemeAttr('light')`), không đọc store theme. Lý do (comment code): giấy ký họa sáng, khung thử tối ở giữa trông lạc.
- Bật `useShortcutDispatcher()` cho phím của canvas thử.
- Không router, không TanStack Query, không service worker, không đụng dữ liệu canvas.

### Cấu trúc trang (`LandingPage.tsx`)

Từ trên xuống, mọi phần nằm trong `.sk-root`:

1. `SketchDefs`: SVG ẩn chứa bộ lọc nét chì (`sk-rough-a`, `sk-rough-b`, `sk-rough-text`), pattern, hình dùng chung (`sk-person`, `sk-mini-note`). Render đúng 1 lần.
2. Thanh điều hướng nổi (sticky): logo về `#thu`, link neo `#van-de`, `#tinh-nang`, `#cach-dung`, `#lo-trinh`, nút "Mở" sang app. Dưới 900px ẩn link neo.
3. Phần đầu `#thu`: tiêu đề + nét gạch đỏ + mô tả + nút tới `#tinh-nang` + `DemoFrame` + ghi chú.
4. `ProblemSection` → `PillarsSection` → `FeaturesSection` (3 cụm: truy nguồn, canvas, AI; cụm canvas không có hình, chỉ tờ giấy nhớ trỏ lên `#thu`) → `StepsSection` (`#cach-dung`) → `RoadmapSection` → `FinalSection` (nút về `#thu` + nút sang app).
5. Chân trang.

Mỗi section bọc `Reveal`: hiện dần 1 lần khi cuộn tới (IntersectionObserver, ngưỡng 0.12). Không có IntersectionObserver thì hiện luôn. Giảm chuyển động: CSS tắt hiệu ứng.

Hình vẽ: `SketchFrame` (khung dán băng keo, nghiêng `tilt` độ), `SketchLayers` (nét chì 2 lượt: lớp chính + lớp mờ lệch 1px). `id` trong `SketchLayers` phải duy nhất cả trang.

### Phong cách ký họa (`sketch/sketch.css`)

- Màu cứng trong biến `--sk-*` đặt ở `.sk-root` (giấy, mực, xanh, đỏ, bút dạ, giấy nhớ, băng keo) và màu viết thẳng trong SVG (`#2a2a2e`, `#b4443a`, `#2f5d8a`...). Đây là ngoại lệ màu ghi trong `coding-style.md`, chỉ trong thư mục landing.
- Font `Patrick Hand` từ Google Fonts (`@import` đầu file), dự phòng `Comic Sans MS`, `cursive`. Landing không có service worker nên offline là dùng font dự phòng.
- Thời gian chuyển động vẫn dùng token chung (`--duration-normal`, `--easing-standard`), lớp z dùng `--z-header`.
- Class đều có tiền tố `sk-`.

### Khung canvas thử (`DemoFrame.tsx`)

- `useMediaQuery('(min-width: 900px)')` chọn: rộng → `InteractiveFrame`, hẹp → `NarrowFrame` (hình tĩnh `DemoStaticSketch` trong `SketchFrame` + câu nhắc mở trên máy tính). Hẹp thì không tải code canvas mini.
- `useMediaQuery` dùng `useSyncExternalStore` + `matchMedia`; lúc chưa có `window` trả `false`.
- `.sk-demo-frame` cao 600px, `isolation: isolate` (z-index bên trong không đè nav), trả lại font + cỡ chữ của app.
- 3 trạng thái:
  - Nghỉ: nút phủ cả khung "Bấm để thử" (Tab tới được, Enter / Space bật). Lăn chuột cuộn trang, phím demo tắt.
  - Bật: bỏ lớp phủ, focus vào khung, viền đổi xanh, canvas nhận lăn chuột + phím, hiện câu nhắc cách nhả.
  - Nhả: về Nghỉ khi `pointerdown` ngoài khung (pha capture trên `document`), hoặc Esc lúc không còn gì để đóng. Nhả bằng Esc thì trả focus về lớp phủ.
- `DemoCanvas` tải lazy (`import('./demo/DemoCanvas')`). Đang tải: `DemoSkeleton` đúng khung (header + 3 card). Lỗi: `LoadBoundary` hiện `ErrorState` + Thử lại; Thử lại tạo lazy mới (React giữ promise lỗi).

### Canvas mini (`demo/`)

- Độc lập canvas thật: kiểu riêng (`types.ts`), toán camera viết lại (`demo-camera.ts`, zoom 0.3–2.5), store Zustand riêng (`demo-store.ts`).
- Chỉ trong bộ nhớ: không localStorage, không IndexedDB. Mỗi lần mount gọi `reset()` nạp board mẫu (`sample-board.ts`): 2 note + 1 trích dẫn có nguồn + 1 đường nối tĩnh. Nút "Làm lại" cũng `reset()` rồi căn lại camera.
- Camera tự căn cho thấy cả board khi khung có kích thước thật lần đầu (`ResizeObserver`), không phóng quá 100%.
- Undo: chụp nguyên mảng object trước mỗi thay đổi, tối đa 50 bước. Đổi thứ vẽ (đưa lên trên) và camera không tính là 1 bước. Undo / redo thoát sửa, bỏ chọn / đóng nguồn nếu object đó không còn.
- Chuột (`useDemoGestures`): Ctrl / Cmd + lăn hoặc pinch → zoom quanh con trỏ; lăn thường → pan; nhấn object → chọn + đưa lên trên, kéo quá 4px thì di chuyển; nhấn 2 lần trong 400ms trên cùng object → sửa (tự đo, không dùng `dblclick` vì surface giữ pointer capture); nhấn vùng trống → bỏ chọn + pan. Chỉ gắn `wheel` khi khung đang bật.
- Thanh công cụ (`DemoToolbar`): 1 tile Note. Bấm hoặc Enter → note giữa khung; kéo → lớp nổi theo con trỏ, thả trên mặt canvas thì tạo tại chỗ, thả ngoài thì bỏ. Note mới vào sửa ngay.
- Card (`DemoObjectCard`): `DrawablyCard` của `drawably/react`, luôn kiểu vẽ tay, không đọc lựa chọn phong cách. Viền chọn ở lớp bọc ngoài, giữ cả lúc kéo. Sửa: ô tiêu đề + ô nội dung chữ thường; Esc hoặc focus rời card thì ghi (1 bước undo nếu có đổi). Nhả khung cũng ghi chữ đang sửa.
- Trích dẫn có `source` → dòng nguồn + nút "Mở nguồn" → `SourcePanel` phủ bên phải: hình SVG tĩnh trang tài liệu, ô được trích tô vàng + khoanh đỏ. Không có PDF thật.
- Trong khung dùng token theme (`bg-background`, `border-border`, `var(--primary)`...), không dùng `--sk-*`.
- Board mẫu là dữ liệu, không qua bộ dịch. Tiêu đề note mới qua bộ dịch (`LANDING.DEMO.NEW_NOTE_TITLE`).

### Phím trong canvas thử (`demo-shortcuts.ts`, `useDemoKeys.ts`)

Lớp `tool`, chỉ bật khi khung đang bật. Bảng không có `display` nên không hiện trong modal phím tắt.

| Id | Phím | Việc |
|---|---|---|
| `demo.undo` | Mod+Z | Undo |
| `demo.redo` | Mod+Shift+Z, Mod+Y | Redo |
| `demo.delete` | Delete, Backspace | Xoá object đang chọn |
| `demo.edit` | Enter | Sửa object đang chọn. Bỏ qua khi focus đang ở nút / link |
| `demo.release` | Esc | Bỏ chọn + nhả khung |

Thứ tự Esc: ô sửa tự xử (lớp tool không chạy khi đang gõ) → panel nguồn (`useEscapeLayer`, lớp overlay) → nhả khung.

### Link sang app (`app-url.ts`)

`APP_CANVAS_URL` = `VITE_APP_URL` (bỏ `/` cuối) + `/canvas`, thiếu biến thì `http://localhost:3000/canvas`. Dùng ở 3 chỗ: nút "Mở" trên nav, "Mở bản đầy đủ" trong header demo, nút cuối trang. Luôn là URL tuyệt đối vì khác domain.

## Không được phá

| Mã | Luật | Lý do | Giữ bằng |
|---|---|---|---|
| `INV-LAND-01` | Code landing không import `src/tools/` (tĩnh lẫn `import()`) | Canvas thật gọi thẳng kho IndexedDB; import vào là demo ghi được dữ liệu thật. Canvas thật đổi gì demo không vỡ theo | Lint (error), cùng luật `INV-CORE-01` |
| `INV-LAND-02` | Canvas mini không lưu gì (không localStorage, IndexedDB, BroadcastChannel); mỗi lần mount nạp lại board mẫu | Thử không để lại gì, tải lại là về mẫu | Review `demo-store.ts` |
| `INV-LAND-03` | Màu cứng chỉ trong `sketch/`, `sketch.css`, `LandingPage.tsx`; trong `demo/` và khung `DemoFrame` chỉ dùng token theme | Ngoại lệ có giới hạn, khung thử phải trông như app | Review + `coding-style.md` |
| `INV-LAND-04` | Lúc khung nghỉ: không bắt `wheel`, lớp phím demo tắt | Lăn chuột phải cuộn trang, Ctrl+Z / Delete chỗ khác không đụng demo | Review `useDemoGestures`, `useDemoKeys` (`enabled: active`) |
| `INV-LAND-05` | Phím demo đi qua bộ điều phối chung, không gắn `keydown` lên `window` / `document` | Thứ tự Esc (sửa → panel → nhả) dựa vào thứ tự lớp | Review |
| `INV-LAND-06` | Dưới 900px không tải chunk canvas mini | Màn hẹp không dùng được canvas, tránh tải thừa | Review `DemoFrame` |
| `INV-LAND-07` | Link sang app chỉ lấy từ `APP_CANVAS_URL`, không viết đường dẫn cứng | Khác domain, đổi domain chỉ sửa biến build | Review |
| `INV-LAND-08` | Landing luôn theme sáng | Giấy ký họa chỉ thiết kế cho nền sáng | Review `LandingRoot` |
| `INV-LAND-09` | `SketchDefs` render đúng 1 lần; `id` của `SketchLayers` / `sk-*` không trùng | Trùng id thì `url(#...)` / `<use>` trỏ sai hình | Review |

## Chỗ trong code

| File | Vai trò |
|---|---|
| `landing.html` | HTML, title + description (tiếng Việt cứng) |
| `src/routes/landing/main.tsx`, `LandingRoot.tsx` | Entry, `lang`, ép theme sáng, bộ điều phối phím |
| `src/routes/landing/LandingPage.tsx` | Nav, phần đầu, thứ tự section, chân trang |
| `src/routes/landing/DemoFrame.tsx` | 3 trạng thái khung, lazy, skeleton, bắt lỗi, bản hẹp |
| `src/routes/landing/useMediaQuery.ts` | Đọc media query |
| `src/routes/landing/app-url.ts` | `APP_CANVAS_URL` |
| `src/routes/landing/sketch/` | Section ký họa, `sketch.css`, `SketchDefs`, `SketchFrame`, `SketchLayers`, `Reveal`, `DemoStaticSketch` |
| `src/routes/landing/demo/DemoCanvas.tsx` | Gốc canvas mini, căn camera, lưới chấm |
| `src/routes/landing/demo/demo-store.ts`, `sample-board.ts`, `types.ts`, `demo-camera.ts` | State, board mẫu, kiểu, toán camera |
| `src/routes/landing/demo/useDemoGestures.ts`, `useDemoKeys.ts`, `demo-shortcuts.ts` | Chuột, phím |
| `src/routes/landing/demo/DemoHeader.tsx`, `DemoToolbar.tsx`, `DemoObjectCard.tsx`, `DemoLinks.tsx`, `SourcePanel.tsx` | UI canvas mini |
| `eslint.config.js` | Luật cấm import `tools/` cho landing |

## Nguồn liên quan

- `01-core.md` mục "2 bản build", `INV-CORE-01`, `INV-CORE-06`.
- Spec cũ (lịch sử): `docs/legacy/specs/canvas-landing-demo/`. Bản phác: `docs/legacy/landing-sketch.html`.
- `.kiro/steering/coding-style.md` mục Theme token (ngoại lệ màu landing).
- Chữ: key `LANDING.*` trong `src/lib/i18n/locales/`.

## Câu còn mở

- (2026-10-13) Doc cũ ghi card demo dùng card vẽ tay trong `src/components/style/`, code dùng thẳng `DrawablyCard` của `drawably/react`. Chờ bạn chốt.
- (2026-10-13) Doc cũ ghi theme của demo đọc từ store toàn app, code ép landing luôn sáng (`INV-LAND-08`). Chờ bạn chốt.
- (2026-10-13) Doc cũ ghi landing là route `/` trong `App.tsx` và "Mở bản đầy đủ" sang `/canvas` cùng app; code là bản build riêng, link tuyệt đối qua `VITE_APP_URL`. Code khớp `01-core.md`, chỉ cần bạn xác nhận bỏ ý cũ.
- (2026-10-13) Landing không chặn Ctrl + lăn chuột ngoài khung thử (app có chặn ở `App.tsx`); lúc khung nghỉ, Ctrl + lăn trên khung sẽ phóng cả trang. Chưa rõ có muốn chặn không.
- (2026-10-13) `landing.html` có title + description tiếng Việt cứng, không đổi theo ngôn ngữ. Chưa rõ có cần dịch không.
