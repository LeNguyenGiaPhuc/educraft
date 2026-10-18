# EduCraft — Product Context

<!-- impeccable:product-schema 1 -->

## Platform

web

## Scope and Authority

Tài liệu ghi nhận sản phẩm để chuẩn bị thiết kế lại **không gian Teacher sau đăng nhập**. Nguồn xác nhận là mô tả của chủ dự án, câu trả lời về giới hạn tên bài kiểm tra và source tại commit `f2a4f9a`, được đọc ngày 14/10/2026.

Các khả năng bên dưới đã được xác minh ở mức source; tài liệu không khẳng định đã kiểm chứng deployment, dữ liệu Supabase thật hoặc chất lượng model trên ảnh thật. README là tài liệu định hướng; chi tiết hành vi được đối chiếu với frontend, backend và migration.

Lượt `init` chỉ tạo tài liệu sản phẩm. Thiết kế mới phải giữ logic nghiệp vụ, API, phân quyền và chức năng đang có. Admin, Student, landing và đăng nhập nằm ngoài phạm vi thiết kế này; chúng được nhắc đến để làm rõ phụ thuộc của Teacher.

## Users

- Người dùng chính: giáo viên Việt Nam đã đăng nhập bằng tài khoản Teacher và làm việc với các lớp được Admin phân công.
- Công việc: quản lý bài kiểm tra bài ghi, chuẩn bị ảnh bài mẫu, xem từng lần nộp của học sinh, sử dụng gợi ý AI khi cần và chốt nhận xét/kết quả.
- Admin quản lý tài khoản, lớp, phân công giáo viên và thành viên lớp. Teacher không được nhận thêm các chức năng quản trị đó trong redesign.
- Student nộp ảnh bài ghi vào bài kiểm tra được phép truy cập và xem kết quả đã chốt. Teacher sử dụng dữ liệu này; không tạo bài nộp thay học sinh.

## Product Purpose

EduCraft hỗ trợ giáo viên đối chiếu nội dung bài ghi của học sinh với bài mẫu do giáo viên cung cấp. Đây là công cụ làm việc thực tế, không phải một landing page hoặc giao diện chỉ để trình diễn.

Một lượt làm việc thành công là: giáo viên mở đúng lớp/bài kiểm tra, chọn đúng học sinh và lần nộp, xem được tài liệu đối chiếu, hiểu phần nào là gợi ý AI, nhập quyết định và nhận xét của mình rồi lưu kết quả thành công. Khi AI không sử dụng được, giáo viên vẫn có luồng đánh giá thủ công.

## Positioning

Nguồn đối chiếu là các ảnh bài mẫu gắn với chính bài kiểm tra, không phải một kho tri thức chung. AI đưa ra độ bao phủ, nội dung còn thiếu và nhận xét nháp; quyền quyết định cuối cùng thuộc giáo viên. Việc chốt được ghi nhận riêng với người đánh giá, nhận xét, kết quả và thời gian chốt.

Độ bao phủ nội dung không được diễn đạt thành điểm học lực hoặc kết luận về năng lực học sinh. Không có căn cứ để quảng bá độ chính xác AI, tốc độ xử lý cố định hay khả năng đọc chữ viết tay hoàn hảo.

## Operating Context

### Luồng làm việc đã có

1. Vào Tổng quan và xem các lớp được phân công.
2. Mở lớp để xem bài kiểm tra hoặc danh sách học sinh.
3. Tạo bài kiểm tra với lớp, tên bài, hạn nộp và ngưỡng đạt; chỉnh sửa khi cần.
4. Thêm, xem, thay thế hoặc xóa ảnh bài mẫu của bài kiểm tra.
5. Chọn một lượt nộp theo học sinh và số lần nộp; mở ảnh bài nộp.
6. Xem đánh giá đã lưu, hoặc chủ động bấm “Phân tích bằng AI” nếu chưa có đánh giá.
7. Xem gợi ý/bản chép/nội dung chưa chắc chắn; chọn kết quả và chỉnh nhận xét.
8. Bấm “Chốt kết quả”; lượt đã chốt trở thành chỉ đọc trong UI hiện tại.

### Route và màn hình Teacher

