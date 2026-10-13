# Đánh giá User Story và Product Goals — 12/10/2026

## Kết luận

**Dự án chưa đầy đủ toàn bộ 24 user story và chưa đạt toàn bộ 5 product goal.** Bản hiện tại có luồng đặt vé và vận hành tương đối đầy đủ, nhưng còn thiếu chức năng thực, thiếu đường thao tác trên giao diện và có dữ liệu mô phỏng xuất hiện trong API theo dõi xe.

Theo cách chấm bảo thủ dưới đây: **12 story đạt nghiệp vụ cốt lõi, 11 story đạt một phần, 1 story chỉ có demo/chưa triển khai nghiệp vụ qua API thật.** Đây là số lượng yêu cầu được bao phủ, không phải tỷ lệ hoàn thành dự án theo công sức hoặc story point.

Đánh giá trên bản chính `Project_Smart_Bus_Ticketing_System_ictu`, commit `055e616`, đối chiếu văn bản Product Vision, 5 Goals và 24 User Stories do người dùng cung cấp. Không thay đổi mã ứng dụng trong lượt đánh giá.

## Cách chấm và giới hạn

- **Đạt cốt lõi:** tìm được đường thao tác/nghiệp vụ và backend tương ứng, đáp ứng ý chính của story.
- **Một phần:** đã có chức năng nhưng thiếu một phần yêu cầu, thiếu giao diện chính hoặc chưa đảm bảo hành vi cần thiết.
- **Demo/chưa có API:** giao diện/mô phỏng có thể thao tác nhưng nghiệp vụ thật chưa được triển khai.
- “Đạt cốt lõi” không có nghĩa đã nghiệm thu trên hệ thống đang triển khai. Kiểm thử hiện tại dùng cơ sở dữ liệu PostgreSQL nhúng, gateway và SMTP giả; chưa xác minh merchant thật, thiết bị GPS/camera thật, email thật hoặc kiểm thử trình duyệt xuyên suốt chế độ API.

Frontend hiện mặc định dùng API, backend đã mount `/api/smartbus/v1`. Nhận xét cũ “frontend chưa nối backend” không còn đúng với snapshot này. Bằng chứng: [appConfig](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/configs/app.config.ts:2), [adapter](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/services/adapter.ts:13), [mount API](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/app.ts:37).

## Đối chiếu 24 user story

