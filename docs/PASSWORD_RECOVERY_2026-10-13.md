# Khôi phục mật khẩu qua email

Trang `/forgot-password` nhận email tài khoản và gửi liên kết tới `/reset-password` qua SMTP đang cấu hình trên máy chủ. `FRONTEND_PUBLIC_URL` phải trỏ tới tên miền frontend; production dùng `https://smart-bus-ticketing-system.vercel.app`. Không đưa SMTP password vào biến `VITE_*` hoặc Git.

Liên kết có hiệu lực 30 phút và chỉ dùng một lần. Mã ngẫu nhiên 256 bit nằm trong URL fragment, được xóa khỏi thanh địa chỉ khi trang tải; database chỉ lưu SHA-256 của mã. Yêu cầu mới thay thế mã cũ. Mỗi tài khoản được gửi tối đa 5 lần/giờ, cách nhau ít nhất 60 giây; giới hạn lưu trong database và tồn tại qua các lần chạy serverless.

API trả cùng thông báo cho địa chỉ không tồn tại, tài khoản khóa, yêu cầu bị giới hạn và SMTP từ chối thư để tránh tiết lộ danh sách tài khoản. Thiếu cấu hình SMTP toàn hệ thống trả 503. Nếu gửi thất bại, mã của lần gửi đó bị vô hiệu hóa.

Mật khẩu mới cần ít nhất 8 ký tự và tối đa 72 byte UTF-8. Đổi mật khẩu trong transaction sẽ xóa mã, tăng `auth_version`, hủy hiệu lực JWT cũ và xác nhận quyền sở hữu email. Các kết nối WebSocket cục bộ bị đóng ngay; phiên trên instance khác bị kiểm tra lại khi gửi thông điệp hoặc qua heartbeat. Người dùng đăng nhập lại sau khi đổi mật khẩu.

## Triển khai

1. Chạy migration `20261013010000_password_recovery.sql` trước khi triển khai backend sử dụng `auth_version`.
2. Cấu hình `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM` và thông tin xác thực theo nhà cung cấp; đặt `FRONTEND_PUBLIC_URL`.
3. Build/deploy backend và frontend cùng phiên bản.
4. Mở `/forgot-password`, dùng email tài khoản do người kiểm tra quản lý; kiểm tra cả hộp thư rác. Đặt mật khẩu mới, xác nhận đăng nhập được và liên kết cũ không dùng lại được.

Migration runner tính checksum chuẩn theo LF, đồng thời chấp nhận checksum CRLF lịch sử. Việc chuyển xuống dòng khi checkout trên Windows/Linux không gây lỗi; thay đổi nội dung SQL vẫn bị từ chối. Checksum lịch sử không bị viết lại.

## Kiểm tra tự động

- `node --test backend/scripts/migration-checksum.test.cjs`: chuyển dòng và phát hiện thay đổi SQL.
- `npm --prefix backend run test:postgres`: migration thật trên PostgreSQL cô lập, nội dung email, mã băm, giới hạn, thay thế/hết hạn, lỗi SMTP, đổi mật khẩu và hủy phiên cũ. SMTP trong kiểm tra được giả lập.
- `npm --prefix frontend test`: biểu mẫu yêu cầu email và đặt mật khẩu; xử lý mã trong fragment, xác nhận mật khẩu, xóa phiên/cache sau thành công.

SMTP chấp nhận thư không chứng minh thư đã tới Inbox. Nghiệm thu nhận thư thực tế cần email tài khoản do người kiểm tra quản lý; không gửi thử tới tài khoản của người khác.