| Route | Component chính | Công việc |
|---|---|---|
| `/teacher` | `DashboardPage.jsx` | Xem lớp được phân công; đi tới tạo bài kiểm tra |
| `/assignments/new` | `CreateAssignmentPage.jsx` | Tạo bài trong một lớp được phân công |
| `/classes/:classId` | `ClassDetailPage.jsx` | Xem tab Bài kiểm tra và Học sinh |
| `/classes/:classId?tab=students` | `ClassDetailPage.jsx` | Mở lớp với tab Học sinh được chọn ban đầu |
| `/classes/:classId/assignments/new` | `CreateAssignmentPage.jsx` | Tạo bài từ ngữ cảnh lớp |
| `/classes/:classId/assignments/:assignmentId` | `AssignmentDetailPage.jsx` | Chỉnh bài kiểm tra, quản lý bài mẫu, chọn lượt nộp, xem AI và chốt |

Chỉnh sửa, upload, AI và chốt hiện là các vùng/trạng thái trong trang chi tiết; không có route riêng cho từng thao tác. Shell hiện có thương hiệu EduCraft, nhãn “Không gian giáo viên”, hai mục “Tổng quan”/“Tạo bài kiểm tra”, danh tính giáo viên và Đăng xuất. Không suy diễn rằng có menu lịch, tin nhắn hoặc cài đặt.

### Nền tảng kỹ thuật

Frontend là React/Vite với React Router; backend là Express, Zod và Supabase JS; dữ liệu dùng PostgreSQL/Supabase và ảnh dùng private Supabase Storage. AI được gọi qua backend bằng provider Gemini hoặc Ollama được chọn trong cấu hình.

`frontend/` chứa trang, component, state và dịch vụ gọi HTTP; `backend/src/modules/` chia trách nhiệm theo nghiệp vụ; `supabase/migrations/` chứa schema, policy và RPC; `backend/tests/`, các test frontend và `supabase/tests/` chứa bằng chứng kiểm thử. `docs/` là ghi chú local theo README/.gitignore, không phải nguồn bắt buộc có trong checkout khác.

## Capabilities and Constraints

### Lớp học và quyền truy cập

- Tổng quan có tên giáo viên, danh sách lớp, học kỳ/năm học, trạng thái lớp, số học sinh và số bài kiểm tra.
- Chi tiết lớp có thông tin môn/lớp và hai tab Bài kiểm tra, Học sinh. Teacher chỉ xem danh sách học sinh.
- `RoleRoute` bảo vệ vai trò ở frontend; `RequireTeacherClass` kiểm tra ngữ cảnh lớp. Backend xác thực, kiểm tra vai trò và quan hệ `teacher_id` với lớp; UI không thay thế kiểm tra quyền backend.
- Giữ các trạng thái đang kiểm tra phiên, đang kiểm tra quyền, không tìm thấy và không được phép truy cập.

### Bài kiểm tra

- Form tạo có tên bài, lớp, ngày/giờ hạn nộp và ngưỡng đạt. Ngưỡng nằm trong 0–100%, mặc định 80%.
- Form Teacher hiện gửi `status: OPEN` khi tạo. Backend mặc định `DRAFT` nếu caller khác không gửi trạng thái; không đổi hành vi tạo của Teacher thành lưu nháp.
- Chỉnh sửa có tên, hạn nộp, ngưỡng và trạng thái `DRAFT`, `OPEN`, `CLOSED`; không có thao tác chuyển lớp trong form sửa hiện tại.
- Backend yêu cầu bài ở trạng thái `OPEN` có hạn nộp trong tương lai. Deadline của Teacher được quy đổi theo UTC+07:00; hạn nộp của bài kiểm tra được hiển thị với múi giờ Việt Nam.
- Chỉ xóa bài kiểm tra chưa có bài mẫu và chưa có lượt nộp. UI khóa nút kèm lý do; backend cũng từ chối khi có dữ liệu. Giữ bước xác nhận xóa và lỗi từ server.
- Giới hạn tên chưa thống nhất; xem phần “Known Gaps and Open Decisions”.

### Ảnh bài mẫu và bài nộp

