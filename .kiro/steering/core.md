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
- Offline: `vite-plugin-pwa` (Workbox), chỉ bản build app (spec `app-offline`)
- Backend: Supabase, project dữ liệu riêng cho bibo (chốt 2026-10-13). `@supabase/supabase-js` chưa cài, cài ở `canvas-sync`
- Auth: đăng nhập ngay trong app (Supabase Auth). Không có service SSO riêng (bạn chốt 2026-10-13, thay hướng `bibo-auth`). Sản phẩm chỉ có 2 phần: landing + app canvas
- Deploy: chưa quyết

Muốn đổi stack thì sửa spec `bibo-foundation` trước, không tự đổi trong code.

## Rule ghi file

- Chỉ ghi vào `d:\develop\Side\bibo-hub\bibo\`.
- Ngoại lệ (bạn cho quyền 2026-10-13): được ghi vào `D:\develop\Side\bibo-hub\bibo-auth\` (folder riêng, không gộp vào `bibo\`). Áp cùng rule: không commit, không push, không ghi khoá bí mật (`.env` chỉ đọc tên biến, không in giá trị).
- Cấm ghi sang `d:\develop\Side\bibo-hub\bibo-hub\` (donor, chỉ đọc).
- Copy code từ donor phải ghi rõ file nguồn trong commit hoặc task log.

## Rule git

- Không tự `git init`. Bạn tự làm khi muốn.
- Không tự commit hay push, trừ khi bạn yêu cầu.
- Không `--force`, không amend commit của bạn.

## Rule code và theme — tóm tắt

Đây là mức tối thiểu Kiro phải nhớ mọi lúc. Chi tiết + ví dụ đúng/sai ở `.kiro/steering/coding-style.md` (tự load khi Kiro đọc file `src/`).

- TypeScript strict, cấm `any`. Alias `@/` trỏ `src/`.
- Dùng token theme (`primary`, `foreground`, `background`, `card`, `muted`, `muted-foreground`, `border`, `destructive`, `success`, `warning`). Cấm màu Tailwind cứng như `bg-blue-500`.
- File component `PascalCase.tsx`, util `kebab-case.ts`, hook `useCamelCase.ts`.
- Tool trong `src/tools/{tên}/`.
- Không `console.log` trong commit.
- UI state → Zustand. Server state → TanStack Query.

## Rule giới hạn output lệnh (tiết kiệm token)

Shell là PowerShell (Windows), không có `head` / `tail`. Lệnh có output khó đoán độ dài thì chặn theo dòng: `Select-Object -First N` hoặc `-Last N`.

Đúng: `npm run build 2>&1 | Select-Object -Last 15`.  
Sai: `npm run build` (có thể chảy tràn ngàn dòng), `... | tail -c 4000` (PowerShell báo lỗi).

## Mode làm việc

Kiro làm việc theo 3 mode. **Không load rule mode ở đây** — chỉ đọc khi bạn ra tín hiệu:

- Bạn yêu cầu tool mới hoặc thêm tính năng lớn → Kiro đọc `.kiro/steering/mode-planner.md`.
- Có `tasks.md` đã duyệt, bắt đầu code → Kiro đọc `.kiro/steering/mode-builder.md`.
- Bạn báo bug hoặc sửa nhỏ → Kiro đọc `.kiro/steering/mode-fix.md`.

Kiro thông báo trước khi chuyển mode, dạng: `[mode: planner] Bắt đầu hỏi rõ yêu cầu tool X.`

## Handoff theo tool

Trước khi làm việc với một tool đã có handoff, Kiro tự đọc file handoff của tool đó để nắm ngữ cảnh, không chờ bạn đính kèm:

- Canvas (`src/tools/canvas/`) → đọc `.kiro/notes/canvas-session-handoff.md` (state đã ship, kiến trúc, gotcha) + `.kiro/notes/canvas-backlog.md` (feature chưa làm).
- Backend / lưu / đồng bộ (spec `canvas-sync`, `canvas-sharing`) → đọc `.kiro/notes/milanote-sync-architecture.md` trước. Không đo lại Milanote bằng MCP trừ câu ở mục "Chưa đo".

Handoff là nguồn chuẩn cho trạng thái tool. Nếu handoff lệch với code thực tế thì tin code, rồi báo bạn để cập nhật handoff.

## Cách bạn làm việc (rút từ các session trước)

Session mới không có lịch sử chat, chỉ có file. Mấy thói quen dưới đây trước giờ chỉ nằm trong chat:

- Bạn test tay, báo theo mã case (VD "B7 sai"). Case nào bạn không nhắc tới là đã test và OK, không hỏi lại.
- Hướng sản phẩm: làm giống Milanote trước, rồi cải tiến. Hành vi chưa rõ thì tra `milanote-sync-architecture.md` / handoff trước khi hỏi.
- Quyết định đã chốt trong chat phải ghi vào spec / handoff / note ngay trong lượt đó, không để tới cuối session.
- Câu đã có trong mục "Câu cần chốt" của note / spec thì hỏi được (chưa ai trả lời). Câu đã ghi "ĐÃ CHỐT" thì không hỏi lại.

## Rule cứng khi hỏi

Kiro hỏi tối đa 3 câu mỗi lượt. Câu hỏi phải là MCQ (A/B/C + Other), mỗi option 1 dòng. Không hỏi lại cái đã có trong stack đã chốt, đã có trong spec, hoặc bạn đã trả lời turn trước.

## Trước khi implement — báo cáo 1 dòng

Trước khi sửa code hoặc viết doc lớn, Kiro báo 1 dòng ngắn: "Đọc {file rule/handoff} để làm {việc}." Bạn thấy Kiro có tra đúng rule không. Không cần cho task nhỏ (typo, đổi tên biến).

Ví dụ:
- "Đọc `canvas-session-handoff.md` + `coding-style.md` để tách file useObjectDrag."
- "Đọc `mode-fix.md` để fix bug zoom bị nhảy."

Bạn thấy Kiro đọc thiếu thì báo, Kiro bổ sung trước khi làm.

## Skill

Bộ skill đặt trong `.kiro/skills/{tên-skill}/SKILL.md`. Kiro chỉ load khi bạn gọi tên hoặc khi câu hỏi khớp trigger phrase trong nội dung skill. Skill không auto load mỗi lượt.

Chưa có skill nào — khi bạn import bộ skill vào folder này thì Kiro sẽ đọc và biết cách dùng.

## Trạng thái hiện tại

Cập nhật 2026-10-12.

- Foundation xong (`bibo-foundation`). Build + lint pass, 0 error (1 warning react-refresh ở `ui/button.tsx`, giữ theo bản gốc shadcn, không cần sửa).
- Đã `git init`. Chưa commit lần nào.
- Tool đang làm: **Canvas** (`src/tools/canvas/`). Chi tiết state + kiến trúc ở `.kiro/notes/canvas-session-handoff.md`.
- Spec gần nhất xong: `canvas-note-autosave` (note tự lưu, hàng đợi ghi, khoá giữa tab theo người chọn, badge, Ctrl+Enter), test tay pass 2026-10-11.
- 2026-10-13: đã ghi Supabase + `bibo-auth` vào `bibo-foundation`. Thứ tự mới: `bibo-auth` → `canvas-sync` → `canvas-sharing`. Hướng dẫn dựng project: `docs/supabase-setup.md` (board ở 1 project chính, file chia nhiều project, đã chốt).
- `canvas-storage-v2` xong 2026-10-12. `app-offline` xong 2026-10-12 (service worker, bạn test pass). Mở session mới bằng `.kiro/notes/next-session-prompt.md`.
- Landing tách bản build riêng (domain gốc), app ở domain `app.`: `npm run dev:landing` / `build:landing`, chi tiết `docs/architecture.md` mục "2 bản build". App `/` chuyển thẳng vào `/canvas`.
- Landing (spec `canvas-landing-demo`, 2026-10-10): canvas mini thử ngay trên trang + phần ký họa. Canvas mini nằm ở `src/routes/landing/demo/`, độc lập hẳn canvas thật: không import `src/tools/canvas/`, không lưu dữ liệu. Canvas thật đổi giao diện thì demo không tự theo.
