# Sprint 4 — Kế hoạch kiểm thử và nghiệm thu

Đồ án Thực tập Cơ sở 2026 · Nhóm 5 — N5 Innovators · ICTU.

Sprint bắt đầu từ baseline `ae023ec` trên `Develop`. Môi trường kiểm thử được chọn là **cục bộ tách biệt**, dùng PostgreSQL thật và Redis thật. Kết quả tại máy không tự thay thế nghiệm thu Staging hoặc chữ ký PO/QA.

## Phạm vi đợt đầu

- Sửa geofencing từ 300 m về 500 m theo bảng kế hoạch, kiểm tra 400/499/500/501 m.
- Chạy 200 virtual users tra cứu liên tục trong 30 giây và 50 tài khoản khác nhau tranh một ghế. Kiểm tra riêng luồng UI dùng transaction PostgreSQL và luồng ticketing dùng Redis + PostgreSQL.
- Soak 20 virtual users trong 60 giây, thu CPU, RSS, heap, event loop và pool. Đây là lượt đo ngắn; cần lượt 30–60 phút trước khi đánh giá xu hướng memory leak.
- Kiểm tra mất mạng khi soát vé và timeout khi đơn thanh toán đã được lưu.
- Lighthouse mobile trên production build của trang chủ và đăng nhập, mặc định ba lượt/trang. Các màn hình có đăng nhập và môi trường Staging còn phải đo riêng.

## Môi trường cục bộ

Tại thư mục gốc:

```powershell
docker compose -f docker-compose.sprint4.yml up -d --wait
npm --prefix backend ci
npm --prefix backend run build
npm --prefix backend run test:sprint4
npm --prefix backend run test:load
```

PostgreSQL: `127.0.0.1:6544`, database điều khiển `smartbus_sprint4_test`, tài khoản `sprint4`, mật khẩu fixture công khai `sprint4-local-only`. Redis: `127.0.0.1:6381`. Chỉ bind loopback; không dùng các thông tin fixture này cho deployment khác. PostgreSQL dùng tmpfs; dừng container sẽ bỏ dữ liệu thử. Runner từ chối URL ngoài localhost và database điều khiển có tên khác, không đọc `DATABASE_URL` của ứng dụng thật.

Mỗi lượt runner tạo một database có tên ngẫu nhiên `smartbus_sprint4_<timestamp>_<random>`, áp migration, tạo 50 hành khách giả và một tuyến/chuyến/xe 40 ghế. API chạy trên cổng loopback ngẫu nhiên bằng pool PostgreSQL gốc, không patch/tuần tự hóa pool như PGlite. Kết thúc lượt chạy đóng API, xóa đúng database tạm và khóa Redis của chuyến thử; database điều khiển không bị xóa.

Đầu ra mặc định: `backend/test-results/sprint4/<run>/`, đã được Git ignore:

- `summary.json`: số request, RPS, HTTP status, p50/p95/p99, kết quả tranh ghế và cấu hình đo.
- `*-requests.json`: thời gian từng request, không chứa token đăng nhập.
- `server-metrics.json`: CPU quy đổi theo một core, RSS/heap, pool total/idle/waiting và event loop p95 mỗi giây.
- `schema.json`, `schema-erd.md`: schema vật lý lấy từ PostgreSQL sau khi áp migration. Quan hệ Mermaid hiện minh họa cạnh FK; kiểm tra unique/nullability trong constraints trước khi dùng như ERD nghiệm thu cuối.
- `api.log`: log cục bộ phục vụ chẩn đoán, không upload toàn bộ log khi chưa kiểm tra dữ liệu.

Có thể đổi thời lượng qua `SPRINT4_SEARCH_SECONDS` / `SPRINT4_SOAK_SECONDS` (10–3600 giây). Chọn `SPRINT4_OUTPUT_DIR` để lưu bằng chứng ngoài checkout. `SPRINT4_API_P95_MS` mặc định 150 ms: p95 của **API tra cứu trong bài đo này**, không phải chứng nhận mọi endpoint đều dưới 150 ms. Việc dùng p95 là phương pháp đo tạm cho nhóm; cần PO/QA chốt cách diễn giải tiêu chí trước nghiệm thu.