| US | Tính năng | Kết quả | Bằng chứng và phần cần hoàn thiện |
|---|---|---|---|
| 1 | Tra cứu điểm đi/đến/thời gian | Đạt cốt lõi | Lọc đúng thứ tự trạm, ngày/giờ và giờ đón tại trạm; [API:278](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:278). |
| 2 | Sơ đồ và chọn ghế trống | Đạt cốt lõi | Có trạng thái ghế, kiểm tra ghế tồn tại/trùng và khóa khi đặt; [API:379](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:379), [API:427](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:427). |
| 3 | Giữ chỗ 10 phút | Đạt cốt lõi | Hạn giữ chỗ 10 phút, khóa ghế và giải phóng hết hạn; [API:468](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:468). Callback còn grace 15 phút nếu ghế chưa giải phóng: cần thống nhất nếu acceptance yêu cầu cutoff tuyệt đối tại phút 10. |
| 4 | Vé điện tử QR | Đạt cốt lõi | Vé đã thanh toán có QR, bảo vệ thông tin xác thực và gửi email vé; [API:699](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:699), [email vé](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/services/ticket-email.service.ts:67). |
| 5 | Gửi yêu cầu hủy/đổi | Đạt cốt lõi | Có yêu cầu và quản lý duyệt; trước giờ chạy ít nhất 30 phút, đổi cùng tuyến/cùng giá; [API:737](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:737), [API:785](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:785). Giới hạn chính sách cần ghi rõ khi nghiệm thu. |
| 6 | MoMo/VNPay/ZaloPay/thẻ | Một phần danh sách phương thức | Có MoMo, VNPay và thẻ qua VNPay; chưa có ZaloPay; [API:585](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:585). Nếu “hoặc” chỉ yêu cầu một phương án thanh toán hợp lệ thì nghiệp vụ chính đã đạt. Chưa nghiệm thu gateway thật. |
| 7 | Hóa đơn điện tử qua email | Một phần | Endpoint gửi biên nhận thanh toán, nội dung nói hóa đơn được cấp theo quy trình nhà xe; chưa có luồng phát hành hóa đơn điện tử; [API:1331](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1331). Nếu chỉ yêu cầu biên nhận làm chứng từ thì cần chỉnh acceptance cho đúng tên chức năng. |
| 8 | Hoàn tiền tự động | Một phần | Có hoàn late payment và hoàn sau duyệt hủy qua provider. Chưa thấy worker tự retry/đối soát khi provider lỗi; [hoàn tiền](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/services/payment-refund.service.ts:29), [hủy vé qua UI](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/services/cancellation.service.ts:36). Giao dịch thất bại chưa thu tiền không cần hoàn. |
| 9 | Vị trí xe thời gian thực | Một phần | Có GPS publisher, lưu vị trí và polling. Khi không có GPS, API vẫn nội suy vị trí và trả `connected:true`; ETA thường có giá trị mặc định; [API:322](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:322), [GPS thiết bị](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/features/tracking/components/GpsPublisher.tsx:35). |
| 10 | Báo sắp đến trạm đón/xuống | Một phần | Geofence 300 m đã nối với luồng GPS, có lưu thông báo và chống trùng. Người nhận hiện là mọi khách/subscriber của chuyến, chưa lọc theo trạm đón/xuống riêng; [người nhận thông báo](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/services/notification.service.ts:179). |
| 11 | Báo sự cố/trễ cho khách | Đạt cốt lõi | Kiểm tra tài xế được phân công, lưu sự cố, gửi cập nhật đến khách; [API:1271](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1271). Chưa tính lại ETA tự động từ mức trễ. |
| 12 | CRUD tuyến/trạm/giá | Đạt cốt lõi | Có quản lý tuyến, trạm, giá và kiểm tra dữ liệu liên quan; [API:1396](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1396). |
| 13 | Thời gian biểu và tần suất theo ngày | Một phần | Tạo/sửa từng chuyến có giờ khởi hành. Chưa có lịch mẫu theo ngày, headway/tần suất hoặc sinh chuyến theo lịch; [quản lý chuyến](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/features/operations/components/ResourceManager.tsx:71), [API:1557](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1557). |
| 14 | Phân xe và tài xế/phụ xe | Một phần nếu cần cả tổ lái | Có xe và một `staffId/driver_id`, kiểm tra trùng lịch; chưa phân đồng thời tài xế và phụ xe; [API:1383](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1383), [API:1618](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1618). Nếu dấu “/” là chọn một trong hai thì phần cốt lõi đã có. |
| 15 | Quét QR trên mobile | Đạt cốt lõi | Web mobile dùng camera Html5Qrcode, backend kiểm tra chữ ký/chuyến/quyền/trạng thái và chống soát lại; [camera](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/features/check-in/components/ScanTicket.tsx:101), [API:869](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:869). Cần nghiệm thu camera trên thiết bị thực. |
| 16 | Đăng ký/gia hạn vé tháng | Demo/chưa có API nghiệp vụ | GET trả danh sách vé tháng rỗng; POST luôn trả 503 “chưa mở bán”; [API:1195](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1195), [API:1204](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1204). Thao tác local demo không chứng minh thanh toán, gia hạn và sử dụng vé tháng thật. |
| 17 | Duyệt đối tượng ưu đãi để hưởng giá | Một phần | Có hồ sơ, duyệt và lưu `discount_status/discount_type`; tính giá đặt vé thật hiện chỉ áp voucher, chưa áp ưu đãi đối tượng; [API:1245](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1245), [API:511](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:511). |
| 18 | Tạo voucher | Đạt cốt lõi, có điều kiện về vai trò | Có CRUD, hiệu lực và áp giảm giá thật; [API:1009](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1009), [API:511](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:511). Quyền hiện gắn ADMIN/FINANCE, chưa có vai trò Marketing riêng; cần thống nhất nhân sự kiêm nhiệm hoặc bổ sung role nếu bắt buộc. |
| 19 | Doanh thu theo ngày/tháng/tuyến | Đạt cốt lõi | Báo cáo theo khoảng ngày và tuyến, có thể chọn toàn tháng, dựa giao dịch và trạng thái vé; [API:922](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:922). Chưa có chế độ nhóm dữ liệu theo tháng riêng. |
| 20 | Lấp đầy từng chuyến | Một phần trên giao diện chính | API dashboard legacy có số ghế từng chuyến; giao diện báo cáo chính gom theo ngày/tuyến, chưa cung cấp bảng/chọn từng chuyến; [dashboard API](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/operations.routes.ts:19), [báo cáo chính](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/features/reports/components/Reports.tsx:141). |
| 21 | Xuất Excel/PDF | Đạt cốt lõi | Dùng ExcelJS và jsPDF, có font tiếng Việt và phân trang PDF; [export](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/features/reports/services/export.ts:43). Chưa kiểm tra trực quan file xuất trong lượt này. |
| 22 | Admin tạo và phân quyền tài khoản | Một phần | Backend có tạo tài khoản và cập nhật quyền; UI chính chỉ liệt kê/chỉnh quyền, thiếu form tạo tài khoản; [API:1093](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1093), [UI tài khoản](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/frontend/src/features/administration/components/Administration.tsx:30). |
| 23 | Nhật ký truy cập và thao tác | Một phần | Có audit cho một số thao tác và màn hình đọc log. Chưa ghi đủ đăng nhập thành công/thất bại, truy cập và mọi thay đổi dữ liệu; [API:52](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:52), [API:966](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:966). Log lỗi kỹ thuật không thay thế đầy đủ audit truy cập. |
| 24 | Khiếu nại hoặc đánh giá | Đạt cốt lõi qua khiếu nại | Có gửi phản ánh, trả lời và rating; [API:1146](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1146), [API:1167](D:/ICTU/TTCS2026/Team 5/Final_Project/Project_Smart_Bus_Ticketing_System_ictu/backend/src/routes/ui.routes.ts:1167). Rating trên UI chính chưa gắn chuyến/vé cụ thể, nên chưa thể coi là đánh giá từng chuyến hoàn chỉnh. Story dùng “hoặc”, đường khiếu nại đáp ứng ý chính. |

