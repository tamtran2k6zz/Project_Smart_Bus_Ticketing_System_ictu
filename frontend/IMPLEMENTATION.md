# SmartBus — checklist triển khai

Ứng dụng mới mở rộng frontend hiện có; phần triển khai SmartBus chỉ thay đổi frontend. Giao diện cũ được giữ qua `VITE_LEGACY_APP=true`. Chế độ demo chạy độc lập; tích hợp backend còn thiếu được ghi rõ trong hợp đồng API.

- [x] S1: nền tảng, UI, landing responsive, anime.js v4, xác thực, layout/guard.
- [x] S2: tra cứu, chi tiết, chọn ghế / mua vé không ghế, hold 10 phút; tuyến/trạm/lịch.
- [x] S3: adapter thanh toán, xác nhận, QR, lịch sử; xe/nhân sự/phân công.
- [x] S4: tracking, mất tín hiệu/kết nối lại, sự cố, camera QR và nhập mã.
- [x] S5: hủy/đổi, hoàn tiền, chứng từ demo, vé tháng, hồ sơ ưu đãi, thông báo/hỗ trợ.
- [x] S6: dashboard/báo cáo, Excel/PDF, voucher, quyền, nhật ký.
- [x] Kiểm chứng: TypeScript, lint, build, Vitest/RTL, Playwright, responsive 360/768/1280/1440, reduced motion và quyền.
- [x] Bàn giao README, .env.example, lockfile và hợp đồng API.

## Bối cảnh repository

Repository cấp ngoài đang có nhiều file đã bị xóa và bản dự án di chuyển vào thư mục con trước phiên này. Thư mục Project_Smart_Bus_Ticketing_System_ictu có Git repository riêng; code frontend được sửa ở đây, giữ nguyên các thay đổi cấp ngoài. Dự án ban đầu có React 19, React Router 6, TypeScript, Vite, Axios, QR và kiểm thử payment; Router được cập nhật 7.18.4 theo bản vá. Chưa thấy AGENTS.md. Tài liệu tại D:/ICTU/TTCS2026/Team 5/SmartBus_Frontend_Plan.md được dùng bổ sung cho prompt.

## Kiểm chứng theo mốc

Kết quả được cập nhật sau khi chạy lệnh thật; không đánh dấu tích hợp thanh toán/GPS/backend thật đã hoàn thành bằng kết quả demo.

| Mốc | Bằng chứng                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | Landing đủ 10 khối; scope anime.js v4 cleanup StrictMode; các vai trò demo; E2E URL tra cứu, đăng nhập quay lại booking, 403, modal Escape/focus và reduced motion |
| S2  | Service tests tranh chấp/ghế sai/hold hết hạn; E2E refresh expiresAt, mua vé không ghế và CRUD trạm; lịch dùng giờ Việt Nam                                        |
| S3  | E2E pending/callback giả/failed/retry/paid/QR; service idempotency, owner và late confirmation; quản lý xe/nhân sự/phân công                                       |
| S4  | E2E QR sai và dùng lại, tracking mất tín hiệu/kết nối lại; service QR sai chuyến/hết hạn/quyền phân công; camera có cleanup, chưa xác minh camera vật lý           |
| S5  | Service hủy/đổi cập nhật booking/ticket/tồn chỗ/doanh thu; thông báo trạm và sự cố; UI vé tháng/ưu đãi/phản ánh/chứng từ                                           |
| S6  | E2E lọc báo cáo và kiểm tra ô Excel 25.000 VND/tuyến r2; PDF trích xuất pypdf và render Poppler kiểm tra dấu Việt; phân quyền/nhật ký/voucher                      |

### Kết quả đã chạy (06/10/2026)

- TypeScript: đạt (typecheck độc lập và trong production build).
- ESLint: đạt trên toàn bộ src, gồm mã cũ và mới.
- Vitest/RTL: 30 test đạt trên 7 file; 8 test Node landing/theme cũ đạt.
- Production build: đạt, giữ cả index.html và landing.html. ExcelJS có chunk ~930 kB (gzip ~256 kB), chỉ tải động khi xuất Excel; còn cảnh báo chunk >500 kB của Vite.
- npm install/audit sau bản vá: 0 vulnerabilities, lockfile và phiên bản trực tiếp exact.
- Playwright: cả 10 kịch bản đã được kiểm chứng đạt. Lượt toàn bộ mở rộng đạt 9/10, phát hiện header đăng nhập tràn ở 360 px; sau khi sửa, chạy lại landing + portal responsive đạt 2/2. Bao gồm 24 lượt kiểm tra layout cổng ở bốn viewport, các luồng pass/eligibility/support/cancel/refund/notification và đăng ký/hồ sơ/quên mật khẩu.
- Chromium từ CDN bị timeout; các E2E chạy bằng Chrome đã cài thông qua PLAYWRIGHT_EXECUTABLE_PATH.

### Tích hợp còn thiếu

API facade theo API_CONTRACT.md, cookie/CSRF/authorization server, cổng thanh toán sandbox + webhook, GPS/ETA, push/email/SMS, hóa đơn điện tử và hoàn tiền provider thật. Camera cần HTTPS/localhost và thiết bị có camera để xác minh phần cứng. Demo chỉ dùng localStorage trên một trình duyệt; không phải dịch vụ xác thực hoặc cơ sở dữ liệu production. Không triển khai dự báo nhu cầu do chưa có dữ liệu/API.

Không commit, không push, không deploy. Mã cũ và các bài kiểm thử cũ được giữ. README có hướng dẫn chạy và cấu hình tích hợp; tài nguyên/cache/test artifacts được bỏ qua qua frontend/.gitignore.

## Sửa sau review giao diện (08/10/2026)

