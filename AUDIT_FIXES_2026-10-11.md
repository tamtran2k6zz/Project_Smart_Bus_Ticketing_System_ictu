# SmartBus — kết quả sửa lỗi kiểm toán 11/10/2026

## Phạm vi và kết luận

Sửa trên nhánh `codex/fix-audit-findings-20261010`, từ main `11bdf7633d357d047ad62739a797aef406f42c06`. Đã fetch origin/main ngày 11/10; main vẫn ở commit này nên nhánh sửa không có chênh lệch cần hòa giải với main tại thời điểm kiểm tra.

Stack giữ Express + PostgreSQL. Giữ `.github` và workflow CI. `api/adapter.js` chỉ là entrypoint Vercel; logic ứng dụng nằm trong `backend`. Working copy khác đang có thay đổi của người dùng không bị sửa.

Các lỗi trọng tâm N1–N7 đã có bản sửa và kiểm tra hồi quy trong checkout này; dependency runtime N8 không còn cảnh báo theo npm audit tại thời điểm kiểm tra. Đây là kết quả local, chưa push, merge, migrate database production hoặc deploy Vercel. Chưa đủ cơ sở xác nhận toàn bộ 24 user story hoặc 5 Product Goals hoàn thành.

## Đối chiếu lỗi và bản sửa

| Mã | Bản sửa | Bằng chứng / giới hạn |
|---|---|---|
| N1 | Frontend mặc định gọi API; Express có `/api/smartbus/v1`, DTO catalog/session/booking/roster và các màn hình quản trị. Chuẩn hóa đăng ký, response envelope và Bearer JWT; bỏ credentials cookie không dùng gây lỗi CORS khi chạy khác origin. | Contract test và trình duyệt đăng nhập → tìm chuyến → chọn hai ghế → giữ chỗ → checkout qua PostgreSQL nhúng. Demo chỉ bật khi cấu hình rõ `VITE_APP_MODE=demo`. |
| N2 | Bắt buộc phương thức thanh toán ở endpoint booking cũ; không cho bỏ paymentMethod để phát hành vé. Soát vé phải có payment SUCCESS. | Test yêu cầu thiếu phương thức bị từ chối, vé chưa trả tiền không được check-in. |
| N3 | Production luôn chặn demo-complete; local còn phải bật `ENABLE_DEMO_PAYMENTS=true`. Callback ký hợp lệ, xử lý lặp và callback đến sau check-in không hoàn tiền nhầm. | Kiểm thử app ở NODE_ENV production và callback lặp bằng gateway giả. |
| N4 | QR bắt buộc chữ ký, hạn và nonce. DRIVER phải được giao chuyến; tài khoản phải hoạt động; kiểm tra trạng thái chuyến, payment, yêu cầu hủy/đổi và cửa sổ check-in từ 30 phút trước khởi hành đến 90 phút sau giờ đến. Nhập mã thủ công đi qua quyền nhân viên riêng. | Test giả QR, sai phân công, quét quá sớm, quét lặp và vé nhóm. Quét quá sớm không tiêu thụ nonce. Chưa kiểm camera trên điện thoại thật. |
| N5 | Luồng GPS REST/WebSocket dùng chung kiểm quyền và validate tọa độ; lưu vị trí PostgreSQL, cache và gọi geofence tạo thông báo. UI tài xế có nút chủ động bật GPS; UI hành khách đọc vị trí API. | Test sai tài xế/tọa độ, lưu vị trí, thông báo người đặt vé/người theo dõi. Vị trí quá 120 giây báo mất kết nối; ETA chưa có thì hiển thị trống. Chưa kiểm GPS vật lý, mất mạng hoặc nhiều process. |
| N6 | Hủy/đổi tối thiểu 30 phút trước giờ chạy thực thi phía server. Lọc giờ HH:mm, thứ tự trạm, giờ đón trạm giữa; MANAGER được xem báo cáo. | Test lọc thời gian, chiều trạm, cutoff, quyền. Trình duyệt xác nhận giờ đón trạm B là 08:20 thay vì giờ đầu tuyến 08:00. |
| N7 | Báo cáo dùng payment thực thu, hoàn tiền và quantity; có lọc ngày/tuyến/xe, tỷ lệ lấp đầy và danh sách hoàn. Email đăng ký/biên nhận dùng SMTP thật, chỉ báo gửi thành công khi SMTP chấp nhận. | Test hoàn vé hai ghế 30.000đ, ghế được trả, doanh thu thuần bằng 0; SMTP thiếu trả false/503. Biên nhận thanh toán chưa phải hóa đơn thuế điện tử. Chưa gửi mail thật trong kiểm thử. |
| N8 | Nâng bcrypt, firebase-admin, Express và các dependency bị ảnh hưởng; cập nhật Jest/ts-jest/TypeScript ESLint, vá handlebars và sửa cấu hình parser. | Backend runtime: 0; frontend toàn bộ: 0. Backend toàn bộ còn 20 package bị đánh dấu moderate từ cùng chuỗi sprintf-js → argparse → js-yaml → công cụ coverage Jest, 0 high/critical. Không chạy audit fix --force để hạ phiên bản tùy tiện. |

