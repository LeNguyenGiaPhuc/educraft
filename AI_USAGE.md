AI Usage Log — Phúc
Nền tảng backend, xác thực và phân quyền
Tool: OpenAI Codex
Key prompt (tóm tắt): Dựng Express API cho EduCraft, thống nhất phản hồi và lỗi, xác thực phiên Supabase, kiểm tra vai trò và trạng thái tài khoản; tạo schema và chính sách truy cập dữ liệu.
Codex hỗ trợ tạo cấu trúc app/server, middleware, bộ kiểm tra dữ liệu đầu vào, Auth API và các migration Supabase ban đầu. Các lớp này là nền để Teacher, Student và Admin gọi API theo cùng một cách.
Sau khi code được tạo, em đối chiếu cách lấy danh tính từ phiên đăng nhập với profile EduCraft, kiểm tra tài khoản phải ACTIVE và quyền truy cập phải dựa trên role của profile. Em cũng rà lại các trường hợp thiếu phiên, sai vai trò, dữ liệu không hợp lệ và lỗi backend để không chỉ dựa vào việc ẩn nút ở frontend.
Các thay đổi chính nằm trong các commit 4f82f5f, 11dcb67, 7db34f0, b1bafbd, 3d3945e và f7cae3e. Các file tiêu biểu là backend/src/app.js, backend/src/middleware/authenticate.js, backend/src/middleware/authorize.js, backend/src/modules/auth/ và supabase/migrations/202609140001_initial_schema.sql, 202609140002_role_based_access.sql. Các test Auth và RLS được thêm trong backend/tests/ và supabase/tests/.
Kết nối luồng Teacher với backend thật
Tool: OpenAI Codex
Key prompt (tóm tắt): Cho giáo viên xem đúng lớp được phân công, danh sách học sinh và bài kiểm tra; kết nối trang tổng quan, chi tiết lớp, tạo bài và duyệt bài với API thật, giữ kiểm tra quyền ở backend.
Codex hỗ trợ tạo teacherClass route, controller, service và frontend service; sau đó kết nối các trang Teacher với dữ liệu từ backend. Khi mở một lớp, frontend lấy classId từ URL rồi gọi API; service backend chỉ trả lớp có id tương ứng và teacher_id là giáo viên đang đăng nhập.
Em rà lại đường đi từ route frontend qua service/API đến backend, trạng thái loading và error, và trường hợp giáo viên tự đổi classId trên URL. Nếu lớp không thuộc giáo viên đó, backend trả lỗi thay vì gửi dữ liệu lớp. Em cũng kiểm tra số lượng học sinh, bài kiểm tra và dữ liệu chi tiết lớp lấy từ đúng lớp được phân công.
Thay đổi chính nằm trong commit 16ba0e1; phần điều chỉnh định dạng hạn nộp gửi tới API ở commit 7d96730. Các file tiêu biểu gồm backend/src/modules/classes/teacherClassRoutes.js, teacherClassController.js, teacherClassService.js, frontend/src/services/teacherClassService.js, frontend/src/components/RequireTeacherClass.jsx và các trang DashboardPage.jsx, ClassDetailPage.jsx, CreateAssignmentPage.jsx, AssignmentDetailPage.jsx. Có test cho teacherClassService ở cả backend và frontend.

