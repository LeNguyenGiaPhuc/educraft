# EduCraft

EduCraft là nền tảng web hỗ trợ giáo viên giao bài tập, nhận bài viết tay của học sinh và chốt kết quả đánh giá với sự trợ giúp của AI. Hệ thống gồm frontend React 19 / Vite, backend Node.js Express 5 và cơ sở dữ liệu PostgreSQL trên Supabase.

---

## 1. Trạng thái hiện tại & Tính năng chính

Các luồng chức năng chính đã hoàn thiện và kết nối đồng bộ giữa Frontend và Backend:

- Xác thực & Phân quyền: Đăng nhập bằng tài khoản/mật khẩu hoặc Google OAuth2, duy trì phiên an toàn bằng HttpOnly cookie với 3 vai trò: ADMIN, TEACHER, STUDENT.
- Quản trị viên (Admin): Quản lý tài khoản, cấp mật khẩu, khóa/mở khóa tài khoản, xóa tài khoản; quản lý lớp học, phân công giáo viên, thêm/xóa học sinh và import danh sách học sinh từ file Excel.
- Bảng điều khiển AI (Admin AI Usage): Theo dõi số lượng request AI, tổng token sử dụng, chi phí ước tính, độ trễ trung bình và các trường hợp AI bị từ chối/cần giáo viên can thiệp.
- Giáo viên (Teacher): Xem các lớp phụ trách, tạo/sửa/xóa bài kiểm tra, quản lý nhiều bài mẫu tham chiếu (references), xem danh sách bài nộp của học sinh theo từng lần nộp, kích hoạt gợi ý AI với streaming thời gian thực, xem bản chép chữ viết tay/các đoạn nghi ngờ mờ, nhập nhận xét và chốt kết quả cuối cùng.
- Học sinh (Student): Xem danh sách lớp học và bài kiểm tra được giao, nộp bài viết tay bằng file ảnh (JPG/JPEG/PNG/WebP, tối đa 5MB), xem lại lịch sử các lần nộp và kết quả đã được giáo viên phê duyệt.
- Lưu trữ & Bảo mật file: Toàn bộ ảnh bài mẫu và bài làm của học sinh được lưu trữ bảo mật trên Supabase Private Storage, chỉ truy cập thông qua Signed URL có thời hạn.

---

## 2. Năng lực AI & Kỹ thuật an toàn (AI Core)

EduCraft đáp ứng 3 năng lực AI cốt lõi theo chuẩn học phần Các công nghệ mới trong KTPM:

1. Đa phương thức (Multimodal Input):
   Nhận diện và phân tích ảnh chụp chữ viết tay tiếng Việt của học sinh đối chiếu trực tiếp với ảnh bài mẫu của giáo viên. Hỗ trợ cả mô hình Cloud (Google Gemini 2.5 Flash) lẫn mô hình Local (Ollama qwen3-vl:2b).

2. Dữ liệu có cấu trúc (Structured Output):
   Kết quả AI được trích xuất và chuẩn hóa theo JSON Schema, xác thực nghiêm ngặt bằng thư viện Zod (coverage_score, transcription, uncertain_content, missing_content, feedback_draft).

3. Quy trình đa tác tử (Multi-agent Workflow):
   - Agent 1 (AI Evaluator): Bóc tách chữ viết tay và so sánh độ bao phủ nội dung so với bài mẫu.
   - Agent 2 (AI Checker): Đóng vai trò giám sát độc lập, tự động rà soát lại kết quả của Agent 1 để phát hiện suy diễn vô căn cứ, ảo giác hoặc vi phạm.

4. Hàng rào an toàn (Guardrails):
   - Prompt injection: Chặn các nỗ lực chèn lệnh trong bài nộp nhằm tự động cho điểm hoặc chiếm quyền.
   - Ngoài phạm vi (Out-of-scope): Phát hiện bài nộp hoặc nội dung không liên quan đến học tập.
   - Lỗi mô hình: Cơ chế bắt lỗi JSON rỗng/hỏng và timeout an toàn.

5. Cơ chế Fallback:
   AI chỉ đóng vai trò trợ lý gợi ý; nếu hệ thống AI gặp sự cố hoặc mất mạng, ứng dụng vẫn hoạt động bình thường, giáo viên vẫn chủ động xem bài và chấm điểm thủ công.

---

## 3. Tài khoản kiểm thử (Test Accounts)

Hệ thống có sẵn các tài khoản kiểm thử cho 3 vai trò với dữ liệu mẫu hoàn chỉnh:

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Mô tả phạm vi truy cập |
| :--- | :--- | :--- | :--- |
| Quản trị viên (Admin) | admin@educraft.test | admin123 | Quản lý toàn bộ tài khoản, lớp học, phân công giáo viên và xem thống kê AI Usage. |
| Giáo viên (Teacher) | teacher@educraft.test | teacher123 | Quản lý bài tập, bài mẫu, xem bài nộp học sinh, gọi AI chấm và chốt điểm. |
| Học sinh (Student) | student@educraft.test | student123 | Xem bài tập được giao, upload bài nộp viết tay và xem điểm đã chốt. |

