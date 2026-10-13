# SmartBus — đánh giá sau triển khai, 12/10/2026

## Kết luận và cách đọc

**24 user story đã có đường đi chức năng trong mã nguồn; cả 5 goal có chức năng tương ứng để trình diễn.** Bản API cục bộ có thể chạy kịch bản 15 phút với database được tạo từ migration thật. Đây là kết luận về phạm vi chức năng và kiểm thử của dự án, chưa phải nghiệm thu tích hợp production hay khẳng định các chỉ tiêu kinh doanh đã đạt trên dữ liệu thật.

Đánh giá trước triển khai được giữ nguyên tại [báo cáo ban đầu](USER_STORY_GOAL_ASSESSMENT_2026-10-12.md). Các nhận xét thiếu ZaloPay, vé tháng chỉ lưu trình duyệt, GPS dựng vị trí, chưa có Goal 5 trong báo cáo đó mô tả bản trước lần bổ sung này; dùng tài liệu hiện tại để báo cáo trạng thái mới.

## Đối chiếu 24 user story

| US | Kết quả hiện tại | Bằng chứng / điều kiện nghiệm thu còn lại |
|---|---|---|
| 1 | Tìm theo điểm đi/đến, ngày và giờ; xét thứ tự trạm | `ui.routes.ts`, kiểm thử API và trình duyệt |
| 2 | Sơ đồ ghế, chọn ghế, kiểm tra ghế còn trống trên backend | Transaction và khóa ghế; kiểm thử xung đột |
| 3 | Giữ đúng 10 phút; callback quá hạn không tiếp tục bán ghế bằng grace 15 phút | `ticket.service.ts`, bài kiểm thử hết hạn và callback muộn |
| 4 | Vé QR sau thanh toán; QR không hợp lệ/đã dùng bị từ chối | Vé lượt được đặt, thanh toán và soát qua API trong kiểm thử trình duyệt |
| 5 | Gửi/duyệt hủy và đổi, cập nhật ghế và vé | Đã thử giao diện với hai vé chuẩn bị; chính sách trước giờ chạy ≥30 phút, cùng tuyến/cùng giá |
| 6 | MoMo, VNPay, ZaloPay; thẻ ngân hàng qua VNPay | `zalopay.service.ts`, kiểm chữ ký/merchant/số tiền/callback lặp; chưa nghiệm thu merchant thật |
| 7 | Ledger phát hành hóa đơn, adapter HTTP idempotency, gửi email kèm chứng từ, tải lại hóa đơn | `invoice.service.ts`; demo phát hành chứng từ DEMO; cần hợp đồng API và tài khoản đơn vị hóa đơn cụ thể |
| 8 | Hoàn tiền sau hủy/thu tiền muộn; hàng đợi bền vững, lease, thử lại, truy vấn kết quả ZaloPay | `refund-queue.service.ts`, `payment-refund.service.ts`; cần nghiệm thu giao dịch hoàn thật |
| 9 | Vị trí/thời điểm GPS thật từ dữ liệu nhận; không bịa tọa độ hoặc ETA khi thiếu/cũ | `tracking-read.service.ts`; demo bơm GPS giả qua API; cần thử thiết bị thật |
| 10 | Chọn trạm đón/xuống riêng, thông báo đúng người, chống trùng | `notification.service.ts`, API kiểm thử người nhận và dedup |
| 11 | Tài xế/phụ xe được phân công gửi sự cố và số phút trễ; khách nhận thông báo | Dữ liệu trễ được lưu và dùng trong tracking |
| 12 | CRUD tuyến/trạm/giá; chính sách giảm giá và giá vé tháng điều chỉnh được | `fare-policy.service.ts`, `FarePolicies.tsx` |
| 13 | Lịch theo ngày trong tuần, khung giờ, headway; sinh chuyến nguyên tử, chặn trùng xe | `schedule.service.ts`, `SchedulePlanner.tsx`; tối đa 31 ngày/300 chuyến mỗi lần; chặn ngày không tồn tại |
| 14 | Phân công xe, tài xế và phụ xe riêng; chặn trùng lịch, sai vai trò và cùng người | `crew-assignment.service.ts`; đổi giờ chuyến giữ nguyên ghế và thông báo khách |
| 15 | Camera QR trên web responsive và nhập token dự phòng; soát vé lượt/vé tháng, danh sách đã lên xe | Phụ xe dùng vai trò DRIVER, được gán riêng; API soát và roster đã thử; camera vật lý chưa nghiệm thu |
| 16 | Mua/gia hạn vé tháng có thanh toán backend; gia hạn thêm đúng 30 ngày, QR ký, chặn replay | `monthly-pass.service.ts`; tự cấp ghế khi lên xe, có kiểm tra sức chứa |
| 17 | Duyệt đối tượng ưu tiên rồi áp dụng giá vé lượt/vé tháng từ chính sách | Sinh viên, cao tuổi, người lao động, khuyết tật; giảm giá ưu tiên và voucher lấy mức lớn hơn, không cộng dồn |
| 18 | Vai trò Marketing tạo/quản lý voucher, không xem báo cáo tài chính | RBAC ở API và giao diện; có kiểm thử 403 |
| 19 | Doanh thu ngày/tháng, lọc tuyến/xe; vé tháng hiển thị riêng theo ngày thanh toán | Không phân bổ doanh thu vé tháng giả vào xe; lọc xe loại phần doanh thu vé tháng |
| 20 | Lấp đầy từng chuyến gồm vé lượt còn hiệu lực và lượt soát vé tháng | `product.routes.ts`, `TransportStrategy.tsx` |
| 21 | Xuất Excel/PDF theo bộ lọc, gồm phần vé tháng | Đã tải và kiểm tra file qua trình duyệt |
| 22 | Admin tạo tài khoản, phân vai trò, khóa tài khoản; API kiểm tra vai trò hiện tại | Mật khẩu được hash; kiểm thử tạo user và từ chối truy cập trái quyền |
| 23 | Nhật ký truy cập và thay đổi: người, method, path, HTTP status, IP | `audit.service.ts`; ghi cả truy cập 403, không ghi body chứa mật khẩu |
| 24 | Phản ánh/đánh giá sao gắn chuyến đã mua hoặc đã soát vé tháng; quản lý trả lời và thông báo | Backend kiểm tra quyền đánh giá chuyến; đã thử gửi và phản hồi qua trình duyệt |