Đánh giá ảnh bài nộp bằng AI thật
Tool: OpenAI Codex
Key prompt (tóm tắt): Nhận ảnh bài học sinh và bài mẫu từ private storage theo quyền của giáo viên, dùng provider AI để đọc và đối chiếu, kiểm tra kết quả theo schema, lưu gợi ý để giáo viên duyệt; xử lý lỗi và giới hạn đầu vào.
Codex hỗ trợ định nghĩa cấu trúc kết quả AI, provider Gemini và Ollama, phần nạp ảnh được phép truy cập, cách chọn provider theo cấu hình và service lưu kết quả. Việc gọi AI là thao tác chủ động của giáo viên. Kết quả gồm nội dung đọc được, mức bao phủ, phần còn thiếu, độ tin cậy và nháp phản hồi; đây là gợi ý, không tự chốt kết quả học sinh.
Sau implementation ban đầu, em rà lại ảnh được lấy từ submission/reference hợp lệ thay vì đường dẫn do client tùy ý cung cấp, dữ liệu model phải qua kiểm tra cấu trúc, giới hạn kích thước ảnh và lỗi provider phải có phản hồi rõ ràng. Em kiểm tra trạng thái submission chuyển qua PROCESSING rồi REQUIRES_REVIEW, đồng thời giữ quyết định cuối cùng ở bước Teacher finalize do luồng submission của nhóm cung cấp.
Các commit chính gồm 3d3ead7, 96d8ad5, 8bca97a, 03b4bc9, 6561b92 và c77d2d0. Các file tiêu biểu là backend/src/modules/ai-evaluations/aiEvaluationSchema.js, aiEvaluationInputService.js, aiEvaluationService.js, providers/geminiAiProvider.js và providers/ollamaAiProvider.js. Các test tương ứng kiểm tra provider, input, cấu trúc dữ liệu và service. Phần RAG từng được thử trong lịch sử phát triển nhưng đã bị loại bỏ ở commit f2a4f9a, nên không được trình bày như chức năng hiện tại.
Ngưỡng đạt và quyền quyết định của giáo viên
Tool: OpenAI Codex
Key prompt (tóm tắt): Dùng ngưỡng đạt của từng bài kiểm tra để xác định trạng thái gợi ý từ điểm bao phủ; không tin trực tiếp trạng thái do model tự trả về và không để AI thay giáo viên chốt kết quả.
Codex hỗ trợ tách quy tắc ngưỡng đạt ra thành coveragePolicy và đưa quy tắc đó vào aiEvaluationService khi lưu cũng như khi đọc kết quả. Ví dụ, bài đặt ngưỡng 80% mà AI ước tính bao phủ 79% thì gợi ý phải là NEEDS_COMPLETION, kể cả model ghi COMPLETED.
Em đối chiếu điểm bao phủ, ngưỡng đạt và trạng thái gợi ý; thêm test cho điểm dưới, bằng và trên ngưỡng, cũng như dữ liệu điểm hoặc ngưỡng không hợp lệ. Gợi ý AI chỉ là thông tin để Teacher xem xét; nhận xét và kết quả cuối cùng vẫn do Teacher chọn và lưu qua luồng finalize.
Thay đổi chính nằm trong commit bd576e2. Các file quan trọng là backend/src/modules/ai-evaluations/coveragePolicy.js, aiEvaluationService.js và backend/tests/coveragePolicy.test.js, aiEvaluationService.test.js.

Giao diện Teacher và sự thống nhất giữa ba vai trò
Tool: OpenAI Codex
Key prompt (tóm tắt): Hoàn thiện cách trình bày workspace Teacher, Student và Admin theo Kinetic Field Notes; giữ API, quyền truy cập và luồng nghiệp vụ hiện có; bổ sung các trạng thái chờ, lỗi và kiểm thử hồi quy.
Codex hỗ trợ xây dựng lớp trình bày Teacher Overview, Class Detail, Assignment Review, sau đó là Student Dashboard/Submission và Admin Dashboard/registry. Phần của em ở đây là thiết kế, kết nối và kiểm tra các màn hình trong các đợt tích hợp, không nhận là tác giả của toàn bộ service nghiệp vụ ban đầu do Kha và Thông triển khai.
Sau khi code được tạo, em rà lại nút và form có gọi đúng service, dữ liệu cũ không ghi đè phản hồi mới, trạng thái đang tải không hiển thị dữ liệu sai quyền, và các thay đổi CSS dùng phạm vi theo vai trò để không làm hỏng workspace khác. Các bài test hồi quy được bổ sung cho Teacher review, Student submission session và Admin registry.
Các đợt giao diện chính nằm trong commit 1c43987, e6faf6f, e1f3734 và d65d045. Các file tiêu biểu là frontend/src/components/teacher/, frontend/src/components/assignment-detail/reviewSession.js, frontend/src/pages/StudentDashboardPage.jsx, StudentSubmissionPage.jsx, AdminAccountsPage.jsx, AdminClassesPage.jsx, frontend/src/data/adminRegistry.js và các stylesheet role-scoped tương ứng.

Landing và trải nghiệm đăng nhập dùng chung
Tool: OpenAI Codex
Key prompt (tóm tắt): Tạo một hero tương tác kể luồng giao bài, nộp bài, phản hồi; đồng bộ màu và trạng thái chung nhưng giữ nguyên cơ chế đăng nhập, điều hướng và quyền truy cập.
Codex hỗ trợ biên tập nội dung giới thiệu, xây dựng LandingShowcase với ba bước tương tác và CSS cho hồ sơ nhiều lớp. Phần đăng nhập tiếp tục dùng dialog hiện có; thay đổi tập trung ở presentation của Landing và các common state.
Em rà lại CTA mở đúng dialog, các bước tương tác có nội dung tương ứng, không còn liên kết đến section đã bỏ và nội dung giới thiệu không tuyên bố quá khả năng AI. Em cũng kiểm tra các trạng thái loading/error và focus của phần dùng chung trong các test liên quan.
Thay đổi chính nằm trong commit 13cd4c4 và d65d045. Các file tiêu biểu là frontend/src/components/landing/LandingShowcase.jsx, frontend/src/styles/landing-dossier.css, frontend/src/pages/LoginPage.jsx, frontend/src/components/CommonPendingState.jsx và frontend/src/styles/common-kinetic.css.

