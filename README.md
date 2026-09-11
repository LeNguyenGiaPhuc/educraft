# educraft
Web-based educational platform for teachers to create assignments and students to submit their note.

## Chức năng hiện tại

- Xem danh sách lớp học.
- Xem chi tiết lớp và học sinh.
- Nhập danh sách học sinh từ file Excel và gộp dữ liệu theo mã học sinh.
- Tạo, chỉnh sửa và xóa lớp học/môn học bằng dữ liệu mock.
- Tạo bài kiểm tra có validation.
- Xem chi tiết bài kiểm tra, lưu bài mẫu giáo viên và chốt bài nộp mock.
- Hiển thị loading, empty, success và error state.
- Responsive trên desktop và mobile.
- API contract mẫu được lưu tại [`docs/api-contract.md`](docs/api-contract.md).

Luồng giao diện học sinh được giữ tách riêng để triển khai ở bước sau; phạm vi
hiện tại tập trung vào workflow của giáo viên.

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
`educraft.classes`, `educraft.students`, `educraft.assignments`,
`educraft.references` và `educraft.submissions`.
Project hiện chưa cần chạy backend.
