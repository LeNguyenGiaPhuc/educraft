# Thiết kế Backend EduCraft

## 1. Mục tiêu

Xây dựng backend thật cho EduCraft để thay thế các mock store hiện có của
frontend. Backend phải giữ nguyên các luồng Admin, giáo viên và học sinh đã
chốt, đồng thời sử dụng database, Row Level Security và Storage đã tạo trên
Supabase.

Kiến trúc được chọn:

```text
React frontend
      |
      | REST API + HttpOnly authentication cookies
      v
Express backend
      |
      +-- Supabase Auth
      +-- PostgreSQL + RLS
      +-- Supabase Storage
```

Express là API trung tâm. Frontend không truy cập trực tiếp Supabase.

## 2. Phạm vi giai đoạn đầu

Giai đoạn này bao gồm:

- Đăng nhập, đăng xuất, làm mới phiên và lấy người dùng hiện tại.
- Xác thực, kiểm tra trạng thái tài khoản và phân quyền theo vai trò.
- CRUD tài khoản và lớp học theo quyền Admin.
- Phân công giáo viên và quản lý học sinh trong lớp.
- Import danh sách học sinh đã được frontend đọc từ Excel.
- CRUD bài kiểm tra theo quyền giáo viên được phân công.
- Upload bài mẫu và bài nộp vào Supabase Storage.
- Nộp lại bài theo số lần nộp.
- Giáo viên xem bài nộp và chốt kết quả.
- Lưu kết quả AI giả lập thông qua một service riêng.
- Test API, phân quyền và các transaction quan trọng.

Chưa làm trong giai đoạn này:

- Gửi email kích hoạt thật.
- Tích hợp mô hình AI thật.
- Microservice, message broker hoặc hệ thống job phức tạp.
- Frontend gọi Supabase trực tiếp.

## 3. Công nghệ

- Node.js và JavaScript ESM.
- Express 5.
- `@supabase/supabase-js` để làm việc với Auth, Data API và Storage.
- Zod để kiểm tra request data.
- Multer memory storage để nhận file, giới hạn tối đa 5 MB.
- `node:test` và Supertest để kiểm tra API.
- PostgreSQL function/RPC cho nghiệp vụ cần transaction nhiều bảng.

Không dùng ORM trong giai đoạn này. Database schema và RLS đã được quản lý
bằng migration Supabase; dùng Supabase client và RPC giúp code ngắn, dễ đọc
và tránh tạo thêm một lớp mapping không cần thiết.

## 4. Cấu trúc backend

```text
backend/
  src/
    app.js
    server.js
    config/
      env.js
      supabase.js
    common/
      errors.js
      response.js
    middleware/
      authenticate.js
      authorize.js
      validate.js
      errorHandler.js
    modules/
      auth/
      accounts/
      classes/
      assignments/
      submissions/
      storage/
      ai-evaluations/
  tests/
```

Mỗi module giữ cấu trúc đơn giản:

```text
route -> controller -> service -> Supabase hoặc PostgreSQL RPC
                     -> validator
```

- Route khai báo URL và middleware.
- Controller nhận request, gọi service và trả response.
- Service chứa nghiệp vụ và truy cập dữ liệu.
- Validator mô tả dữ liệu đầu vào.
- Controller không chứa câu truy vấn và không dùng `service_role` trực tiếp.

## 5. Supabase clients và ranh giới tin cậy

Backend có hai cách tạo Supabase client:

### User-scoped client

Client này nhận access token của request. Các thao tác thông thường phải dùng
client này để `auth.uid()` có giá trị và RLS tiếp tục kiểm soát dữ liệu.

Ví dụ:

- Giáo viên chỉ đọc lớp được phân công.
- Học sinh chỉ đọc lớp và bài của mình.
- Học sinh chỉ đọc bài nộp của mình.
- Giáo viên chỉ chốt bài thuộc lớp được giao.

### Admin client

Client này dùng `SUPABASE_SERVICE_ROLE_KEY` và bỏ qua RLS. Nó chỉ được dùng
trong service hệ thống đã xác định, chủ yếu cho:

- Tạo hoặc xóa Supabase Auth user.
- Khôi phục dữ liệu khi một quy trình nhiều bước thất bại.
- Các tác vụ quản trị không thể thực hiện bằng user-scoped client.

`service_role` không được trả về frontend, ghi log hoặc commit vào Git.

## 6. Xác thực và phiên đăng nhập

