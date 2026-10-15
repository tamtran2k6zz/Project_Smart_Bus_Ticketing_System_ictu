# Thanh toán chuyển khoản Techcombank

Checkout dùng lựa chọn **Mã QR / Chuyển khoản Techcombank** thay cho **Thẻ ngân hàng**. Khách quét QR trong ứng dụng ngân hàng, hoặc nhập số tài khoản và nội dung để chuyển khoản. Hệ thống không thu số thẻ, CVV hay OTP.

## Tài khoản nhận

- Ngân hàng: Techcombank (BIN `970407`).
- Số tài khoản: `19075207874011`.
- Chủ tài khoản: `TRAN DANG CONG TAM`.

Thông tin được giải mã từ QR do chủ dự án cung cấp. QR mới được tạo tại backend, chứa tài khoản nhận, số tiền VND và nội dung riêng cho từng đơn; không gửi dữ liệu đơn sang dịch vụ tạo QR bên ngoài. Thông tin người nhận được lưu theo từng giao dịch để đối soát đơn cũ nếu cấu hình thay đổi sau này.

## Khách hàng

1. Chọn ghế và tạo đặt vé bằng tài khoản đã xác minh email.
2. Chọn **Mã QR / Chuyển khoản Techcombank**, khởi tạo thanh toán.
3. Quét hoặc tải QR, kiểm tra người nhận trong ứng dụng ngân hàng; chuyển đúng số tiền và nội dung. Có nút sao chép số tài khoản và nội dung.
4. Chọn xác nhận đã chuyển tiền rồi bấm **Tôi đã chuyển khoản**. Có thể bổ sung mã giao dịch người gửi để hỗ trợ tra cứu.
5. Chờ tài chính/admin đối soát. Khai báo của khách không xác nhận thanh toán và không phát hành vé. Trang tự cập nhật; sau khi nhận tiền đúng hạn, vé xuất hiện trong **Vé của tôi**, email vé đi qua hàng đợi gửi hiện có.

Giữ ghế vẫn có hạn 10 phút, không được kéo dài khi tải lại hoặc báo đã chuyển tiền. Sau thời hạn này QR bị ẩn, khách được yêu cầu không chuyển thêm. Khách đã chuyển vẫn có thể gửi thông báo để đối soát. Sau khi báo chuyển, đổi phương thức bị khóa để tránh thanh toán hai lần.

## Tài chính/admin

Trong **Báo cáo & doanh thu → Đối soát chuyển khoản Techcombank**, chọn **Đối soát**:

1. Tra cứu báo có thực tế trên tài khoản nhận, đối chiếu nội dung và người gửi. Không xác nhận chỉ từ ảnh biên lai khách gửi.
2. Nhập **số tiền thực nhận** và **mã giao dịch báo có tại ngân hàng**, đánh dấu đã đối chiếu rồi xác nhận.
3. Chưa nhận được tiền: chọn từ chối, ghi lý do. Đơn bị hủy và ghế được giải phóng. Nếu tiền thực tế đến sau đó, vẫn có thể đối soát lại để cộng số tiền nhận vào ví.

Chỉ ADMIN/FINANCE được xem danh sách và duyệt; không được tự duyệt giao dịch của mình. Một mã báo có chỉ ghi nhận một lần; gửi lại cùng xác nhận không phát hành vé/cộng tiền lần hai. Danh sách tối đa 100 giao dịch, ưu tiên khách đã báo chuyển và giao dịch chờ xử lý. Mỗi giao dịch lưu người duyệt, thời điểm, ghi chú, mã báo có và số tiền thực nhận.

Tiền đến sau khi hết giữ ghế, sau khi đổi phương thức, khi chuyến đã đóng hoặc lệch số tiền: cộng **số tiền thực nhận** vào ví khách trong cùng transaction, không phát hành vé hoặc lấy lại ghế của đơn khác. Khách nhận thông báo và có thể dùng ví/rút tiền theo quy trình ví hiện có. Hủy vé đã thanh toán Techcombank hoàn vào ví; không gọi API hoàn tiền của MoMo/VNPay/ZaloPay.

## Triển khai

Áp dụng migration `supabase/migrations/20261015010000_bank_transfer_payments.sql` qua `npm --prefix backend run db:migrate` **trước khi phát hành API mới**. Migration thêm bảng, ràng buộc và index, không tự ghi nhận giao dịch nhận tiền. Bảng bật RLS, thu hồi quyền trực tiếp từ PUBLIC/anon/authenticated; mọi thao tác đi qua API đã đăng nhập.

Không cần webhook hay khóa API Techcombank. Tài chính vẫn kiểm tra tiền trong ứng dụng ngân hàng và xác nhận thủ công. Trước khi mở thu tiền, kiểm tra QR bằng ứng dụng ngân hàng để xác nhận tên người nhận, số tiền và nội dung; thao tác quét không đồng nghĩa tiền đã được chuyển. Không dùng chế độ demo để thu tiền thật.

## Kiểm thử

- `npm --prefix backend run build`
- `npm --prefix backend test -- --runInBand`
- `npm --prefix backend run test:postgres`
- `npm --prefix frontend test -- --maxWorkers=1`
- `npm run lint` và `npm run build`

Test PostgreSQL nhúng kiểm tra quyền, khai báo khách không phát hành vé, duyệt đúng tiền, chống trùng mã báo có, đối soát lặp, từ chối, tiền đến sau từ chối/hết hạn/đổi phương thức, lệch số tiền, hoàn ví và đối chiếu sổ ví. Test QR xác nhận checksum của ảnh gốc và dữ liệu người nhận/số tiền/nội dung. Test checkout xác nhận thay lựa chọn thẻ, hiển thị QR, báo chuyển không tự xác nhận, khóa đổi phương thức và ẩn QR khi hết giữ ghế.
