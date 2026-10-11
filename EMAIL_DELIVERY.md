# Xác minh email và gửi vé SmartBus

## Hành vi

- Đăng ký kiểm tra định dạng email và tạo tài khoản chưa xác minh. Người dùng nhận liên kết có hiệu lực 30 phút, mở liên kết rồi bấm **Xác minh email**. Chỉ khi bước này thành công mới có thể giữ ghế/thanh toán. Đăng nhập và xem tài khoản vẫn được phép để gửi lại liên kết.
- Xác minh chứng minh quyền truy cập hộp thư tại thời điểm xác minh, không chứng minh danh tính thật hoặc loại trừ email tạm thời. Không đánh dấu email “thật” chỉ vì đúng định dạng hoặc SMTP chấp nhận thư.
- Mã ngẫu nhiên 256 bit, DB chỉ lưu SHA-256; chỉ dùng một lần. Gửi lại làm vô hiệu mã cũ; chờ 60 giây giữa hai lần gửi và tối đa 5 lần mỗi giờ/tài khoản. Mã ở URL fragment để không xuất hiện trong HTTP access log/referrer. GET trang không tự xác minh, tránh link scanner tiêu thụ mã.
- Sau callback MoMo/VNPay xác nhận thanh toán hợp lệ và cấp vé, transaction lưu công việc gửi email trong PostgreSQL. Email có mã vé, tuyến, giờ đón theo trạm, ghế/số vé, số tiền, QR PNG và liên kết tới vé hiện tại trong tài khoản. Không gửi QR khi thanh toán còn chờ/thất bại hoặc được hoàn vì đến muộn.
- QR gửi qua email có hạn đến 90 phút sau giờ đến dự kiến, thay vì hết hạn 24 giờ sau khi mua trước nhiều ngày. Quyền soát vé, cửa sổ giờ chạy và payment vẫn được kiểm tra phía server. Khi hủy/đổi chuyến, dùng vé mới nhất trong tài khoản.
- Callback lặp và worker chạy đồng thời dùng claim trong DB để tránh gửi trùng thông thường. SMTP lỗi không đảo ngược thanh toán; email chờ gửi lại. Trạng thái `sent` nghĩa SMTP đã chấp nhận, không phải xác nhận người nhận đã đọc hoặc thư chắc chắn vào Inbox.
- Công việc thử tối đa 5 lần, cách nhau 5 phút. Hết lượt báo `failed`; vé vẫn có trong tài khoản. Worker bỏ qua vé đã hủy/không còn thanh toán thành công. Nếu process chết sau khi SMTP nhận thư nhưng trước khi DB ghi `sent`, lần thử sau có thể gửi trùng; đây là cơ chế ít nhất một lần, không bảo đảm exactly-once trên SMTP.

## Cấu hình trước khi triển khai

1. Chạy `npm --prefix backend run db:migrate` với DIRECT_URL PostgreSQL direct/session port 5432. Migration mới: `20261011133000_email_verification_delivery.sql`.
2. Cấu hình ở môi trường backend, không đưa vào các biến VITE/frontend:

   ```dotenv
   FRONTEND_PUBLIC_URL=https://your-frontend-domain.example
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-smtp-user
   SMTP_PASSWORD=your-smtp-password
   SMTP_FROM=SmartBus <your-sender@example.com>
   ```

   FRONTEND_PUBLIC_URL phải là frontend thật, HTTPS khi production. Địa chỉ FROM cần được SMTP provider cho phép gửi. Thiếu SMTP thì API báo chưa gửi được, email chưa xác minh và chưa thể đặt vé; không có chế độ tự bỏ qua xác minh.

3. Giữ job có Bearer PAYMENT_CRON_SECRET gọi `/api/v1/ticketing/release-expired` định kỳ. Mỗi lượt xử lý thêm tối đa một email đến hạn, phù hợp thời hạn Vercel 30 giây. Với lưu lượng lớn, dùng worker riêng và điều chỉnh batch; theo dõi bảng `ticket_email_deliveries`, đặc biệt status failed hoặc processing quá 2 phút. Sau khi sửa cấu hình, nhân viên vận hành có thể đặt lại failed về pending/attempts=0 để retry có kiểm soát.
4. Rebuild/deploy frontend và backend cùng migration. **Tài khoản cũ cũng chưa được mặc định xác minh**; hành khách đăng nhập sẽ được hướng dẫn xác minh. Không backfill đã xác minh nếu chưa có bằng chứng sở hữu email.
5. Nghiệm thu bằng hộp thư thật thuộc người kiểm thử: đăng ký → nhận mail → xác minh → đặt/thanh toán sandbox merchant → nhận QR → xem vé trong tài khoản. Không dùng credential hoặc email thật trong test fixtures/commit.

## API

| Endpoint dưới `/api/smartbus/v1/auth` | Quyền | Kết quả |
|---|---|---|
| POST `/verify-email`, body `{token}` | Có liên kết email | Xác minh; mã sai/hết hạn/đã dùng trả 400 |
| POST `/resend-verification` | Bearer JWT của chủ tài khoản | Gửi lại; giới hạn trả 429; SMTP chưa gửi được trả emailSent=false |
| GET `/session` | Bearer JWT | Có boolean emailVerified |

GET `/api/smartbus/v1/bookings/:id` có ticketEmailStatus: pending/processing/sent/skipped/failed. Giao diện kết quả thanh toán hiển thị theo trạng thái thật, không coi thanh toán thành công đồng nghĩa email đã gửi thành công.

Kiểm thử tích hợp dùng migrations thật trên PGlite, gateway HTTP giả và SMTP transport giả, không gửi thư ra ngoài. Bộ test bao phủ mã cũ/hết hạn/đã dùng, cooldown, chưa xác minh bị chặn giữ ghế, QR PNG sau thanh toán, callback lặp, worker đồng thời, SMTP từ chối và retry. Giao diện được kiểm bằng fixture local; không cập nhật website production trong bước này.
