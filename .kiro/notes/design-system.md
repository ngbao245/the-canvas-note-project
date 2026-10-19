# Note: Design System nhất quán xuyên dự án

**Trạng thái**: ĐÃ CHỐT + ĐÃ SHIP (spec `design-system` Task 1-8, Task 9 deferred).
**Ghi lúc**: 2026-08-28. **Cập nhật**: 2026-09-17 sau khi ship.

## Kết quả đã chốt

Spec `design-system` (`docs/legacy/specs/design-system/`) đã implement xong Task 1-8. Các điểm từng cần bàn giờ đã quyết:

1. **Nguồn token duy nhất**: app `src/styles/index.css` là nguồn chuẩn. Mỗi theme 1 khối `[data-theme='...']` ngang hàng (dark mặc định + light). Thêm theme mới = copy khối, đổi màu.
2. **Palette**: primary xanh `#007acc` (VS Code blue) là brand color chính thức. Token dạng HEX/rgba, `tailwind.config.ts` đọc qua `var()` trực tiếp (không HSL wrapper).
3. **Font**: THAY 2026-10-15 (Plus Jakarta Sans chưa từng được nạp). Giờ Inter (sans) + Fraunces (serif) + JetBrains Mono (mono), nguồn chuẩn `docs/system/02-ui-common.md` mục Font.
4. **Motion token**: đã port sang app — `--duration-fast (60ms) / --duration-normal (200ms) / --easing-standard`. Chi tiết drag/drop + animation ở `.kiro/steering/motion-rules.md` (nếu tạo sau).
5. **Component**: 2 trục độc lập.
   - Trục THEME (màu): `theme-store.ts` (Zustand persist).
   - Trục PHONG CÁCH (vẽ tay / phẳng): `ui-style-store.ts`. Lớp vỏ Style `src/components/style/{Button,Card,Badge}.tsx` render drawably (hand) hoặc shadcn/HTML (flat). Vỏ khác dựng dần khi cần.
   - Shared state: `src/components/shared/{Skeleton,LoadingState,EmptyState,ErrorState}.tsx`.
6. **Dark/light**: cả 2 qua `[data-theme]`, App.tsx subscribe `theme-store` + `ui-style-store` đồng bộ lên `<html>`.
7. **Icon**: lucide-react là nguồn chính. drawably (0.4.2) chỉ cho phong cách vẽ tay.

## Còn treo

- **Task 9 deferred**: drawably scope chi tiết + doc riêng. Chưa làm.
- **Trang demo**: `/thu/style-demo` bày Button/Card/Badge + shared states + toggle theme + toggle phong cách.
- **Elevation shadow + z-index tokens** (thêm 2026-09-17): `--shadow-elevation-1/2/3` + `--z-canvas/modal/toolbar...` trong `index.css`, expose qua Tailwind. Chuẩn bị cho Canvas Phase B.

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
