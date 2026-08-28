---
inclusion: manual
---

# Mode Fix — sửa bug và tính năng nhỏ

Load file này khi bạn báo bug hoặc yêu cầu sửa nhỏ (dưới 3 file).

## Cây quyết định

```
Yêu cầu của bạn
├── Bug rõ, có cách repro, đụng ≤ 2 file → Fix thẳng (bên dưới)
├── Bug mù mờ hoặc đụng ≥ 3 file → Hỏi bạn có tạo spec ngắn không
├── Tính năng nhỏ tool cũ (1-2 US, ≤ 3 file) → Mode Planner với 2-3 câu MCQ
├── Tính năng lớn tool cũ → Mode Planner đầy đủ, spec đặt tại `{tool}-{tên-tính-năng}/`
└── "Dò lại / audit" → Mode Audit (bên dưới)
```

## Fix bug thẳng

### 1. Load context
Đọc spec tool (nếu có), doc, entry point (route/lib).

### 2. Grep sơ bộ
Đếm file có match nghi ngờ. `≤ 2` thì tiếp. `≥ 3` thì dừng, hỏi bạn:

```
Bug này đụng {N} file, phức tạp hơn dự kiến:
- {file 1}
- {file 2}
- {file 3}

Kiro nghĩ nên tạo spec ngắn để track. Bạn ok không? (Y/N)
```

### 3. Repro
Mô tả cách repro để bạn verify. Nếu có công cụ tự chạy được thì Kiro tự repro.

### 4. Nói lý do gốc và cách fix
```
Lý do gốc: {1-2 câu}
Cách fix: sửa {file A}, {file B}
Ảnh hưởng: {có đụng feature khác không}

OK không?
```

### 5. Fix và verify build

`npm run build 2>&1 | tail -c 4000`. Pass thì tiếp. Fail thì phân tích, thử cách khác. Không lặp 2 lần cùng cách.

### 6. Chờ bạn verify

```
Kiro fix xong. Bạn test:
1. {bước 1}
2. {bước 2}

Xong báo Kiro:
- Bug hết → Kiro đóng task
- Vẫn còn → Kiro thử cách khác (không lặp cách cũ)
```

**Không đóng task khi bạn chưa xác nhận bug hết.**

### 7. Nếu bạn báo vẫn còn bug
Không thử lại cách vừa fail. Grep sâu hơn, đề xuất cách khác, quay về Bước 4.

## Mode Audit — dò lại output vừa gen

Từ khóa bạn hay dùng: "dò lại", "audit", "coi lại", "có gì dư không", "review".

Scope:
- File Kiro vừa sửa trong session này
- Tool cụ thể bạn nói
- Không rõ → hỏi 1 câu MCQ.

Check 4 loại:
1. Rule/logic trùng ở nhiều chỗ (có thể mâu thuẫn)
2. Link chết, TODO chưa xử, placeholder chưa fill
3. Ví dụ dư (2 ví dụ minh họa cùng 1 rule, không thêm insight)
4. Rule quá chi tiết cho case hiếm

Format báo cáo:
```
## Điểm dư
- {file}:{line} — {mô tả + 1 dòng trích}

## Có thể gộp
- {file A} + {file B} — {lý do 1 câu}

## Đề xuất
- {gì cụ thể, số hóa được}

Bạn muốn:
A) Fix hết
B) Fix từng cái, hỏi mỗi lần
C) Chỉ report, không fix

[Answer]:
```

**Rule cứng**: Kiro không tự fix trong Mode Audit. Chờ bạn chọn. Không mở scope. Không tô hồng — không có gì dư thì nói thẳng.
