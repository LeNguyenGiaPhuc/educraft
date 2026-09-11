# educraft
Web-based educational platform for teachers to create assignments and students to submit their note.

## Chức năng hiện tại

- Xem danh sách lớp học.
- Xem chi tiết lớp và học sinh.
- Tạo bài kiểm tra có validation.
- Nộp bài ghi bằng mock submission flow.
- Hiển thị loading, empty, success và error state.
- Responsive trên desktop và mobile.
- API contract mẫu được lưu tại [`docs/api-contract.md`](docs/api-contract.md).

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

Dữ liệu bài kiểm tra mới được lưu tạm trong `localStorage` với key
`educraft.assignments`. Project hiện chưa cần chạy backend.