Các đường dẫn mã nguồn trong bảng là tên file; backend nằm ở `backend/src/services`, `backend/src/routes`; frontend nằm ở `frontend/src/features`.

## Đối chiếu 5 goal

| Goal | Phần đã triển khai và có thể demo | Giới hạn đánh giá |
|---|---|---|
| G1: Số hóa bán vé | Tìm chuyến → giữ ghế → thanh toán → QR; hủy/đổi/hoàn; vé tháng và ưu tiên | Cần nghiệm thu provider thật; chưa đo tỷ lệ chuyển đổi thực tế |
| G2: Điều hành | Tuyến/trạm/giá, lịch mẫu, xe/tài xế/phụ xe, dời giờ chuyến, soát QR và danh sách lên xe | Cần chạy thử quy trình với nhà xe và thiết bị thực |
| G3: Theo dõi hành trình | GPS, trạng thái dữ liệu cũ, ETA, trạm riêng, sự cố và trễ | Cần thử GPS/camera/push trên thiết bị và mạng thực |
| G4: Tài chính và báo cáo | Ngày/tháng/tuyến/xe, doanh thu vé tháng riêng, hoàn tiền, lấp đầy, Excel/PDF | Cần đối soát giao dịch provider, hóa đơn và SMTP thực |
| G5: Tối ưu tần suất | Mật độ theo giờ/trạm, đề xuất tăng/giữ/giảm, dự báo theo lịch sử cùng thứ, hệ số cao điểm và số chuyến khuyến nghị | Dự báo thống kê tham khảo; dữ liệu giả không chứng minh sai số hay hiệu quả tối ưu |

Goal 5 dùng lượng khách lịch sử từ vé hợp lệ/lượt vé tháng. Thời gian tại trạm có cộng thời gian di chuyển từ đầu tuyến. Dự báo dùng trung bình cùng thứ, fallback trung bình ngày; ngưỡng đề xuất dựa trên sức chứa. Khoảng dự báo là trung bình ± độ lệch chuẩn, chưa phải khoảng tin cậy được hiệu chỉnh. Cần thống nhất tiêu chí sai số và đánh giá trên lịch sử vận hành thật.

## Kiểm chứng

Các kiểm tra chạy trên bản chính cục bộ, Node.js/Chrome và PostgreSQL nhúng PGlite. PGlite có transaction và chạy migration SQL, nhưng chưa thay thế kiểm thử tải trên PostgreSQL server nhiều kết nối.

