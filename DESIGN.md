---
name: EduCraft
description: "Bàn làm việc học tập dạng blueprint cho luồng giao bài, nộp bài và phản hồi."
colors:
  page-bg: "#eef4ff"
  surface: "#ffffff"
  surface-subtle: "#f4f7ff"
  surface-hover: "#e8f0ff"
  ink: "#0b1c30"
  muted: "#434655"
  muted-light: "#d6e2f6"
  border: "#b9c9e5"
  accent: "#2563eb"
  accent-hover: "#174dc8"
  accent-soft: "#eaf1ff"
  success: "#006c4a"
  warning: "#92400e"
  error: "#ba1a1a"
  focus: "#2563eb"
  blueprint-grid: "rgb(37 99 235 / 5%)"
  blueprint-line: "#9db7e7"
  signal: "#a8e840"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif"
    fontSize: "clamp(64px, 8.3vw, 128px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif"
    fontSize: "clamp(38px, 4vw, 54px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  title:
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "0.08em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  page-gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "38px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "40px"
  nav-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "46px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "22px"
  status-ready:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-hover}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
    width: "100%"
  workflow-proof:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "18px 16px 16px"
---

# Design System: EduCraft

## Overview

**Creative North Star: "The Academic Blueprint"**

EduCraft là một bàn làm việc học tập sáng, chính xác và có nhịp vận hành rõ ràng. Lưới blueprint trên nền trắng và xanh rất nhạt, chữ navy, cobalt chủ đạo, tín hiệu lime, khung vuông và đường kẻ mảnh biến giao bài, nộp bài và phản hồi thành một quy trình có thể đọc nhanh thay vì một dashboard bo tròn đại trà.

Landing dùng quy mô chữ lớn và một bằng chứng luồng ba bước để cho thấy ba vai trò cùng làm việc trong một hệ thống trước khi mời đăng nhập. Sau đăng nhập, cùng thế giới đó chuyển sang chế độ vận hành với soft layered depth: page header đóng khung, stat/card có phân cấp mạnh, bảng dùng header navy và shadow xanh nhẹ chỉ nhấn các lớp quan trọng.

**Key Characteristics:**

- Lưới blueprint và đường kẻ mảnh tạo cấu trúc, không chỉ làm nền trang trí.
- Cobalt dẫn hành động; lime chỉ đánh dấu điểm cần chú ý hoặc bước đang tiến hành.
- Hình học vuông với bán kính rất nhỏ giữ cảm giác học thuật và vận hành.
- Page header, stat/card và bảng dùng khung, sắc độ và shadow mềm để tạo thứ bậc rõ.
- Trạng thái luôn được diễn đạt bằng chữ bên cạnh màu sắc.

## Colors

Bảng màu lạnh, sáng và có độ tương phản cao: cobalt cho tương tác, lime cho tín hiệu, navy cho nội dung, còn các lớp xanh nhạt dựng nên mặt giấy blueprint.

### Primary

- **Working Cobalt**: Dùng cho hành động chính, mục điều hướng đang chọn, bước tiến trình đang hoạt động, focus và các đường nhấn.
- **Deep Cobalt**: Dùng cho hover/focus của hành động chính và chữ liên kết cần độ tương phản cao hơn.
- **Cobalt Wash**: Dùng cho selected rows, active cards và bề mặt phản hồi nhẹ; không thay thế nền trắng của nội dung chính.

### Secondary

- **Signal Lime**: Chỉ dùng như đường đáy, bóng offset hoặc chấm tín hiệu để nhấn bước tiếp theo; không dùng như một mảng nền lớn.

### Neutral

- **Blueprint Mist**: Nền trang và nền lưới của shell đã đăng nhập.
- **Drafting White**: Bề mặt card, form, bảng, sidebar và dialog.
- **Quiet Panel Blue**: Bề mặt phụ, header bảng, vùng hover và nhóm thông tin có mức ưu tiên thấp.
- **Ink Navy**: Chữ chính, tiêu đề và thông tin cần độ chắc.
- **Working Gray**: Chữ mô tả, metadata và điều hướng chưa chọn.
- **Construction Line**: Đường chuẩn và đường chia có sắc xanh rõ hơn border thông thường.
- **Border Blue**: Viền điều khiển, card và bảng ở trạng thái nghỉ.

