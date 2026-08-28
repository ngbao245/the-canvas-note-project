---
inclusion: always
---

# Nguyên tắc lõi — bibo

File duy nhất load mỗi lượt. Rule khác đọc theo tình huống.

## Xưng hô

Gọi bạn là "bạn". Kiro xưng "Kiro". Không dùng "anh/em/mình/tớ/chúng ta".

## Cách nói

- Tiếng Việt có dấu, ngắn gọn, đi vào việc.
- Không dùng emoji ở bất kỳ chỗ nào (chat, code, doc, commit).
- Không dùng từ khó: "elicitation", "SSOT", "drift", "abort-safe", "footprint", "hysteresis", "verifiable unit". Nói thẳng: "hỏi cho rõ", "nguồn chuẩn", "lệch nhau", "an toàn khi dừng".
- Có 2 lựa chọn trở lên thì mỗi lựa chọn một dòng, kèm 1 câu ưu/nhược. Kiro nói rõ nghiêng phương án nào và tại sao.

## Stack đã chốt

- Vite 6 + TypeScript strict
- React 18 + Tailwind 3 + shadcn/ui (copy vào repo, không dùng như package)
- Zustand cho state UI, TanStack Query v5 cho state server
- React Router v6
- Backend, auth, deploy: chưa quyết, chờ tool đầu tiên cần

Muốn đổi stack thì sửa spec `bibo-foundation` trước, không tự đổi trong code.

## Rule ghi file

- Chỉ ghi vào `d:\develop\Side\bibo-hub\bibo\`.
- Cấm ghi sang `d:\develop\Side\bibo-hub\bibo-hub\` (donor, chỉ đọc).
- Copy code từ donor phải ghi rõ file nguồn trong commit hoặc task log.

## Rule git

- Không tự `git init`. Bạn tự làm khi muốn.
- Không tự commit hay push, trừ khi bạn yêu cầu.
- Không `--force`, không amend commit của bạn.

## Rule màu và theme

Dùng token trong `src/styles/index.css`: `primary`, `foreground`, `background`, `card`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `destructive`, `success`, `warning`.

Đúng: `bg-primary text-foreground border-border`, `bg-success/10 text-success`.  
Sai: `bg-blue-500`, `text-slate-100`, `bg-green-500/10` (đã có `success`).

## Rule code

- TypeScript strict, không `any`. Kiểm tra kiểu trước khi dùng.
- Alias `@/` trỏ `src/`.
- File component: `PascalCase.tsx`. File util: `kebab-case.ts`.
- Tool mới đặt trong `src/tools/{tên-tool}/`, gồm `route.tsx`, `api.ts`, `types.ts`, `components/`, `lib/`.
- Không `console.log`. Chỉ `console.warn` hoặc `console.error` khi cần, kèm `// eslint-disable-next-line no-console`.

## Rule giới hạn output lệnh (tiết kiệm token)

Chạy lệnh shell có output khó đoán độ dài: pipe qua `head -c 4000` hoặc `tail -c 4000` để chặn theo byte.

Đúng: `npm run build 2>&1 | tail -c 4000`.  
Sai: `npm run build` (có thể chảy tràn ngàn dòng).

## Mode làm việc

Kiro làm việc theo 3 mode. **Không load rule mode ở đây** — chỉ đọc khi bạn ra tín hiệu:

- Bạn yêu cầu tool mới hoặc thêm tính năng lớn → Kiro đọc `.kiro/steering/mode-planner.md`.
- Có `tasks.md` đã duyệt, bắt đầu code → Kiro đọc `.kiro/steering/mode-builder.md`.
- Bạn báo bug hoặc sửa nhỏ → Kiro đọc `.kiro/steering/mode-fix.md`.

Kiro thông báo trước khi chuyển mode, dạng: `[mode: planner] Bắt đầu hỏi rõ yêu cầu tool X.`

## Rule cứng khi hỏi

Kiro hỏi tối đa 3 câu mỗi lượt. Câu hỏi phải là MCQ (A/B/C + Other), mỗi option 1 dòng. Không hỏi lại cái đã có trong stack đã chốt, đã có trong spec, hoặc bạn đã trả lời turn trước.

## Trạng thái hiện tại

- Foundation đã xong (Task 1-10 của `bibo-foundation` pass). App scaffold, build + lint đều pass.
- Chưa `git init`. Chưa có tool cụ thể nào.
- Bước tiếp: bạn quyết định port tool đầu tiên từ donor sang, hoặc `git init` để commit foundation.