Supabase Auth là hệ thống xác thực chính. Backend không tự mã hóa hoặc lưu mật
khẩu.

Luồng đăng nhập:

1. Frontend gọi `POST /api/auth/login` với email và mật khẩu.
2. Express gọi Supabase Auth bằng anon key.
3. Express kiểm tra profile tồn tại và có trạng thái `ACTIVE`.
4. Access token và refresh token được đặt trong cookie `HttpOnly`.
5. Frontend gọi `GET /api/auth/me` để lấy profile và role.

Các cookie sử dụng `HttpOnly`, `SameSite=Lax`, `Secure` trong production và
thời hạn phù hợp với token Supabase. CORS chỉ cho phép `FRONTEND_ORIGIN` và
cho phép gửi credentials. Các request thay đổi dữ liệu phải kiểm tra Origin.

Mọi endpoint được bảo vệ chạy middleware theo thứ tự:

```text
authenticate -> require ACTIVE profile -> require role -> resource ownership
```

Kiểm tra role không thay thế kiểm tra quyền trên tài nguyên. Một giáo viên có
role `TEACHER` vẫn bị từ chối nếu lớp không được phân công cho giáo viên đó.

## 7. Vai trò và quyền

### Admin

- Quản lý tài khoản.
- Tạo, sửa và xóa lớp.
- Phân công một giáo viên đang hoạt động cho một lớp.
- Thêm, import hoặc xóa học sinh khỏi lớp.
- Không chấm bài thay giáo viên.

### Giáo viên

- Chỉ xem lớp được Admin phân công.
- Tạo và quản lý bài kiểm tra trong lớp được giao.
- Upload bài mẫu.
- Xem bài nộp, xem đề xuất AI và chốt kết quả.
- Không tạo lớp hoặc thay đổi giáo viên phụ trách.

### Học sinh

- Chỉ xem lớp và bài kiểm tra mình được tham gia.
- Nộp hoặc nộp lại bài khi bài còn mở và chưa quá hạn.
- Xem kết quả đã được giáo viên chốt.
- Không xem bài của học sinh khác hoặc kết quả AI chưa được chốt.

Backend kiểm tra quyền và Supabase RLS cung cấp lớp bảo vệ thứ hai.

## 8. Quy ước API

Base URL:

```text
/api
```

Response thành công:

```json
{
  "data": {}
}
```

