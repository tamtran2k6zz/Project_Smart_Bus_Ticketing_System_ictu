# Sửa lỗi và đánh giá lại SmartBus — 11/10/2026

## Kết luận

Đã sửa và kiểm chứng **8/8 lỗi trong báo cáo ban đầu** trên bản chính `Project_Smart_Bus_Ticketing_System_ictu`. Đã xử lý thêm hai rủi ro phát hành vé/thanh toán demo và các đường hiển thị QR của giao diện legacy bị ảnh hưởng. Các kiểm tra cục bộ về kiểu dữ liệu, lint, build, nghiệp vụ và API/database đều đạt.

Baseline: commit `3201308828bba3c7f91a21d9797fe31b309b20b7` cộng thay đổi worktree người dùng đã có. Việc xóa `api/index.ts` và di chuyển sang `backend/api/index.ts` được giữ lại; thêm adapter JavaScript ở root để Vercel nạp Express đã build. Không commit, push, triển khai hoặc thay đổi database thật trong lượt này.

## Đối chiếu từng lỗi

| Mã | Trước sửa | Sau sửa và bằng chứng |
|---|---|---|
| S1 — P1 | Callback thành công lặp sau soát vé bị xem là thanh toán muộn, dẫn đến hoàn tiền | `confirmPayment` nhận cả `BOOKED` và `CHECKED_IN` là đã xác nhận. Test HTTP gửi lại callback ký hợp lệ sau check-in: vé vẫn `CHECKED_IN`, thanh toán `SUCCESS`, không gọi refund. |
| S2 — P1 | Soát vé trong lúc chờ hoàn tiền có thể làm hoàn tiền vé vừa dùng | Transaction khóa hàng vé, lưu `CANCELLED`, giải phóng ghế và lưu khóa idempotency trước lời gọi provider. Test giữ provider ở trạng thái chờ rồi soát vé nhận 409; test provider thất bại vẫn giữ vé đã hủy và retry dùng cùng request ID. |
| S3 — P1 | Import entrypoint sai; Vercel trỏ file đã xóa | Sửa import ở `backend/api/index.ts`; `api/adapter.js` nạp `backend/dist/app.js`; cấu hình function/rewrite/includeFiles khớp adapter. Full backend typecheck và smoke HTTP qua adapter đạt. Chưa xác nhận cloud deployment. |
| S4 — P2 | Từ chối hủy giữ chỗ `RESERVED/PENDING` | Hủy chuyển vé sang `CANCELLED`, giao dịch sang `FAILED`, ghế khả dụng. Callback thành công đến sau hủy được hoàn tiền; không khôi phục vé và callback lặp không hoàn thêm. |
| S5 — P2 | SQL dùng cột `route_stops.sequence` không tồn tại | Dùng `stop_order AS sequence` và sắp xếp theo `stop_order`. Chạy service thật qua migrations PostgreSQL nhúng, xác nhận thông báo `BUS_APPROACHING` đọc được từ API. |
| S6 — P2 | Tìm chuyến trả hành trình ngược chiều | SQL yêu cầu `origin_rs.stop_order < dest_rs.stop_order`. API tìm thuận chiều có chuyến, ngược chiều trả danh sách rỗng. Test mới đã thất bại trước sửa và đạt sau sửa. |
| F1 — P2 | Sửa giờ/thời lượng/xe bỏ qua xung đột phân công; xe trong assignment lệch trip | Dùng cùng helper kiểm tra overlap cho lưu assignment và sửa trip; cập nhật xe assignment sau khi kiểm tra đạt. Test chồng lịch bị từ chối và không lưu; đổi xe hợp lệ được đồng bộ. |
| F2 — P2 | Sửa danh sách trạm làm mất hành trình đang giữ/đã mua | Chặn đổi danh sách/thứ tự trạm khi tuyến có hold active hoặc booking paid. Test cho cả hold và vé đã trả tiền; danh sách trạm được giữ nguyên. |

Mã liên quan: [ticketing.routes.ts](<D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ticketing.routes.ts:80>), [trips.controller.ts](<D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/controllers/trips.controller.ts:52>), [notification.service.ts](<D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/services/notification.service.ts:157>), [operations.api.ts](<D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/features/operations/services/operations.api.ts:16>).

## Các thay đổi bổ sung cần thiết