AI Checker và nhật ký sử dụng AI
Tool: OpenAI Codex
Key prompt (tóm tắt): Thêm bước checker độc lập để kiểm tra chéo gợi ý của evaluator; lưu trạng thái và lý do cần giáo viên xem lại, ghi nhận lượt gọi model, lỗi, độ trễ và token; cung cấp số liệu tổng hợp cho Admin.
Codex hỗ trợ bổ sung schema checker, lời gọi checker trong Gemini/Ollama provider, luồng evaluator → checker → lưu kết quả và bộ ghi usage. Checker có thể nêu điểm mâu thuẫn hoặc bằng chứng chưa chắc chắn; checker không tự quyết định kết quả cuối cùng. Nếu checker lỗi, service ghi lỗi và vẫn xử lý gợi ý evaluator để Teacher xem lại.
Em rà lại thứ tự hai lượt gọi AI, trạng thái khi checker thiếu hoặc trả JSON không hợp lệ, việc kết quả phải gắn đúng submission, và trường hợp lỗi ghi usage không được làm mất kết quả đánh giá đã tạo. Usage được ghi theo từng interaction với stage, provider, model, trạng thái, token, độ trễ và chi phí nếu nhà cung cấp trả dữ liệu; Admin ACTIVE mới được xem thống kê. Em cũng xem bộ ca eval cho phản hồi có căn cứ, nội dung thiếu, prompt injection, ngoài phạm vi và câu trả lời không chắc chắn. Các ca này là kiểm thử cho checker, không phải bằng chứng mọi ảnh viết tay ngoài đời đều được xử lý hoàn hảo.
Thay đổi chính nằm trong commit ac5451a. Các file quan trọng gồm backend/src/modules/ai-evaluations/aiEvaluationSchema.js, aiEvaluationService.js, aiUsageService.js, aiUsageRoutes.js, backend/evals/aiCheckerCases.js, backend/scripts/runAiCheckerEval.js và migration supabase/migrations/202610160001_ai_checker_usage.sql. Các test cho checker, service, provider, usage route và usage service nằm trong backend/tests/.

Hai trường hợp code do AI hỗ trợ chưa đạt

Trường hợp 1 — Timeout Gemini truyền sai vị trí
Ở phiên bản đầu, tín hiệu hủy được đặt trong nội dung request gửi tới ai.interactions.create. Khi đối chiếu với cách SDK nhận tùy chọn của lời gọi, em phát hiện cách này không bảo đảm timeout được SDK áp dụng như dự kiến. Nếu model phản hồi chậm, người dùng có thể chờ lâu hơn hoặc việc hủy không tác động đúng lời gọi mạng.
Cách phát hiện: Đọc lại lời gọi provider và thêm test ghi lại request cùng options mà SDK nhận cho cả lượt đọc ảnh và lượt tạo gợi ý.
Cách sửa: Đưa timeout vào tham số options của SDK dưới dạng { timeout: timeoutMs }, không đặt signal trong request body. Test xác nhận cả hai lời gọi đều có options đúng và request không chứa signal.
Thay đổi nằm trong commit a26eabb, tại backend/src/modules/ai-evaluations/providers/geminiAiProvider.js và backend/tests/geminiAiProvider.test.js.

Trường hợp 2 — Trạng thái AI chưa tuân theo ngưỡng đạt của bài
Ở phiên bản đầu, service có thể lưu và trả trực tiếp suggested_status do model cung cấp. Ví dụ model trả COMPLETED cho mức bao phủ 79% dù giáo viên đặt ngưỡng 80%; như vậy gợi ý trái với quy tắc của bài kiểm tra.
Cách phát hiện: Đối chiếu kết quả lưu với ngưỡng của assignment và tạo test có điểm bao phủ 79%, ngưỡng 80%, model đề xuất COMPLETED.
Cách sửa: Đọc coverage_threshold của assignment, kiểm tra giá trị hợp lệ rồi tính lại suggested_status ở backend. Quy tắc này được áp dụng trước khi lưu và khi trả một evaluation đã có; test xác nhận kết quả phải là NEEDS_COMPLETION. Teacher vẫn có quyền quyết định kết quả cuối cùng khi finalize.
Thay đổi nằm trong commit bd576e2, tại backend/src/modules/ai-evaluations/coveragePolicy.js, aiEvaluationService.js và backend/tests/aiEvaluationService.test.js.

