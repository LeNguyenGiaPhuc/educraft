# EduCraft

EduCraft là nền tảng web hỗ trợ giáo viên giao bài ghi, nhận bài nộp của học sinh và chốt kết quả sau khi xem AI phân tích. Dự án gồm frontend React/Vite, backend Express và PostgreSQL/Supabase.

## Trạng thái hiện tại

Các luồng chính đã kết nối frontend với backend:

- Đăng nhập, làm mới phiên và phân quyền ADMIN, TEACHER, STUDENT.
- Admin quản lý tài khoản, đặt mật khẩu, khóa/mở khóa tài khoản và xóa khi đủ điều kiện.
- Admin quản lý lớp, phân công giáo viên, thêm/xóa học sinh và import danh sách Excel.
- Teacher xem lớp được phân công, tạo/chỉnh sửa/xóa bài kiểm tra và quản lý nhiều bài mẫu.
- Teacher xem bài nộp theo học sinh và số lần nộp, gọi đánh giá AI, nhập nhận xét và chốt kết quả.
- Student xem lớp/bài kiểm tra được phép truy cập, nộp ảnh JPG/JPEG/PNG, xem lịch sử nộp và kết quả đã chốt.
- File bài mẫu và bài nộp được lưu qua Supabase Storage với signed URL.

AI evaluator hiện là evaluator mô phỏng deterministic để phục vụ prototype. Việc kết nối mô hình AI thật và gửi email tự động là phần mở rộng sau MVP.

## Công nghệ và cấu trúc

- `frontend/`: React, React Router, Vite, CSS.
- `backend/`: Express, Zod, Supabase JS.
- `supabase/migrations/`: schema, quyền truy cập, function và policy của database/storage.
- `supabase/tests/`: các truy vấn kiểm tra schema, RLS và storage policy.
- `docs/api-contract.md`: hợp đồng endpoint giữa frontend và backend.
- `docs/frontend-workflow.md`: workflow và tiêu chí phân quyền của giao diện.

## Yêu cầu

- Node.js 20.19 trở lên.
- Một project Supabase đã áp dụng các migration trong `supabase/migrations/`.

## Chạy backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run dev
```

Điền các biến sau vào `backend/.env`:

```text
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Kiểm tra backend tại `GET http://localhost:3000/api/health`.

## Chạy frontend

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Frontend dùng `http://localhost:3000` làm API mặc định. Có thể đổi bằng:

```text
VITE_API_BASE_URL=http://localhost:3000
```

Mở địa chỉ Vite hiển thị trong terminal, thường là `http://localhost:5173`.

## Database và Storage

Áp dụng migration theo thứ tự tên file trong `supabase/migrations/`. Có thể chạy bằng Supabase CLI hoặc dán từng migration vào SQL Editor của project nhóm. Sau đó chạy các file kiểm tra trong `supabase/tests/` để xác nhận schema, RLS và storage policy.

Không commit `backend/.env`, service-role key hoặc các thông tin bí mật khác.

## Kiểm tra code

Chạy test và lint riêng cho từng phần:

```powershell
cd backend
npm test
npm run lint

cd ..\frontend
npm test
npm run lint
npm run build
```

Trạng thái kiểm tra gần nhất trên `main`:

- Backend: `202/202` test đạt.
- Frontend: `191/191` test đạt.
- Backend lint, frontend lint và frontend build đều đạt.

Trước khi bàn giao, vẫn cần chạy smoke test trên Supabase thật cho ba vai trò, upload file thật và các trường hợp bị từ chối quyền truy cập.
