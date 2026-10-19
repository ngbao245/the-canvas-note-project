# Thiết kế — Giới hạn pan + kéo lố đàn hồi

**Trạng thái**: Nháp

Không có màn hình mới. Chỉ đổi cách camera chạy trong `src/tools/canvas/`.

## Hiện trạng (đọc code 2026-10-16, chưa thử trình duyệt)

- `CanvasSurface` tính khung bao object mỗi lần object đổi, lúc kéo / resize bỏ object đang chọn ra, đưa vào engine. `pan-bounds.ts` nới khung 500 / 400 mỗi phía, board trống = 1000 × 800 quanh gốc.
- Mọi đường đổi camera chặn cứng vào vùng đó (pan, lăn, zoom, từng khung hiệu ứng, fit, reset, hydrate, đổi cỡ màn, đổi Kích thước giao diện).
- Hệ quả:
  - Tới rìa là dừng cứng.
  - Vùng tính lại mỗi lần → xoá / kéo object về là vùng co, engine chặn lại camera → camera tự dời.
  - Board 1 note (hoặc chọn hết rồi kéo): lúc kéo khung bao rỗng → vùng thành 1000 × 800 quanh gốc → camera có thể bị lôi về gốc giữa lúc kéo (cần xác minh, case PB4).
  - Tự cuộn lúc kéo object chỉ chạy khi phía đó có object khác lòi ra ngoài màn, và vẫn bị chặn trong vùng của object khác → không kéo object ra xa được.
  - Khoảng thở mỗi phía: code để 1 màn, doc `10` ghi 25%. Lệch nhau, bản mới bỏ hẳn.
  - Đổi board: camera board mới được nạp TRƯỚC object (`useBoardSync`) → lúc nạp bị chặn theo vùng của board cũ; trong lúc chờ nạp, store object vẫn giữ object board cũ.

## Ba lớp

1. **Vùng tài liệu** (canvas-space). Chỉ tính từ object trên canvas (bỏ item Khay chờ, như cũ), GỒM CẢ object đang kéo / resize ở vị trí hiện tại. Mỗi lần nhận khung bao mới: vùng = hợp (vùng cũ, khung bao nới 500 / 400). Chỉ giãn. Reset khi vào board khác. Board trống: 1000 × 800 quanh gốc.
2. **Phạm vi camera** (px màn). Tính lúc dùng từ vùng tài liệu × zoom + cỡ màn, mỗi trục:
   - a = −đầu × zoom, b = cỡ màn − cuối × zoom, phạm vi = [min(a, b), max(a, b)].
   - Tài liệu × zoom to hơn màn: màn đi trong tài liệu. Nhỏ hơn: tài liệu đi trong màn. Không còn khoảng thở.
3. **Kéo lố**. Chỉ là phần vẽ, tạm thời:
   - Trần d mỗi trục = min(15% màn trục đó, 120px).
   - Lố o ≥ 0 tính từ vị trí thô (theo tay, không chặn) → vẽ ở rìa ± d × (1 − 1 / (0,55 × o / d + 1)). Càng kéo càng nặng, không bao giờ quá d.
   - Không ghi vào vùng tài liệu, không lưu IndexedDB.

## Luồng

