# Kế hoạch bộ doc hệ thống (`docs/system/`)

**Trạng thái**: Viết xong đủ 13 phần (2026-10-13). Còn: vẽ lại sơ đồ kiến trúc + bạn chốt các câu mở. Việc kế sau đó: đăng nhập trong app.

## Vì sao

Session 2026-10-13 có 4 lần lệch giữa spec / note / code:
- Spec `canvas-outbox` gửi nguyên object, trái note kiến trúc mục 2.5 (đã chốt gửi theo trường), spec không ghi chỗ lệch.
- Kiro dựa ghi chú cũ nói "gõ 1 phím cả canvas vẽ lại", code đã sửa từ trước.
- Comment `api.ts` ghi "kéo ghi mỗi pointermove", code chỉ ghi lúc thả.
- `next-session-prompt.md` mô tả `bibo-auth` SSO, trái `core.md`.

Gốc: sự thật rải ở handoff (nhật ký 1000+ dòng), note Milanote (đo + quyết định lẫn nhau), 18 spec (chỉ ghi phần thay đổi).

## Đã chốt (bạn, 2026-10-13)

- Phạm vi: toàn app, chia từng phần, đi từng phần một. Phần đơn giản viết ngắn, vẫn đủ ý.
- Cách làm mỗi phần: Kiro đọc code + doc cũ, đưa bảng chỗ khác nhau, bạn chốt cái chuẩn, rồi Kiro mới viết file. Code là gốc khi chưa chốt.
- Quy tắc không được phá: mỗi file có mục "Không được phá", mã theo phần (`INV-CORE-01`, `INV-SYNC-01`...). `00-map.md` liệt kê hết.
- Doc cũ: chuyển vào `docs/legacy/` TỪNG PHẦN, ngay khi doc mới của phần đó chốt xong; sửa đường dẫn trong `core.md`, `AGENTS.md` cùng lượt. Handoff giữ lại, chỉ ghi nhật ký, không mô tả kiến trúc nữa.
- Đồng bộ: tách 2 phần. `20` lưu trên máy (nguồn chuẩn hiện tại, không được mất chữ). `21` gửi server (đổi nhiều khi `canvas-sync` / `canvas-sharing`). Chỗ nối "object + mục outbox chung 1 transaction" ghi ở `20`, `21` trỏ về.

## Chốt khi làm `01-core` (2026-10-13)

- Thử offline: 1 lệnh `npm run preview:offline` (build app rồi preview cổng 4173, `--strictPort`). Đã thêm vào `package.json`. Doc cũ ghi `npx vite preview --port 5181` / `npm run preview` thì thay bằng lệnh này.
- Doc hệ thống không ghi số phiên bản thư viện, chỉ trỏ `package.json` (tránh lệch khi nâng bản). Ngoại lệ: ghi gói nào đang ghim đúng bản.
- Trang thử `/thu/*`: gỡ khỏi router (`App.tsx`), giữ file, coi như phần mở rộng, bạn đánh giá sau (`.kiro/notes/backlog.md`).
- `docs/conventions.md` → `docs/legacy/`. Chỉ chép luật "icon chỉ dùng `lucide-react`" sang `coding-style.md`. Bỏ cỡ icon chuẩn và thứ tự import (không có lint giữ, code đã lệch).
- Khuôn file (áp cho mọi phần): dòng "Cập nhật · Đối chiếu code" → Phạm vi → Hiện trạng → Không được phá (bảng Mã | Luật | Lý do | Giữ bằng) → Chỗ trong code → Nguồn liên quan → Câu còn mở (nếu có). Phần ngắn ~80–200 dòng, phần chi tiết ~200–400; dài hơn thì tách file con.
- `docs/architecture.md`: đã chuyển cả file vào `docs/legacy/` (đợt 2). Theme (`02`), Outbox (`21`) tra ở đó khi viết.

## Chốt thêm (2026-10-13, sau `01-core`)

