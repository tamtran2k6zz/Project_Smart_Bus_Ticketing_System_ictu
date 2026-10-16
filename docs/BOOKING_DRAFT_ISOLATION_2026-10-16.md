# Sửa bản nháp giữ chỗ giữa các tài khoản — 16/10/2026

## Hiện tượng và nguyên nhân

Khách A giữ ghế; đăng xuất và đăng nhập B/C trên cùng trình duyệt. Ghế của A vẫn bị khóa là đúng. Lỗi là lựa chọn và `holdId` của A còn nằm trong bản nháp dùng chung `smartbus.booking-draft.v1`, khiến B gửi yêu cầu đọc giữ chỗ của A và nhận 404 “Không tìm thấy giữ chỗ”. UI vẫn đếm ghế cũ như đã chọn và khóa nút tiếp tục.

Đã tái hiện qua E2E: A giữ ghế 01; B đăng ký rồi mở cùng chuyến vẫn thấy ghế 01 có `aria-pressed=true`, dù ghế bị vô hiệu hóa. Test này thất bại trước sửa.

## Thay đổi

- Mỗi tài khoản dùng một Zustand store và khóa localStorage riêng: `smartbus.booking-draft.v2:<userId>`. Các tài khoản khác tab không ghi đè bản nháp của nhau. Đổi tài khoản khởi tạo lại form và trạng thái thao tác.
- Phản hồi giữ chỗ đến muộn sau khi đổi tài khoản chỉ cập nhật store của người đã gửi yêu cầu.
- Bản nháp v1 không có chủ sở hữu được bỏ qua. Không tự gán hold cũ cho người đăng nhập mới, không tự gọi API giải phóng hold của người khác. Dữ liệu giữ chỗ/đơn/thanh toán trên server vẫn do nghiệp vụ hiện có quản lý. Người đang có bản nháp v1 có thể cần chọn lại ghế khi nâng cấp; đơn đã tạo vẫn thuộc lịch sử của tài khoản.
- HTTP interceptor giữ lại mã trạng thái. Chỉ 404/410 khi đọc hold mới xóa tham chiếu hold cũ của đúng tài khoản và cho chọn lại; timeout/mất mạng/500 giữ nguyên tham chiếu để thử lại.
- Ghế được người khác giữ/đặt trong lúc đang chọn được bỏ khỏi lựa chọn khi polling cập nhật. Không giữ lại ghế đã khóa trong tổng số vé rồi bắt khách gửi lại một lựa chọn không hợp lệ.
- Danh sách ghế và số chỗ trống cùng cập nhật mỗi 5 giây. Nếu POST giữ chỗ trả 409, đọc lại ghế/tồn chỗ ngay. Quyết định giữ chỗ cuối cùng vẫn ở server.

## Kiểm tra hồi quy

`BookingFlow.test.tsx`: hold 404, lỗi mạng/500, ghế vừa bị khách khác giữ, khôi phục hold đúng chủ và phản hồi đến muộn khi A chuyển sang B.

`booking.store.test.ts`: không nhận bản nháp legacy thiếu chủ; ghi/xóa B không thay đổi dữ liệu lưu của A. `http.test.ts`: giữ nguyên status để phân biệt lỗi nghiệp vụ với lỗi mạng.

`tests/e2e/booking-accounts.spec.ts`: A/B/C lần lượt đăng nhập và giữ ghế 01/02/03; không nhận lựa chọn của người khác; A quay lại và reload vẫn khôi phục đúng hold của A. E2E này dùng dữ liệu demo cục bộ, không phải giao dịch ngân hàng thật.

Các kiểm tra ownership/409 phía backend đã có trong `backend/scripts/test-ui-contract.cjs`. Bản sửa này không nới quyền đọc hoặc cập nhật hold trên server.

Kết quả cục bộ: toàn bộ 15 E2E qua; 13 test tập trung cho booking/store/HTTP qua; lint, TypeScript và production build qua. Bộ frontend đầy đủ trước khi thêm ca 409 cuối có 110 Vitest và 8 theme test qua; CI chạy lại toàn bộ sau commit.