Tiêu chí dữ liệu: đúng một người giữ ghế thành công, 49 phản hồi 409, đúng một hold/reservation trong DB, đúng chủ sở hữu, Redis key có TTL và thuộc người thắng đối với luồng Redis. HTTP 409 có chủ đích không tính là lỗi hệ thống. Tra cứu phải trả chuyến thử hợp lệ, không chỉ HTTP 200. Bài đo giữ ghế không thu tiền hay tự phát hành vé.

200 virtual users là số vòng người dùng đồng thời theo mô hình closed-loop, không phải cam kết 200 request/giây. Ghi cả cấu hình máy, volume dữ liệu và các tác vụ khác đang chạy khi so sánh kết quả.

## Lighthouse

```powershell
npm --prefix frontend ci
npm --prefix frontend run build
$env:CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm --prefix frontend run test:performance
```

Runner dùng Lighthouse phiên bản cố định trong devDependencies, tạo HTTP server chỉ đọc trên loopback để phục vụ production build. Mặc định đo mobile ba lượt cho `/` và `/login`, giữ HTML/JSON từng lượt và median. `SPRINT4_WEB_URL` chỉ chấp nhận localhost nếu cần đo một server cục bộ khác. Có thể đặt `SPRINT4_LIGHTHOUSE_RUNS=1` để chẩn đoán nhanh; không trộn với kết quả median ba lượt khi nghiệm thu.

Static server dùng gzip level 6 và cache immutable cho assets có hash, tương ứng `frontend/nginx.conf`. Lượt baseline trước tối ưu chưa nén; ghi rõ thay đổi máy chủ khi so sánh. Build tạo ảnh hero responsive bằng Sharp; `npm run dev` vẫn phục vụ ảnh gốc. Font optional ưu tiên nội dung đọc được ngay bằng font hệ thống nếu font thương hiệu chưa sẵn sàng.

Gate hiện kiểm tra performance score >85 và **observed page load** <2 giây. LCP được báo cáo riêng. Cần thống nhất “tải trang” là observed load hay LCP trước ký DoD; không đổi cách tính để làm kết quả xanh. Static server không đại diện CDN/network của deployment và không dùng dữ liệu giả để chứng minh màn hình API.

Hướng dẫn công cụ gốc: [GoogleChrome/Lighthouse](https://github.com/GoogleChrome/lighthouse#using-the-node-cli).

## CI và thu bằng chứng

CI chính giữ các unit/integration checks hiện có, thêm guard/statistics tests cho runner. Workflow **Sprint 4 isolated performance** chạy thủ công qua Actions, tạo PostgreSQL/Redis service riêng và upload JSON/metrics/ERD kể cả khi gate hiệu năng thất bại. Không tự chạy tải vào Vercel khi push.

Lưu mỗi lỗi theo: mã, US/DoD liên quan, severity, bước tái hiện, kết quả mong đợi/thực tế, môi trường/commit, người phụ trách, bản sửa, bằng chứng retest. Chỉ đóng lỗi sau retest; không coi CI xanh là bằng chứng toàn bộ Staging đã đạt.

## Điều kiện kết thúc Sprint

1. Ma trận 24 US có kết quả trên Staging hoặc môi trường được PO phê duyệt, gồm thiết bị camera/GPS và dịch vụ ngoài thuộc phạm vi.
2. Có số liệu tải, Lighthouse, API và soak đủ thời lượng; các mục chưa đạt có quyết định rõ ràng.
3. Không còn Critical/Major chưa được xử lý hoặc chấp nhận theo quy trình nhóm.
4. OpenAPI/Swagger, ERD và Docker phản ánh đúng PostgreSQL/Supabase hiện tại.
5. Báo cáo PDF 5 chương, slide cuối, video, dry run 20 phút và biên bản PO/QA hoàn tất, rồi mới tag `v1.0.0`.
