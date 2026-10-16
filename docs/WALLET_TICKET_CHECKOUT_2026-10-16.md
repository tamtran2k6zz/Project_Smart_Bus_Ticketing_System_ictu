# Thanh toán vé chuyến bằng ví cá nhân

Đồ án Thực tập Cơ sở 2026 · Nhóm 5 — N5 Innovators · ICTU.

## Luồng khách hàng

1. Nạp tiền tại **Ví của tôi**. Số dư chỉ được cộng khi cổng thanh toán xác nhận hợp lệ; tạo yêu cầu nạp chưa làm tăng số dư.
2. Chọn chuyến/ghế, giữ chỗ, nhập hành khách rồi tiếp tục thanh toán.
3. Chọn **Ví cá nhân** để xem số dư khả dụng và số dư dự kiến sau thanh toán. Ví cần hoạt động và đủ toàn bộ tổng tiền đơn. Thiếu tiền có đường dẫn **Nạp tiền / Xem ví**, sau đó có thể cập nhật số dư khi quay lại checkout trong thời hạn giữ chỗ.
4. Nhấn **Thanh toán bằng ví**. Server xác nhận trừ tiền và phát hành vé; giao diện mở kết quả thanh toán. Khoản trừ có trong lịch sử ví.
5. Khi hủy vé đủ điều kiện và được xử lý theo quy trình hiện có, tiền được hoàn lại ví, có lịch sử và chống hoàn lặp.

Số dư khả dụng đã trừ tiền giữ cho yêu cầu rút đang chờ; checkout dùng đúng số dư này. Giao diện demo localStorage không cung cấp tiền ví mô phỏng; phương thức ví dùng API thật.

## Hợp đồng và tính nhất quán

`POST /api/smartbus/v1/payments` nhận `{ "bookingId": "...", "gateway": "Wallet" }`. Không nhận số dư hay giá từ trình duyệt làm nguồn quyết định. Kiểm tra JWT/chủ sở hữu đặt vé và xác minh email vẫn áp dụng.

Trong một transaction PostgreSQL, server khóa đặt vé, kiểm tra giữ chỗ, khóa ví của đúng người dùng, kiểm tra trạng thái/số dư, đặt ghế và ghi `wallet_transactions` loại `PAYMENT` tham chiếu ticket ID. Xác nhận payment `WALLET`, vé và ghế `BOOKED`, cập nhật doanh số và xếp email trong cùng transaction. Nếu một bước thất bại, cả khoản trừ và thay đổi vé được rollback.

Gửi lại yêu cầu cho đơn đã trả tiền trả về cùng giao dịch; không trừ lại. Các đơn khác nhau dùng cùng ví được tuần tự hóa bằng khóa dòng ví để tránh số dư âm. Giao dịch chuyển khoản Techcombank đã **SUBMITTED** vẫn phải chờ tài chính, không được thanh toán thêm bằng ví.

Hủy vé mua bằng ví hoàn về ví, bao gồm đường hủy UI và endpoint tương thích `/api/v1/ticketing/tickets/:id/cancel`; không gửi khoản hoàn WALLET sang cổng thanh toán bên ngoài.

## Triển khai

Áp dụng migration **trước khi triển khai mã mới**:

`supabase/migrations/20261016010000_wallet_ticket_payments.sql`

Migration bổ sung `WALLET` vào CHECK constraint của `payment_transactions.payment_method`; không thêm bảng hoặc thay đổi số dư hiện có. Dùng quy trình migrations hiện tại, ví dụ `npm --prefix backend run db:migrate` với cấu hình đúng môi trường triển khai. Không dùng thông tin PostgreSQL fixture của Sprint 4 cho production. Sau đó triển khai backend/frontend từ Develop.

## Xác minh

- `backend/scripts/test-wallet-checkout.cjs`: nạp qua callback có chữ ký, ownership, xác minh email, khóa ví, tiền giữ rút, thanh toán nhiều ghế theo tổng tiền trong DB, replay, ledger, QR, hết hạn, hoàn lặp và chặn thanh toán thêm khi đã báo chuyển khoản.
- `Checkout.test.tsx`: chọn ví, hiển thị số dư, thanh toán không redirect ra cổng ngoài, chặn thiếu tiền/khóa ví và cho chọn cổng khác.
- Runner `npm --prefix backend run test:load` bổ sung hai đơn 15.000đ cùng tranh ví 20.000đ trên PostgreSQL nhiều kết nối; kiểm tra số dư, ledger, ghế và replay. Tiền mở đầu là fixture trong DB tạm, không phải nạp ngân hàng thật.

Các số đo cục bộ không thay thế nghiệm thu merchant/production. Có 95 backend unit tests, 115 frontend tests và 554 kiểm tra API/database qua trong đợt này; kết quả native được lưu riêng cùng bằng chứng Sprint 4. Cả 15 E2E hồi quy giao diện cũng qua; các E2E này dùng demo localStorage, còn tính đúng đắn thanh toán ví được kiểm tra bằng API/database và PostgreSQL nhiều kết nối nêu trên.

[Kết quả PostgreSQL nhiều kết nối](sprint4/results/2026-10-16-wallet-ticket-load.json): hai đơn cùng gửi thanh toán ví 20.000đ, mỗi đơn 15.000đ → đúng một đơn trả tiền, một phản hồi 409, số dư còn 5.000đ, một bút toán trừ, một ghế BOOKED; replay không trừ thêm. Ghi baseline commit và workingTree=modified vì đo trên bản sửa chưa commit.

**Runner tổng thể chưa đạt gate tải:** phần tra cứu 200 VU trong cùng lượt có p95 177,59ms, vượt 150ms; không lỗi tra cứu/soak và các kiểm tra tranh ghế đều đúng. Kiểm tra tiền ví qua không được diễn giải thành mọi tiêu chí hiệu năng Sprint 4 đã đạt. Chỉ tiêu tra cứu cần tiếp tục theo dõi/ổn định.