- **Kéo màn** (Space, chuột giữa, Ctrl + kéo): lúc bắt đầu, vị trí thô = camera hiện tại. Mỗi lần di chuột cộng vào vị trí thô, camera vẽ = kéo lố của vị trí thô. Thả / huỷ: đích = vị trí đã chặn, hiệu ứng có sẵn (đuổi 20% mỗi khung) đưa camera về. Đường giảm tốc rồi dừng, phần thấy được ~200ms.
- **Lăn / touchpad**: cùng cách, vị trí thô cộng dồn theo từng sự kiện. Mỗi sự kiện hẹn lại 120ms, hết hẹn mà không có sự kiện mới → về rìa. Touchpad còn quán tính thì sự kiện vẫn tới, màn đứng ở chỗ lố tới khi hết quán tính.
- **Zoom** (mọi kiểu), Fit, Về 100%, hydrate: bỏ trạng thái lố trước (vị trí thô = vị trí đã chặn), rồi chặn cứng như hiện tại.
- **Tự cuộn lúc kéo object**: chặn cứng, không lố. Bỏ điều kiện "phía đó còn object khác". Object đang kéo đã ở trong vùng tài liệu nên vùng giãn theo từng khung, tự cuộn đi tiếp được. Trần an toàn: không cuộn quá ±100.000 canvas từ gốc (Kiro tự chọn, đổi được).
- **Vùng tài liệu giãn**: phạm vi chỉ rộng ra → không phải chặn lại camera.
- **Phạm vi hẹp đi** (đổi cỡ màn, đổi Kích thước giao diện, zoom out lúc lố): đích = vị trí đã chặn, camera đang vẽ đuổi bằng hiệu ứng có sẵn, không nhảy.
- **Đổi board**:
  1. `useBoardSync` báo engine board mới → vùng tài liệu "chưa biết", không chặn.
  2. Nạp camera board mới, không chặn.
  3. Engine chỉ nhận khung bao khi id board của store object (`loadedBoardId`) khớp board mới → bỏ qua object board cũ còn trong store lúc chờ nạp.
  4. Nhận lần đầu → dựng vùng mới; camera ngoài phạm vi thì trượt về.
- **Lưu IndexedDB**: luôn lưu vị trí đã chặn.

## File và trách nhiệm

| File | Việc |
|---|---|
| `engine/pan-bounds.ts` | Hàm thuần: hợp 2 khung, phạm vi camera theo zoom + màn (bỏ khoảng thở), kéo lố có trần, chặn mềm. Giữ khoảng dư 500 / 400 + vùng board trống. Bỏ hằng khoảng thở. |
| `engine/camera-engine.ts` | Giữ vùng tài liệu chỉ giãn + id board. Giữ vị trí thô cho cử chỉ đang chạy. Kéo màn có 2 kiểu: có lố (tay) và cứng (tự cuộn). Báo hết cử chỉ → trượt về. Hẹn giờ cho lăn. Zoom / Fit / reset / hydrate bỏ lố trước. Đổi cỡ màn / Kích thước giao diện trượt về thay vì nhảy. Lưu vị trí đã chặn. |
| `components/CanvasSurface.tsx` | Bỏ việc loại object đang chọn khỏi khung bao. Truyền kèm id board đang nạp. Zoom tối thiểu động vẫn tính từ khung bao object (không đổi luật). |
| `hooks/useBoardSync.ts` | Báo engine board mới trước khi nạp camera. |
| `hooks/usePointerInteraction.ts` | Kéo màn dùng kiểu có lố; thả / huỷ báo hết cử chỉ. |
| `hooks/useEdgePan.ts` | Bỏ kiểm "phía đó còn object khác", dùng kéo cứng + trần an toàn. |
| `engine/pan-bounds.test.ts` (mới) | Test hàm thuần. |
| `docs/system/10-canvas-core.md` | Viết lại mục "Giới hạn pan", thêm dòng kéo lố vào bảng thao tác. |

## Điều kiện biên

- Cỡ màn = 0 (chưa đo): không chặn, như hiện tại.
- Object khoá vị trí: không ảnh hưởng.
- Item Khay chờ: không tính vào vùng tài liệu (INV-CANVAS-18).
- 2 tab cùng board: mỗi tab tự giữ vùng, không đồng bộ.
- Đang kéo màn mà mất focus cửa sổ / pointercancel: coi như thả, trượt về.

## Rủi ro

- Hiệu ứng có sẵn đuổi camera trong lúc tay đang kéo → giật. Phải tắt đuổi x / y khi đang trong cử chỉ.
- Đổi board: nếu khớp id board sai, vùng của board cũ lọt sang board mới → camera không chặn đúng.
- Kéo object ra xa liên tục: vùng giãn mãi trong phiên, dừng bằng trần an toàn.
- Vị trí kéo object (`reposition`) đọc camera đang vẽ: tự cuộn chặn cứng nên không bị lố, giữ được khớp chuột.

## Quyết định đã hoãn

- Cỡ tối thiểu tài liệu theo màn kiểu Milanote: chưa đo đủ.
- Trần an toàn toạ độ ±100.000: Kiro tự chọn, chưa có số đo.