Đối với US6, US14, US18 và US24, cách diễn đạt về phương án/vai trò có thể thay đổi kết quả chấm sau khi thống nhất acceptance criteria. Bảng này không tự đặt yêu cầu ứng dụng native, tất cả gateway cùng lúc hoặc một vai trò mới như điều kiện bắt buộc nếu spec chưa quy định.

## Đối chiếu 5 Product Goals

| Goal | Mức đáp ứng | Phần đã có | Phần còn thiếu để tuyên bố đạt đầy đủ |
|---|---|---|---|
| 1. Số hóa bán vé/thanh toán | Gần đạt phần chức năng cốt lõi | Tra cứu, ghế, giữ chỗ, thanh toán MoMo/VNPay/thẻ và QR | Nghiệm thu giao dịch thật, callback và soát vé trên thiết bị. Cam kết loại bỏ hoàn toàn vé giấy cần kiểm chứng quy trình vận hành, không suy ra từ code. |
| 2. Tối ưu vận hành | Một phần | Tuyến, trạm, xe, chuyến, phân công và soát QR | Lịch mẫu/tần suất chạy theo ngày; phân công tổ lái nếu yêu cầu đồng thời tài xế và phụ xe. |
| 3. Trải nghiệm bằng vị trí | Một phần, cần xử lý trước khi nghiệm thu | GPS publisher, lưu vị trí, bản đồ, geofence và báo sự cố | Không dùng vị trí giả trong API thật; ETA từ dữ liệu thật; thông báo đúng trạm cá nhân; tự thông báo thay đổi lịch/trễ. |
| 4. Tài chính và chính sách ưu đãi | Một phần | Doanh thu theo ngày/tuyến, vé lượt và voucher, duyệt hồ sơ | Vé tháng thật và gia hạn; áp giá ưu đãi đã duyệt; bộ lọc/phân tích theo xe trên UI. API có `vehicleId` nhưng UI chưa dùng. |
| 5. Phân tích vận tải chiến lược | Chưa thấy triển khai | Có thống kê doanh thu và lấp đầy làm nền dữ liệu | Phân tích mật độ theo khung giờ/trạm, đề xuất tần suất và dự báo nhu cầu cao điểm. Chưa tìm thấy pipeline/model hay endpoint/UI thực hiện các chức năng này. |