- Một bài kiểm tra có nhiều ảnh bài mẫu. Mỗi thao tác thêm/thay hiện gửi một file; thay một bài mẫu không thay toàn bộ danh sách.
- Bài mẫu chấp nhận JPEG/JPG, PNG, WebP, tối đa 5 MiB/file (`5 * 1024 * 1024` byte, UI ghi 5 MB). Backend kiểm tra dung lượng, MIME khai báo và chữ ký byte. Không thêm upload PDF hoặc công cụ chỉnh sửa ảnh.
- UI giữ tên file gốc, thời gian upload, link xem, thêm, thay, xóa, hủy, trạng thái lưu và phản hồi thành công/lỗi. Xóa bài mẫu có xác nhận.
- File được lưu ở private buckets `reference-materials` và `student-submissions`; link xem có hạn dùng do backend tạo. Không biến link đó thành URL công khai vĩnh viễn hoặc đưa service-role key ra client.
- Teacher xem danh sách lượt nộp theo `submission.id`, danh tính học sinh và `attempt_number` từ backend. Không đánh lại số lần nộp hoặc gộp mất các lượt riêng.
- Adapter Teacher hiện dùng file đầu tiên trong `submission.files` để hiển thị và mở ảnh. Không khẳng định đã có trình xem nhiều trang hay công cụ chỉnh sửa ảnh.

### AI đánh giá

- Khi chọn lượt nộp, UI đọc kết quả AI đã lưu bằng GET; việc mở trang không tự phát sinh một lần phân tích model mới. Khi chưa có kết quả, giáo viên chủ động bấm Phân tích bằng AI để POST.
- Trước khi chạy, UI thông báo ảnh bài mẫu/bài nộp được gửi tới dịch vụ AI và nhắc về chính sách dữ liệu của nhà trường. Provider có thể là local hoặc hosted; không quảng bá mọi cấu hình đều giữ ảnh trên máy local.
- Backend cần có ít nhất một bài mẫu và một ảnh bài nộp. Giới hạn mặc định cho một lượt AI là 4 ảnh bài mẫu và tổng ảnh 15 MiB, có thể cấu hình. Đây là giới hạn đánh giá, không phải giới hạn số bài mẫu được upload.
- AI tạo `coverage_score`, `confidence`, `missing_content`, `feedback_draft`, bản chép mẫu/nộp và `uncertain_content`; kết quả được kiểm tra schema. Metadata có provider, model, prompt version và latency.
- Backend quyết định lại `suggested_status`: `coverage_score >= coverage_threshold` là `COMPLETED`, thấp hơn là `NEEDS_COMPLETION`. Không dùng confidence thay độ bao phủ hoặc tự đổi quy tắc thành chốt theo confidence.
- `confidence` là số model cung cấp; chưa có bằng chứng hiệu chỉnh để gọi nó là phần trăm chính xác đã kiểm chứng.
- Thành công AI chuyển lượt nộp sang `REQUIRES_REVIEW`, không sang `FINALIZED`. Kết quả đã lưu được trả lại khi gọi lại; hiện không có thao tác bắt buộc tái phân tích một kết quả đã lưu. Lượt đã chốt bị backend từ chối phân tích lại.
- Giữ loading, chưa chạy, lỗi/timeout/dữ liệu không hợp lệ, thử lại và kết quả đã có. API hiện không cung cấp phần trăm tiến độ hoặc thời gian còn lại; UI không được tự bịa các con số đó.
- Runtime hiện dùng Gemini/Ollama qua interface provider; không có RAG hoặc chatbot đang được wiring vào luồng Teacher.

### Nhận xét và chốt

- Form giáo viên có kết quả cuối `COMPLETED` hoặc `NEEDS_COMPLETION` và nhận xét không rỗng. Có thể dùng gợi ý AI làm bản nháp rồi chỉnh sửa; không ghi đè nhận xét giáo viên đã nhập chỉ vì AI tải xong.
- AI là tùy chọn: khi chưa chạy hoặc thất bại, form nhận xét/chốt vẫn tồn tại. Không bắt giáo viên chờ AI để chốt thủ công.
- `finalize_submission_review` kiểm tra giáo viên được phân công, ghi `teacher_reviews` và đổi trạng thái submission thành `FINALIZED` trong cùng transaction. Chốt lại cùng lượt đã chốt bị từ chối.
- UI khóa chọn kết quả/nhận xét sau khi chốt và hiển thị trạng thái Đã chốt. Giữ phản hồi đang lưu, lỗi và thành công.
- Backend có trường `final_score` tùy chọn, nhưng form Teacher hiện không nhập/gửi điểm. Chủ dự án xác nhận không thêm chức năng điểm số; giữ nguyên contract backend hiện có.

