# educraft
Web-based educational platform for teachers to create assignments and students to submit their note.

## Chức năng hiện tại

- Xem danh sách lớp học.
- Xem chi tiết lớp và học sinh.
- Admin import danh sách học sinh từ file Excel theo mẫu `STT`, `Họ và tên`, `Email`.
- Tự tạo tài khoản học sinh mock ở trạng thái chờ kích hoạt và thêm vào lớp; email/mật khẩu thật sẽ tích hợp sau.
- Tạo, chỉnh sửa và xóa lớp học/môn học bằng dữ liệu mock.
- Tạo bài kiểm tra có validation.
- Xem chi tiết bài kiểm tra, lưu bài mẫu giáo viên và chốt bài nộp mock.
- Hiển thị loading, empty, success và error state.
- Responsive trên desktop và mobile.
- API contract mẫu được lưu tại [`docs/api-contract.md`](docs/api-contract.md).

Giao diện Admin, giáo viên và học sinh hiện dùng mock data để demo; phần
backend, gửi email kích hoạt và lưu trữ thật sẽ tích hợp ở giai đoạn sau.

## Công nghệ

- React
- React Router
- Vite
- CSS

## Chạy project

Yêu cầu Node.js 20.19 trở lên.

```bash
git clone https://github.com/LeNguyenGiaPhuc/educraft.git
cd educraft/frontend
npm ci
npm run dev
```

Mở địa chỉ được hiển thị trong terminal, thường là:

```text
http://localhost:5173
```

## Kiểm tra code

```bash
npm test
npm run lint
npm run build
```

Dữ liệu prototype được lưu tạm trong `localStorage` với các key
`educraft.classes`, `educraft.users`, `educraft.students`, `educraft.assignments`,
`educraft.references` và `educraft.submissions`. Danh sách tài khoản trong
`educraft.users` là nguồn chính cho roster được Admin import; `educraft.students`
chỉ được giữ để tương thích với các fixture cũ.
Project hiện chưa cần chạy backend.
