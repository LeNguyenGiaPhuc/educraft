# EduCraft AI readiness lab

Readiness lab này chạy Gemini ở ngoài luồng sản phẩm và không ghi dữ liệu vào Supabase. Mỗi case được chạy hai lần với `temperature=0.1` và `temperature=0.7`, sau đó ghi JSON đã loại API key/base64 và một bảng Markdown để nhóm đánh giá thủ công.

## Chuẩn bị

Đặt năm ảnh synthetic hoặc đã ẩn danh trong `backend/ai-readiness-lab/fixtures/` theo đúng tên trong `cases.json`. Không đưa ảnh học sinh thật hoặc thông tin định danh vào Git; thư mục fixture và output đã được ignore.

## Chạy

```powershell
cd backend
$env:GEMINI_API_KEY='your-key'
$env:GEMINI_MODEL='gemini-3.8-flash'
npm run ai:lab
```

Kết quả nằm trong `backend/ai-readiness-lab/outputs/<timestamp>/`:

- 10 file JSON, mỗi file tương ứng một case và một temperature.
- `report.md` gồm model, prompt version, latency, schema validity, confidence và các cột để ghi chất lượng/lỗi hallucination.

Nhóm cần mở đủ 10 JSON, đối chiếu với ảnh synthetic, ghi `observed_quality` và `failure_notes` trong báo cáo. Nếu nét chữ không chắc chắn, kiểm tra đoạn đó có xuất hiện trong `uncertain_content`; không xem một bản chép tự tin nhưng sai là thành công.

Nếu chạy khi chưa có key, lệnh sẽ dừng trước khi tạo output và báo rõ `GEMINI_API_KEY`.