### API hiện hữu phải bảo toàn

| Mục đích | Method và path |
|---|---|
| Xem lớp | `GET /api/teacher/classes`, `GET /api/teacher/classes/:classId` |
| Liệt kê/tạo bài kiểm tra | `GET`, `POST /api/classes/:classId/assignments` |
| Đọc/sửa/xóa bài kiểm tra | `GET`, `PATCH`, `DELETE /api/assignments/:assignmentId` |
| Liệt kê/thêm bài mẫu | `GET`, `POST /api/assignments/:assignmentId/references` |
| Thay/xóa bài mẫu | `PUT`, `DELETE /api/assignments/:assignmentId/references/:referenceId` |
| Liệt kê lượt nộp | `GET /api/assignments/:assignmentId/submissions` |
| Đọc một lượt nộp | `GET /api/submissions/:submissionId` |
| Đọc/chạy đánh giá AI | `GET`, `POST /api/submissions/:submissionId/ai-evaluation` |
| Chốt nhận xét/kết quả | `PATCH /api/submissions/:submissionId/review` |

Giữ định danh, body, dữ liệu response, cookie phiên và hành vi lỗi của các API. Thay nhãn hiển thị không được thay mã enum hoặc mở rộng quyền.

## Brand Commitments

- Tên sản phẩm: EduCraft; phạm vi hiện tại được gọi là Không gian giáo viên.
- Yêu cầu đã xác nhận: toàn bộ nội dung UI của thiết kế mới bằng tiếng Việt, dùng thuật ngữ rõ và phù hợp giáo viên Việt Nam.
- Phân biệt “bài mẫu”, “bài nộp”, “lần nộp”, “gợi ý AI”, “ngưỡng đạt” và “kết quả giáo viên chốt”.
- `COMPLETED` có thể hiển thị “Hoàn thành”; `NEEDS_COMPLETION` là “Cần bổ sung”; `REQUIRES_TEACHER_REVIEW` là “Cần giáo viên xem lại”. Đây là yêu cầu Việt hóa nhãn, giữ nguyên enum API; chưa sửa UI trong init.
- Source có wordmark EduCraft, dấu E và favicon. Init không đặt bảng màu, font, bố cục hoặc hệ component mới và không thay `DESIGN.md`.

## Evidence on Hand

| Nguồn | Điều đã xác minh |
|---|---|
| `README.md`, `frontend/package.json`, `backend/package.json` | Mục đích repo, stack, cấu trúc và lệnh chạy/test |
| `frontend/src/App.jsx`, `components/AppShell.jsx`, `components/RoleRoute.jsx`, `components/RequireTeacherClass.jsx` | Route, shell, vai trò và bảo vệ ngữ cảnh lớp |
| `frontend/src/pages/{DashboardPage,ClassDetailPage,CreateAssignmentPage,AssignmentDetailPage}.jsx` | Các màn và state Teacher hiện có |
| `frontend/src/components/assignment-detail/` | Sửa bài, upload/thay/xóa mẫu, chọn lượt nộp, AI và chốt |
| `frontend/src/services/`, `frontend/src/data/teacherSubmissionView.js`, `frontend/src/data/assignmentDeadline.js` | Contract HTTP, danh tính lượt nộp và deadline |
| `backend/src/modules/{classes,assignments,submissions,storage}/` | Quyền trên lớp, nghiệp vụ bài kiểm tra, file, lượt nộp và chốt |
| `backend/src/modules/ai-evaluations/`, `backend/src/config/env.js`, `backend/src/createDependencies.js` | Provider, prompt/schema, giới hạn đầu vào, ngưỡng đạt và lưu gợi ý |
| `supabase/migrations/202609140005_finalize_submission_review_rpc.sql` | Transaction chốt và kiểm tra quyền trong database |
| `backend/tests/`, `frontend/src/**/*.test.js`, `supabase/tests/` | Có kiểm thử nghiệp vụ/API/UI/RPC; không dùng số test trong README làm kết quả chạy mới |