**Goal 5 chưa có user story chuyên biệt trong danh sách 24 story.** US19–21 mới bao phủ báo cáo mô tả và xuất dữ liệu, chưa bao phủ đề xuất hay dự báo. Vì vậy hoàn thành cả 24 story vẫn chưa tự động hoàn thành Product Vision/Goals.

## Ưu tiên hoàn thiện và điều kiện nghiệm thu

1. **GPS đáng tin cậy:** API không có vị trí phải báo chưa có dữ liệu/mất kết nối; giữ timestamp đo thật, bỏ nội suy giả ở API; tính ETA/next stop hoặc báo chưa xác định. Test cả chưa từng nhận GPS, GPS cũ, mới và mất quyền thiết bị.
2. **Vé tháng và giá ưu đãi:** triển khai persistence, mua/gia hạn qua gateway, kỳ hiệu lực, quyền sử dụng khi lên xe; áp đối tượng đã duyệt vào tính giá đúng chính sách. Test mua, callback lặp, gia hạn, hết hạn, hoàn tiền và soát vé tháng.
3. **Hoàn tiền bền vững:** thống nhất hành vi legacy và API mới; có trạng thái pending, idempotency, retry/đối soát và quan sát lỗi. Luồng UI hiện gọi provider trong transaction, khác luồng legacy được mô tả là ghi hủy trước khi gọi provider.
4. **Vận hành/thông báo:** lịch theo ngày/tần suất, phân công tổ lái theo phạm vi thống nhất; thông báo đúng trạm và thay đổi lịch/trễ, tránh gửi mọi trạm cho mọi khách.
5. **Hoàn thiện UI/kiểm toán:** tạo tài khoản trên màn hình Admin; thống kê từng chuyến, bộ lọc xe; log truy cập/đăng nhập và thay đổi dữ liệu đầy đủ.
6. **Chốt phạm vi chứng từ/thanh toán:** biên nhận hay hóa đơn điện tử; ZaloPay có bắt buộc; phân quyền nhân viên Marketing. Triển khai đúng phạm vi đã chốt.
7. **Bổ sung backlog cho Goal 5:** density theo giờ/trạm, đề xuất tần suất có giải thích và dự báo cao điểm. Định nghĩa dữ liệu đầu vào, khoảng thời gian dự báo và ngưỡng sai số/độ tin cậy trước khi nghiệm thu; chưa đủ dữ liệu phải báo rõ.

## Kiểm chứng trong lượt đánh giá

| Kiểm chứng | Kết quả |
|---|---|
| Backend build TypeScript | Đạt |
| Backend Jest | 73/73 test, 8/8 suite đạt |
| API/nghiệp vụ với PostgreSQL nhúng | 301 kiểm tra đạt; gateway/SMTP dùng giả lập |
| Frontend Vitest, worker cô lập | 76/76 test, 14/14 file đạt |
| Landing/theme Node tests | 8/8 đạt |
| Frontend TypeScript và production build | Đạt; Vite có cảnh báo một số bundle lớn hơn 500 kB |

Lệnh frontend xác nhận: `vitest run --pool=threads --maxWorkers=1`, giữ cô lập mặc định và chế độ demo của cấu hình test. Lần thử dùng `--no-isolate` có 27 lỗi; chạy lại cô lập đạt toàn bộ, nên không dùng các lỗi ở cấu hình thử đó để kết luận ứng dụng hỏng. Lần chạy fork worker ban đầu không khởi tạo được worker trong thời hạn; không có test chức năng nào chạy ở lượt đó.

Log nằm tại `D:/ICTU/TTCS2026/Team 5/Final_Project/project-story-review-20261012`. Không chạy test trên dữ liệu production, không gửi email thật, không gọi merchant thật.

Tài liệu lịch sử có một số mô tả cũ về API/GPS. Các kết luận trong báo cáo ưu tiên mã nguồn tại commit được ghi trên, không lấy đánh dấu hoàn thành trong tài liệu làm bằng chứng nghiệm thu.
