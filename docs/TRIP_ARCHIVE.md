# Giải phóng chuyến hoàn thành

Từ phiên bản này, **Giải phóng chuyến hoàn thành** tại **Lịch chạy** xử lý tất cả chuyến đã hoàn thành, không yêu cầu chờ 7 ngày.

## Quy tắc

- Chuyến `SCHEDULED`/`IN_TRANSIT` đã qua giờ đến dự kiến được chuyển thành `COMPLETED` và lưu trữ.
- Mọi chuyến đã ở trạng thái `COMPLETED` đều được lưu trữ, kể cả chuyến vừa hoàn thành.
- Chuyến đã lưu trữ được bỏ qua khi chạy lại; số đếm chỉ gồm các chuyến mới được giải phóng.
- Chuyến chưa đến giờ hoàn tất và chuyến `CANCELLED` không bị thay đổi.

Lưu trữ ghi thời điểm vào `trips.archived_at`. Không xóa chuyến, vé, thanh toán hoặc liên kết xe/tài xế/phụ xe. Các liên kết này là lịch sử đối soát; xe và tổ lái của chuyến đã lưu trữ không còn được tính vào kiểm tra trùng lịch mới.

## Giao diện

**Lịch chạy** và **Phân công chuyến** có hai chế độ:

- **Đang vận hành**: các chuyến/phân công chưa lưu trữ.
- **Đã lưu trữ**: tra cứu lịch sử, không có nút thêm/sửa/xóa.

Danh sách chuyến của nhân viên và danh sách `/api/v1/trips` mặc định bỏ qua chuyến đã lưu trữ. Catalog vẫn cung cấp ngữ cảnh chuyến cũ cho vé của hành khách; báo cáo, doanh thu và phân tích lịch sử vẫn tính dữ liệu của chuyến lưu trữ.

## Triển khai

Áp dụng migration `supabase/migrations/20261015000000_archive_completed_trips.sql` trước khi triển khai API. Migration chỉ thêm cột, ràng buộc và index; không tự lưu trữ hoặc xóa chuyến hiện có. Sau triển khai, bấm nút giải phóng để đưa các chuyến đã hoàn thành vào lưu trữ, hoặc chờ tác vụ định kỳ hiện có (Express mỗi phút; Vercel theo lịch cron đã cấu hình).

API `POST /api/smartbus/v1/operations/cleanup-old-trips` giữ quyền ADMIN/MANAGER và khóa trả về `oldTripsCleaned`. Số đếm nay bao gồm cả các chuyến đã hoàn thành được lưu trữ. Dùng `GET /api/smartbus/v1/operations/trips?archived=true` hoặc `.../assignments?archived=true` để xem lịch sử lưu trữ; danh sách mặc định chỉ trả dữ liệu chưa lưu trữ.

## Kiểm thử

`npm --prefix backend run build` và `npm --prefix backend run test:trip-cleanup` kiểm tra chuyến đã hoàn thành biến mất khỏi vận hành nhưng vẫn còn trong lịch sử, vé/thanh toán/tài xế được giữ nguyên, xe và tổ lái dùng được cho lịch mới, trùng lịch đang hoạt động vẫn bị chặn, quyền truy cập và việc bấm nhiều lần.

Kiểm thử giao diện `ResourceManager.test.tsx` kiểm tra nút giải phóng, hai danh sách và quyền chỉ xem lịch sử; kiểm thử demo trong `business.test.ts` xác nhận hành vi tương ứng.