> Ghi chú: Ở môi trường phát triển local (npm run dev), màn hình đăng nhập hỗ trợ phím tắt / tự động điền nhanh các tài khoản demo trên. Ngoài ra, người dùng có thể đăng nhập trực tiếp thông qua nút Đăng nhập với Google.

---

## 4. Công nghệ & Cấu trúc thư mục

- Frontend: React 19, React Router 7, Vite 8, Pure CSS.
- Backend: Node.js 20+, Express 5, Zod, @supabase/supabase-js, Google Gen AI SDK.
- Database & Storage: PostgreSQL (Supabase), Row Level Security (RLS), Supabase Storage.

```text
educraft/
├── backend/
│   ├── evals/                   # Bộ 20 test cases đánh giá AI (aiCheckerCases.js)
│   ├── scripts/                 # Script chạy benchmark đánh giá mô hình AI
│   ├── src/
│   │   ├── config/              # Cấu hình môi trường, logger, client Supabase
│   │   ├── middleware/          # Auth JWT, request logger, error handler
│   │   ├── modules/             # Các module nghiệp vụ (accounts, classes, assignments,
│   │   │                        # submissions, storage, ai-evaluations)
│   │   ├── app.js               # Khởi tạo Express app
│   │   └── server.js            # Entry point chạy HTTP server
│   └── tests/                   # 34 file unit & integration test backend (293 tests)
├── frontend/
│   ├── src/                     # 100% mã nguồn ứng dụng React (119 files)
│   │   ├── components/          # UI components (teacher, student, admin, kinetic...)
│   │   ├── contexts/            # Quản lý phiên đăng nhập (AuthContext)
│   │   ├── data/                # Data models, validators, state reducers
│   │   ├── pages/               # Các trang màn hình chính
│   │   ├── services/            # API client kết nối Backend Express
│   │   └── styles/              # Các file định dạng CSS
│   └── tests/                   # 56 file unit test frontend (204 tests)
└── supabase/
    ├── migrations/              # Lịch sử migration cấu trúc bảng, RLS, Storage và RPC
    └── tests/                   # Các script SQL kiểm tra bảo mật RLS và Storage policy
```

---

## 5. Hướng dẫn cài đặt & Khởi chạy

### Yêu cầu tiên quyết
- Node.js: Phiên bản 20.19.0 trở lên.
- Dự án Supabase: Đã áp dụng các file SQL trong supabase/migrations/.
- (Tùy chọn) Ollama: Nếu muốn chạy thử nghiệm AI mô hình local (qwen3-vl:2b).

---

### Bước 1: Cài đặt và cấu hình Backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Mở file backend/.env và thiết lập các biến môi trường cần thiết:

```dotenv
NODE_ENV=development
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
GOOGLE_OAUTH_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Cấu hình Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cấu hình AI Provider (Chọn 'gemini' hoặc 'ollama')
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Cấu hình Local Ollama (nếu dùng AI_PROVIDER=ollama)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3-vl:2b
OLLAMA_NUM_CTX=4096
OLLAMA_NUM_PREDICT=512

# Giới hạn an toàn
AI_TIMEOUT_MS=30000
AI_MAX_REFERENCE_IMAGES=4
AI_MAX_TOTAL_BYTES=15728640
```

Khởi chạy server backend:

```powershell
npm run dev
```

Kiểm tra trạng thái server tại: GET http://localhost:3000/api/health.

---

### Bước 2: Cài đặt và cấu hình Frontend

```powershell
cd ../frontend
npm ci
Copy-Item .env.example .env
```

Nội dung cơ bản trong frontend/.env:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Khởi chạy máy chủ phát triển frontend:

```powershell
npm run dev
```

Truy cập ứng dụng tại địa chỉ hiển thị trong terminal (mặc định: http://localhost:5173).

---

## 6. Kiểm thử tự động & Đánh giá chất lượng

Hệ thống được kiểm thử toàn diện với 497 tests tự động pass 100%:

```powershell
# 1. Chạy toàn bộ test Backend (293 tests)
cd backend
npm test
npm run lint

# 2. Chạy bộ đánh giá 20 ca kiểm thử AI (AI Evaluation Benchmark)
npm run eval:ai-checker

# 3. Chạy toàn bộ test Frontend (204 tests)
cd ../frontend
npm test
npm run lint
npm run build
```

Kết quả kiểm tra thực tế:
- Backend: 293 / 293 test PASS (100%).
- Frontend: 204 / 204 test PASS (100%).
- AI Evaluation: 20 / 20 test cases PASS (100% bao gồm normal, edge, prompt-injection, out-of-scope).
- ESLint: 0 lỗi ở cả hai repo.
- Production Build: Đóng gói thành công không cảnh báo.