AI Usage Log — Kha
Student Portal, Dashboard và quyền truy cập Assignment
Tool: OpenAI Codex
Key prompt (tóm tắt): Implement the Student portal and Dashboard flow. Keep Teacher and Admin flows unchanged, scope data to the current Student, add route guards and automated tests.
OpenAI Codex được sử dụng để hỗ trợ xây dựng Student portal, Dashboard, route cơ bản và luồng Student mở assignment.
Sau khi code được tạo, em kiểm tra lại cách hệ thống xác định Student hiện tại, quyền truy cập assignment, các trạng thái loading và error, cũng như cách assignment được truyền từ route xuống trang nộp bài.
Các thay đổi chính được thực hiện trong các commit cd010e4, d0b0758, 8a5fca4 và c6e56ac.
Các file chính liên quan gồm frontend/src/pages/StudentDashboardPage.jsx, frontend/src/components/RequireStudentAssignment.jsx và các file Student routing liên quan.
Nộp bài, nộp lại và lịch sử Submission
Tool: OpenAI Codex
Key prompt (tóm tắt): Implement the Student submission flow with deadline validation, file validation, resubmission, submission history and finalized-result display. Add tests for important edge cases.
Codex được sử dụng để hỗ trợ xây dựng luồng Student chọn ảnh, kiểm tra dữ liệu trước khi nộp, hỗ trợ nhiều lần nộp và hiển thị lịch sử submission.
Sau khi implementation ban đầu được tạo, em kiểm tra lại deadline của assignment, trạng thái assignment, multiple attempts và việc Student chỉ được nhìn thấy kết quả cuối cùng sau khi Teacher đã finalize.
Các thay đổi liên quan nằm trong các commit c6e56ac, 9626572 và 8757637.
Các file chính liên quan gồm frontend/src/pages/StudentSubmissionPage.jsx, frontend/src/data/assignmentDeadline.js và các file quản lý Student submission tương ứng.
Shared Image Storage và kiểm tra File
Tool: OpenAI Codex
Key prompt (tóm tắt): Implement shared private image storage for reference and Student submission images. Accept JPEG, PNG and WebP up to 5 MB, validate actual file content and generate storage paths on the server.
Codex được sử dụng để hỗ trợ xây dựng image upload middleware và storage service dùng chung cho ảnh bài mẫu và ảnh Student.
Sau khi code được tạo, em kiểm tra lại việc backend không chỉ tin MIME type do client khai báo mà còn kiểm tra signature bytes thực của JPEG, PNG và WebP.
Storage path cũng được hệ thống tự tạo thay vì cho client tự truyền đường dẫn. File sau đó được lưu trong private Supabase Storage.
Thay đổi chính nằm trong commit fc87246.
Các file chính là backend/src/modules/storage/imageUpload.js và backend/src/modules/storage/storageService.js.
Transactional Student Submission
Tool: OpenAI Codex
Key prompt (tóm tắt): Implement real Student submission persistence. Derive Student identity from authentication, allocate attempt numbers safely in the database, upload the image, save file metadata and roll back partial failures.
Codex được sử dụng để hỗ trợ xây dựng submission route, controller, service và Supabase RPC cho luồng submission thật.
Sau khi code được tạo, em kiểm tra lại để Student ID được lấy từ authentication thay vì request body. Database kiểm tra class membership, trạng thái assignment và deadline trước khi cho phép tạo submission.
Phần tạo attempt sử dụng transaction advisory lock để tránh trường hợp hai request cùng lúc tạo trùng attempt number.
Sau khi database tạo được submission, backend mới upload ảnh vào Storage và lưu metadata của file vào bảng submission_files.
Nếu upload file thất bại thì submission vừa tạo sẽ được rollback. Nếu file đã upload nhưng lưu metadata thất bại thì hệ thống xóa cả file và submission để tránh dữ liệu chỉ hoàn thành một phần.
Thay đổi chính nằm trong commit f8f4489.
Các file quan trọng gồm backend/src/modules/submissions/submissionService.js và supabase/migrations/202609140004_submission_attempt_rpc.sql.
Các test tương ứng cũng được thêm để kiểm tra quyền Student, attempt allocation, deadline, Storage failure và rollback.
Đọc Submission và kết quả Finalized
Tool: OpenAI Codex
Key prompt (tóm tắt): Add Student and Teacher submission read access and Teacher finalization while keeping Student-visible data safe and exposing Teacher results only after finalization.
Codex được sử dụng để hỗ trợ mở rộng backend để Student và Teacher đọc submission theo đúng quyền, đồng thời thêm luồng Teacher chốt kết quả.
Sau khi implementation được tạo, em kiểm tra lại để Student chỉ nhận teacher_result khi review đã được finalize.
Các lần nộp vẫn giữ đúng attempt number và Teacher có thể đưa ra quyết định cuối cùng độc lập với AI suggestion.
Các thay đổi chính nằm trong các commit 2ee6fb4 và de35ff1.
File chính liên quan là backend/src/modules/submissions/submissionService.js cùng với các submission routes, validators và tests tương ứng.
AI Evaluation Workflow ban đầu
Tool: OpenAI Codex
Key prompt (tóm tắt): Add an initial mock AI evaluation workflow for Teacher review, including route, controller, service, persistence and submission state transitions.
Codex được sử dụng để hỗ trợ xây dựng phiên bản AI evaluation đầu tiên gồm route, controller, service và automated tests.
Ở giai đoạn này hệ thống sử dụng mock evaluator để hoàn thiện trước luồng trạng thái của submission từ SUBMITTED sang PROCESSING và sau đó sang REQUIRES_REVIEW.
Em kiểm tra lại quyền Teacher, việc tái sử dụng evaluation đã tồn tại, cách lưu evaluation và cách phục hồi trạng thái submission nếu quá trình evaluation thất bại.
Thay đổi chính nằm trong commit d4de897.
Các file chính gồm backend/src/modules/ai-evaluations/aiEvaluationController.js, backend/src/modules/ai-evaluations/aiEvaluationRoutes.js và backend/src/modules/ai-evaluations/aiEvaluationService.js.
Phiên bản này được sử dụng làm nền tảng ban đầu trước khi nhóm tiếp tục tích hợp provider AI thật và các cơ chế AI nâng cao ở những giai đoạn sau.
Fix lỗi encoding tên file tiếng Việt cho Submission và Reference
Tool: OpenAI Codex
Key prompt (tóm tắt): Truy vết và sửa lỗi tên file tiếng Việt bị mojibake trong Student submission và Teacher reference; dùng một helper backend an toàn cho cả dữ liệu ghi mới và bản ghi cũ, không thay đổi Storage path hoặc quy tắc upload.
Trong quá trình manual integration test, các tên như `bài nộp - đồng ý.png` và `bài mẫu đối chiếu.jpg` hiển thị sai trên màn Student và Teacher. Khi truy vết luồng multipart, em xác định Multer có thể đưa tên UTF-8 qua `file.originalname` dưới dạng chuỗi đã bị giải mã theo latin1; giá trị này sau đó được lưu vào `original_filename`, nên cần xử lý ở cả đường ghi và đường đọc.
Codex hỗ trợ tách helper dùng chung `normalizeFilenameEncoding()` để chỉ khôi phục mojibake latin1 → UTF-8 khi phép chuyển đổi có thể round-trip. Helper giữ nguyên tên ASCII và Unicode/Vietnamese đã đúng, đồng thời không nhận kết quả chứa ký tự thay thế `�`.
Submission service áp dụng helper trước khi ghi `submission_files.original_filename` và khi project file cũ ra API Student/Teacher. Reference service áp dụng cùng helper trước khi ghi hoặc thay thế `reference_files.original_filename` và khi trả reference cũ cho Teacher. Nhờ đó bản ghi đã bị lỗi hiển thị đúng mà không cần migration.
Generated Storage path, nội dung file, MIME rule và giới hạn upload không thay đổi. Bộ focused test đạt 56/56, toàn bộ backend test đạt 305/305, lint đạt và manual test cho Student submission cùng Teacher reference đều đạt.
Các file chính gồm backend/src/modules/storage/filenameEncoding.js, backend/src/modules/submissions/submissionService.js, backend/src/modules/assignments/referenceService.js và các test service tương ứng.
Hai trường hợp AI-generated code chưa đạt
Trường hợp 1: Deadline ban đầu chưa đủ chính xác để quyết định quyền nộp bài
Trong implementation Student flow ban đầu, deadline chủ yếu được xử lý dưới dạng dữ liệu phục vụ hiển thị.
Cách xử lý này chưa đủ chắc chắn để quyết định Student còn được phép nộp bài hay không, đặc biệt ở đúng thời điểm deadline và trong trường hợp dữ liệu thời gian có hoặc không có timezone.
Khi review lại luồng và chạy các edge case test, em phát hiện cần có một giá trị thời gian chuẩn để dùng cho business logic.
Deadline sau đó được chuẩn hóa thành dueAt có timezone UTC+07:00.
Logic mới kiểm tra chính xác trường hợp Student nộp trước deadline, đúng deadline, sau deadline, dữ liệu thời gian không hợp lệ và assignment đã bị đóng.
Các automated tests cũng kiểm tra việc cùng một thời điểm được biểu diễn bằng UTC nhưng vẫn được format chính xác theo timezone của trường.
Thay đổi nằm trong commit c6e56ac.
Các file chính là frontend/src/data/assignmentDeadline.js và frontend/src/data/assignmentDeadline.test.js.
Cách phát hiện là review lại luồng deadline và kiểm thử các boundary case cũng như timezone case.
Cách sửa là sử dụng canonical dueAt có timezone cho business logic thay vì phụ thuộc vào chuỗi thời gian chỉ dùng để hiển thị.
Trường hợp 2: Middleware Teacher ở cấp Router chặn nhầm Student Submission
Trong một phiên bản backend, Assignment Router và Reference Router sử dụng authenticate và requireRole('TEACHER') ở cấp toàn router.
Vì các router này cùng được mount dưới /api và được đăng ký trước Submission Router, Student request như POST /api/assignments//submissions có thể đi qua Teacher middleware trước khi tới Submission Router.
Kết quả là một request Student hợp lệ có thể bị từ chối sai trước khi route submission thật sự được xử lý.
Khi kiểm tra cách các router được compose theo thứ tự production, em phát hiện authorization middleware đang được đặt ở phạm vi quá rộng.
Code sau đó được sửa bằng cách bỏ Teacher authorization ở cấp toàn router và đặt authenticate cùng requireRole('TEACHER') trực tiếp trên từng Teacher-only endpoint.
Sau thay đổi, integration test được bổ sung để kiểm tra Student submission vẫn tới đúng Submission Router, Student submission history vẫn hoạt động, Teacher assignment endpoint vẫn hoạt động, Student vẫn bị cấm truy cập Teacher assignment và reference endpoint, đồng thời các API route không tồn tại vẫn đi tới normal 404 handler.
Thay đổi nằm trong commit 1d80c3c.
Các file liên quan là backend/src/modules/assignments/assignmentRoutes.js, backend/src/modules/assignments/referenceRoutes.js và backend/tests/routerComposition.test.js.
Cách phát hiện là Student request không tới được Submission Router khi các router được compose giống môi trường production.
Cách sửa là giảm phạm vi authorization middleware từ toàn router xuống từng Teacher-only route và thêm integration tests để kiểm tra route composition.