- Tên file luôn tiếng Anh (doc, note, spec, code). Nội dung vẫn tiếng Việt. Đã đổi tên các phần trong bảng dưới.
- `00-map.md` làm bản khung ngay (trước `20`), điền dần khi xong từng phần. Mục đích: nhắc chủ đề nào chỉ nạp file của chủ đề đó.

## Chốt khi làm `20` (2026-10-13, xong)

- Xoá board có board con không gói 1 transaction: ghi hiện trạng vào `20`, việc sửa nằm ở handoff mục "Hàng đợi ghi". Không sửa code.
- `version` trùng / lùi giữa 2 tab: ĐÃ SỬA 2026-10-13 (bạn chốt "giải quyết để còn scale"). `writeObjects` đọc version trên đĩa trong cùng transaction rồi +1, bỏ bộ đếm trong bộ nhớ. Kiro test MCP pass V1–V3 (ghi ở handoff mục "Hàng đợi ghi").
- "Chỗ hở đã biết" (onblocked, xoá board không 1 transaction, `flush()` báo xong dù lỗi): ghi 1 dòng mỗi chỗ ở mục "Câu còn mở" của `20`, việc sửa nằm ở handoff "Việc còn mở". Khuôn file không đổi.

## Gọn handoff (chốt 2026-10-13, đã làm)

- Bản cũ 1.097 dòng → `docs/legacy/canvas-session-handoff-2026-10-13.md`.
- Handoff mới chỉ còn: việc đang dở / chờ test / chỗ hở + bảng luật cứng chưa vào `docs/system/` (cột "Sẽ vào" ghi phần doc nhận). Viết phần nào thì đối chiếu luật của phần đó với code, chuyển vào doc, xoá khỏi handoff.
- Luật: không ghi nhật ký, xong việc xoá dòng.
- Bỏ khi gọn (đã sai so với code): `window.__canvasRepo` / `__canvasStores` (không có trong `src/`), "object trên root lưu `boardId: null`" (đã bỏ 2026-10-05), các mục ghi "LỖI THỜI", việc đã xong (storage-v2, app-offline, lỗi 2 board Home).

## Chốt khi làm `21` (2026-10-13, xong)

- Sơ đồ (câu 1 = A): sửa 3 dòng "2s" → "1s" trong json `docs/sync-diagrams/` (`outbox-lifecycle` dòng "throttle 2s", `shared-board` 2 dòng "~2s"), vẽ lại 2 sơ đồ đồng bộ bằng skill technical-diagrams. Sơ đồ kiến trúc vẽ lại sau khi xong `10`–`12`. Đóng câu mở trong `00-map`.
- "Áp cả nhóm" (câu 2 = A): ghi hiện trạng (server giả chỉ đảm bảo cả request hợp lệ mới áp; patch thiếu object bỏ riêng; `groupId` bị đè khi gộp). Đưa vào câu mở cho `canvas-sync`, quyết cùng thiết kế RPC.
- Gửi keepalive lúc đóng tab (câu 3 = A): ghi hiện trạng, không sửa. Có thể thiếu thay đổi cuối, thay đổi vẫn trong outbox, lần mở sau gửi tiếp.
- Đã làm: sửa 3 dòng json + vẽ lại `2-outbox-lifecycle.html`, `3-shared-board.html` (showcase, 0 lỗi). Sửa note 2.1 (bỏ trùng chỉ bằng `opId`).
- Gotcha: ghi file json bằng `Set-Content -Encoding utf8` (PowerShell 5) thêm BOM → `deliver` báo JSON sai. Dùng `[IO.File]::WriteAllText` với `UTF8Encoding($false)` hoặc tool sửa file.

## Chốt khi làm `11` (2026-10-13, xong)

