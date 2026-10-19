# Báo cáo kỹ thuật Sprint 4

**Đồ án Thực tập Cơ sở 2026 · Nhóm 5 — N5 Innovators**

Trường Đại học Công nghệ Thông tin & Truyền thông — Đại học Thái Nguyên (ICTU).

Ngày cập nhật: 16/10/2026. Trạng thái: **đang kiểm thử, chưa nghiệm thu production**.

## Môi trường và phương pháp đo

Đã chạy PostgreSQL 16 và Redis 7 trong Docker riêng, chỉ bind localhost. API Node.js dùng pool PostgreSQL gốc, max 10; không dùng hàng đợi tuần tự PGlite. Mỗi lượt tạo database tạm riêng, áp migrations thật, tạo 50 tài khoản giả, một tuyến, một xe 40 ghế và một chuyến tương lai. Không gọi merchant/SMTP/FCM thật, không thu/chuyển tiền.

Baseline mã nguồn trước đợt sửa: ae023ec trên Develop. Bằng chứng JSON ghi workingTree=modified vì lượt đo chạy trên bản sửa chưa commit; không trình bày kết quả này như đo trên commit baseline sạch. Cấu hình máy và timestamps có trong [kết quả tải](sprint4/results/2026-10-16-load.json).

## Kết quả kiểm thử tải thực đo

| Kịch bản | Kết quả |
|---|---|
| 200 virtual users tra cứu liên tục, 30 giây | 73.770 request HTTP 200, không lỗi, p50 74,24 ms, p95 138,38 ms, p99 176,21 ms |
| 50 khách tranh ghế qua UI/PostgreSQL | 1 hold thành công, 49 phản hồi 409; đúng chủ ghế; p95 1.019,73 ms |
| 50 khách tranh ghế qua Redis + PostgreSQL | 1 reservation thành công, 49 phản hồi 409; Redis key đúng chủ và TTL; p95 59,31 ms |
| Soak 20 virtual users, 60 giây | 149.920 request HTTP 200, không lỗi, p95 11,93 ms |

Hai ca tranh ghế không tạo bản ghi hold/reservation trùng. HTTP 409 ở các khách thua tranh chấp là phản hồi nghiệp vụ dự kiến, không tính như lỗi 5xx.

Lượt đầu cùng harness ghi p95 tra cứu 545,04 ms và pool waiting lên tới 981. Bản sửa gộp **các lần đọc cùng danh mục đang chạy**; khi hoàn tất bỏ promise, yêu cầu tiếp theo đọc lại database. Không cache lâu giá hoặc tồn chỗ và không thay đổi transaction bán vé. Lượt cuối không chạy build/install cùng lúc đạt p95 tra cứu 138,38 ms. Khác biệt tải máy giữa các lượt được ghi nhận; chưa suy ra tỷ lệ cải thiện cho production.

**Chưa đạt kết luận mọi API <150ms:** luồng UI giữ ghế khi 50 khách tranh cùng tài nguyên vẫn p95 khoảng 1 giây. Gate của runner hiện chỉ áp p95 150ms cho tra cứu; safety gates của các ca tranh ghế kiểm tra tính đúng đắn. Đây là điểm cần tối ưu/đo tiếp, không bị bỏ khỏi báo cáo.

Lượt retest bổ sung thanh toán ví cùng ngày ghi tra cứu p95 **177,59ms**, nên toàn runner thất bại gate 150ms dù kiểm tra ví và chống đặt trùng qua. Mốc 138,38ms ở trên là kết quả lượt trước, chưa chứng minh hiệu năng ổn định qua mọi lượt. Xem [bằng chứng mới](sprint4/results/2026-10-16-wallet-ticket-load.json) và [luồng thanh toán ví](WALLET_TICKET_CHECKOUT_2026-10-16.md).

CPU peak 98,52% quy đổi theo một core; RSS peak 194,67 MiB; heap peak 80,81 MiB; pool peak 10 kết nối, waiting peak 99; event-loop p95 cao nhất trong các mẫu 28,57 ms. [CSV giám sát từng giây](sprint4/results/2026-10-16-server-metrics.csv) và JSON tóm tắt là nguồn số liệu. Soak 60 giây không đủ chứng minh không có memory leak; cần lượt 30–60 phút và dataset lớn hơn.