AI Usage Log - Thông
Tool: OpenAI Codex
Đăng nhập, phân quyền và giao diện Admin ban đầu
Key prompt:
	“Xây dựng giao diện đăng nhập và quản lý. Gồm ba vai trò Admin, Teacher, Student, chặn truy cập trang không thuộc quyền và xây dựng giao diện quản trị ban đầu.”
Codex hỗ trợ tạo layout và các màn hình quản trị tài khoản, lớp học và danh sách học sinh.
Sau khi code được tạo, em đã rà soát cách xác định người dùng hiện tại, duy trì trạng thái sau khi tải lại trang và xử lý truy cập sai vai trò.
Thay đổi chính nằm trong commit 3528619.
Các file liên quan gồm AuthProvider.jsx, RoleRoute.jsx, LoginPage.jsx và các trang Admin. Dữ liệu giả lập phục vụ giai đoạn đầu trước khi chuyển sang API thật.
Backend quản lý tài khoản và lớp học
Key prompt:
	“Xây dựng API quản lý tài khoản và lớp học cho Quản trị viên. Kiểm tra dữ liệu đầu vào, vai trò và trạng thái hoạt động, hỗ trợ phân công giáo viên, thêm hoặc gỡ học sinh và xử lý xung đột dữ liệu.”
Codex sẽ giúp em xây dựng route, controller, validator và service cho các module tài khoản và lớp học.Các chức năng gồm xem, tạo, cập nhật, khóa, mở khóa và xóa tài khoản, tạo, cập nhật lớp, phân công giáo viên và quản lý thành viên.
Sau implementation ban đầu, em rà soát điều kiện ADMIN ACTIVE, email và mã lớp trùng, điều kiện giáo viên được phân công và dữ liệu thành viên lớp.
Số thứ tự học sinh được quản lý trong class_members vì một học sinh có thể thuộc nhiều lớp với số thứ tự khác nhau.
Implementation ban đầu nằm trong commit 3d962f4. Sau tích hợp, nhóm tiếp tục hoàn thiện việc đồng bộ Auth user với profile, kiểm tra lịch sử và xử lý import trong commit a5b6a1b.
Các file chính là [accountService.js] (D:/Nam3/NewTech/educraft/backend/src/modules/accounts/accountService.js), [classService.js] (D:/Nam3/NewTech/educraft/backend/src/modules/classes/classService.js) và các route, controller, validator tương ứng.

