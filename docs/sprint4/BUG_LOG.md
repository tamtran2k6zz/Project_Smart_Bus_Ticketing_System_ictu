# Bug log và việc cần retest Sprint 4

Cập nhật 16/10/2026. Bản sửa làm việc trên Develop từ baseline ae023ec. Đây là kết quả kỹ thuật tại máy, chưa phải biên bản PO/QA.

| ID | Mức độ | Kịch bản / thực tế | Trạng thái / bằng chứng |
|---|---|---|---|
| S4-001 | Major | Lighthouse mobile trang chủ dưới 85; nội dung hiển thị chậm dù load event sớm | Đang xử lý. Có tối ưu gzip/font/ảnh/JS; xem kết quả ba lượt trong báo cáo kỹ thuật. Cần đo lại màn hình có đăng nhập và deployment. |
| S4-002 | Major | 50 khách giữ cùng ghế qua UI: đúng 1 thắng/49 conflict, p95 1.019,73 ms; chưa đáp ứng cách hiểu mọi API dưới 150 ms | Mở. Đo lại transaction/audit/pool, giữ nguyên kiểm tra ownership và không bán trùng. |
| S4-003 | Major | Geofence báo trạm dùng bán kính 300 m thay vì 500 m theo kế hoạch | Đã sửa, chờ nghiệm thu thiết bị. Unit test tại 400/499/500/501 m và notification call pass. |
| S4-004 | Minor | Báo cáo cũ có số liệu 500 RPS/CPU chưa kèm bằng chứng và mô tả kiến trúc không khớp | Đã sửa báo cáo theo số đo và mã thật. Không ghi toàn bộ DoD PASS. |
| S4-005 | Major | `font-display: optional` làm tiêu đề trộn Arial Black/Times New Roman khi tải font chậm | Đã sửa sang `swap`. E2E trì hoãn font 1,2 giây: trước sửa fail, sau sửa chỉ dùng Be Vietnam Pro ExtraBold. Cần đo lại Lighthouse sau thay đổi chính sách font. |

Các việc nghiệm thu còn lại: soak 30–60 phút với dataset lớn, API OpenAPI/Swagger, ERD cardinality, provider sandbox/SMTP/FCM, camera/GPS thiết bị, ma trận 24 US trên môi trường được duyệt, báo cáo PDF/slide/video/dry run và chữ ký người phụ trách. Các mục này chưa được đóng bằng CI cục bộ.

Mẫu retest: `ID / commit / môi trường / bước tái hiện / expected / actual / evidence / người kiểm tra / ngày`. Chỉ đóng Major khi kết quả hoặc quyết định chấp nhận được ghi cụ thể.
