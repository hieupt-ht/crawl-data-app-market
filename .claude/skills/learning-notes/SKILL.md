---
name: learning-notes
description: Use at the end of every work session in this project where code was written or changed. Writes a self-contained HTML study note (in Vietnamese) into docs/learning/ explaining the concepts, decisions, and code used, so the developer (a 4th-year student) can read and learn from it.
---

# Viết bài tổng hợp kiến thức sau mỗi lần làm

Sau mỗi phiên có viết/sửa code, tạo **một file HTML** để bạn sinh viên đọc lại và học.

## Đặt file ở đâu
- `docs/learning/NN-ten-ngan.html` (ở thư mục gốc dự án), `NN` là số thứ tự tăng dần: `01-dashboard-overview.html`, `02-...`.
- Cập nhật `docs/learning/index.html` (mục lục): thêm 1 dòng gồm số, tên bài, ngày, 1 câu tóm tắt.

## Nội dung (theo thứ tự)
1. **Hôm nay làm gì** — 3–5 dòng, kèm cách chạy thử (lệnh cụ thể).
2. **Bản đồ file** — cây thư mục những file đã tạo/sửa, mỗi file 1 dòng giải thích.
3. **Kiến thức chính** — 4–8 khái niệm. Mỗi khái niệm:
   - Giải thích bằng lời đơn giản (như nói với bạn cùng lớp), có ví dụ đời thường nếu được.
   - Một đoạn code ngắn (≤ 15 dòng) **lấy từ chính dự án**, có ghi tên file.
   - "Lỗi hay gặp" — 1–2 dòng.
4. **Vì sao chọn cách này** — các quyết định thiết kế quan trọng và phương án đã bỏ qua.
5. **Tự kiểm tra** — 3–5 câu hỏi/bài tập nhỏ (có đáp án ẩn trong `<details>`).
6. **Đọc thêm** — 2–4 link tài liệu chính thức (react.dev, nextjs.org, docs.djangoproject.com, echarts.apache.org…).

## Hình thức
- Một file HTML tự chứa (CSS trong `<style>`, không cần mạng), nền sáng, chữ dễ đọc (16px, dòng ~70 ký tự).
- Code đặt trong `<pre><code>`, có tên file phía trên.
- Viết tiếng Việt; thuật ngữ tiếng Anh giữ nguyên lần đầu kèm giải nghĩa: "state (trạng thái)".
- Ngắn gọn: đọc trong 15–20 phút.