## Sửa bổ sung trong luồng API thật

- Giữ 1–6 ghế bằng transaction, hạn 10 phút theo server; giá/voucher tính phía server. Booking cùng hold và payment có xử lý gọi lặp. Một QR đại diện nhóm ghế, roster đếm đúng quantity.
- Yêu cầu hủy/đổi lưu DB, chờ quản lý duyệt; ẩn QR trong lúc chờ. Hủy gọi gateway hoàn trước khi đánh dấu REFUNDED; lỗi không báo hoàn thành giả. Đổi cùng tuyến/cùng giá, chuyển đủ ghế, cập nhật chuyến và vô hiệu QR cũ.
- CRUD tuyến/trạm/xe/chuyến/nhân sự và phân công; kiểm lịch xe/tài xế, trạng thái hoạt động và chuyến chưa chạy. Không sửa chuyến đang có vé/giữ chỗ. Sửa giá tuyến giữ nguyên thời gian trạm; đổi trạm hoặc sức chứa khi đã có chuyến bị chặn để giữ tính nhất quán của lịch sử và sơ đồ ghế.
- Lưu tài khoản/vai trò/khóa tài khoản, voucher, hồ sơ ưu đãi, phản ánh/trả lời, sự cố/thông báo và audit DB. JWT kiểm tra trạng thái/vai trò hiện tại trong DB; khóa tài khoản có hiệu lực với token đang giữ.
- Migration thêm 10 bảng hợp đồng UI, ticket quantity, payment URL và vai trò FINANCE. Bật RLS và thu hồi quyền PUBLIC/anon/authenticated cho bảng mới; kiểm tra tổng 27 bảng public có RLS.
- Chức năng vé tháng và khôi phục mật khẩu chưa mở có thông báo rõ, không nhận thành công giả hoặc phát vé demo trong chế độ API.

## Kết quả kiểm tra cuối

| Kiểm tra | Kết quả |
|---|---|
| Backend ESLint / build TypeScript | Qua sau cập nhật dependency |
| Backend Jest | 7 suites, 66 tests qua |
| `npm --prefix backend run test:postgres` | 213 API/database checks qua, gồm hợp đồng UI và các trường hợp từ chối nghiệp vụ |
| Frontend ESLint / typecheck / build | Qua |
| Frontend Vitest | 9 files, 42 tests qua; chạy worker riêng với `--pool=threads --maxWorkers=1` |
| Frontend Node theme | 8 tests qua |
| npm audit backend runtime | 0 |
| npm audit backend cả dev | 20 moderate, 0 high, 0 critical; số package bị ảnh hưởng, không phải 20 lỗ hổng độc lập |
| npm audit frontend cả dev | 0 |
| Browser React → Express → PGlite | Đăng nhập, danh sách/chi tiết vé QR ký, yêu cầu hủy chờ duyệt, tìm trạm giữa, giữ A02/A03 (19 → 17 ghế trống), countdown 10 phút, checkout hai vé 24.000đ |

Một lần Vitest timeout khởi động worker trên Windows; lần chạy cuối có isolation đầy đủ đã qua 42/42. Thử tắt isolation làm mock HTTP bị dùng chung giữa các file nên không dùng kết quả đó làm xác nhận. Build còn cảnh báo chunk ExcelJS khoảng 930 kB trước gzip; export được tải động, cảnh báo không làm build thất bại.

Log và ảnh kiểm thử local nằm trong `.cache/` hoặc `*.log`, đã được ignore. Ảnh checkout: `.cache/browser-checkout-2026-10-11.png`. Gateway MoMo HTTP giả và PGlite giúp xác minh logic/migrations, chưa thay thế sandbox merchant thật, PostgreSQL server đa kết nối, load test, Redis đa instance, SMTP thật hoặc thiết bị camera/GPS thật. Trình duyệt dùng database fixture riêng; không ghi dữ liệu thử lên website production và không thực hiện giao dịch tiền thật.