### Semantic

- **Success Green**: Kết quả hoàn tất hoặc trạng thái thành công.
- **Warning Amber**: Trạng thái đang chờ hoặc cần chú ý.
- **Error Red**: Lỗi nhập liệu, trạng thái thất bại và hành động nguy hiểm.

**The Cobalt Leads Rule.** Mỗi vùng chỉ có một điểm nhấn cobalt chính; các bề mặt còn lại giữ trắng hoặc xanh rất nhạt để thứ tự hành động luôn rõ.

**The Signal Is Earned Rule.** Lime chỉ xuất hiện ở tín hiệu tiến trình, đường đáy hoặc bóng offset của hành động quan trọng; không dùng để tô phủ card hay dashboard.

## Typography

**Display Font:** Plus Jakarta Sans (với Segoe UI và sans-serif dự phòng)

**Body Font:** Plus Jakarta Sans (với Segoe UI và sans-serif dự phòng)

**Character:** Một hệ sans duy nhất giữ giao diện rõ và liền mạch. Cá tính đến từ độ đậm cao, tracking âm ở tiêu đề lớn và micro-label viết hoa có tracking rộng, không đến từ việc trộn nhiều font.

### Hierarchy

- **Display** (800, `clamp(64px, 8.3vw, 128px)`, 0.9): Chỉ dành cho tuyên ngôn ở landing; ở viewport rộng bố cục hai cột giới hạn cỡ tối đa để workflow proof vẫn cân bằng.
- **Headline** (800, `clamp(38px, 4vw, 54px)`, 1.15): Tiêu đề trang nội bộ trong framed header; giảm còn `32px` trên mobile.
- **Title** (700, `20px`, 1.35): Tiêu đề panel, lớp học, bài kiểm tra và nhóm nội dung.
- **Body** (400, `14px`, 1.6): Nội dung form, bảng và mô tả; đoạn giải thích giữ độ dài đọc khoảng 68 ký tự.
- **Label** (800, `10px`, tracking `0.08em`, uppercase): Header bảng, mã bước và nhãn trạng thái ngắn; nhãn trường nhập giữ cỡ lớn hơn để ưu tiên khả năng đọc.

**The One Sans Rule.** Không thêm display serif hay monospace trang trí; phân cấp bằng cỡ chữ, độ đậm, tracking và vị trí trên lưới.

**The Operational Label Rule.** Chữ viết hoa có tracking rộng chỉ dành cho metadata ngắn, header bảng và chỉ số bước; không dùng cho câu hướng dẫn dài.

## Layout

Landing chiếm toàn bộ chiều rộng và chiều cao viewport, đặt brand cùng hành động đăng nhập ở đầu, headline lớn ở trung tâm và workflow proof ba bước bên cạnh trên màn hình rộng. Từ `1100px`, phần nội dung chính chuyển thành hai cột có khoảng cách lớn; dưới `620px`, workflow vẫn hiện ở dạng compact với stage, canvas và card được thu gọn.

Không gian đã đăng nhập dùng content max-width `1360px`, gutter desktop `32px` và gutter mobile `16px`. Admin và giáo viên dùng sidebar `248px` ở desktop; tại `960px` sidebar chuyển thành dải ngang xếp chồng phía trên nội dung. Khu vực chính giữ lưới blueprint `40px`, giảm còn `28px` trên mobile. Heading trang nằm trong khung lưới riêng, có motif hình học, shadow mềm và vạch cobalt-lime làm mốc căn.

Card lớp học thường dùng lưới hai cột; danh sách bài tập co bằng `auto-fit` với cột tối thiểu khoảng `260px`. Form hai cột trở thành một cột trên màn hình nhỏ. Bảng được đặt trong vùng cuộn ngang thay vì ép nội dung, còn các nhóm hành động được phép wrap. Mốc responsive chính là `640px`, `900px`, `960px` và `1100px`, với các tinh chỉnh form ở `680px` và landing ở `620px`.