Tích hợp giao diện Admin với backend thật
Key prompt:
	“Bỏ dữ liệu ảo của các trang quản trị và thay bằng API thật. Giữ các luồng chức năng hiện có, hiển thị rõ trạng thái đang tải và lỗi, đồng thời tải lại dữ liệu sau khi thao tác thành công.”
Codex giúp kết nối Dashboard, quản lý tài khoản, danh sách lớp và chi tiết lớp với backend.
Các lời gọi API được đưa qua adminAccountService và adminClassService, thay vì truy cập Supabase trực tiếp trong page hoặc component.
Sau khi code được tạo, em đối chiếu đường dẫn, phương thức HTTP, dữ liệu gửi và phản hồi. Giao diện chỉ xác nhận thành công sau khi backend hoàn tất.
 Em cũng test thử các trường hợp chưa đăng nhập, sai quyền, không tìm thấy tài nguyên và xung đột dữ liệu.
Thay đổi chính nằm trong commit 92b84b9.
Các file liên quan gồm các trang Admin, [adminAccountService.js] (D:/Nam3/NewTech/educraft/frontend/src/services/adminAccountService.js), [adminClassService.js] (D:/Nam3/NewTech/educraft/frontend/src/services/adminClassService.js) và các component quản lý lớp, nhập học sinh.
Nhập danh sách học sinh từ Excel
Key prompt:
	“Xây dựng luồng nhập học sinh từ Excel với các cột STT, họ tên và email. Chuẩn hóa dữ liệu, báo lỗi theo dòng, cho phép xem trước và chỉ gửi danh sách hợp lệ đến backend. Không tạo tài khoản tạm hoặc lưu dữ liệu cục bộ thay cho backend.”
