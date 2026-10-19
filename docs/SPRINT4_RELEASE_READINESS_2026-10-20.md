# Sprint 4 — Quyết định đóng gói ngày 20/10/2026

Đồ án Thực tập Cơ sở 2026 · Nhóm 5 — N5 Innovators · ICTU.
Hạn nộp: 26/10/2026 (giờ Việt Nam).

**NO-GO cho v1.0.0 chính thức. Được đóng gói snapshot ứng viên để QA, không phải nghiệm thu 24/24 US.**

Nguồn: mã trên Develop, [ma trận 24 US](SPRINT4_ACCEPTANCE_MATRIX.md), [báo cáo kỹ thuật](SPRINT_4_TECHNICAL_REPORT.md), [bug log](sprint4/BUG_LOG.md). Kết quả 16/10 là lịch sử, chưa đo lại trên snapshot 20/10.

## Đối chiếu đủ 20 nhiệm vụ

| # | Nhiệm vụ | Trạng thái có bằng chứng | Việc còn lại / người đề xuất phụ trách |
|---|---|---|---|
| 1 | Sprint Planning, công cụ tải Staging | Có kế hoạch và runner, chỉ chạy local tách biệt theo lựa chọn trước đó | Tâm tổ chức Planning, chốt môi trường với QA; chưa có biên bản cuộc họp |
| 2 | CPU/RAM/DB/Redis pool | Có metrics PostgreSQL pool, CPU/RSS/event loop trong lượt tải local | Toản/Vũ đo host/container và Redis trên môi trường nghiệm thu; không gọi PostgreSQL là MySQL |
| 3 | Bundle/mobile | Đã gzip, font tự host, ảnh responsive, code splitting | Đức/Vinh/Thiệp: Lighthouse mobile trang chủ lịch sử 78/100, LCP 4,67s; chưa đạt gate >85 |
| 4 | 200 tra cứu + 50 tranh ghế | Runner và JSON có; tranh ghế 1 thắng/49 conflict | Đức/Tuấn/Toản: lượt gần nhất tra cứu p95 177,59ms >150ms; cần tối ưu và đo lại |
| 5 | Đề cương/phân công | Có đề cương và phân công đề xuất bên dưới | Tâm xác nhận người nhận và hạn nội bộ |
| 6 | Lỗi tải/Injection/JWT | Có truy vấn tham số hóa, RBAC/JWT và kiểm thử tự động | Tuấn/Vũ/Toản rà lại issuer/algorithms/TTL, secrets, injection trên môi trường được duyệt, ghi bằng chứng |
| 7 | UI/mất mạng thanh toán/soát vé | Có test timeout, retry, offline và sửa ghế/font/mobile | Đức/Ánh retest mạng thật; không biến pending thành paid khi timeout |
| 8 | RBAC/đối soát tiền | Có kiểm tra API, ledger ví, hoàn tiền, replay | Phúc/Vũ đối soát dataset độc lập, hóa đơn/provider và ledger theo từng ID giao dịch |
| 9 | Kiến trúc/ERD/Swagger | Docker và ERD Markdown có | Tuấn/Vũ hoàn thiện OpenAPI/Swagger và kiểm chứng schema hiện tại; dự án PostgreSQL, không có ERD MySQL |
| 10 | Trực chiến Hotfix | Có git/CI/bug log | Tâm lập lịch người trực, triage và ghi nhận phản hồi; chưa có phiên trực được xác nhận |
| 11 | 100% 24 US Staging | Có ma trận 24 US và test tự động cục bộ | Ánh/Phúc/Toản chạy từng ca trên môi trường được duyệt, giữ cả BLOCKED trong mẫu số |
| 12 | Báo cáo kiểm thử | Có báo cáo kỹ thuật, metrics và ma trận | Toản/Ánh tổng hợp kết quả đúng snapshot, số lỗi/retest và phạm vi chưa kiểm tra |
| 13 | Sửa 100% lỗi + retest | Các lỗi ghế/font/mobile/đổi tài khoản có kiểm tra hồi quy | Chưa đóng mọi Major: performance và các ca chưa nghiệm thu còn mở |
| 14 | Release/tag v1.0.0 | Chưa đủ điều kiện | Chỉ xuất source snapshot có SHA-256; không gắn tag chính thức |
| 15 | Báo cáo PDF cuối | Có tài liệu nền và đề cương | Tâm biên tập bản cuối; hiện chưa phải PDF hoàn chỉnh đủ chứng cứ |
| 16 | Slide hội đồng | Có slide Sprint 1, không phải bộ slide cuối | Thiệp/Vinh làm bộ cuối theo kịch bản bên dưới |
| 17 | Biên bản 24/24 DoD | Chưa được QA/PO xác nhận | Chừa chữ ký thật; không ký thay, không ghi PASS khi còn BLOCKED |
| 18 | Video demo dự phòng | Chưa có bằng chứng clip cuối | Đức/Ánh quay flow bằng dữ liệu thử, che dữ liệu cá nhân, kiểm tra phát lại |
| 19 | Dry run | Có kịch bản chuẩn bị, chưa có biên bản diễn tập | Cả nhóm diễn tập 15 phút, đo thời gian và ghi lỗi |
| 20 | Retro/hồ sơ sáng 26/10 | Chưa diễn ra | Tâm tổ chức Retro, checklist hồ sơ và bản sao trước buổi báo cáo |

