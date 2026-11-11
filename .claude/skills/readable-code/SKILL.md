---
name: readable-code
description: Use whenever writing or editing code in this project (Next.js frontend or Django backend). The developer is a 4th-year student with little industry experience, so code must be easy to read, explain itself, and teach good habits. Applies to every code change, big or small.
---

# Viết code dễ đọc, dễ hiểu

Người đọc code là **sinh viên năm 4, chưa nhiều kinh nghiệm**. Mục tiêu: đọc một file là hiểu nó làm gì
và *vì sao* làm vậy — không cần hỏi lại.

## 1. Đặt tên
- Tên biến/hàm bằng **tiếng Anh**, đầy đủ nghĩa: `filteredReviews`, `computeDomainStats` — không viết tắt kiểu `fr`, `cds`.
- Hàm bắt đầu bằng động từ (`filter…`, `compute…`, `format…`, `build…`). Biến boolean bắt đầu bằng `is/has/can`.
- Hằng số cấu hình viết HOA: `MAX_REVIEWS`, `DEFAULT_WEIGHTS`.

## 2. Comment (bằng tiếng Việt)
- **Đầu mỗi file**: 2–5 dòng nói file này để làm gì, nằm ở đâu trong luồng dữ liệu.
- **Trước hàm quan trọng**: một dòng JSDoc `/** ... */` nói hàm trả về gì, kèm ví dụ nếu có (`0.215 -> "21,5%"`).
- Comment giải thích **VÌ SAO**, không lặp lại code làm gì. Tốt: `// Dùng log để lĩnh vực 70 triệu không đè bẹp lĩnh vực 5 triệu`. Xấu: `// cộng 1 vào i`.
- Khi dùng một khái niệm mới với người mới (useMemo, useRef, hydration, min–max…), giải thích ngắn 1 dòng ngay chỗ dùng.

## 3. Cấu trúc
- **Một file — một việc.** Component chỉ lo hiển thị; tính toán để trong `lib/` dưới dạng hàm thuần (nhận vào → trả ra, không sửa dữ liệu gốc).
- Hàm ngắn (lý tưởng < 40 dòng). Dài hơn thì tách hàm con có tên rõ nghĩa.
- Tránh lồng sâu: dùng `return` sớm (`if (!data) return null;`) thay vì if-else lồng nhiều tầng.
- Dữ liệu lặp lại → mảng + `.map()` thay vì copy-paste JSX 3 lần.
- Ưu tiên cách viết phổ biến, dễ tra Google hơn mẹo "thông minh" khó hiểu.

## 4. TypeScript / Python
- TS: khai báo `interface` cho mọi dữ liệu đi qua nhiều file (để trong `lib/types.ts`). Không dùng `any`; nếu buộc phải ép kiểu thì dùng `unknown` + `as` và comment lý do.
- Python/Django: type hints cho hàm, docstring tiếng Việt ngắn, tuân PEP 8.
- Python cho người mới:
  - Ưu tiên vòng `for` rõ ràng hơn list comprehension lồng nhau hay one-liner dài; comprehension chỉ dùng khi một dòng đọc được.
  - Khái niệm Django lần đầu xuất hiện trong file thì comment 1 dòng: QuerySet (truy vấn lười, chưa chạy ngay),
    `select_related`/`prefetch_related` (gom truy vấn, tránh N+1), `transaction.atomic()` (lỗi giữa chừng thì không lưu gì),
    serializer (kiểm tra + chuyển dữ liệu JSON ↔ Python), migration, `get_or_create`/`update_or_create`.
  - View mỏng: view chỉ nhận request → gọi hàm trong `services/` → trả response. Logic để trong `services/`.
  - Thông báo lỗi trả về cho người dùng bằng tiếng Việt, nói rõ sai ở đâu ("Review thứ 3: score phải là 1 hoặc 2").

## 5. Trước khi báo xong
- Chạy kiểm tra: `npx tsc --noEmit` và `npm run lint` (frontend); `python -m pytest` / `python manage.py check` (backend).
- Không để lại code chết, `console.log` gỡ lỗi, hay comment kiểu "TODO" không có nội dung.
- Sau đó dùng skill `learning-notes` để viết bài tổng hợp kiến thức cho lần làm việc này.