200 virtual users là closed-loop concurrency, không phải 200 RPS cố định. Dataset nhỏ không đại diện quy mô nhà xe/Staging. Chỉ tiêu dưới 150ms đang diễn giải bằng p95 cho bài tra cứu; cần PO/QA chốt phương pháp chính thức.

## Geofencing và mất mạng

Bán kính báo trạm được sửa về 500m theo kế hoạch. Có test khoảng cách thật tại 400/499/500/501m và test đường gọi notification; xử lý sai số số thực dưới một micrometer ở đúng biên. Camera vật lý, GPS thực và nhận FCM trên thiết bị chưa được nghiệm thu từ các test này.

Đã thêm test scanner từ chối xác minh khi offline, phục hồi sau lỗi mạng, và checkout đọc lại đơn PENDING đã lưu sau timeout mà không tự xác nhận đã trả tiền. Các test component không thay thế bài E2E cắt mạng trên thiết bị thật; backend vẫn phải chống replay/idempotency theo các integration checks hiện có.

## Hiệu năng frontend

Có runner Lighthouse mobile 13.5.0 với phiên bản cố định, lưu HTML/JSON từng lượt, mặc định ba lượt cho trang chủ và đăng nhập. Đo production build bằng static server cục bộ, không dùng Vite dev server. Observed load và LCP được báo riêng.

| Trang | Điểm từng lượt → trung vị | LCP trung vị | Observed load trung vị | Gate >85 / load <2s |
|---|---|---|---|---|
| Trang chủ | 73 / 78 / 79 → **78** | 4.673,35 ms | 118 ms | **Chưa đạt điểm** |
| Đăng nhập | 90 / 90 / 90 → **90** | 3.287,04 ms | 88 ms | Đạt gate hiện tại |

[JSON kết quả ba lượt](sprint4/results/2026-10-16-lighthouse.json) là nguồn số liệu, ghi baseline commit và workingTree=modified. Điểm trước tối ưu là 49/61; baseline static server chưa gzip nên khác biệt bao gồm cả cấu hình phục vụ nội dung. LCP cả hai trang vẫn trên 2 giây; load event sớm của SPA không chứng minh nội dung chính đã hiển thị trong 2 giây. Mục trang chủ tiếp tục mở trong [bug log](sprint4/BUG_LOG.md), chưa nghiệm thu frontend.

Đã bật gzip và cache asset có hash trong Nginx; static server đo dùng cùng chính sách nén. Button dùng CSS active thay cho khởi tạo Anime.js ở từng nút; layout từng role tải động. Font chỉ giữ Latin/tiếng Việt. Hiệu ứng cuộn chỉ chạy trên desktop. Build tự sinh WebP 480/960/1440 px từ ảnh hero gốc bằng Sharp; trình duyệt chọn theo srcset/sizes, ảnh trang trí trang đăng nhập tải lazy. Không giảm CPU/network throttling của Lighthouse để nâng điểm.

**Đính chính font sau lượt đo trên:** `font-display: optional` đã gây lỗi trộn Arial Black/Times New Roman khi file font đến muộn. Đã đổi về `swap`; E2E trì hoãn font 1,2 giây xác nhận tiêu đề chỉ dùng Be Vietnam Pro ExtraBold sau tải, không còn font hệ thống. Các điểm Lighthouse 78/90 phía trên là bằng chứng lịch sử trước sửa font; cần đo lại để đánh giá hiệu năng của bản dùng `swap`.

Cảnh báo bundle >500kB chưa tự chứng minh Lighthouse thất bại; ExcelJS/PDF tải động theo chức năng. Cần đo thêm các màn hình đăng nhập, thanh toán, soát vé và Staging. Frontend Docker chuyển cùng Node 22 với CI và dùng npm ci để tái lập dependency.

## Bảo mật và đối soát

