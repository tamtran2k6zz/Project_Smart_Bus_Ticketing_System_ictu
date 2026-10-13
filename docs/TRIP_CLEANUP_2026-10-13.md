# Sửa chức năng giải phóng chuyến

Nút quản lý lịch chạy gọi `POST /api/smartbus/v1/operations/cleanup-old-trips`. Trước bản sửa, router tổng quát `/operations/:key` coi `cleanup-old-trips` là tên danh mục và trả `404 — Danh mục không tồn tại`. Endpoint cũ chỉ được mount ở `/api/operations` và `/api/v1/operations`.

Router hành động tĩnh hiện được mount trước router danh mục. Cả ba đường dẫn dùng cùng một handler, yêu cầu đăng nhập và vai trò ADMIN hoặc MANAGER.

Theo yêu cầu ngày 13/10/2026, hoàn tất những chuyến `SCHEDULED` hoặc `IN_TRANSIT` có `arrival_time <= NOW()`, thay cho chờ đủ bảy ngày kể từ khởi hành. Chuyến chưa đến giờ kết thúc, chuyến đã hoàn tất và chuyến hủy giữ nguyên. Không xóa chuyến, vé, giao dịch hay phân công. Lệnh UPDATE dùng điều kiện trạng thái nên chạy lại an toàn và trả đúng số chuyến đã thay đổi. Job giải phóng định kỳ hiện có cũng dùng quy tắc này; lịch chạy job vẫn cần được cấu hình ở môi trường triển khai.

Frontend hiển thị thông báo và số chuyến do API trả về, bao gồm trường hợp 0 chuyến. Chế độ demo tính giờ đến từ giờ khởi hành cộng thời lượng và dùng cùng điều kiện trạng thái/thời gian.

Kiểm tra: `npm --prefix backend run build` rồi `npm --prefix backend run test:trip-cleanup`. Test sử dụng PostgreSQL cô lập và router thật, kiểm tra đường dẫn UI/legacy, quyền, chuyến gần đây đã kết thúc, chuyến đang chạy đã kết thúc, chuyến có giờ khởi hành rất cũ nhưng giờ đến còn ở tương lai, trạng thái hủy và yêu cầu lặp. CI chạy test này sau build. Frontend kiểm tra thông báo theo số chuyến thực tế qua `useAction.test.tsx`.