Codex sẽ giúp em xây dựng phần đọc Excel, kiểm tra dữ liệu, xem trước danh sách và gửi yêu cầu import.
Sau khi code được tạo, em rà soát việc chuẩn hóa email, kiểm tra trường bắt buộc, STT và email trùng. Dữ liệu có lỗi không được gửi như một danh sách hợp lệ.
Backend tiếp tục kiểm tra tài khoản đã tồn tại, vai trò, họ tên và thành viên lớp. Tài khoản STUDENT phù hợp có thể được tái sử dụng; email thuộc Admin hoặc Teacher bị từ chối.
Phần ban đầu nằm trong các commit 3d962f4 và 92b84b9. Nhóm hoàn thiện cơ chế transactional RPC và xóa bù Auth user trong commit a5b6a1b.
Các file chính gồm [StudentImportPanel.jsx] (D:/Nam3/NewTech/educraft/frontend/src/components/StudentImportPanel.jsx), [studentImport.js] (D:/Nam3/NewTech/educraft/frontend/src/data/studentImport.js), classService.js và migration 202609140006_admin_import_students_rpc.sql.

Tiến độ và khôi phục luồng phân tích AI
Key prompt:
	“Bổ sung tiến độ phân tích AI có xác thực cho màn giáo viên duyệt bài. Hiển thị các bước xử lý thực tế, giữ nháp nhận xét thủ công, xử lý hủy kết nối và phản hồi đến muộn.”
