# Ví SmartBus

Phân hệ ví của đồ án Thực tập Cơ sở 2026, Nhóm 5 — N5 Innovators, ICTU.

## Sử dụng

- Hành khách mở **Ví SmartBus** (`/account/wallet`) để xem số dư, 100 giao dịch gần nhất, yêu cầu rút tiền và đăng ký gia hạn tự động.
- Khi điều hành duyệt yêu cầu hủy vé tại giao diện hành khách, khoản đã thanh toán được hoàn vào ví trong cùng giao dịch cơ sở dữ liệu với việc hủy vé và trả ghế. Ví tự được tạo nếu khách chưa mở trang ví.
- Nạp 10.000–10.000.000 đồng qua MoMo, VNPay hoặc ZaloPay. Tạo đơn hoặc quay lại từ cổng thanh toán không làm tăng số dư. Chỉ callback được xác minh chữ ký, mã đơn, phương thức, số tiền và mã giao dịch mới cộng tiền.
- Rút 10.000–10.000.000 đồng: nhập tên ngân hàng, số tài khoản và tên chủ tài khoản. Số tiền được trừ khỏi số dư khả dụng ngay khi gửi yêu cầu; có lịch sử để đối soát.
- **ADMIN/FINANCE → Báo cáo & doanh thu → Duyệt rút tiền từ ví**: chuyển khoản thủ công bên ngoài hệ thống, đối chiếu người nhận và số tiền, rồi ghi mã giao dịch ngân hàng để xác nhận. Việc bấm xác nhận không thực hiện lệnh chuyển tiền ngân hàng. Không được tự duyệt yêu cầu của mình. Từ chối phải có lý do và tự trả lại số tiền giữ trong ví, đúng một lần.
- Tại **Vé tháng & ưu đãi**, chọn **Ví SmartBus** để mua/gia hạn bằng số dư hiện có. Sau lần mua đầu, chọn vé tháng tại trang ví và xác nhận hạn mức để bật gia hạn tự động. Có thể tắt bất kỳ lúc nào.

## Chu kỳ vé tháng

Hệ thống giữ chính sách vé tháng hiện hành: **30 ngày/kỳ**. Khi hết hạn, tác vụ định kỳ mua kỳ tiếp theo bằng ví theo giá hiện tại của hồ sơ khách hàng. Không thu vượt hạn mức đã đồng ý; không thu sớm cho vé còn hạn. Khi thiếu tiền, ví bị khóa, tuyến ngừng hoạt động hoặc giá vượt hạn mức, hệ thống giữ nguyên số dư và thử lại sau một ngày. Trong thời gian hết hạn, vé không có hiệu lực. Khi gia hạn muộn, kỳ mới bắt đầu từ lúc mua thành công, không truy thu các kỳ đã bỏ lỡ.

## Triển khai

1. Triển khai migration `supabase/migrations/20261014010000_customer_wallet_flows.sql` qua quy trình `npm --prefix backend run db:migrate` hiện có, trước khi phát hành API mới. Migration bổ sung bảng và ràng buộc, không xóa dữ liệu khách hàng. Nên chạy trên staging và sao lưu theo quy trình vận hành trước.
2. Cấu hình các cổng thanh toán và callback của dự án; không có đường nạp tiền mô phỏng trực tiếp trên API ví. Khách cần xác minh email trước khi nạp/rút/mua vé hoặc bật gia hạn.
3. Express chạy tác vụ gia hạn cùng vòng xử lý định kỳ mỗi phút. Vercel có cron `/api/v1/ticketing/release-expired` mỗi ngày lúc 00:00 UTC (07:00 Việt Nam), dùng `CRON_SECRET` trong header Bearer. Vì vậy việc gia hạn trên lịch mặc định Vercel có thể diễn ra trong vòng 24 giờ sau khi hết hạn. Nếu cần sát giờ hết hạn, cấu hình scheduler bên ngoài gọi endpoint có xác thực mỗi phút. Không gọi endpoint này từ trình duyệt khách hàng.
4. Khai báo `CRON_SECRET` đủ mạnh trên Vercel. API cũng chấp nhận `PAYMENT_CRON_SECRET` cho scheduler ngoài. Kiểm tra nhật ký job sau triển khai. Giới hạn mặc định 20 lượt đăng ký đến hạn mỗi lần; tăng tần suất scheduler khi số lượng khách vượt khả năng xử lý của lịch ngày.
5. API truy cập PostgreSQL bằng tài khoản dịch vụ hiện có. Các bảng ví bật RLS và thu hồi quyền `PUBLIC`, `anon`, `authenticated`; không cấp quyền ghi số dư từ Supabase client.

Các endpoint mới ở `/api/smartbus/v1/wallet`, đồng thời giữ `/api/v1/wallet` và `/api/wallet`. API nạp cũ đã đổi hợp đồng: `amount` là số nguyên, `method` là `MOMO|VNPAY|ZALOPAY`, `requestKey` là mã chống trùng; kết quả trả URL thanh toán, không cộng tiền trực tiếp. Form rút tiền không lưu CCCD/ngày sinh. Dữ liệu ngân hàng gắn với từng yêu cầu và chỉ khách sở hữu cùng ADMIN/FINANCE có thể xem.

## Kiểm thử

`npm --prefix backend run build` và `npm --prefix backend run test:postgres` chạy cả kiểm thử ví trên PostgreSQL nhúng với cổng thanh toán giả lập tại máy, gồm hoàn vé được duyệt, chữ ký/số tiền sai, callback lặp, khóa ví, rút vượt số dư, duyệt/từ chối trùng, phân quyền, đối soát sổ ví, mua vé và tác vụ gia hạn trùng. `npm --prefix frontend test -- --pool=threads --maxWorkers=1` kiểm tra form ngân hàng, giữ mã yêu cầu khi thử lại, xác nhận hạn mức, trạng thái nạp và quyền duyệt chi.

Kiểm thử này không chuyển tiền thật và không thay thế việc nghiệm thu callback/đối soát trên môi trường thanh toán đã cấu hình.