Response lỗi:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Kiểm tra lại dữ liệu đã nhập.",
    "fields": {
      "email": "Email đã được sử dụng."
    }
  }
}
```

Mã HTTP chính:

- `400`: request không đúng cấu trúc.
- `401`: chưa đăng nhập hoặc phiên hết hạn.
- `403`: đúng tài khoản nhưng không đủ quyền.
- `404`: không tìm thấy tài nguyên được phép nhìn thấy.
- `409`: xung đột dữ liệu như email hoặc mã lớp trùng.
- `422`: dữ liệu đúng cấu trúc nhưng vi phạm quy tắc nghiệp vụ.
- `500`: lỗi hệ thống không mong đợi.

API sử dụng các enum viết hoa giống database như `ADMIN`, `ACTIVE`, `OPEN`,
`SUBMITTED` và `FINALIZED`. Khi thay mock, frontend service chịu trách nhiệm
chuyển enum thành nhãn tiếng Việt để hiển thị.

Các nhóm endpoint chính:

```text
/api/auth/*
/api/admin/accounts/*
/api/classes/*
/api/assignments/*
/api/submissions/*
```

`docs/api-contract.md` phải được cập nhật cùng lúc khi endpoint hoặc response
thay đổi.

## 9. Luồng import học sinh

Frontend tiếp tục đọc file Excel, hiển thị preview và chỉ bật nút xác nhận khi
file hợp lệ. Frontend gửi các dòng đã chuẩn hóa đến Express; backend vẫn phải
kiểm tra lại toàn bộ dữ liệu.

Mỗi dòng gồm:

```json
{
  "studentNumber": "01",
  "name": "Nguyễn Văn An",
  "email": "parent@example.com"
}
```

Quy tắc:

- `STT`, họ tên và email là bắt buộc.
- Email được chuyển về chữ thường và loại bỏ khoảng trắng thừa.
- Email cá nhân hoặc email phụ huynh đều được chấp nhận.
- Mỗi học sinh phải có một email duy nhất trong toàn hệ thống.
- Một tài khoản học sinh có thể tham gia nhiều lớp.
- `studentNumber` thuộc quan hệ `class_members`, không thuộc tài khoản.
- Email trùng trong file hoặc thuộc tài khoản không phải Student làm toàn bộ
  import thất bại.
- File chỉ được import khi tất cả dòng hợp lệ.

Luồng xử lý:

1. Kiểm tra quyền Admin và lớp tồn tại.
2. Validate toàn bộ request mà chưa ghi dữ liệu.
3. Phân loại tài khoản đã tồn tại và tài khoản cần tạo.
4. Tạo các Supabase Auth users cần thiết bằng admin client.
5. Gọi một PostgreSQL RPC để thêm toàn bộ `profiles` và `class_members` trong
   một transaction.
6. Nếu tạo Auth user hoặc RPC thất bại, xóa các Auth users vừa tạo trong lần
   import và trả lỗi; không giữ membership một phần.

Tài khoản mới có trạng thái `PENDING` và chưa được phép đăng nhập. Ở giai đoạn
sau, hệ thống gửi email chứa link dùng một lần để học sinh tự đặt mật khẩu.
Không gửi hoặc lưu mật khẩu dạng rõ.

## 10. Luồng upload và bài nộp

Frontend gửi file qua Express bằng `multipart/form-data`. Express kiểm tra:

- Người dùng có quyền với assignment hoặc submission.
- MIME type thuộc JPEG, PNG hoặc WebP.
- Kích thước không vượt quá 5 MB mỗi file.
- Assignment đang `OPEN` và chưa quá hạn khi học sinh nộp bài.

Luồng nộp bài:

1. PostgreSQL RPC tạo submission với `attempt_number` tiếp theo.
2. Backend upload file vào
   `student-submissions/{submission_id}/{file_name}`.
3. Backend lưu metadata vào `submission_files`.
4. AI service giả lập tạo `ai_evaluations` và chuyển bài sang trạng thái phù
   hợp để giáo viên xem xét.
5. Nếu upload hoặc ghi metadata thất bại, backend xóa object và submission tạm.

Việc tính `attempt_number` phải nằm trong RPC để tránh hai request đồng thời
tạo cùng một lần nộp.

Luồng bài mẫu sử dụng bucket
`reference-materials/{assignment_id}/{file_name}`. Khi thay file, backend tải
file mới trước, cập nhật metadata rồi mới xóa file cũ. Nếu bước cuối thất bại,
backend ghi log object dư để có thể dọn lại mà không làm mất bài mẫu đang dùng.

## 11. Giáo viên chốt kết quả

AI chỉ tạo đề xuất trong `ai_evaluations`. Kết quả cuối thuộc
`teacher_reviews`.

Khi giáo viên chốt kết quả, một PostgreSQL RPC phải:

1. Xác nhận giáo viên vẫn được phân công cho lớp.
2. Tạo hoặc cập nhật `teacher_reviews`.
3. Đặt `is_finalized = true` và `finalized_at`.
4. Chuyển submission sang `FINALIZED`.

Bốn thay đổi trên chạy trong cùng một transaction. Học sinh chỉ đọc được
review đã có `is_finalized = true`.

## 12. Xóa dữ liệu

- Xóa lớp tiếp tục sử dụng cascade đã định nghĩa để xóa assignment, bài mẫu,
  submission và membership liên quan. Service phải dọn các object Storage
  trước hoặc sau database delete bằng quy trình có thể thử lại.
- Tài khoản chưa có dữ liệu học tập có thể bị xóa khỏi Supabase Auth.
- Tài khoản đã có submission hoặc teacher review không hard delete vì schema
  đang bảo vệ lịch sử bằng `ON DELETE RESTRICT`; Admin phải khóa tài khoản.
- Xóa thất bại vì còn dữ liệu liên quan trả `409 ACCOUNT_HAS_HISTORY`.

## 13. Xử lý lỗi và logging

- Zod validation error được chuyển thành `VALIDATION_ERROR` với lỗi theo field.
- Lỗi unique constraint được chuyển thành `409` với mã nghiệp vụ rõ ràng.
- Lỗi RLS không được trả nguyên văn về frontend.
- Log gồm request ID, method, path, status và thời gian xử lý.
- Không log mật khẩu, cookie, access token, refresh token hoặc service key.
- Lỗi Storage sau khi database đã thay đổi phải kích hoạt bước bù trừ và được
  ghi log để kiểm tra thủ công nếu bù trừ thất bại.

## 14. Biến môi trường

Backend cần các biến sau:

```text
PORT
NODE_ENV
FRONTEND_ORIGIN
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Repository chỉ chứa `.env.example`. File `.env` thật phải nằm trong
`.gitignore`.

## 15. Kiểm thử

Mỗi module cần kiểm tra tối thiểu:

- Trường hợp thành công.
- Request thiếu hoặc sai dữ liệu.
- Chưa đăng nhập.
- Đăng nhập đúng nhưng sai role.
- Đúng role nhưng không sở hữu hoặc không được phân công tài nguyên.
- Xung đột dữ liệu.
- Lỗi Supabase hoặc Storage và hành vi rollback.

Các mức test:

- Unit test cho validator và service nghiệp vụ thuần.
- API integration test bằng Supertest với Supabase client được thay bằng fake.
- Supabase SQL tests hiện có tiếp tục kiểm tra schema, RLS và Storage policy.
- Smoke test với project Supabase thật trước khi thay mock frontend.

Không dùng database production cho test tự động.

## 16. Phân công team

### Leader - Backend foundation và integration

- Khởi tạo Express, cấu hình môi trường và cấu trúc module.
- Tạo user-scoped client và admin client.
- Làm Auth, cookie, middleware, validation và error handler chung.
- Thiết lập test và tài liệu chạy backend.
- Duy trì API contract, review và tích hợp PR.

### Member 1 - Admin, tài khoản và lớp học

- CRUD tài khoản.
- Khóa và mở khóa tài khoản.
- CRUD lớp học và phân công giáo viên.
- Quản lý `class_members`.
- Import học sinh và rollback khi thất bại.
- Test quyền Admin và transaction import.

### Member 2 - Bài kiểm tra và bài nộp

- CRUD assignment theo lớp được phân công.
- Upload, thay và xóa bài mẫu.
- Nộp và nộp lại bài.
- Upload file bài nộp.
- AI evaluation giả lập.
- Giáo viên chốt kết quả.
- Test quyền Teacher, Student và rollback Storage.

Member chỉ bắt đầu branch nghiệp vụ sau khi `backend-foundation` đã được merge
vào `main`.

## 17. Quy trình branch và review

1. Leader dọn working tree và tạo branch `feature/backend-foundation`.
2. Hoàn thành foundation, test và merge vào `main`.
3. Member cập nhật `main` rồi tạo branch theo module.
4. Mỗi PR chỉ chứa thay đổi của module được giao.
5. PR phải mô tả endpoint, migration/RPC mới, test đã chạy và cách kiểm tra.
6. Leader kiểm tra phân quyền, transaction, lỗi và API contract trước khi merge.
7. Sau khi merge các module, chạy test tích hợp toàn backend.
8. Chỉ bắt đầu thay mock frontend khi smoke test backend với Supabase thật đạt.

## 18. Tiêu chí hoàn thành BE giai đoạn đầu

- Toàn bộ nghiệp vụ hiện có của frontend mock có API thật tương ứng.
- Frontend không cần gọi Supabase trực tiếp.
- Auth và role được kiểm tra tại Express; quyền dữ liệu tiếp tục được RLS bảo vệ.
- Import không để lại profile hoặc membership một phần.
- Upload thất bại không để lại submission hoặc metadata sai.
- AI không tự chốt kết quả thay giáo viên.
- Không có secret trong repository hoặc log.
- Test backend, SQL policy test và smoke test Supabase đều đạt.
- `docs/api-contract.md` phản ánh đúng implementation thực tế.
- Có hướng dẫn cài đặt, biến môi trường và chạy backend cho thành viên mới.

## 19. Kế hoạch triển khai và rollback

Triển khai theo thứ tự:

1. Backend foundation và Auth.
2. Accounts, classes và import.
3. Assignments, Storage, submissions và reviews.
4. Test tích hợp với Supabase thật.
5. Thay từng mock frontend bằng service thật theo từng module.
6. Email kích hoạt và AI thật ở giai đoạn sau.

Mỗi module được merge độc lập. Nếu một module chưa ổn định, frontend tiếp tục
dùng mock cho module đó trong khi các module đã đạt có thể dùng API thật. Các
migration mới phải có migration sửa tiếp rõ ràng; không sửa lịch sử migration
đã áp dụng trên Supabase production.