**The Workflow Before Widgets Rule.** Bố cục phải làm lộ thứ tự công việc và bước tiếp theo trước khi tối ưu số lượng card trên màn hình.

## Elevation & Depth

Hệ thống dùng soft layered depth có chọn lọc. Card cơ bản vẫn dựa vào nền trắng và viền xanh, còn page header, state/table panel, workflow proof và vùng tác vụ chính nhận shadow xanh nhẹ để tạo thứ bậc. Card có thể mở nâng thêm khi hover/focus; dialog là lớp nổi mạnh nhất.

### Shadow Vocabulary

- **Base Panel** (`box-shadow: none`): Card hỗ trợ ở trạng thái nghỉ; border và nền vẫn là lớp phân tách chính.
- **Ambient Panel** (`0 18px 44px rgb(18 63 159 / 8%)`): State panel và vùng nội dung cần tách nhẹ khỏi nền blueprint.
- **Framed Header** (`0 24px 64px rgb(8 20 40 / 12%)`): Page header và bề mặt định hướng cấp cao.
- **Interactive Card** (`0 18px 40px rgb(18 63 159 / 14%)`): Hover/focus cho stat, lớp học hoặc bài tập có thể mở.
- **Workflow Float** (`0 24px 56px rgb(22 72 153 / 16%)`): Workflow proof trên landing.
- **Modal Float** (`0 28px 72px rgb(0 24 61 / 28%)`): Dialog đăng nhập trên backdrop navy mờ.

**The Soft Layering Rule.** Shadow phải mềm, sắc xanh và gắn với thứ bậc: lớp định hướng, lớp tác vụ hoặc trạng thái tương tác; không phủ cùng một mức bóng lên mọi card.

## Shapes

Hình học chính là khung chữ nhật gần vuông: bán kính nhỏ `2px`, trung bình `4px`, lớn `6px`. Button và input trong landing có thể vuông tuyệt đối để tăng cảm giác bản vẽ; panel nội bộ dùng bán kính trung bình, dialog lớn dùng bán kính lớn. Viền chủ đạo dày `1px`, các đường nhấn trạng thái hoặc đầu card dày `3px`.

Avatar, badge, chỉ số bước và trạng thái trong implementation mới cũng được làm vuông nhẹ thay vì pill tròn đại trà. Các hình vuông lệch hoặc xoay chỉ là motif nền blueprint, không trở thành decoration lặp lại trên mọi card.

**The Drafting Frame Rule.** Mọi container phải đọc như một khung làm việc có cạnh rõ; tránh pill, blob và bán kính lớn không mang ý nghĩa thao tác.

## Components

### Buttons

- **Shape:** Khung vuông nhẹ (`2px`), chiều cao chuẩn `38px`; nút landing và submit đăng nhập dùng góc vuông cùng chiều cao lớn hơn.
- **Primary:** Nền cobalt, chữ trắng, padding ngang `14px`, font đậm; đường lime inset `3px` là tín hiệu nhận diện trong workspace.
- **Hover / Focus:** Chuyển sang cobalt đậm, giữ focus outline `2px` có offset `3px`; nút đăng nhập dùng dịch chuyển hình học `3px` và giảm bóng offset.
- **Secondary / Ghost:** Outline dùng nền trắng và viền xanh nhạt; ghost dùng nền trong, chữ cùng viền cobalt; danger dùng đỏ ngữ nghĩa và không mượn lime.

### Chips

- **Style:** Badge và status là khung vuông nhẹ, padding ngắn, chữ đậm nhỏ; nền là tint theo trạng thái và luôn có label văn bản.
- **State:** Ready/active dùng cobalt; completed dùng xanh success; waiting dùng amber; error/closed dùng đỏ hoặc neutral tùy ngữ nghĩa.

### Cards / Containers