## Triển khai bản sửa

1. Cài theo lockfile: `npm --prefix backend ci` và `npm --prefix frontend ci`.
2. Cấu hình `DIRECT_URL` (direct/session PostgreSQL port 5432), `DATABASE_URL`, JWT secret, CORS và các biến trong `.env.example`. Chạy `npm --prefix backend run db:migrate` với biến môi trường tương ứng. Script ưu tiên DIRECT_URL; không dùng transaction pooler port 6543 để migrate. Sao lưu và kiểm tra trên staging trước production.
3. Frontend build với `VITE_APP_MODE=api`, `VITE_API_BASE_URL=/api/smartbus/v1` nếu chung origin; khác origin dùng URL API đầy đủ và thêm đúng origin frontend vào CORS_ORIGIN. Vercel cần rebuild khi đổi biến VITE.
4. Cấu hình merchant MoMo/VNPay, URL callback public và trang kết quả theo `.env.example`; đăng ký IPN với cổng thanh toán. Giữ `ENABLE_DEMO_PAYMENTS=false` và NODE_ENV=production. Nghiệm thu thanh toán, callback lặp/đến muộn và hoàn tiền trên sandbox merchant thật.
5. Cấu hình SMTP_HOST/PORT/FROM và thông tin xác thực nếu muốn gửi email. Thiếu SMTP sẽ báo chưa gửi, không báo thành công giả. Cấu hình tile provider nếu cần nền bản đồ địa lý; không gửi GPS trước khi tài xế chủ động bật và cấp quyền.
6. Vercel adapter phục vụ REST; giao diện GPS có thể polling REST. WebSocket lâu dài cần chạy `backend/dist/server.js` trên hạ tầng hỗ trợ kết nối liên tục. Redis cần thiết để đồng bộ cache/dedupe thông báo giữa nhiều instance; khóa ghế vẫn dựa trên PostgreSQL. Bố trí job release-expired với PAYMENT_CRON_SECRET và giám sát đối soát/refund.
7. Sau deploy chạy lại luồng hai tài khoản/hai thiết bị, camera soát vé, GPS/đến trạm, email, export và quyền quản trị. Commit local không tự cập nhật website đang chạy.

## Phần còn thiếu so với yêu cầu sản phẩm

| Nhóm | Phần đã cải thiện | Chưa thể nghiệm thu hoàn tất |
|---|---|---|
| Goal 1: bán vé/thanh toán/QR | Nối API, giữ ghế, payment, QR và hủy/đổi; đóng các đường phát vé chưa trả tiền. | ZaloPay, hóa đơn thuế điện tử; nghiệm thu merchant thật và chính sách đổi khác giá/tuyến. |
| Goal 2: vận hành | CRUD, chuyến đơn, phân tài xế/xe, chống trùng lịch, soát vé/roster. | Lịch chạy lặp/tần suất và phân công phụ xe riêng; nghiệm thu mobile/camera. |
| Goal 3: vị trí/thông báo | GPS API, UI đọc dữ liệu thật, geofence, sự cố và thông báo. | ETA, nhận biết tiến trình trạm đón/trả đầy đủ, offline/reconnect, push thiết bị thật và triển khai realtime nhiều instance. |
| Goal 4: tài chính/ưu đãi | Báo cáo theo payment/refund, bộ lọc, voucher DB, duyệt hồ sơ ưu đãi. | Vé tháng/gia hạn/thanh toán và soát vé tháng; áp giá ưu đãi theo chính sách đầy đủ; retry/đối soát gateway vận hành. |
| Goal 5: phân tích chiến lược | Có dữ liệu booking/check-in và báo cáo cơ bản. | Mật độ theo khung giờ/trạm, dữ liệu xuống xe, dự báo nhu cầu và gợi ý tần suất; cần dữ liệu lịch sử và tiêu chí đánh giá. |

Audit DB đã bao phủ các thao tác UI chính, chưa phải nhật ký đầy đủ mọi truy cập/biến động ở mọi endpoint legacy. Khôi phục mật khẩu chưa triển khai. Các khoảng thiếu này cần backlog phát triển tiếp; không tính màn hình demo hoặc endpoint báo chưa mở là tính năng hoàn thành.
