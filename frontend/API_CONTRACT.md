# Hợp đồng API frontend SmartBus mới

Base URL mặc định /api/smartbus/v1; tất cả response là JSON trực tiếp (không envelope). Đây là hợp đồng adapter đề xuất, chưa phải các endpoint backend hiện có. Các interface nguồn ở features/*/types. Thời gian ISO 8601 có timezone; tiền nguyên VND. Lỗi HTTP 400/401/403/404/409/410 trả {message}; client cần quyền từ /auth/session và server vẫn kiểm tra quyền API.

| Endpoint                          | Body / response                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| GET /catalog                      | {routes: Route[], stops: Stop[], vehicles: Vehicle[], trips: Trip[]}                                  |
| POST /auth/login                  | {email,password} → User; đặt cookie session                                                           |
| POST /auth/register               | {name,email,phone,password} → User; chỉ PASSENGER                                                     |
| GET /auth/session                 | User đã xác minh, permissions và active từ server                                                     |
| POST /auth/logout                 | Hủy cookie session                                                                                    |
| POST /auth/forgot-password        | {email} → {message}; không tiết lộ tồn tại tài khoản                                                  |
| PUT /auth/profile                 | {name,phone} → User                                                                                   |
| GET /trips?from=&to=&date=&time=  | Trip[]; ngày/giờ trong Asia/Ho_Chi_Minh                                                               |
| GET /trips/:id                    | Trip                                                                                                  |
| GET /trips/:id/seats              | Seat[]; mine được server tính theo session                                                            |
| POST /holds                       | {tripId,seatIds,quantity,from?,to?} → Hold, có serverTime, expiresAt, boardingStopId, alightingStopId |
| GET /holds/:id                    | Hold thuộc session, serverTime mới                                                                    |
| DELETE /holds/:id                 | Giải phóng hold của session                                                                           |
| POST /bookings                    | {holdId,name,phone,voucher} → Booking; tính giá/voucher phía server, idempotent theo hold             |
| GET /bookings                     | Booking[] thuộc session                                                                               |
| GET /bookings/:id                 | Booking thuộc session, không tin callback params                                                      |
| POST /payments                    | {bookingId,gateway,idempotencyKey} → Payment; redirectUrl HTTPS sandbox khi tích hợp                  |
| GET /bookings/:id/payment         | Payment gần nhất hoặc null                                                                            |
| POST /bookings/:id/invoice        | Yêu cầu hóa đơn                                                                                       |
| GET /bookings/:id/invoice         | {url} chứng từ backend cấp                                                                            |
| GET /tickets                      | Ticket[] thuộc session, chỉ được phát sau paid                                                        |
| GET /tickets/:id                  | Ticket thuộc session, token opaque không phải auth token                                              |
| POST /tickets/:id/requests        | {kind:cancel/exchange,exchangeTripId?} → Ticket                                                       |
| GET /ticket-requests              | Ticket[] đang chờ, cần support permission                                                             |
| PUT /ticket-requests/:id          | {approve:boolean} → Ticket; khóa tồn chỗ khi đổi                                                      |
| POST /refunds/:bookingId          | Chỉ tài chính; xác nhận từ provider, không tin frontend                                               |
| GET /trips/:id/location           | {lat,lng,updatedAt,connected,eta,nextStop}                                                            |
| POST /ticket-validations          | {tripId,token} → {valid,message,ticketId?,quantity?}; xác minh & mark used nguyên tử                  |
| GET /operations/:resource         | Array theo resource routes/stops/trips/vehicles/staff/assignments                                     |
| POST /operations/:resource        | Tạo entity (schema ở features/operations/schemas)                                                     |
| PUT /operations/:resource/:id     | Cập nhật entity, xác minh tham chiếu và xung đột lịch                                                 |
| DELETE /operations/:resource/:id  | Xóa entity không được tham chiếu                                                                      |
| GET /operations/driver-accounts   | User[] tài xế cho phân công                                                                           |
| GET /staff/trips                  | Trip[] được phân công theo session/quyền                                                              |
| GET /incidents?tripId=            | Incident[] công khai cho hành khách tracking                                                          |
| POST /incidents                   | {tripId,message}; cần quyền nhân viên và phân công                                                    |
| PUT /incidents/:id                | {resolved:true}; cần operations                                                                       |
| GET /passes                       | {passes:Pass[],eligibility:Eligibility[]} thuộc session                                               |
| POST /passes                      | {routeId,id?}; thật phải đi qua thanh toán, trạng thái pending/active                                 |
| POST /eligibility                 | {category,document} → Eligibility                                                                     |
| GET /eligibility/pending          | Eligibility[]; quyền eligibility                                                                      |
| PUT /eligibility/:id              | {approve:boolean}                                                                                     |
| GET /notifications                | Notification[] thuộc session                                                                          |
| POST /notifications/read          | {id?}; thiếu id đánh dấu tất cả của session                                                           |
| POST /notifications/subscriptions | {tripId}                                                                                              |
| GET /support                      | SupportRequest[] thuộc session                                                                        |
| GET /support/all                  | SupportRequest[]; quyền support                                                                       |
| POST /support                     | {subject,message,rating}                                                                              |
| PUT /support/:id                  | {reply}; quyền support                                                                                |
| GET /vouchers                     | Voucher[]; quyền promotions                                                                           |
| POST, PUT, DELETE /vouchers[/id]  | Schema ở features/promotions/services                                                                 |
| GET /reports?from=&to=&routeId=   | Report tổng hợp từ toàn bộ dữ liệu, không từ trang phân trang                                         |
| GET /users                        | User[]; quyền users                                                                                   |
| PUT /users/:id                    | {role,active,permissions}; tránh tự khóa quản trị cuối cùng                                           |
| GET /audit-logs                   | Audit[]; quyền audit                                                                                  |

## Các bất biến phía backend

- Không tin userId, giá, role, permissions, số ghế, thời hạn hoặc trạng thái thanh toán từ localStorage/frontend.
- Hold 10 phút do thời gian server quyết định; 409 khi tranh chấp, 410 khi hết hạn. SeatMode=false cần giữ sức chứa thay cho ghế.
- Tìm trạm theo thứ tự route.stopIds; điểm xuống phải nằm sau điểm lên. Server xác nhận đoạn hành trình, giá và giờ đón. Booking sao chép boardingStopId/alightingStopId từ hold; frontend không thay đổi đoạn của hold đang hiệu lực qua URL. Demo giữ sức chứa và tính giá cả tuyến, giờ hiển thị là giờ khởi hành tại đầu tuyến.
- Payment status chỉ từ webhook/cổng đã kiểm chứng; pending không có QR, failed/canceled chưa thu không cần hoàn, late paid phải đối soát/hoàn.
- Token QR random opaque và hết hạn; server kiểm tra đúng trip, phân công nhân viên, paid, canceled/used, rồi ghi nhận nguyên tử. Demo một QR có quantity để soát nhóm.
- DTO User không có mật khẩu hoặc secret. credentials trong DB demo chỉ phục vụ mô phỏng và tuyệt đối không dùng cho authentication production.
- Backend kiểm soát chính sách vé tháng, duyệt ưu đãi, phí đổi/hủy, hoàn tiền và audit bất biến. Frontend demo không chứng minh các tích hợp này hoạt động thật.
