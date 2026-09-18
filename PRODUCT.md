# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Quản trị viên quản lý tài khoản, lớp học, giáo viên phụ trách và danh sách học sinh.
- Giáo viên quản lý lớp được phân công, tạo bài kiểm tra, xem bài nộp và chốt kết quả.
- Học sinh xem bài kiểm tra, nộp ảnh bài ghi và theo dõi lịch sử cùng kết quả đã chốt.

## Product Purpose

EduCraft hỗ trợ quy trình giao, nộp và đánh giá bài ghi trong lớp học. Thành công của sản phẩm là ba vai trò có thể hoàn thành đúng công việc của mình trong một luồng rõ ràng, ít nhầm lẫn và có kiểm soát quyền truy cập.

## Positioning

EduCraft tập trung vào bài làm dạng ảnh hoặc bài ghi: học sinh nộp file, hệ thống tạo phân tích AI hỗ trợ và giáo viên là người đưa ra kết quả cuối cùng. AI không thay thế quyết định của giáo viên.

## Operating Context

- Admin có thể nhập danh sách học sinh từ Excel sau khi dữ liệu được kiểm tra hợp lệ.
- Giáo viên làm việc theo lớp, bài kiểm tra, tài liệu tham chiếu và từng lần nộp của học sinh.
- Học sinh có thể nộp lại khi bài kiểm tra còn mở và xem kết quả sau khi giáo viên chốt.
- Dữ liệu và file được lưu bằng PostgreSQL/Supabase Database, Auth và Storage.

## Capabilities and Constraints

- Frontend dùng React, React Router, Vite và CSS thuần.
- Backend dùng Express, Zod và Supabase JS.
- Hệ thống có ba vai trò `ADMIN`, `TEACHER`, `STUDENT` và kiểm tra quyền ở cả frontend lẫn backend.
- Giữ nguyên các luồng chức năng đã kết nối backend; đợt trùng tu giao diện không tự ý thêm nghiệp vụ chưa được backend hỗ trợ.
- Giao diện được trùng tu cho toàn bộ sản phẩm theo từng nhóm màn hình, kiểm tra xong một nhóm trước khi chuyển sang nhóm tiếp theo.
- AI evaluator hiện là bản mô phỏng deterministic cho prototype.
- Gửi email tự động và mô hình AI thật nằm ngoài phạm vi MVP hiện tại.

## Brand Commitments

- Tên sản phẩm: EduCraft.
- Ngôn ngữ giao diện chính: tiếng Việt.
- Bộ giao diện Stitch tại `E:/Download/stitch_duplicate_of_educraft_draft_ui.zip` là nguồn tham chiếu hình ảnh cho đợt redesign.
- Phong cách định hướng: hiện đại, học thuật, sáng sủa, dễ đọc và ưu tiên trạng thái tiến trình.

## Evidence on Hand

- Mã nguồn và luồng nghiệp vụ đang hoạt động trong repository hiện tại.
- README mô tả các luồng đã kết nối frontend với backend.
- Bốn màn hình Stitch tham chiếu: quản lý tài khoản, chi tiết lớp/import Excel, giáo viên chấm bài và học sinh nộp bài.
- Bộ Stitch có một tài liệu design token tham khảo, nhưng các nội dung nghiệp vụ minh họa trong đó không mặc nhiên là chức năng thật của EduCraft.

## Product Principles

1. Giữ cho luồng công việc của từng vai trò rõ ràng và không lẫn quyền.
2. Giáo viên luôn là người chốt kết quả cuối cùng.
3. Trạng thái dữ liệu và bước tiếp theo phải dễ nhận biết bằng cả chữ lẫn màu.
4. Giao diện mới phải giữ nguyên hành vi đã được kiểm thử.
5. Ưu tiên mã nguồn đơn giản, sạch và dễ hiểu đối với sinh viên.

## Accessibility & Inclusion

- Các trạng thái không chỉ được biểu đạt bằng màu sắc.
- Điều khiển phải dùng được bằng bàn phím và có focus rõ ràng.
- Nội dung chính phải đọc được trên desktop, tablet và mobile.