Có truy vấn tham số hóa, kiểm tra JWT_SECRET tối thiểu 32 ký tự, kiểm tra vai trò/trạng thái tài khoản hiện tại và auth_version. Password reset tăng auth_version để hủy phiên cũ. Handler logout UI hiện trả thành công và frontend xóa token; chưa tuyên bố logout vô hiệu hóa mọi JWT trên máy chủ. JWT mặc định 86400 giây nếu không đặt JWT_EXPIRES_IN, không mô tả mặc định là 15 phút–1 giờ.

Các integration checks trước đó bao phủ ownership/RBAC, callback ký, số tiền, replay, hoàn ví và ledger. Ma trận nghiệm thu từng role/US và số tiền trên môi trường nghiệm thu còn cần hoàn tất. Techcombank theo quyết định chủ dự án là đối soát thủ công, không yêu cầu webhook.

## Kiến trúc triển khai thực tế

~~~mermaid
flowchart LR
  Client[Trình duyệt] --> FE[React SPA / Vercel hoặc Nginx]
  FE --> API[Express API]
  API --> PG[(PostgreSQL / Supabase)]
  API -. Khi cấu hình .-> Redis[(Redis)]
~~~

Docker Compose ứng dụng dùng database ngoài qua DATABASE_URL. Tất cả service đã hợp nhất trong `docker-compose.yml`: frontend/backend/Redis ứng dụng chạy mặc định; `sprint4-postgres` và `sprint4-redis` thuộc profile `sprint4`, network riêng, **chỉ dành cho kiểm thử**. Xem lệnh khởi động/dọn đúng service ở kế hoạch kiểm thử. Website Vercel đã kiểm tra trước đợt này đang dùng PostgreSQL-only; không suy ra Redis production đã được bật từ việc Redis cục bộ READY.

Express server.ts có WebSocket gateway; Vercel api/index.js chỉ nạp Express app. Giao diện tracking hiện polling. Nghiệm thu WebSocket cần host phù hợp hoặc quyết định phạm vi được duyệt, không lấy health UP làm bằng chứng socket hoạt động.

## ERD, Swagger và hồ sơ còn lại

Runner xuất schema vật lý và Mermaid từ database đã áp migration; bao gồm các bảng mới về ví, chuyển khoản và hóa đơn. Diagram hiện minh họa cạnh FK; cần đối chiếu unique/nullability để hoàn thiện cardinality bản cuối. ERD nền cũ không được coi là schema vật lý hiện tại.

**OpenAPI/Swagger toàn bộ API chưa hoàn thành trong đợt khởi động này.** Bảng endpoint Markdown không được coi là Swagger. Cần hoàn thiện hợp đồng request/response, bảo mật, role, lỗi và ví dụ theo routes thực tế.

Xem [kế hoạch chạy](SPRINT4_TEST_PLAN.md) và [ma trận 24 US](SPRINT4_ACCEPTANCE_MATRIX.md). Hồ sơ cuối còn: báo cáo PDF 5 chương, slide, video dự phòng, dry run 20 phút, bug log/retest và biên bản PO/QA. Chưa tag v1.0.0 hoặc ký 24/24 DoD chỉ dựa trên kết quả cục bộ.

## Hồi quy mã nguồn ngày 16/10/2026

Typecheck, lint và production build backend/frontend đều qua. Backend: 95 unit test/15 suite; frontend: 101 Vitest/21 file và 8 Node theme test; runner: 2 guard/statistics test. Integration: 516 kiểm tra API/database qua PGlite, kiểm tra archive chuyến và Vercel adapter đều qua. Các log 409/ECONNREFUSED trong ca kiểm tra lỗi là tình huống chủ đích, không được tính thành giao dịch thật thành công. Kết quả tải native PostgreSQL/Redis được tách ở trên.

13 kịch bản Playwright E2E qua giao diện demo cục bộ đều qua, gồm responsive/keyboard/reduced motion, đặt vé, QR, phân quyền, xuất báo cáo và các màn hình hành khách/nhân viên/admin. Đã xem ảnh chụp mobile 360 px; đây không phải bằng chứng backend/provider Staging. Compose config và Nginx `nginx -t` trong container dùng một lần đều hợp lệ. Frontend dependency audit sau cập nhật không có lỗ hổng được công cụ báo tại thời điểm kiểm tra.
