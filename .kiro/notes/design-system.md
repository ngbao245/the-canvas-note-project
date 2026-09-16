# Note: Design System nhất quán xuyên dự án

**Trạng thái**: Đang bàn, CHƯA chốt, CHƯA làm.
**Ghi lúc**: 2026-08-28

## Vấn đề bạn nêu

Style thiết kế phải đi xuyên suốt cả dự án — cùng 1 ngôn ngữ thiết kế từ mockup HTML tới app React thật. Không để mỗi trang/tool một kiểu, không drift.

## Vì sao quan trọng

- Dự án theo hướng plugin, sau này nhiều tool. Nếu mỗi tool tự do style thì UI rối, mất nhận diện.
- Foundation React (`src/styles/index.css` + `tailwind.config.ts`) và mockup (`mockups/shared.css`) hiện đang là 2 nguồn token RIÊNG, dễ lệch nhau.

## Điểm cần chốt (khi quay lại bàn)

1. **Nguồn token duy nhất**: mockup `shared.css` và app `index.css` phải map cùng bộ token. Chọn 1 làm chuẩn.
   - Lưu ý: 2 bên đang khác giá trị. App dùng hsl (`--primary: 222 47% 11%` = gần đen). Mockup dùng hex (`--primary: #007acc` = xanh). PHẢI thống nhất.
2. **Palette chính thức**: mockup dùng primary xanh `#007acc` (VS Code blue). App foundation dùng primary gần đen. Chốt cái nào là brand color thật.
3. **Font**: mockup dùng 'Plus Jakarta Sans'. App foundation dùng system-ui. Chốt font chính thức (cần import Google Font hay không).
4. **Motion token**: mockup có `--duration-fast/normal + easing-standard`. App foundation chưa có. Cần port sang app.
5. **Component parity**: mockup có nhiều pattern (chip, card-node, action-bar, plugin-card, nav-item). App mới có button/input/card/shared-state. Cần liệt kê component nào thành shadcn thật.
6. **Dark/light**: cả 2 đều hỗ trợ, nhưng cơ chế khác (mockup `[data-theme]`, app cũng `[data-theme]` nhưng token khác). Đồng bộ.
7. **Icon**: mockup dùng SVG sprite tự vẽ. App dùng lucide-react. Chốt 1 nguồn icon.

## Hướng đề xuất (chưa chốt)

- Lấy mockup làm "design truth" vì nó thể hiện đúng vibe bạn muốn (VS Code style, xanh #007acc, Plus Jakarta Sans).
- Viết lại `src/styles/index.css` + `tailwind.config.ts` của app để match mockup token.
- Tạo 1 spec riêng `design-system` khi bắt tay làm, không nhét vào foundation.

## KHÔNG làm gì cho tới khi bạn nói bắt đầu.

## Rule modal / overlay (chốt sớm, áp dụng mọi modal)

Áp cho: command palette, dialog, plugin detail modal, mọi popup nổi trên backdrop.

1. **Không bao giờ bị cắt**: modal luôn nằm trọn trong viewport.
2. **Co giãn theo màn hình**: chiều cao tối đa = viewport trừ khoảng cách trên/dưới, không hardcode `max-height` px cứng.
3. **Khoảng cách trên/dưới cố định**: backdrop có padding (VD `10vh` trên, `48px` dưới) để modal không chạm mép.
4. **Chỉ phần thân scroll**: header (search) + footer cố định (`flex: 0 0 auto`), phần body dài thì scroll bên trong (`flex: 1 1 auto; min-height: 0; overflow-y: auto`).
5. **Backdrop cũng scroll được**: nếu màn hình quá thấp, backdrop `overflow: auto` để không kẹt.

Pattern CSS chuẩn (đã áp cho `mockups/09-command-palette.html`):
```css
.backdrop { display: flex; align-items: flex-start; justify-content: center; padding: 10vh 16px 48px; overflow: auto; }
.modal { max-height: calc(100vh - 10vh - 48px); display: flex; flex-direction: column; overflow: hidden; }
.modal-header, .modal-footer { flex: 0 0 auto; }
.modal-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
```

Khi làm shadcn Dialog thật trong app React: cấu hình DialogContent theo pattern trên, không để content tràn viewport.