Phân công là **đề xuất dựa trên vai trò trong README**, không phải bằng chứng thành viên đã nhận việc.

## Quyết định thanh toán tạm thời

MoMo và ZaloPay bị chặn khi tạo/tiếp tục giao dịch mới ở đặt vé, vé tháng, nạp ví và endpoint đặt vé tương thích. UI mặc định VNPay; chuyển khoản Techcombank (tài chính xác nhận thủ công) và thanh toán ví còn dùng theo cấu hình hiện có. Không chứng nhận VNPay merchant đã hoạt động chỉ vì nút được mở.

API mặc định `PAYMENT_PAUSED_METHODS=MOMO,ZALOPAY` khi biến chưa được đặt. Kiểm tra cấu hình triển khai: không để biến này rỗng. Giao diện hiện luôn hiển thị hai lựa chọn bị khóa. Muốn mở lại cần bỏ phương thức khỏi biến server và cập nhật UI trong cùng bản thay đổi.

Các tiêu chí yêu cầu MoMo/ZaloPay phải được ghi PAUSED/BLOCKED hoặc được QA/PO chấp nhận giảm phạm vi; không tính là PASS chỉ vì đã tắt nút.

Giữ nguyên xác minh chữ ký callback/hoàn tiền của giao dịch cũ để tránh tiền đã chuyển bị treo. Không gọi provider thật trong kiểm thử. Bộ fixture callback cô lập chủ động mở provider chỉ trong process test; không dùng thiết lập đó cho production.

## Đề cương báo cáo và phân công đề xuất

1. **Tổng quan, bài toán, mục tiêu, phạm vi** — Tâm. Mô tả ICTU/Nhóm 5, 5 goals, 24 US, giới hạn merchant và thiết bị.
2. **Phân tích yêu cầu và thiết kế** — Vinh/Thiệp, Vũ hỗ trợ ERD. Use case, activity/sequence đặt vé–thanh toán–soát vé, schema PostgreSQL, khóa ngoại/cardinality.
3. **Kiến trúc và triển khai** — Tuấn/Vũ/Minh Đức. React/Vite, Express, Docker, Supabase PostgreSQL, Redis, Vercel; API contracts, bảo mật, giao dịch ví/idempotency, cấu hình không chứa secrets.
4. **Kiểm thử và đánh giá** — Ánh/Phúc/Toản. Ma trận 24 US, nguồn expected, môi trường/commit, log lỗi, retest, chỉ số tải và Lighthouse, RBAC/offline/đối soát tiền.
5. **Kết quả, hạn chế, hướng phát triển** — Tâm cùng nhóm. Nêu rõ những gì chưa nghiệm thu, không trình bày demo/mock như provider thật.
6. **Phụ lục** — link commit, migration, cách cài đặt, OpenAPI đã kiểm chứng, kết quả JSON, phân công, biên bản và tài liệu tham khảo.

Hạn nội bộ đề xuất: 21/10 chốt môi trường/schema/API và xử lý gate; 22–23/10 hồi quy/đối soát/retest; 24/10 tổng hợp PDF/slide/video; 25/10 dry run/Retro, QA và PO quyết định phát hành; sáng 26/10 kiểm tra hồ sơ. Đây là kế hoạch, không phải lịch họp đã được gửi.

## Slide và demo 15 phút