- Viết riêng, ngắn (bạn chốt A): khuôn chung + bảng loại đang có + nút giữ chỗ + các bước thêm loại mới.
- Note `canvas-object-type-defaults.md` → `docs/legacy/` (bảng "Đã ship" đã sai: note 338 × 68, không phải 180). Kích thước dự kiến loại chưa làm chép sang `11`.
- Luật lọc HTML / dán: phần chung vào `INV-OBJ-03`..`05`, phần riêng note còn ở handoff cho `12`.
- Sửa comment đầu `useObjectRegistry.tsx` (nhắc image / link, "tự đăng ký lúc module load": sai).
- Loại `rect` (bạn chốt A): ĐÃ GỠ 2026-10-13 (`rect-type.ts`, `RectObject.tsx`, `createRectAt`, mục trong `OBJECT_TYPES`, comment `types.ts`).

## Dọn markdown cũ (chốt 2026-10-13)

- 1 folder duy nhất cho markdown không dùng nữa: `docs/legacy/` (spec vào `docs/legacy/specs/{tên}/`). Không xoá lúc này vì repo chưa có commit nào; khi đã commit, bạn có thể xoá cả folder.
- Đã chuyển: `conventions.md`, spec `bibo-auth`, `bibo-foundation`, `app-offline`, `dev-panel`, `tinh-nang.html` (đổi tên `features.html`), `landing-sketch.html`, `sketchbook.html`.
- Đã xoá (2026-10-13): 6 file `*.visual-check.*`, rồi (bạn đổi ý cùng ngày) `bibo-architecture-explained.html` + `add-explanations.mjs`. Giữ `bibo-architecture.html`, `bibo.architecture.json`, `explanations.json`.
- File html cũ trong legacy dùng comment `<!-- LEGACY ... -->` ở dòng đầu thay cho dòng `>` của markdown.
- Đợt 2 (bạn chốt "giải quyết các file còn lại", 2026-10-13): chuyển luôn mọi spec đã ship, `docs/canvas.md`, `docs/architecture.md`, bản backlog canvas cũ. Không chờ viết từng phần doc: legacy vẫn đọc được để đối chiếu khi viết phần đó (`00-map.md` mục "Bản cũ để đối chiếu").

## Trạng thái file sau khi dọn (2026-10-13)

| Nhóm | File | Ở đâu |
|---|---|---|
| Spec đã ship (lịch sử) | `bibo-foundation`, `app-offline`, `dev-panel`, `bibo-auth` (bỏ hướng), `canvas`, `canvas-nested-boards`, `canvas-unsort`, `design-system`, `settings`, `shortcuts`, `shortcuts-modal`, `canvas-note-autosave`, `canvas-storage-v2`, `canvas-landing-demo` | `docs/legacy/specs/` |
| Spec còn dùng | `canvas-content-objects` (Image / Link chưa làm), `canvas-unsort-multi-select` (Task 5-7), `i18n` (Task 5-7, bạn đang chuyển chữ), `canvas-outbox` (chờ O2 + O5), `canvas-note-block-keys` (chờ N1–N4) | `.kiro/specs/`. Xong / test pass thì chuyển |
| Task mở của spec đã chuyển | `settings` Task 11 + nút "Sắp ra mắt", `shortcuts-modal` "không tìm thấy", `design-system` Task 9 | `.kiro/notes/backlog.md` |
| Doc cũ | `conventions.md`, `architecture.md`, `canvas.md`, `features.html`, `landing-sketch.html`, `sketchbook.html` | `docs/legacy/` |
| Note gọn lại | handoff (1.097 → 72 dòng), `canvas-backlog.md` (316 → ~50 dòng, chỉ còn việc chưa làm) | Bản cũ `docs/legacy/*-2026-10-13.md` |
| Note giữ (còn đúng, nhập vào doc khi viết phần đó) | `milanote-sync-architecture.md` (hướng cho `canvas-sync` / `canvas-sharing`, còn nhiều phần chưa có code), `design-system.md` (còn luật modal chưa có chỗ, chờ chốt `02` câu modal) | `.kiro/notes/`. Đã vào legacy: `z-index-tiers.md` (→ `02`), `canvas-object-type-defaults.md` (→ `11`) |

Giả định Kiro tự chọn: 5 spec từng ghi "chờ bạn test" (`canvas-nested-boards`, `canvas-unsort`, `canvas-landing-demo`, `shortcuts`, `shortcuts-modal`) coi như pass theo luật `core.md` ("case không nhắc tới là đã OK"), nên đã chuyển. Bạn thấy lỗi thì báo, Kiro đọc spec trong legacy để sửa.

