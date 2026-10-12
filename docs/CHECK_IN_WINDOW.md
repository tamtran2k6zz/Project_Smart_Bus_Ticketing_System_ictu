# Thời gian soát vé

Trường hợp được báo: Bến xe Mỹ Đình → Công Nghệ Thông Tin, khởi hành 06:30 ngày 13/10/2026, quét QR ngày 12/10. Vé chưa đến giờ soát; không phải lỗi phân công tài xế. Mở soát vé từ 06:00 ngày 13/10, đóng sau giờ đến dự kiến 90 phút. Không sửa ngày chạy hay mở soát sớm để vượt điều kiện này.

Đối chiếu catalog production: chuyến `62855ccc-c63a-46aa-8bf3-cd22eb1cd322` có departure `2026-10-12T23:30:00Z` (= 06:30 ngày 13/10 giờ Việt Nam), duration 35 phút; dự kiến đến 07:05 và đóng soát lúc 08:35 ngày 13/10. Không có sai lệch múi giờ trong lịch chuyến này.

Backend dùng chung `getCheckInWindow` cho API chuyến và thao tác soát vé. `Trip.checkIn` có state, opensAt, closesAt, serverTime, message. Thời điểm trả theo ISO UTC; thông báo ghi rõ giờ Việt Nam. Phân biệt chưa mở, đã đóng, hoàn thành, hủy và lịch không hợp lệ. Quyền tài xế, thanh toán, chữ ký QR, hạn QR, nonce và chống soát trùng vẫn được kiểm tra trên máy chủ.

Màn hình tài xế hiển thị giờ mở/đóng trên danh sách chuyến và trang QR. Camera và nhập token bị khóa ngoài cửa sổ; trạng thái cập nhật từ máy chủ mỗi 5 giây, không dựa vào đồng hồ điện thoại để mở nút. Tự dừng camera khi cửa sổ đóng hoặc không xác nhận được quyền. Đổi chuyến xóa token cũ. Roster vẫn xem được trước giờ mở; từ chối sớm không sử dụng vé hay làm tăng số khách.

Kiểm thử gồm chuyến ngày mai 06:30, biên 30 phút trước giờ chạy và 90 phút sau giờ đến, UTC/+07:00, chuyến hoàn thành/hủy/lịch sai, tài xế chưa được phân công, API từ chối không tiêu thụ vé và nút tự mở sau phản hồi mới. Fixture kiểm thử UI chỉ chạy trên localhost, không yêu cầu camera hoặc soát vé thật trên production.
