---
inclusion: manual
---

# Mode Builder — code từng task một

Load file này khi có `tasks.md` đã duyệt và bắt đầu implement.

## Nguyên tắc lõi

- 1 task một lượt. Tick `[x]` xong mới sang task tiếp.
- Đọc file trước khi sửa. Chưa biết cấu trúc thì không code.
- Verify build ở cuối phase, không phải cuối từng task.

## Flow

### 1. Load context
Đọc `tasks.md` tìm task `[ ]` đầu tiên. Đọc `requirements.md` để biết điều kiện chấp nhận. Đọc `design.md` để biết UI/luồng. Nếu có `progress.md` thì đọc để biết task đang dở tới đâu.

### 2. Thông báo
```
[mode: builder] Task N: {tên task}.
Sẽ đụng: {file 1}, {file 2}
Verify sau khi xong: {cách test}
```

Không hỏi bạn duyệt lại — bạn đã duyệt `tasks.md` rồi.

### 3. Code
Sửa qua công cụ chuyên dụng (không dùng shell `sed/awk`). Tuân thủ rule trong `core.md`.

### 4. Verify

**Giữa phase**: dùng `getDiagnostics` cho file vừa sửa. Sạch thì tiếp. Có lỗi thì fix ngay.

**Cuối phase, hoặc task đụng `vite.config`, `tsconfig`, `package.json`, hoặc lazy import**: chạy `npm run build 2>&1 | Select-Object -Last 15`. Pass thì tiếp. Fail thì phân tích, fix, build lại. Tối đa 3 lần thử cùng cách. Sau 3 lần vẫn fail thì dừng, giải thích, hỏi bạn.

### 5. Tick `[x]` trong `tasks.md`

Ngay lượt này. Không để lượt sau.

### 6. Xóa `progress.md` nếu có

### 7. Báo cáo

```
Task N xong: {tên task}

File đã sửa/tạo: {list}
Verify: {kết quả}
Task tiếp: N+1 — {tên}

Bạn muốn:
A) Xem code Task N trước
B) Làm Task N+1 luôn
C) Nghỉ, tiếp sau

[Answer]:
```

Chờ bạn trả lời. Không tự làm Task N+1 khi chưa được ok.

## Khi task quá to hoặc bạn muốn dừng giữa chừng

Tạo `.kiro/specs/{tool}/progress.md`:

```markdown
# Progress: Task N — {tên}

## Đã xong
- [x] {bước}

## Đang dở
- {mô tả cụ thể}

## Cần làm tiếp
- [ ] {bước}

## File đã sửa
- {đường dẫn} — {đã làm gì}

## Quyết định đã chọn
- {quyết định + 1 câu lý do}
```

Xóa file này khi task xong (bước 6).

## Rule không được vi phạm

- Không code 2 task cùng lượt (trừ khi bạn nói rõ "làm hết Phase X luôn").
- Không skip verify.
- Không skip tick `[x]`.
- Không tự đổi scope task. Thấy task viết sai thì dừng, báo bạn sửa `tasks.md`.
- Không code khi build đang fail.
