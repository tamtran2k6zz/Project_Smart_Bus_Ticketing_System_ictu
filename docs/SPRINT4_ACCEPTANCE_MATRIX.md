# Sprint 4 — Ma trận nghiệm thu 24 User Stories

Trạng thái dưới đây là điểm xuất phát cho hồi quy. “Có test tự động” không thay thế “Đạt trên Staging”. Điền commit, môi trường, kết quả và liên kết bằng chứng trước ký nghiệm thu. Các chữ ký PO/QA phải do người phụ trách xác nhận.

| US | Kịch bản bắt buộc | Nguồn test hiện có | Bằng chứng nghiệm thu còn lại |
|---:|---|---|---|
| 01 | Tra cứu đúng chiều trạm, ngày, giờ; không hiện chuyến đóng | test-ui-contract.cjs | 200 VU, lọc biên ngày/giờ trên Staging |
| 02 | Chọn nhiều ghế, 50 người tranh cùng ghế, đúng một người thắng | test-ui-contract.cjs; sprint4/load.cjs | Kết quả DB/Redis nhiều kết nối và ảnh UI |
| 03 | Giữ 10 phút, refresh không kéo dài, tiền đến muộn không lấy ghế khác | test-ui-contract.cjs; test-bank-transfer.cjs | Đồng hồ thiết bị/mạng và callback Staging |
| 04 | QR chỉ sau xác nhận tiền; QR giả/hết hạn/replay bị từ chối | test-postgres.cjs; test-email-contract.cjs | Quét camera thật trên hai thiết bị |
| 05 | Hủy/đổi đủ điều kiện, hoàn đúng tiền đã trả, không hoàn trùng | test-ui-contract.cjs; test-wallet-flows.cjs | Đối chiếu UI, DB, ví/provider trên Staging |
| 06 | MoMo/VNPay/ZaloPay theo phạm vi; Techcombank thủ công đúng số tiền/mã báo có | test-postgres.cjs; test-bank-transfer.cjs | Merchant sandbox và sao kê/đối soát được nghiệm thu |
| 07 | Chứng từ đúng đơn, số tiền, người nhận, retry không phát hành trùng | test-product-features.cjs | Provider hóa đơn, SMTP thật, chứng từ gốc |
| 08 | Hoàn ví/rút thủ công/hoàn provider, lỗi và retry không mất/trùng tiền | test-wallet-flows.cjs; test-postgres.cjs | Đối soát số dư trước/sau và lịch sử ngân hàng |
| 09 | GPS đúng xe, tọa độ cũ/mất mạng hiển thị rõ | test-ui-contract.cjs | Thiết bị thật; chốt polling/WebSocket theo deployment |
| 10 | Báo đúng trạm/đúng khách trong 500 m, không spam trùng | notification.service.spec.ts; gps.service.spec.ts | Biên 499/500/501 m và nhận thông báo thiết bị |
| 11 | Tổ lái đúng chuyến báo sự cố/trễ, khách nhận cập nhật | test-product-features.cjs | Thao tác trên điện thoại và mạng yếu |
| 12 | CRUD tuyến/trạm/giá, thay giá chỉ đúng đối tượng | test-ui-contract.cjs | Ma trận dữ liệu hợp lệ/sai và RBAC |
| 13 | Sinh lịch đúng ngày/giờ, không trùng xe, rollback nguyên tử | schedule.service.spec.ts; test-product-features.cjs | Lịch nhiều ngày và nhập sai trên UI |
| 14 | Phân công tài xế/phụ xe, chặn trùng lịch và sai vai trò | test-product-features.cjs | Đổi giờ/xe/nhân sự trên Staging |
| 15 | Soát vé đúng chuyến, đúng sức chứa; offline không tự báo hợp lệ | ScanTicket.test.tsx; test-ui-contract.cjs | Camera thiếu sáng, latency dưới 1 giây theo kế hoạch |
| 16 | Vé tháng/gia hạn đúng tiền, đúng kỳ, replay không cộng kỳ | test-product-features.cjs; test-wallet-flows.cjs | Gia hạn tự động bằng ví trên scheduler Staging |
| 17 | Duyệt hồ sơ ưu tiên rồi mới áp giá, không cộng sai voucher | test-ui-contract.cjs; test-product-features.cjs | Hồ sơ mẫu đã ẩn danh và bảng tính đối chiếu |
| 18 | Voucher theo quyền Marketing, hạn/giới hạn được kiểm tra | test-ui-contract.cjs | Biên hạn sử dụng và tải đồng thời |
| 19 | Doanh thu ngày/tháng/tuyến/xe trừ hoàn, vé tháng tách đúng | test-ui-contract.cjs; test-product-features.cjs | Đối soát dataset kiểm soát bằng bảng độc lập |
| 20 | Lấp đầy đúng từng chuyến, không tính vé hủy hoặc replay pass | test-product-features.cjs | Dataset đủ booked/check-in/cancel/pass |
| 21 | Excel/PDF khớp bộ lọc, font tiếng Việt, số tiền đầy đủ | tests/demo-api/product-demo.spec.ts | File từ Staging mở bằng Excel/PDF reader |
| 22 | Admin phân quyền/khóa; người thường không nâng quyền | test-ui-contract.cjs; test-postgres.cjs | Matrix mọi role và IDOR trên Staging |
| 23 | Audit có actor/method/status/IP, không chứa mật khẩu/token | test-product-features.cjs | Retest thao tác thành công, lỗi, từ chối quyền |
| 24 | Chỉ khách có quyền đánh giá chuyến, quản lý trả lời đúng khách | test-product-features.cjs | Quy trình UI sau hành trình và nhận thông báo |

Các file `.cjs` ở `backend/scripts`, `.spec.ts` ở `backend/src/services`, `ScanTicket.test.tsx` ở frontend. Ba kịch bản `tests/demo-api` dùng API demo cục bộ; không ghi “Staging PASS” chỉ từ các kịch bản này.

Mẫu ghi kết quả: `US / Test ID / Expected / Actual / PASS-FAIL-BLOCKED / Commit / Environment / Evidence / Bug ID / Retest by/date`. Tổng hợp riêng Critical/Major/Minor và các ca bị chặn do dịch vụ ngoài, không bỏ ca blocked khỏi tỷ lệ để đạt 100%.
