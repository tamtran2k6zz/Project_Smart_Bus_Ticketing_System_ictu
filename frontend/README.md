# SmartBus frontend

React + TypeScript + Vite, giao diện tiếng Việt / VND / Asia/Ho_Chi_Minh. Bản triển khai S1–S6 chạy độc lập bằng adapter demo. Thanh toán, GPS và xác thực vé trong chế độ demo đều được mô phỏng.

## Chạy ứng dụng

Yêu cầu Node.js 24 (phiên này kiểm tra bằng 24.14.0), npm 11.

```powershell
cd frontend # từ thư mục gốc repository
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Mở http://localhost:3000. Không cần backend cho demo. Font Việt, minh họa TAMBUS WebP và sơ đồ Leaflet chạy bằng tài nguyên local. Nếu cổng 3000 đang dùng, chạy `npm run dev -- --port 3010 --strictPort` và mở http://localhost:3010.

## Trải nghiệm demo

- Trang đăng nhập có nút Hành khách, Tài xế/phụ xe, Điều hành, Tài chính, Quản trị viên. Email mẫu tương ứng: `passenger`, `driver`, `manager`, `finance`, `admin` @smartbus.demo. Mật khẩu chung `SmartBus123!`.
- Tìm một chuyến khởi hành trong tương lai (dữ liệu khởi tạo gồm 8 ngày). Tuyến 01 không gắn ghế; tuyến 02 và 03 có ghế. Mỗi đặt vé tối đa 6 hành khách.
- Tra cứu trực tiếp mặc định theo ngày Việt Nam hiện tại. Hỗ trợ điểm lên/xuống trung gian theo đúng chiều tuyến; demo vẫn áp dụng giá/sức chứa cả tuyến. Giờ trên chuyến là giờ khởi hành tại đầu tuyến; giờ đón trung gian cần nhà xe xác nhận.
- Giữ chỗ → nhập thông tin → checkout → khởi tạo giao dịch → chọn mô phỏng pending/failed/canceled/paid. Chỉ paid có QR. `SMART10` giảm 10% khi còn hiệu lực.
- Tải lại giữ nguyên expiresAt. Ghế held/booked được dịch vụ kiểm tra lại. Khi hết hạn phải giữ chỗ lại. Dữ liệu được lưu trong localStorage; Web Locks tuần tự hóa ghi giữa các tab trên trình duyệt hỗ trợ. Đây không thay thế khóa/tồn ghế backend.
- QR chứa token ngẫu nhiên; một QR đại diện toàn bộ số vé của một đặt vé. Demo soát vé yêu cầu đúng chuyến, còn hạn, chưa sử dụng và booking paid. Tài xế chỉ soát chuyến đã được phân công; quản trị/điều hành được soát các chuyến.
- Vé tự chuyển nhãn hết hạn và ẩn QR/token khi hết expiresAt, kể cả đang mở trang; vé đã dùng/đã hủy cũng ẩn mã.
- Yêu cầu hủy/đổi gửi trước khởi hành 30 phút; xử lý tại /admin/support. Duyệt hủy trả chỗ, khoản hoàn chờ xử lý ở /admin/reports. Duyệt đổi cùng tuyến/loại vé cập nhật booking/ticket và chọn chỗ trống. Thông báo được cập nhật theo thao tác.
- Vé tháng giá minh họa 250.000đ/30 ngày; hồ sơ ưu đãi được duyệt có giá 150.000đ. Không nhập dữ liệu cá nhân nhạy cảm vào demo.
- Tracking có thời điểm cuối, ETA mô phỏng, nút mất tín hiệu/kết nối lại. Sự cố nhân viên báo sẽ xuất hiện trên tracking.
- Báo cáo lọc theo ngày khởi hành/tuyến, tính từ toàn bộ DB demo; Excel/PDF giữ bộ lọc đã áp dụng. Giá trị không được tạo ngẫu nhiên. Doanh thu gồm khoản chờ hoàn, trừ khoản đã hoàn.
- Xóa localStorage của trang để khởi tạo lại demo. Dữ liệu demo không phải cơ sở dữ liệu chia sẻ giữa các thiết bị.

## Giữ giao diện/API cũ

Mã frontend cũ giữ nguyên tại các thư mục ban đầu và `src/LegacyApp.tsx`. Bật `VITE_LEGACY_APP=true` rồi khởi động lại Vite để chạy giao diện cũ và API cũ. `landing.html` và các kiểm thử payment/theme cũ vẫn được giữ.

Backend đang có /api/v1/auth, trips/search, trips/:id/seats và nghiệp vụ payment; hợp đồng này khác DTO mới. Chế độ API mới dùng hợp đồng trong [API_CONTRACT.md](API_CONTRACT.md), cần backend facade/mapping hoặc điều chỉnh các service theo DTO đã thống nhất. Không tuyên bố đã tích hợp thật chỉ bằng cách đổi env.

## Nối backend

1. Đặt `VITE_APP_MODE=api`, `VITE_API_BASE_URL` trỏ đến base URL facade; restart Vite.
2. Các service feature đi qua `services/http.ts` (Axios, timeout, cookie withCredentials). Chế độ api không âm thầm fallback về demo.
3. Implement endpoint /catalog, /auth/session và các response có kiểu đã nêu. Backend xác thực cookie HttpOnly, kiểm tra quyền và ownership trên mọi endpoint, CORS cho origin frontend; cần cơ chế CSRF phía server khi dùng cookie.
4. Backend cấp giá, ghế, serverTime/expiresAt, QR token; khóa ghế và check-in nguyên tử. Cổng phải xác nhận webhook và idempotency. Callback chỉ đọc booking.
5. /payments trả redirectUrl HTTPS do backend cấp. Chỉ dùng sandbox khi thử tích hợp; không nhúng secret vào VITE_*.
6. Tracking hiện dùng polling 5 giây qua adapter; nối GPS/ETA server và trả connected/updatedAt thật. Có thể thay bằng SSE/WebSocket trong cùng adapter. Thông báo hiện ở trong ứng dụng; push/email/SMS cần backend.
7. Tile Leaflet tùy chọn: `VITE_MAP_TILE_URL` + `VITE_MAP_ATTRIBUTION` theo giấy phép provider. Khi chưa cấu hình, nền chỉ là sơ đồ tuyến minh họa.
8. Hóa đơn điện tử/hoàn tiền/đăng ký vé tháng thật cần nghiệp vụ backend và provider; PDF demo ghi rõ không phải hóa đơn hợp lệ. Dự báo nhu cầu chưa triển khai vì chưa có dữ liệu/API.

## Kiểm tra

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Nếu CDN Playwright không tải được Chromium, dùng Chrome đã cài:

```powershell
$env:PLAYWRIGHT_EXECUTABLE_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$env:PLAYWRIGHT_PORT = '3010' # tùy chọn khi cổng 3000 đang dùng
npm run test:e2e
```

E2E: responsive 360/768/1280/1440, reduced motion, menu, keyboard, callback giả, hold refresh/hết hạn, thanh toán retry, QR, mất tín hiệu/kết nối lại, quyền, CRUD/modal và nội dung Excel/PDF. Camera vật lý/GPS/webhook/gateway thật cần kiểm chứng trong môi trường tích hợp. Kết quả cụ thể ghi ở [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Tổ chức mã

Giữ cây src bắt buộc; `features/*/services` chứa nghiệp vụ, `pages` ghép component, `routes/AppRouter.tsx` ghép route, `configs/routes.ts` chứa path, `services/mocks` chứa DB demo. Query quản lý server cache; Zustand chỉ giữ session, bản nháp và menu. CSS Modules + variables, anime.js 4.5.0 dùng createScope/revert, createTimeline, animate, stagger, onScroll; reduced motion bỏ chuyển động. Modal dùng dialog native với focus trap/Escape/phục hồi focus.

Font Be Vietnam Pro theo OFL (giấy phép ở public/fonts/OFL.txt và package fontsource). Dependency trực tiếp chốt phiên bản exact; dùng lockfile đã có trong repository với `npm ci`.

Hero và Header đã được tách thành component riêng; timeline anime.js v4 chạy một lần khoảng một giây, cleanup theo scope và bỏ chuyển động khi reduced motion. Nguồn ảnh và prompt minh họa TAMBUS được ghi ở [src/assets/images/README.md](src/assets/images/README.md).