- Backend: **83 test / 12 suite**, build, typecheck và lint đạt.
- Frontend: **79 Vitest + 8 test giao diện/theme bằng Node**, build, typecheck và lint đạt. Build còn cảnh báo chunk thư viện xuất file lớn; không chặn chạy demo.
- API/database: **372 kiểm tra đạt**, gồm auth/RBAC, vé, callback, giữ chỗ, lịch/xe, vé tháng, giá ưu tiên, thông báo riêng, hoàn tiền, hóa đơn và báo cáo. Có kiểm tra không hủy lịch có người đã lên bằng vé tháng và hủy được lịch rỗng.
- Trình duyệt API demo: **3/3 kịch bản đạt**, xuyên suốt đặt vé/vé tháng/soát vé; quản lý/báo cáo/phân quyền; hủy/đổi/ưu tiên/tracking/đánh giá. Kiểm tra bổ sung nút đăng nhập nhanh dùng tài khoản demo cô lập cũng đạt. Kiểm thử làm thay đổi dữ liệu, phải reset trước báo cáo.
- Hồi quy trình duyệt chế độ mô phỏng độc lập: **13/13 đạt**, gồm responsive, bàn phím, điều hướng, giữ chỗ/hết hạn, QR, CRUD, xuất file, ưu tiên/phản ánh và đăng ký. Đã cập nhật selector theo nhãn hiện tại, giới hạn trường vai trò trong dialog và đặt đồng hồ kiểm thử vào cửa sổ soát vé. Các ca này bổ sung kiểm tra giao diện; ba kịch bản API phía trên mới đi qua backend demo.
- Serverless handler đã qua kiểm thử cô lập. Không có triển khai production trong lần làm việc này.

Log kiểm chứng nằm ở thư mục cạnh dự án `../project-story-review-20261012/`: `backend-features-unit-final.log`, `frontend-features-tests-final.log`, `frontend-features-build-final.log`, `features-integration-final.log`, `legacy-e2e-final.log`, `demo-browser-clean-final.log`, `demo-quick-login-final.log`, `features-serverless.log`. Những lần chạy trước có thể còn log lỗi trong thư mục này; dùng kết quả cuối tương ứng, không coi mọi file log là một lần kiểm thử duy nhất.

Chứng cứ demo tại `backend/demo-output/evidence/`: ảnh `reports.png`, Excel `report.xlsx`, PDF `report.pdf`. Đây là dữ liệu giả phục vụ báo cáo. ID và vé chuẩn bị nằm ở `ids.json` và `prepared.json`; không commit đầu ra demo hoặc tài khoản này vào môi trường thật.

## Sẵn sàng báo cáo

Chạy `DEMO_START.ps1`, mở **http://127.0.0.1:3010**, đăng nhập `passenger@smartbus.demo` / `SmartBus123!`. Có tài khoản driver, conductor, manager, finance, admin, marketing cùng miền và mật khẩu. Dừng/reset bằng `DEMO_STOP.ps1` rồi `DEMO_START.ps1`; đăng nhập lại sau reset.

[Kịch bản 15 phút và cách xử lý dự phòng](DEMO_2026-10-13.md) đã đối chiếu tất cả 24 story và 5 goal, kèm tài khoản, thứ tự thao tác, vé mẫu và lời dẫn.

## Điều kiện trước khi tuyên bố sẵn sàng production

1. Cấu hình và nghiệm thu merchant sandbox thật MoMo/VNPay/ZaloPay, callback HTTPS công khai, hoàn tiền và đối soát.
2. Nối adapter với hợp đồng API cụ thể của nhà cung cấp hóa đơn, thông tin đơn vị bán; xác minh chứng từ gốc. Hóa đơn DEMO không phải hóa đơn thuế.
3. Cấu hình SMTP, thử nhận email thật; thử camera/GPS và thông báo trên thiết bị/mạng thật.
4. Chạy migration/backup trên database mục tiêu và kiểm thử tải/xung đột nhiều kết nối.
5. Dùng lịch sử vận hành thật để đánh giá dự báo và đo chỉ tiêu product goal.

Không cần các tài khoản bên ngoài để trình diễn bản cục bộ đã chuẩn bị; banner trên demo ghi rõ thanh toán, hóa đơn, email và GPS mô phỏng.