- **Corner Style:** Bán kính trung bình (`4px`) với border `1px`.
- **Background:** Trắng trên nền xanh blueprint; card hỗ trợ có thể dùng tint xanh rất nhạt hoặc lime rất nhạt.
- **Shadow Strategy:** Card hỗ trợ có thể phẳng; page header, state/table panel và vùng tác vụ chính dùng shadow mềm, còn card có thể mở nâng `-2px` đến `-3px` khi hover/focus.
- **Border:** Construction line cho nhóm chính; cobalt cho selected/active; stripe cobalt `3px` ở đầu card dùng để nhấn loại nội dung.
- **Internal Padding:** Thường `22px` đến `24px`; card bài tập nhỏ dùng `18px`.

Page header là framed surface cao nhất trong workspace: lưới `28px`, gradient trắng–xanh, motif hình vuông xoay, vạch cobalt-lime và headline lớn. Stat card dùng giá trị cobalt lớn, label uppercase, dải nhấn trên cùng và corner mark để tách rõ số liệu khỏi card nội dung.

### Inputs / Fields

- **Style:** Nền trắng, viền xanh `1px`, góc `2px`, chiều cao từ `40px` đến `50px` tùy mật độ bề mặt.
- **Focus:** Viền chuyển cobalt và thêm thanh inset cobalt `3px` ở cạnh trái; một số form tác vụ dùng outline cobalt mờ `3px`.
- **Error / Disabled:** Error dùng viền đỏ, nền đỏ rất nhạt và thông báo chữ; disabled giữ label hành động nhưng loại bỏ affordance con trỏ.

### Navigation

Sidebar desktop rộng `248px`, nền trắng có nhịp kẻ ngang; mục điều hướng là khung `2px`. Hover trở về nền trắng có border, active dùng nền cobalt, chữ trắng và một tín hiệu lime vuông ở mép phải. Khi dưới `960px`, sidebar chuyển thành header xếp chồng và nav được phép wrap thay vì thu thành icon không nhãn.

### Tables

Header dùng nền Ink Navy và chữ trắng viết hoa ở cỡ nhỏ; cell dùng padding `14px 16px` và border-bottom mảnh. Hover row chỉ đổi tint nhẹ. Trên mobile, bảng cuộn ngang hoặc chuyển sang hàng có nhãn; không cắt mất dữ liệu để ép vừa viewport.

### Workflow Proof

Khối luồng trên landing là signature component: header và footer micro-label, ba bước đánh số, canvas lưới, một card bài ghi và đường tiến trình lime-to-cobalt. Workflow vào trang cùng nhịp, đường tín hiệu và card chuyển động nhẹ; `prefers-reduced-motion` tắt toàn bộ animation. Dưới `620px`, component được thu gọn nhưng vẫn hiển thị đủ luồng.

## Do's and Don'ts

### Do:

- **Do** giữ nền trắng hoặc xanh rất nhạt, lưới blueprint và đường kẻ mảnh làm cấu trúc chính.
- **Do** dùng cobalt cho hành động hoặc trạng thái ưu tiên cao nhất trong từng vùng.
- **Do** dùng lime có tiết chế ở đường đáy, bóng offset hoặc tín hiệu tiến trình.
- **Do** giữ card, table và form cùng scale góc `2px` đến `6px` và cùng ngôn ngữ border.
- **Do** dùng shadow xanh mềm để phân tầng page header, panel quan trọng và card tương tác.
- **Do** viết trạng thái bằng chữ bên cạnh màu và giữ focus bàn phím nhìn thấy rõ.
- **Do** để bố cục desktop co thành một cột hoặc wrap có chủ đích; giữ workflow landing ở dạng compact trên mobile.

### Don't:

- **Don't** biến EduCraft thành dashboard bo tròn đại trà với pill, gradient và shadow trên mọi card.
- **Don't** dùng lime như màu nền diện rộng hoặc cạnh tranh với cobalt cho hành động chính.
- **Don't** thêm nhiều font, icon trang trí hoặc lời hứa thương hiệu không xuất phát từ sản phẩm.
- **Don't** ẩn trạng thái chỉ bằng màu hoặc loại bỏ nhãn văn bản khỏi điều hướng responsive.
- **Don't** làm lưới blueprint đậm hơn nội dung, bảng hoặc form đang vận hành.
- **Don't** bịa thêm bước workflow, vai trò hoặc khả năng để làm giao diện trông phong phú hơn.
