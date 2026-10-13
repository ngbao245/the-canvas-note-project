# Dựng Supabase cho bibo

**Trạng thái**: Nháp, viết 2026-10-13. Cách chia project đã chốt. Bước 6 chưa ai thử, phải kiểm khi `bibo-auth` có đăng nhập.

Liên quan: `.kiro/specs/bibo-foundation/design.md` (stack), `.kiro/notes/milanote-sync-architecture.md` mục 2.8 (vì sao Supabase), 2.11a (giới hạn gói).

## Bức tranh

```
bibo-auth (project auth)  ──cấp token──▶  trình duyệt
                                             │ cùng 1 token
              ┌──────────────────────────────┼───────────────────────┐
              ▼                              ▼                       ▼
   project dữ liệu chính            project file 1   ...   project file N
   (board, object, outbox,          (Storage: ảnh, file đính kèm)
    khoá, Realtime)
```

Mấu chốt: mọi project cùng dùng **1 khoá ký JWT**. Token do project auth cấp sẽ được project dữ liệu và các project file tin luôn. Nhờ vậy RLS (`auth.uid()`) chạy thẳng trên từng project, client không cần giữ khoá quản trị.

Lý do làm vậy: Supabase chỉ tin token bên ngoài từ vài nhà cung cấp có sẵn (Clerk, Firebase, Auth0, Cognito, WorkOS), không có "tin token của project Supabase khác". Nhưng Supabase cho nhập khoá ký của mình vào project ([JWT Signing Keys](https://supabase.com/docs/guides/auth/signing-keys)), nên nhập cùng 1 khoá vào mọi project là được.

## Chia nhiều project (ĐÃ CHỐT 2026-10-13: hướng A + chuẩn bị cho C)

Dữ liệu board nằm ở 1 project chính, chỉ file (ảnh, đính kèm) mới chia ra nhiều project. Giống cách donor làm với Library (`bibo-hub/docs/library-storage-nodes.md`), nhưng không để khoá quản trị trên trình duyệt.

Chuẩn bị sẵn để sau chuyển sang C (gán mỗi người dùng vào 1 project) mà không viết lại lớp gửi. Bắt buộc làm trong `canvas-sync`:
1. Mọi dòng dữ liệu có cột chủ sở hữu.
2. Có bảng "board nằm ở project nào" ngay từ đầu, lúc đầu chỉ 1 giá trị (project chính).
3. Client lấy kết nối Supabase theo board, không dùng 1 client cố định cho cả app.

Vì sao chọn A lúc này: chữ note nhẹ (ước 2-5 KB / object, 500 MB chứa ~100-250 nghìn object, chưa đo), thứ đầy trước là ảnh. Hiện 1 người dùng, chưa chia sẻ. Giới hạn Realtime dồn vào 1 project là chỗ sẽ nghẽn trước, lúc đó mới chuyển C.

Lý do:
- Chữ note rất nhẹ. 500 MB database của gói Free chứa được rất nhiều board. Thứ chiếm chỗ là ảnh (Storage Free chỉ 1 GB).
- `apply_ops` phải áp cả nhóm hoặc không gì, khoá note, Realtime theo board: tất cả cần chung 1 database. Chia board ra nhiều database thì thao tác giữa 2 board (kéo object sang board con) không còn an toàn.

Hướng C (bạn nêu 2026-10-13, để sau): mỗi project cùng 1 schema đầy đủ (board + object + file), mỗi người dùng bibo được gán vào 1 project, project đầy thì người mới vào project kế. Ưu nhược Kiro phân tích trong chat 2026-10-13, tóm lại:
- Được: cả dữ liệu lẫn giới hạn Realtime (200 kết nối, 2 triệu tin / tháng) chia đều theo project. Mọi board của 1 người cùng 1 database nên thao tác nhiều object vẫn an toàn.
- Mất: board chia sẻ giữa 2 người ở 2 project → người được mời phải nối vào project của chủ board; cần bảng "board nằm ở project nào". Kéo object từ board mình sang board người khác (khác project) không áp chung 1 lần được. Project của 1 người đầy thì phải dời cả người đó sang project khác.
- Chuẩn bị rẻ dù chọn gì: mọi dòng có cột chủ sở hữu, có bảng "board → project" ngay từ đầu (lúc đầu chỉ 1 giá trị).

## Giới hạn phải biết trước

- Gói Free: tối đa 2 project đang chạy, tính trên mọi tổ chức bạn làm chủ ([billing](https://supabase.com/docs/guides/platform/org-based-billing)). Project đã tạm dừng thì không tính, nhưng cũng không phục vụ được.
- Project Free không ai gọi trong 1 tuần sẽ bị tạm dừng. Project file ít người mở rất dễ bị dừng, lúc đó ảnh trên project đó không tải được cho tới khi bạn bật lại.
- Muốn quá 2 project Free thì phải dùng nhiều tài khoản. Bạn đã từng làm cách này (xác nhận 2026-10-13).
- ĐÃ CHỐT 2026-10-13: project auth được nằm ở tài khoản khác với project dữ liệu (bạn đã từng làm). Khoá ký chung nhập theo từng project nên không phụ thuộc tài khoản. Bạn tự xếp project nào ở tài khoản nào, không phải tạm dừng donor.
- Chống tạm dừng (bạn chốt 2026-10-13): 1 job định kỳ gọi từng project. ĐỂ SAU (bạn chốt 2026-10-13): làm khi có project file thứ 2 hoặc khi có project bị dừng lần đầu. Hướng đang nghiêng (chưa chốt): pg_cron + pg_net ở project chính gọi Edge Function `keepalive`, hàm này chạy `SELECT` qua REST tới mọi project, mỗi ngày, chỉ dùng publishable key. Dự phòng: chuyển phần lịch sang GitHub Actions nếu project chính bị dừng.
- Tra 2026-10-13: Supabase CHƯA công bố "hoạt động" là gì. Theo người dùng báo lại ([gist zaydiscold](https://gist.github.com/zaydiscold/30a534efaf13821e91c041ae5eaa9fdd)): gọi `/auth/v1/health` KHÔNG giữ được project (không chạm Postgres); phải là câu `SELECT` thật qua REST (`/rest/v1/<bảng>?select=*&limit=1`). Nên chạy mỗi ngày, không phải mỗi tuần (lịch GitHub Actions có thể trễ / bỏ lượt). Edge Function không tự chạy theo lịch: theo [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), cách chính thức là pg_cron + pg_net gọi Edge Function định kỳ (URL + publishable key cất trong Supabase Vault). Edge Function gọi `SELECT` qua supabase-js tới từng project = request REST thật, kể cả tới chính project chính. pg_cron chạy bên trong database có được tính không: chỉ có 1 câu trả lời của bên thứ ba (không phải nhân viên Supabase) nói có ([discussion #13121](https://github.com/orgs/supabase/discussions/13121)), chưa kiểm chứng.
- Lỗi của donor không được lặp: `library-storage-pool/lib/pool.ts` dùng `service_role_key` ngay trên trình duyệt để tải file lên. Khoá đó vượt mọi RLS, lộ ra là mất hết dữ liệu node. Ở bibo, client chỉ cầm publishable key + token người dùng.

## Các bước

### Bước 1: Tạo project dữ liệu chính

1. Vào dashboard Supabase, tạo project mới (trong tổ chức gói Free).
2. Region: Singapore (`ap-southeast-1`), gần Việt Nam nhất.
3. Mật khẩu database: tạo ngẫu nhiên, cất vào trình quản lý mật khẩu. Không ghi vào repo.
4. Ghi lại (ngoài repo): project ref, URL project, publishable key.

### Bước 2: Cài Supabase CLI

Dùng qua `npx`, không cài toàn máy:

```powershell
npx supabase login
```

### Bước 3: Tạo khoá ký chung

```powershell
npx supabase gen signing-key --algorithm ES256
```

Lệnh in ra 1 khoá riêng (JSON). Cất vào trình quản lý mật khẩu. [!] Tuyệt đối không để trong `bibo\` (kể cả `.env`): ai có khoá này là tự tạo được token đăng nhập vào mọi project.

### Bước 4: Nhập khoá vào từng project

Làm cho project auth, project dữ liệu chính, và mỗi project file:

1. Dashboard project → Settings → JWT Keys (mục JWT Signing Keys).
2. Tạo khoá mới ở dạng chờ (standby), chọn nhập khoá có sẵn, dán khoá ở Bước 3.
3. Bấm Rotate để khoá đó thành khoá đang dùng. Khoá chờ chưa được tin, phải rotate thì project mới chấp nhận token ký bằng nó.
4. Mỗi lần đổi trạng thái khoá, Supabase khoá thao tác khoảng 5 phút. Đợi rồi làm project kế.

Project auth của `bibo-auth` đang chạy thật thì rotate an toàn: token cũ vẫn được nhận tới khi bạn thu hồi khoá cũ.

Project auth = project MỚI (ĐÃ CHỐT 2026-10-13), không dùng project auth của donor. Tạo project auth giống Bước 1, rồi nhập khoá chung ngay từ đầu. Project mới chưa có user nên rotate không ảnh hưởng ai.

### Bước 5: Tắt đăng ký ở project dữ liệu + project file

Dashboard → Authentication → tắt cho phép người dùng mới tự đăng ký.

Lý do: các project này cũng có Auth riêng, dùng chung khoá ký. Để mở thì ai cũng tự đăng ký được ở đó và nhận token hợp lệ. Chỉ project auth được cấp tài khoản.

### Bước 6: Kiểm token chéo (sau khi `bibo-auth` có đăng nhập)

1. Đăng nhập qua `bibo-auth`, lấy access token.
2. Gọi 1 hàm SQL nhỏ ở project dữ liệu trả về `auth.uid()`, gửi kèm `Authorization: Bearer <token>`.
3. Đúng: trả về id người dùng của project auth. Sai: lỗi 401.

Chưa ai thử. Rủi ro: token có `iss` (nơi cấp) là project auth, Kiro chưa chắc project dữ liệu có từ chối vì khác nơi cấp không. Nếu bị từ chối thì dự phòng theo cách donor: Edge Function tự kiểm token rồi gọi database (`bibo-hub/backup/supabase/functions/workspace-proxy`), đổi lại RLS không dùng thẳng được.

## Khi viết schema (`canvas-sync`)

- Người dùng không nằm trong `auth.users` của project dữ liệu. Không tạo khoá ngoại tới `auth.users`. Cột chủ sở hữu là `uuid` thường, RLS so với `auth.uid()`.
- Bảng nào cũng bật RLS ngay khi tạo.
- Migration để trong `bibo\supabase\migrations\`, đẩy bằng `npx supabase db push`.
