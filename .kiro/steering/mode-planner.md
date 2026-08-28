---
inclusion: manual
---

# Mode Planner — hỏi cho rõ, viết spec

Chỉ load file này khi bạn yêu cầu tool mới hoặc tính năng lớn.

## Bước 1: Diễn giải lại yêu cầu

Kiro nói lại yêu cầu bằng 1-2 câu, hỏi bạn xác nhận. Sai chỗ nào bạn chỉnh, đúng thì tiếp Bước 2.

## Bước 2: Hỏi tối đa 3 câu MCQ

3 câu quan trọng nhất, mỗi câu format:

```
1. [Câu hỏi cụ thể]
   A) [phương án 1]
   B) [phương án 2]
   C) [phương án 3]
   X) Ý khác (ghi rõ)

Kiro nghiêng về [A/B/C] vì [1 câu lý do].
```

Không hỏi 8 category dài dòng. Cái không hỏi thì Kiro tự chọn theo mặc định, note rõ ở Bước 3 để bạn duyệt.

Cái Kiro **không được hỏi** vì đã có trong `core.md`:
- Stack (Vite + React + TS + Tailwind + Zustand + TanStack Query)
- Package manager (npm)
- Cách xưng hô
- Style theme (token-based)
- Folder convention (`src/tools/{tên}/`)

Nếu 3 câu chưa đủ rõ, hỏi tiếp 1-2 câu nữa. Nếu bạn nói "OK cứ vậy đi", Kiro dừng hỏi và note assumption.

## Bước 3: Viết spec

Tạo `.kiro/specs/{tên-tool}/` copy từ `.kiro/specs/_TEMPLATE/`. Điền 3 file:

- `requirements.md` — user stories: "Là [ai], tôi muốn [làm gì] để [đạt được gì]". Điều kiện chấp nhận: "Cho [tình huống], khi [hành động], thì [kết quả]".
- `design.md` — có mấy màn hình, luồng thao tác, dữ liệu lưu ở đâu. Không viết code.
- `tasks.md` — checkbox chia phase. Mỗi task = một đơn vị verify được. Task không đo bằng số file, mà đo bằng "có gì rõ ràng để test khi xong".

## Rule không được vi phạm

- Không code trong khi ở mode Planner.
- Không quyết stack cụ thể trong `requirements.md` (thuộc `design.md`).
- Không đặt tên biến, function, component trong spec.
- Không bắt bạn tự điền template.

## Bước 4: Báo cáo

```
Spec `{tên-tool}` xong ở `.kiro/specs/{tên-tool}/`:
- Yêu cầu: N user stories
- Thiết kế: M màn hình  
- Task: K task chia P phase

Bạn muốn:
A) Duyệt và chuyển Builder làm Task 1
B) Sửa spec chỗ nào cụ thể
X) Ý khác

[Answer]:
```

Chờ bạn duyệt xong mới chuyển Builder.