- 0–2 phút: bài toán/nhóm/phạm vi, kiến trúc và PostgreSQL.
- 2–8 phút: tra cứu → giữ ghế → ví hoặc QR Techcombank → xác nhận thanh toán → vé QR → soát vé. Dùng dữ liệu giả, xác nhận thủ công có ghi rõ.
- 8–10 phút: vé tháng theo tuyến, ví/hoàn tiền/gia hạn và màn hình điều hành.
- 10–12 phút: báo cáo doanh thu, đối soát và phân quyền.
- 12–15 phút: bằng chứng tải/kiểm thử, giới hạn thực tế, kết luận và câu hỏi.

Video dự phòng phải dùng cùng snapshot, quay cả trạng thái chờ và xác nhận, không cắt để gây hiểu nhầm thanh toán tự động. Dry run ghi người trình bày, tổng thời gian, lỗi, người sửa, lần retest; chưa ghi đã hoàn thành khi chưa diễn tập.

## Gate trước tag chính thức

- [ ] Chốt Staging hoặc có quyết định QA/PO chấp nhận môi trường local thay thế; ghi rõ phạm vi.
- [ ] 24/24 US đủ test expected/actual/evidence, 0 Critical/Major mở hoặc có chấp nhận bằng văn bản đúng thẩm quyền.
- [ ] Tải 200/50, mobile performance, soak và tài nguyên đạt tiêu chí đã chốt, trên commit phát hành.
- [ ] Migrations, backup/restore/rollback, secrets/JWT/RBAC, đối soát tiền và mạng gián đoạn đã retest.
- [ ] PDF/slide/video/dry run/biên bản hoàn chỉnh và người phụ trách ký thật.
- [ ] CI xanh, working tree sạch, xác định chính xác commit, checksum gói và quyết định phát hành.

Chưa gắn tag `v1.0.0`, chưa tạo GitHub Release chính thức, chưa xác nhận production đã nhận bản sửa.

## Rà soát kỹ thuật ở snapshot 20/10

- Frontend đã lazy-load các màn hình và chỉ import ExcelJS/jsPDF khi xuất file; bundle ExcelJS lớn không đồng nghĩa nó tải ngay ở trang chủ. Không đổi chunk thresholds để che cảnh báo. Cần đo Lighthouse mới sau mọi thay đổi; số 78/100 là kết quả lịch sử 16/10.
- JWT hiện là token **ký**, không phải dữ liệu mã hóa: không đưa bí mật vào payload. Có secret tối thiểu 32 ký tự, verify chữ ký/hạn, kiểm tra tài khoản active và auth_version từ DB; quyền dùng role hiện tại trong DB. Chưa chứng nhận secrets/HTTPS/rotation của production. Hai điểm verify HTTP/WebSocket chưa pin algorithm cụ thể; ghi nhận là mục cần gia cố và retest trước nghiệm thu thay vì tuyên bố audit bảo mật đã xong.
- Các truy vấn trọng yếu dùng tham số, nhưng kiểm thử tự động không chứng minh đã kiểm tra mọi injection boundary. Danh sách tìm kiếm/sort/filter và toàn bộ role/IDOR cần QA ghi kết quả riêng.
- Gói xuất là source snapshot từ tracked Git, có commit và SHA-256; không chứa node_modules, dist, .env cá nhân, database hoặc thông tin xác thực. Cài theo README bằng lockfile, áp migrations trên môi trường đúng; kiểm tra migration ví `20261016010000_wallet_ticket_payments.sql` trước triển khai.

## Xác minh bản sửa ngày 20/10

- Backend typecheck/lint/build qua; 97 unit tests / 15 suites qua.
- 561 kiểm tra API/database PostgreSQL nhúng qua, gồm 7 yêu cầu trực tiếp bị chặn 409 và callback MoMo cũ vẫn cộng ví đúng khi cổng đang khóa. Thiếu method vẫn trả 400.
- Frontend lint/build và 116 unit tests / 23 files qua.
- Toàn bộ 21 E2E Chromium qua trên demo localStorage (3,3 phút), gồm luồng đặt vé/thanh toán/soát vé, báo cáo PDF/Excel, mất mạng, font, ghế, mobile/desktop và tài khoản A/B/C.
- E2E demo không thay cho 24/24 US trên API Staging; unit/integration dùng provider giả và tiền thử. Chưa có lượt native load/Lighthouse mới cho snapshot này; không ghi lại số 16/10 như số đo mới.