## Danh sách phần (thứ tự làm: 01 → 20 → 21 → 11 → 12 → 10 → các phần ngắn còn lại)

| File | Nội dung | Độ dài |
|---|---|---|
| `00-map.md` | Việc gì đọc file nào + danh sách mọi `INV-` | Ngắn |
| `01-core.md` | Stack, 2 bản build, cấu trúc folder, ranh giới import, bảng dev, mở app offline | Ngắn. Làm đầu tiên để chốt khuôn file |
| `02-ui-common.md` | Theme token, chuyển động, lớp z, focus, con trỏ, chọn chữ, loading / empty / error. Tóm tắt + trỏ `coding-style.md` | Ngắn |
| `03-i18n.md` | i18n | Ngắn |
| `04-shortcuts.md` | Tóm tắt + trỏ `shortcuts.md` | Ngắn |
| `05-settings.md` | Các mục cài đặt, lưu ở đâu, ảnh hưởng gì | Ngắn |
| `10-canvas-core.md` | Board, board lồng nhau, camera, chọn, kéo, undo, Unsort, sao chép / dán | Chi tiết |
| `11-object-types.md` | Bảng phần chung + phần riêng từng loại (note, board, rect, image, link) | Chi tiết |
| `12-note.md` | Tiptap, tự lưu khi gõ, mã khối, Card Clipper, tự cao | Chi tiết |
| `20-local-data.md` | Data model, IndexedDB v3, hàng đợi ghi, `version`, đồng bộ + khoá giữa tab | Chi tiết |
| `21-server-sync.md` | Outbox, gói create / patch / delete, nhịp 1s, vòng đời trang; sau: chiều nhận về, xung đột, realtime | Chi tiết |
| `30-landing.md` | Landing + canvas thử | Ngắn |
| `decisions.md` | Sổ quyết định: ngày, lý do, thay quyết định nào | Dồn dần |

## Luật giữ không lệch (áp dụng khi bộ doc có phần đầu tiên)

- Spec mới có mục "Đối chiếu doc hệ thống": đụng `INV-` nào, lệch chỗ nào (không lệch thì ghi "không lệch").
- Đổi hành vi → sửa doc hệ thống ngay trong task đó. Doc sai so với code → tin code, báo bạn, sửa doc.

## Tiến độ

- [x] 01-core (2026-10-13, `docs/system/01-core.md`, `INV-CORE-01`..`09`)
- [x] 20 (2026-10-13, `docs/system/20-local-data.md`, `INV-DATA-01`..`11`) · [x] 21 (2026-10-13, `INV-SYNC-01`..`10`) · [x] 11 (2026-10-13, ngắn theo bạn chốt A, `INV-OBJ-01`..`07`) · [x] 12 (`INV-NOTE-01`..`17`) · [x] 10 (`INV-CANVAS-01`..`19`)
- [x] 02 (`INV-UI-01`..`12`) · [x] 03 (`INV-I18N-01`..`09`) · [x] 04 (`INV-KEY-01`..`11`) · [x] 05 (`INV-SET-01`..`08`) · [x] 30 (`INV-LAND-01`..`09`) · [x] decisions
- [x] 00-map (điền đủ 2026-10-13)
- [x] Vẽ lại sơ đồ kiến trúc theo bộ doc (2026-10-13; gộp server giả + Supabase thành 1 khối "Server" theo bạn chốt)
- [ ] Bạn chốt các câu "Chờ bạn chốt" (tổng hợp ở handoff mục "Câu chờ bạn chốt trong doc")

`10`, `12`, `02`, `03`, `04`, `05`, `30` viết song song bằng 5 agent (2026-10-13), mỗi agent chỉ ghi doc, chỗ lệch ghi "Câu còn mở" không tự chọn. Kiro đã đọc lại 7 file; luật cứng handoff đã chuyển hết.