- [x] Ô giờ tablet đủ rộng; ô ngày/giờ desktop tăng lên 220/150 px để không cắt nội dung ở cỡ chữ 16 px.
- [x] `/trips` trực tiếp dùng ngày hiện tại theo giờ Việt Nam cho cả form và kết quả; card hiển thị ngày cùng giờ.
- [x] Tìm được trạm trung gian đúng chiều. Điểm lên/xuống đi theo URL vào hold, booking và vé. Nếu hành trình URL khác hold hiện tại, phải giải phóng/chọn lại trước khi tiếp tục; refresh không kéo dài hold.
- [x] Vé hết expiresAt tự đổi nhãn và ẩn QR/token trong lúc trang đang mở. Vé đã dùng/hủy cũng ẩn mã.
- [x] Booking và checkout hiển thị tuyến, ngày/giờ đầu tuyến, điểm lên/xuống, kèm giải thích giờ đón trung gian và giá demo cả tuyến.
- [x] Dashboard sắp chuyến sắp khởi hành theo thời gian, loại chuyến hoàn thành, lấy 5 chuyến trên toàn bộ tuyến.
- [x] Field nối nhãn, hint và lỗi với aria-labelledby/describedby/invalid; AuthLayout có đích skip link focus được.
- [x] Chữ phụ dễ đọc hơn, tagline không xuống dòng; chọn trạm bằng checkbox và nút xếp thứ tự thay cho Ctrl + multi-select.
- [x] Header/Hero theo ảnh mẫu: asset TAMBUS riêng nền trong suốt, LED 01 - SMARTBUS, biển 20T-000.00, các thẻ ETA/vé là HTML. Asset dùng WebP 405.542 byte, có bản PNG gốc và [nguồn/prompt](src/assets/images/README.md).
- [x] Tách Header, Button, HeroSection, HeroBusVisual, ArrivalCard, TicketReadyCard, DemoNotice và useHeroAnimation. Tokens CSS, timeline khoảng 1 giây, scope cleanup StrictMode, reduced motion; giữ nguyên phần còn lại và chế độ giao diện cũ.

Kiểm chứng sau sửa: TypeScript độc lập đạt; ESLint đạt; Vitest/RTL 36/36 trên 7 file và Node legacy 8/8 đạt. Playwright toàn bộ 13/13 đạt, gồm responsive 360/768/1280/1440, giữ chỗ, thanh toán, QR, tracking, quyền, báo cáo/export và các luồng tài khoản. Lượt đầu Vitest gặp ENOENT do thư mục tạm sandbox; chạy ngoài sandbox với một worker đã đạt. Bài E2E skip link đã chờ màn hình lazy load hoàn tất trước khi thao tác bàn phím.

Production build cuối (`npm run build`, gồm TypeScript) đạt. Vẫn có cảnh báo ExcelJS chunk khoảng 930 kB, tải động khi export; không chặn build. Sau chỉnh khoảng cách Header và độ rộng ngày/giờ, chạy lại landing responsive + auth skip link + portal responsive đạt 3/3. Ảnh cuối ở `docs/previews/smartbus-hero-1440.png` và `docs/previews/smartbus-hero-360.png`.

Không thay đổi lockfile/phụ thuộc trong đợt sửa giao diện này. Tích hợp bên ngoài còn thiếu như mục trên; không có giao dịch thật hoặc deploy.

### Đồng bộ ảnh xe khu vực xác thực (08/10/2026)

AuthLayout dùng lại ảnh TAMBUS WebP của trang chủ thay SVG xe cũ, giữ tỷ lệ ảnh, nền trong suốt và bố cục form. Áp dụng chung cho đăng nhập, đăng ký và quên mật khẩu; mobile giữ bố cục form hiện có. Lint, format và production build gồm TypeScript đạt. Docker frontend đã build/recreate riêng bằng `docker compose up -d --no-deps --build frontend`; hai E2E xác thực trên Docker (mobile keyboard/skip link và đăng ký/hồ sơ/quên mật khẩu) đạt 2/2. Ảnh kiểm chứng desktop ở `docs/previews/smartbus-auth-tambus.png`. Không commit hoặc push Git.

Màn hình xác thực bỏ thanh “Chế độ demo” phía dưới Header. Bỏ vòng tròn xanh trang trí sau xe để nền phẳng, đồng đều; AuthLayout dùng flex với chiều cao tối thiểu bằng viewport, tránh dải nền lệch ở cuối trang. Giới hạn nội dung minh họa trong cột thương hiệu. Lint/format, build Docker gồm TypeScript và hai E2E xác thực chạy lại đều đạt (2/2). Đã xem ảnh desktop 1440 px và mobile 360 px trên bản Docker, xác nhận không còn vòng nền tràn; cập nhật ảnh bàn giao ở `docs/previews/smartbus-auth-tambus.png`, `docs/previews/smartbus-auth-mobile.png`. Frontend phục vụ tại `http://localhost:3000/login`.

### Kiểm chứng trước khi đưa mã lên GitHub (08/10/2026)

Đã cập nhật `main` từ `origin/main` bằng fast-forward, giữ các commit mới của nhóm. Kiểm tra lại frontend trên mã sau cập nhật: ESLint đạt, production build gồm TypeScript đạt, Node legacy 8/8 và Vitest/RTL 36/36 trên 7 file đạt. Lượt Vitest dùng forks gặp timeout khởi động worker UI trên Windows; chạy lại toàn bộ với `--pool=threads --maxWorkers=1` đã đạt. Commit chỉ gồm frontend, tài liệu, asset và lockfile; không gồm `.env` thật, build hoặc kết quả kiểm thử. Các tích hợp thật còn thiếu vẫn được ghi trong `API_CONTRACT.md`.
