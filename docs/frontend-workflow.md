# EduCraft frontend workflow

Tài liệu này chốt luồng của bản frontend mock trước khi thay bằng service thật.

## Quyền theo vai trò

| Vai trò | Được làm | Không được làm |
| --- | --- | --- |
| Admin | Quản lý tài khoản, tạo/sửa/xóa lớp, phân công một giáo viên cho lớp, thêm/import/xóa học sinh | Chấm bài thay giáo viên |
| Giáo viên | Chỉ xem lớp được Admin phân công; tạo bài kiểm tra; thêm bài mẫu; xem bài nộp; xem AI đề xuất; chốt kết quả | Tạo/xóa lớp, phân công giáo viên, xem lớp không được giao |
| Học sinh | Xem lớp/bài được tham gia; nộp và nộp lại bài; xem trạng thái và nhận xét đã chốt | Xem bài của học sinh khác hoặc chốt kết quả |

## Luồng Admin

1. Tạo tài khoản giáo viên hoặc học sinh. Tài khoản học sinh được import từ Excel ở trạng thái `pending`.
2. Tạo lớp với mã lớp, môn học, học kỳ và năm học.
3. Chọn một giáo viên đang hoạt động để phân công. Khi đổi giáo viên, giáo viên cũ mất quyền truy cập lớp.
4. Mở chi tiết lớp để import Excel hoặc thêm/xóa học sinh.
5. File chỉ được lưu sau khi preview không còn lỗi. Mỗi dòng cần `STT`, `Họ và tên`, `Email`; email được chuẩn hóa chữ thường và không được trùng trong file.
6. Tài khoản học sinh mới giữ trạng thái chờ kích hoạt; nút `Kích hoạt` trong mock đặt mật khẩu demo. Gửi email thật sẽ làm ở backend.

## Luồng giáo viên

1. Đăng nhập bằng tài khoản đang hoạt động.
2. Dashboard chỉ hiển thị các lớp được phân công.
3. Tạo bài kiểm tra trong một lớp được phân công.
4. Mở chi tiết bài để thêm/thay bài mẫu và xem danh sách bài nộp.
5. Xem kết quả AI mô phỏng, sau đó chọn trạng thái và nhận xét cuối rồi bấm `Chốt kết quả`.

## Quy tắc dữ liệu mock

- `educraft.users` giữ thông tin đăng nhập và tương thích với dữ liệu cũ.
- `educraft.classes` giữ thông tin lớp; lớp tạo mới có `teacherId`.
- `educraft.classMemberships` giữ quan hệ học sinh-lớp và STT riêng của từng lớp.
- Các thao tác xóa lớp phải xóa bài, bài mẫu, bài nộp, membership và class id tương ứng.
- Email là định danh đăng nhập duy nhất trong mock. Nếu dùng email phụ huynh cho hai học sinh, bản mock cần hai email khác nhau (backend sau này có thể tách account và contact email).

## Tiêu chí chốt frontend

- Route trái quyền trả về trạng thái lỗi và không hiển thị dữ liệu lớp.
- CRUD lớp và tài khoản có validation, thông báo lỗi/thành công và không cần reload trang.
- Import Excel có kiểm tra phần mở rộng, kích thước, header, STT, họ tên, email, dòng trùng và preview trước khi lưu.
- STT hiển thị đúng theo từng lớp; cùng một tài khoản ở hai lớp không dùng chung STT.
- `npm test`, `npm run lint` và `npm run build` đều phải xanh trước khi chuyển sang BE.