Không ghi nhận số người dùng, khách hàng, testimonial, accuracy benchmark, latency SLA hoặc độ sẵn sàng production từ lần đọc source này. Không chép khóa API, tài khoản học sinh thật hoặc nội dung `.env` vào tài liệu thiết kế.

## Product Principles

1. Quyết định của giáo viên luôn phân biệt với gợi ý AI; chỉ hành động chốt mới tạo kết quả cuối cùng.
2. Tài liệu đối chiếu, học sinh và lần nộp phải giữ đúng ngữ cảnh, định danh và nguồn dữ liệu.
3. Luồng thủ công vẫn có ích khi model hoặc network gặp lỗi; lỗi không được làm mất nhận xét đang viết.
4. Redesign phục vụ thao tác thực tế, giữ API và phân quyền; không tự mở rộng sản phẩm bằng chatbot, điểm số, gamification hoặc tính năng chưa được duyệt.
5. Nhãn và số liệu phải đúng bản chất dữ liệu; không bịa tiến độ, độ chính xác, trạng thái xử lý hoặc khả năng chưa có.

## Accessibility & Inclusion

Source hiện có label cho form, aria cho selected/loading/error, điều hướng và hỗ trợ reduced motion trong CSS. Thiết kế sau cần bảo toàn ý nghĩa đó, hỗ trợ đọc chữ Việt có dấu, focus bàn phím, thao tác trên màn hình nhỏ và tên/nhận xét dài. Không diễn đạt trạng thái chỉ bằng màu. Chưa có kết quả audit để khẳng định đạt một mức chứng nhận accessibility cụ thể.

## Known Gaps and Open Decisions

- **Giới hạn tên bài kiểm tra:** frontend tạo giới hạn 120 ký tự; backend validator giới hạn 160; form sửa không đặt `maxLength` và dựa vào backend. Chủ dự án đã chọn ghi cả hai như hiện trạng và đánh dấu chưa thống nhất. Init không chọn một giới hạn chung hoặc sửa validation. Cần quyết định riêng trước thay đổi quy tắc này.
- **Ngôn ngữ:** UI hiện còn `Completed`, `Needs Completion`, `Requires Teacher Review`. Yêu cầu thiết kế mới là tiếng Việt; chưa được triển khai trong bước này.
- **Tiến độ nộp:** `ClassDetailPage` dùng tổng số lượt nộp (`submissions.length`) trên sĩ số nhưng nhãn là “học sinh đã nộp”. Nhiều lần nộp có thể làm tổng vượt sĩ số. Ghi nhận đây là lệch nghĩa hiện trạng; không khẳng định đã có số học sinh phân biệt hoặc tự sửa cách đếm.
- **Bài nộp gần nhất trong roster:** `teacherClassService` frontend đang gán “Chưa có dữ liệu”, chưa tính bài gần nhất. Không thiết kế dựa trên giả định trường này đã được cung cấp đầy đủ.
- **Bản chép AI:** prompt Gemini yêu cầu trích xuất nguyên văn, còn Ollama hiện yêu cầu tóm tắt tối đa 120 từ/trang. UI đang gọi cả hai là bản chép. Không khẳng định mọi provider giữ nguyên văn đầy đủ; thay pipeline là quyết định khác, ngoài init/redesign UI.
- **Kết quả AI đã lưu:** hiện không có cơ chế invalidation được xác minh khi thay bài mẫu; POST có thể trả lại evaluation cũ. Không hứa rằng thay bài mẫu tự cập nhật AI.
- **Thời gian:** deadline đã cố định múi giờ Việt Nam; timestamp bài mẫu/lượt nộp hiện format theo múi giờ trình duyệt. Không giả định tất cả timestamp đã chuẩn hóa cùng cách hiển thị.
- **Triển khai và dữ liệu:** chưa xác minh hệ thống production, latency trên phần cứng thực, calibration của confidence hoặc benchmark ảnh. Các tên lớp/người dùng trong thiết kế minh họa phải được ghi là dữ liệu giả lập.

Các điểm này là giới hạn đã quan sát hoặc quyết định còn mở, không phải yêu cầu tự động sửa trong lượt thiết kế. Mọi thay đổi nghiệp vụ phải được chủ dự án xác nhận riêng.