Codex được sẽ giúp xây dựng route stream, bộ đọc sự kiện và trạng thái tiến độ trong màn duyệt bài.
Giao diện nhận các bước input_ready, transcribed, evaluated, checked và persisted từ backend. Sự kiện hoàn tất chỉ được xác nhận sau khi kết quả đã lưu và bài chuyển sang trạng thái chờ giáo viên duyệt.
Sau implementation ban đầu, em rà soát các trường hợp bấm nhiều lần, mất kết nối, đổi bài và phản hồi đến muộn. Kết quả phải gắn với đúng lần nộp, không ghi đè nhận xét giáo viên đã chỉnh.
Thay đổi chính nằm trong commit a1eac82; phần khôi phục sau mất kết nối được sửa tiếp trong 9c76e58.
Các file chính gồm [aiEvaluationStreamRoutes.js] (D:/Nam3/NewTech/educraft/backend/src/modules/ai-evaluations/aiEvaluationStreamRoutes.js), [aiEvaluationStream.js] (D:/Nam3/NewTech/educraft/frontend/src/services/aiEvaluationStream.js) và [reviewSession.js] (D:/Nam3/NewTech/educraft/frontend/src/components/assignment-detail/reviewSession.js).
Dashboard thống kê sử dụng AI
Key prompt:
	“Tích hợp API thống kê AI vào giao diện tổng quan của quản trị viên, hiển thị lượt gọi, lỗi, lượt bị từ chối, độ trễ trung bình và chi phí có thể xác định.”
Codex giúp em xây dựng service và component thống kê AI, sử dụng API do Phúc cung cấp.
Sau khi code được tạo, em rà soát cách ánh xạ số liệu và các trạng thái đang tải, trống hoặc lỗi. Số lượt gọi AI được phân biệt với số bài nộp vì một lượt phân tích có thể gồm nhiều lời gọi model.
 Trường hợp chi phí chưa có dữ liệu được hiển thị rõ, lúc đầu nó tự chuyển thành 0 USD, em đã sửa lại và nó sẽ báo chưa có. Các request tải thống kê đồng thời được chia sẻ để hạn chế gọi trùng.
Thay đổi chính nằm trong commit a1eac82.
Các file liên quan gồm [AdminAiUsagePanel.jsx] (D:/Nam3/NewTech/educraft/frontend/src/components/AdminAiUsagePanel.jsx), [adminDashboard.js] (D:/Nam3/NewTech/educraft/frontend/src/data/adminDashboard.js) và [aiUsageService.js] (D:/Nam3/NewTech/educraft/frontend/src/services/aiUsageService.js).

Hai trường hợp AI-generated code chưa đạt
Trường hợp 1 - Tạo profile chưa hoàn thiện tài khoản đăng nhập
Trong implementation backend ban đầu, createAccount chủ yếu ghi thông tin vào bảng profiles, chưa hoàn thiện bước tạo Supabase Auth user tương ứng.
Khi đối chiếu với luồng đăng nhập, việc chỉ tạo profile chưa đáp ứng đầy đủ yêu cầu Admin cấp tài khoản. Profile nghiệp vụ không thay thế danh tính đăng nhập trong Supabase Auth.
Sau đợt rà soát tích hợp của nhóm, luồng được sửa thành tạo Auth user trước, lấy UUID trả về để tạo profile cùng ID. Nếu ghi profile thất bại, backend xóa bù Auth user vừa tạo.
Bản đầu nằm trong commit 3d962f4; phần sửa được nhóm thực hiện trong commit a5b6a1b.
Các file chính là accountService.js và [adminServices.test.js] (D:/Nam3/NewTech/educraft/backend/tests/adminServices.test.js).
Cách phát hiện: Đối chiếu code tạo tài khoản với yêu cầu đăng nhập và quan hệ UUID giữa Auth user với profile.
Cách sửa: Tạo danh tính Auth trước, dùng UUID đó cho profile và bổ sung kiểm thử cho thứ tự tạo cùng trường hợp ghi profile thất bại.
Trường hợp 2 - Mất kết nối khiến giao diện khóa chạy lại AI
Trong implementation stream ban đầu, giao diện có thể tiếp tục giữ khóa xử lý sau khi kết nối gián đoạn, ngay cả khi GET đã xác nhận chưa có kết quả AI.
Trạng thái này khiến giáo viên không thể chủ động thử lại dù lần xử lý trước không tạo được kết quả.
Code được sửa để cho phép thử lại khi xác nhận kết quả chưa tồn tại. Nếu GET thất bại và trạng thái chưa rõ, giao diện tiếp tục yêu cầu đồng bộ. Backend vẫn kiểm soát các yêu cầu chạy đồng thời.
Thay đổi nằm trong commit 9c76e58.
Các file liên quan gồm reviewSession.js, aiEvaluationStreamRoutes.js và các test phiên duyệt bài, stream tương ứng.
Cách phát hiện: Rà soát nhánh mất kết nối và trường hợp GET trả 404 sau gián đoạn.
Cách sửa: Phân biệt “chưa xác định kết quả” với “đã xác nhận chưa có kết quả”, cho thử lại đúng trường hợp và bổ sung kiểm thử khôi phục.