- Bỏ nhánh phát hành `BOOKED` trực tiếp khi không truyền `paymentMethod`. Mặc định tạo QR reservation `RESERVED/PENDING`; chưa thanh toán không có QR soát vé và scan bị từ chối.
- Demo mặc định tắt, cần `PAYMENT_DEMO_ENABLED=true` ngoài production. Production luôn từ chối. Demo chỉ xác nhận vé còn hạn trên chuyến chưa khởi hành, cập nhật số ghế đã đặt và giữ nguyên trạng thái chuyến.
- Giao diện legacy tiếp nhận trạng thái vé đã hủy ngay cả khi HTTP hoàn tiền báo lỗi; ẩn QR, giữ trạng thái tiền chưa hoàn và có nút thử lại. Lịch sử chỉ hiện QR cho `BOOKED/SUCCESS` trước khi chuyến hết thời gian. Thao tác demo không còn chuyển sang đánh giá chuyến chưa kết thúc.
- Cập nhật README, hướng dẫn Vercel, env mẫu và CI. CI kiểm tra full backend typecheck, API/PostgreSQL và adapter sau build.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Backend full TypeScript (`npm --prefix backend run typecheck`) | Đạt, gồm entrypoint đã di chuyển |
| Frontend TypeScript | Đạt, gồm thay đổi cuối ở lịch sử vé |
| Lint backend và frontend | Đạt |
| Build backend và frontend | Đạt |
| Backend Jest | **61/61**, 7 suites |
| Frontend Vitest | **43/43**, 8 files; dùng pool forks, một worker trên Windows |
| Frontend Node landing tests | **8/8** |
| API/database PostgreSQL nhúng | **147 checks**, migrations thật, gateway cục bộ giả lập |
| Serverless adapter | Đạt: nạp compiled Express, request API nhận JSON 404 đúng |
| Chrome E2E | **13/13**, 4,1 phút; tìm chuyến, checkout/QR, phân quyền, CRUD, xuất báo cáo, hủy/hoàn demo và các viewport |
| 5 tình huống probe của review ban đầu | Đạt với kỳ vọng đã sửa |

Lệnh chạy hồi quy chính:

```sh
npm --prefix backend run typecheck
npm run lint
npm run build
npm --prefix backend test -- --runInBand
npm --prefix backend run test:postgres
npm --prefix backend run test:serverless
npm --prefix frontend run test:landing
```

Vitest chạy trong thư mục `frontend` bằng `vitest run --pool=forks --maxWorkers=1 --no-isolate`. E2E dùng `npm run test:e2e`, Chrome cục bộ, cổng 3079 và chế độ frontend demo. Các thông báo lỗi trong log API là test âm có chủ đích, ví dụ vé đã dùng, ghế đã giữ hoặc provider từ chối hoàn tiền.

Log trước/sau nằm tại thư mục workspace `project-review-20261011`: `regression-before.log`, `postgres-after.log`, `frontend-build-after.log`, `e2e-after.log`. Các log review cũ giữ nguyên để đối chiếu; hai script probe đã đổi kỳ vọng từ tái hiện lỗi sang kiểm tra bản sửa. Không dùng kết quả cũ để kết luận trạng thái hiện tại.

## Standards

Review theo skill `code-review`, đọc độc lập hai trục. Không tìm thấy vi phạm quy tắc cứng mới trong thay đổi. Có một khuyến nghị thiết kế không chặn: orchestration hủy/hoàn tiền còn nằm trong route và có phần giống `refundLatePayment`; có thể gom vào service có kiểu kết quả rõ ràng khi mở rộng chính sách hoàn tiền. Không cần refactor kiến trúc để đóng tám lỗi hiện tại.

## Spec

Hai lỗi nghiệp vụ frontend F1/F2 đã đóng. Review tiếp phát hiện giao diện legacy chưa phản ánh hủy chờ hoàn tiền và vẫn mở đánh giá sau demo; đã sửa và được đọc lại. Đường QR trong lịch sử cũng đã được sửa. Không phát hiện blocker mới trong phạm vi diff đã kiểm tra.

**Kết quả hai trục:** Standards: 0 vi phạm cứng, 1 khuyến nghị thiết kế; Spec: 0 finding còn mở trong phạm vi sửa lỗi này.

## Giới hạn của kết luận

- Frontend chính vẫn mặc định demo/localStorage. Hợp đồng đề xuất `/api/smartbus/v1` chưa được tích hợp đầy đủ với Express `/api/v1`; việc đó là phần phát triển riêng đã công bố trong tài liệu, không được coi là đã hoàn thành bởi các bản sửa này.
- Chưa triển khai Vercel preview, ghi dữ liệu Supabase thật, giao dịch merchant thật, email thật hoặc FCM thật. Smoke local chỉ xác minh entrypoint và cấu hình trong repository.
- Test PostgreSQL nhúng dùng adapter một session, tuần tự hóa transaction. Đã kiểm tra scan khi provider đang chờ, nhưng chưa chứng minh mọi interleaving/khóa bằng nhiều connection PostgreSQL thật. Khả năng idempotency của provider thật cần kiểm tra trong sandbox merchant.
- Truy vấn thông báo gần trạm đã sửa và chạy được; việc nối service này từ luồng GPS runtime vẫn là khoảng trống tích hợp được ghi nhận trước đó.
- Bảo vệ danh sách trạm hiện giữ nguyên cấu trúc tuyến có booking paid, kể cả lịch sử. Muốn thay cấu trúc tuyến đã bán cần tạo tuyến/phiên bản hành trình mới.
- Build frontend còn cảnh báo bundle ExcelJS khoảng 930 kB; không gây lỗi build, chưa tối ưu thêm trong phạm vi sửa lỗi này.

Đánh giá hiện tại: **đạt các kiểm tra cục bộ cho phạm vi tám lỗi đã phát hiện; chưa đủ bằng chứng nghiệm thu vận hành bán vé/thanh toán thật.**
