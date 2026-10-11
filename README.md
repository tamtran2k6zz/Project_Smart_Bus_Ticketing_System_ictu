# <img width="37" height="42" alt="image" src="https://github.com/user-attachments/assets/e99a581d-9797-4d3d-942c-1974d42c3183" />
 SmartBus — Hệ thống bán vé và quản lý xe buýt thông minh

**Đồ án Thực tập Cơ sở 2026 — Nhóm 5 (N5 Innovators)**

Trường Đại học Công nghệ Thông tin & Truyền thông — Đại học Thái Nguyên (ICTU).

SmartBus hỗ trợ tra cứu chuyến, đặt ghế, thanh toán, nhận vé QR, theo dõi xe và quản lý vận hành. Giao diện sử dụng tiếng Việt, tiền tệ VND và múi giờ `Asia/Ho_Chi_Minh`.

![Giao diện SmartBus với minh họa TAMBUS](frontend/docs/previews/smartbus-hero-1440.png)

## Trạng thái hiện tại

Cập nhật ngày **11/10/2026**, theo mã nguồn `main` sau bản sửa conflict `3feca1e`.

- Frontend React/TypeScript mặc định chạy **API**. Express đã có lớp API `/api/smartbus/v1` cho giao diện mới, bên cạnh các endpoint `/api/v1` và alias `/api` của giao diện legacy.
- Luồng API có đăng ký/đăng nhập bằng JWT, xác minh email, giữ nhiều ghế, đặt vé, thanh toán MoMo/VNPay, phát hành QR, soát vé theo chuyến và gửi email vé sau thanh toán.
- Chế độ **demo** chạy độc lập trong trình duyệt khi đặt `VITE_APP_MODE=demo`; dữ liệu, thanh toán và vị trí xe được mô phỏng.
- Backend có quản lý tuyến/trạm/xe/lịch chạy/nhân sự, phân công tài xế, vé tháng, ưu đãi, thông báo, phản ánh và báo cáo. Quyền được kiểm tra tại API.
- Khôi phục mật khẩu trực tuyến hiện trả HTTP 503. ZaloPay và mua vé không chọn ghế chưa được hỗ trợ trong luồng API hiện tại. Lựa chọn `Card` dùng luồng VNPay.

Các kiểm tra cục bộ đã đạt: typecheck, lint, build, **66 test backend**, **59 test Vitest frontend**, **8 test theme** và **297 kiểm tra API/database**, bao gồm hợp đồng frontend và email. Kết quả này dùng database PostgreSQL nhúng, gateway và SMTP giả lập; nghiệm thu thanh toán/email thật cần cấu hình dịch vụ và kiểm tra riêng.

## Mục lục

- [Công nghệ và kiến trúc](#công-nghệ-và-kiến-trúc)
- [Chạy nhanh chế độ demo](#chạy-nhanh-chế-độ-demo)
- [Chạy API bằng Node.js và Vite](#chạy-api-bằng-nodejs-và-vite)
- [Chạy bằng Docker Compose](#chạy-bằng-docker-compose)
- [Xác minh email và gửi vé](#xác-minh-email-và-gửi-vé)
- [Thanh toán và soát vé](#thanh-toán-và-soát-vé)
- [Các đường dẫn giao diện](#các-đường-dẫn-giao-diện)
- [API chính](#api-chính)
- [Kiểm tra và build](#kiểm-tra-và-build)
- [Triển khai Vercel](#triển-khai-vercel)
- [Cấu trúc repository và tài liệu](#cấu-trúc-repository-và-tài-liệu)
- [Đội ngũ phát triển](#đội-ngũ-phát-triển)

## Công nghệ và kiến trúc

| Thành phần            | Công nghệ / vai trò                                                                |
| --------------------- | ---------------------------------------------------------------------------------- |
| Frontend              | React 19, TypeScript, Vite 8, React Router, CSS Modules, anime.js v4               |
| Dữ liệu và biểu mẫu   | TanStack Query, Axios, Zustand, React Hook Form, Zod                               |
| Bản đồ và báo cáo     | Leaflet, Recharts, ExcelJS, jsPDF                                                  |
| Backend               | Express, TypeScript, JWT, bcrypt, WebSocket, Nodemailer                            |
| Database              | PostgreSQL trên Supabase; migrations và RLS trong `supabase/migrations`            |
| Khóa tạm thời         | PostgreSQL row locks; Redis tùy chọn cho khóa và chống gửi trùng giữa các instance |
| Kiểm thử              | Jest, Vitest/Testing Library, Playwright, PGlite                                   |
| Đóng gói / triển khai | Docker Compose, Nginx, Vercel                                                      |

Vite chuyển tiếp `/api` tới `http://localhost:5000` khi phát triển. Trong Docker, Nginx chuyển tiếp tới service `backend:5000`. Trên Vercel, `api/adapter.js` nạp Express từ `backend/dist/app.js`; rewrite API được xử lý trước fallback SPA.

## Chạy nhanh chế độ demo

Dùng Node.js 24/npm 11 để khớp môi trường kiểm chứng cục bộ. CI và Docker backend đang dùng Node.js 22.

```powershell
git clone https://github.com/tamtran2k6zz/Project_Smart_Bus_Ticketing_System_ictu.git
cd Project_Smart_Bus_Ticketing_System_ictu
npm --prefix frontend ci
Copy-Item frontend/.env.example frontend/.env.local
```

Sửa `frontend/.env.local`:

```dotenv
VITE_APP_MODE=demo
VITE_API_BASE_URL=/api/smartbus/v1
VITE_LEGACY_APP=false
```

```powershell
npm --prefix frontend run dev
```

Mở [http://localhost:3000](http://localhost:3000). Nếu cổng đã bận, chạy `npm --prefix frontend run dev -- --port 3010 --strictPort` và mở cổng 3010.

Tài khoản demo dùng mật khẩu chung `SmartBus123!`:

| Vai trò       | Email                     |
| ------------- | ------------------------- |
| Hành khách    | `passenger@smartbus.demo` |
| Tài xế        | `driver@smartbus.demo`    |
| Điều hành     | `manager@smartbus.demo`   |
| Tài chính     | `finance@smartbus.demo`   |
| Quản trị viên | `admin@smartbus.demo`     |

Các tài khoản này thuộc dữ liệu trình duyệt. Chạy thử: tìm chuyến → chọn ghế → giữ chỗ → checkout → chọn kết quả thanh toán mô phỏng → xem vé/QR. Xóa dữ liệu `smartbus.demo.v1` trong localStorage để khởi tạo lại demo. Refresh trang không gia hạn giữ chỗ; tham số callback không tự xác nhận thanh toán.

## Chạy API bằng Node.js và Vite

### 1. Cài dependency và cấu hình backend

Từ thư mục gốc repository:

```powershell
npm ci
npm --prefix backend ci
npm --prefix frontend ci
Copy-Item .env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
```

Điền cấu hình riêng vào `backend/.env`:

| Biến                  | Giá trị / mục đích                                                         |
| --------------------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`        | Connection string PostgreSQL Transaction pooler, thường cổng 6543, cho API |
| `DIRECT_URL`          | Connection string Session pooler/direct cổng 5432, cho migration           |
| `JWT_SECRET`          | Secret riêng tối thiểu 32 ký tự                                            |
| `PORT`                | `5000`                                                                     |
| `CORS_ORIGIN`         | Origin frontend được phép, ví dụ `http://localhost:3000`                   |
| `REDIS_URL`           | Để trống khi chạy chỉ với khóa PostgreSQL, hoặc URL Redis riêng            |
| `FRONTEND_PUBLIC_URL` | Origin frontend dùng trong liên kết email, ví dụ `http://localhost:3000`   |
| `SMTP_*`              | Cấu hình gửi email xác minh và vé; xem phần email bên dưới                 |
| `VNPAY_*`, `MOMO_*`   | Merchant và callback của cổng thanh toán được sử dụng                      |

Lấy nguyên connection string từ mục **Connect** của Supabase, thay mật khẩu đúng định dạng URL. Các biến database/JWT/SMTP thuộc môi trường backend và không được đặt trong `VITE_*`. Mẫu `.env.example` được chia sẻ; file `.env` riêng được Git ignore.

Có thể tạo JWT secret bằng Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

### 2. Migration và tài khoản quản trị

Chạy các lệnh dưới đây **trong `backend/`** để `dotenv` đọc đúng `backend/.env`:

```powershell
cd backend
npm run db:migrate
$env:ADMIN_EMAIL = 'admin@example.com'
$env:ADMIN_PASSWORD = Read-Host 'Mật khẩu quản trị, tối thiểu 12 ký tự' -MaskInput
npm run db:create-admin
Remove-Item Env:ADMIN_PASSWORD
Remove-Item Env:ADMIN_EMAIL
```

`-MaskInput` dùng PowerShell 7. Với Windows PowerShell 5.1, điền `ADMIN_EMAIL` và `ADMIN_PASSWORD` tạm thời trong `backend/.env`, chạy `npm run db:create-admin`, rồi xóa hai biến này khỏi file.

Migration runner dùng `DIRECT_URL` trước `DATABASE_URL`, từ chối cổng Transaction pooler 6543 và lưu checksum các migration đã áp dụng. Người quản lý database chạy migration cho môi trường dùng chung khi có migration mới. Hai migration bổ sung API giao diện và email là `20261010163000_ui_api_contract.sql` và `20261011133000_email_verification_delivery.sql`.

Tài khoản quản trị được tạo bởi script; không có mật khẩu quản trị dùng chung. Tạo tuyến, trạm, xe và chuyến tương lai qua giao diện quản trị để có dữ liệu tìm kiếm/đặt vé. Tài khoản demo trình duyệt không đăng nhập được vào database thật.

### 3. Khởi chạy

Trong terminal backend:

```powershell
npm run start:express
```

Trong terminal mới, từ thư mục gốc:

```powershell
npm --prefix frontend run dev
```

`frontend/.env.local` cho luồng API:

```dotenv
VITE_APP_MODE=api
VITE_API_BASE_URL=/api/smartbus/v1
VITE_LEGACY_APP=false
```

Frontend: [http://localhost:3000](http://localhost:3000). Health API: [http://localhost:5000/api/health](http://localhost:5000/api/health). JWT frontend mới được lưu trong sessionStorage và gửi bằng header `Authorization: Bearer ...`; HTTP 401 sẽ xóa token. API lỗi không tự chuyển sang demo.

Để mở giao diện legacy, đặt `VITE_LEGACY_APP=true` rồi khởi động lại Vite hoặc build lại. Các biến `VITE_*` được đọc lúc build; đổi env sau khi build cần dựng lại frontend.

## Chạy bằng Docker Compose

Compose có ba service: **frontend**, **backend**, **redis**. Database nằm trên Supabase; Compose hiện không khởi chạy PostgreSQL cục bộ.

```powershell
Copy-Item .env.example .env
```

Điền `DATABASE_URL`, `JWT_SECRET` và các biến backend cần dùng trong `.env` gốc. Chuẩn bị migration bằng hướng dẫn Node.js ở trên. Các giá trị trong `backend/.env` và `.env` gốc cần trỏ tới đúng môi trường database.

`docker-compose.yml` hiện truyền các biến database/JWT/payment cơ bản. Để dùng email và cấu hình QR bổ sung, tạo `docker-compose.override.yml` ở thư mục gốc:

```yaml
services:
  backend:
    environment:
      SMTP_HOST: ${SMTP_HOST:-}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_SECURE: ${SMTP_SECURE:-false}
      SMTP_USER: ${SMTP_USER:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      SMTP_FROM: ${SMTP_FROM:-}
      FRONTEND_PUBLIC_URL: ${FRONTEND_PUBLIC_URL:-http://localhost:3000}
      QR_HMAC_SECRET: ${QR_HMAC_SECRET:-}
      QR_EXP_MINUTES: ${QR_EXP_MINUTES:-1440}
      PAYMENT_DEMO_ENABLED: ${PAYMENT_DEMO_ENABLED:-false}
```

Override chứa tham chiếu biến; các giá trị SMTP/JWT riêng vẫn nằm trong `.env`. Đặt các biến frontend trong `frontend/.env.local` trước khi build image. Sau đó chạy:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs --tail 50 backend frontend
```

- Frontend và API qua Nginx: [http://localhost:3000](http://localhost:3000), `/api/health`.
- Backend trực tiếp: [http://localhost:5000/api/health](http://localhost:5000/api/health).
- Đổi `FRONTEND_PORT` trong `.env` nếu cổng 3000 bận; cập nhật `FRONTEND_PUBLIC_URL` và origin liên quan theo cổng mới.
- Compose dùng Redis nội bộ mặc định. Các máy dùng chung PostgreSQL có thể cần Redis dùng chung nếu muốn đồng bộ khóa Redis giữa các máy.

Sau khi pull mã mới, dựng lại service đã thay đổi. Khi chỉ đổi frontend:

```powershell
git pull --ff-only
docker compose up -d --no-deps --build frontend
```

## Xác minh email và gửi vé

Luồng API: **đăng ký → nhận liên kết → bấm xác minh → giữ ghế/đặt vé → thanh toán → nhận vé QR**.

```dotenv
FRONTEND_PUBLIC_URL=http://localhost:3000
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=SmartBus <your-sender@example.com>
```

Liên kết xác minh có hiệu lực 30 phút, dùng một lần; gửi lại làm vô hiệu mã cũ. Gửi lại giới hạn 60 giây/lần và 5 lần mỗi giờ/tài khoản. Chưa xác minh thì không thể giữ ghế/thanh toán; vẫn có thể đăng nhập để yêu cầu gửi lại. Thiếu SMTP không tự bỏ qua xác minh.

Sau callback thanh toán hợp lệ, backend lưu công việc gửi email trong PostgreSQL. Email gồm mã vé, hành trình, ghế/số lượng, số tiền, QR PNG và liên kết tới vé hiện tại. SMTP lỗi không đảo ngược thanh toán. Job `/api/v1/ticketing/release-expired` xử lý thêm tối đa một email đến hạn mỗi lần; thử tối đa 5 lần, cách nhau 5 phút. Gọi job bằng Bearer `PAYMENT_CRON_SECRET` và cấu hình lịch gọi trong môi trường triển khai.

Trạng thái email `sent` nghĩa SMTP chấp nhận thư. Luồng và hướng dẫn nghiệm thu chi tiết: [EMAIL_DELIVERY.md](EMAIL_DELIVERY.md).

## Thanh toán và soát vé

- **API frontend mới:** MoMo hoặc VNPay; lựa chọn `Card` được xử lý qua VNPay. Gateway merchant phải được cấu hình ở backend.
- **Tiếp tục hoặc đổi thanh toán:** khi giao dịch đang chờ và giữ chỗ còn hiệu lực, khách có thể mở lại cổng hiện tại hoặc chọn phương thức khác. Đổi cổng tạo mã giao dịch mới, giữ nguyên ghế và thời hạn giữ chỗ. Xác nhận thành công đến muộn từ giao dịch cũ đi qua luồng hoàn tiền, không phát hành thêm vé. Vé đã thanh toán và giữ chỗ hết hạn không được đổi cổng.
- **Lỗi khởi tạo cổng:** API trả 502 kèm hướng dẫn thử lại hoặc đổi phương thức; checkout không khóa khách vì bản ghi thanh toán còn ở trạng thái chờ. Thiếu thông tin merchant vẫn cần được cấu hình trên môi trường chạy backend/Vercel.
- **Frontend demo:** có thể chọn kết quả thanh toán mô phỏng. Thao tác này chỉ cập nhật dữ liệu demo trong trình duyệt.
- **API legacy QR demo:** `POST /api/v1/ticketing/bookings` yêu cầu `paymentMethod` rõ ràng: `MOMO`, `VNPAY` hoặc `QR`; thiếu/sai phương thức trả 400. `QR` tạo giữ chỗ `RESERVED/PENDING`. Endpoint `/bookings/:ticketId/demo-complete` chỉ bật khi `PAYMENT_DEMO_ENABLED=true` ngoài production; xác nhận vé và giữ nguyên trạng thái chuyến.

Vé chỉ dùng để soát sau xác nhận thanh toán. Backend kiểm tra chữ ký/thời hạn/nonce QR, đúng chuyến, phân công tài xế, trạng thái vé và cửa sổ soát vé. Nhập mã vé thủ công cần `manual=true` và quyền soát vé. Vé hủy/hết hạn/chưa thanh toán bị từ chối; soát lặp không tạo thêm lần check-in.

API legacy hủy vé đã mua trước khởi hành ít nhất 30 phút và chưa soát. Trạng thái hủy được lưu trước lời gọi hoàn tiền. Nếu provider lỗi, trả `ticketStatus=CANCELLED`, `refundPending=true`; gửi lại cùng endpoint để tiếp tục bằng cùng mã yêu cầu hoàn tiền.

Để nhận IPN từ merchant khi chạy local, dùng origin HTTPS công khai/tunnel trong `PAYMENT_PUBLIC_BASE_URL`, `VNPAY_IPN_URL`, `MOMO_IPN_URL`. `localhost` chỉ truy cập được từ máy local. Với frontend mới, cấu hình `PAYMENT_RESULT_URL` và `MOMO_REDIRECT_URL` tới trang `/payment/result` trên origin frontend.

## Các đường dẫn giao diện

| Khu vực    | Đường dẫn                                                                                                                                                                     |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Công khai  | `/`, `/trips`, `/trips/:tripId`, `/tracking/:tripId`                                                                                                                          |
| Tài khoản  | `/login`, `/register`, `/forgot-password`, `/verify-email`                                                                                                                    |
| Đặt vé     | `/booking/:tripId`, `/checkout/:bookingId`, `/payment/result`                                                                                                                 |
| Hành khách | `/account/tickets`, `/account/tickets/:ticketId`, `/account/passes`, `/account/notifications`, `/account/support`, `/account/profile`                                         |
| Quản trị   | `/admin`, `/admin/routes`, `/admin/stops`, `/admin/schedules`, `/admin/vehicles`, `/admin/staff`, `/admin/assignments`, `/admin/reports`, `/admin/promotions`, `/admin/users` |
| Nhân viên  | `/staff/trips`, `/staff/scan`, `/staff/incidents`                                                                                                                             |

Frontend có các vai trò `PASSENGER`, `DRIVER`, `MANAGER`, `FINANCE`, `ADMIN`; quyền truy cập thực tế do backend quyết định.

## API chính

### Frontend mới: `/api/smartbus/v1`

| Nhóm              | Endpoint tiêu biểu                                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Xác thực          | `POST /auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/resend-verification`; `GET /auth/session`                 |
| Tra cứu           | `GET /catalog`, `/trips`, `/trips/:id`, `/trips/:id/seats`, `/trips/:id/location`                                            |
| Giữ chỗ           | `POST /holds`, `GET /holds/:id`, `DELETE /holds/:id`; chọn 1–6 ghế khác nhau                                                 |
| Đặt vé/thanh toán | `POST /bookings`, `GET /bookings/:id`, `/bookings/:id/payment`; `POST /payments`                                             |
| Vé và yêu cầu     | `GET /tickets`, `/tickets/:id`; `POST /tickets/:id/requests`; `GET /ticket-requests`, `PUT /ticket-requests/:id`             |
| Soát vé/vị trí    | `POST /ticket-validations`, `GET /ticket-validations/checked-in`, `/staff/trips`; `POST /trips/:id/location`                 |
| Quản lý           | `/operations/:key`, `/users`, `/passes`, `/vouchers`, `/eligibility`, `/incidents`, `/support`, `/notifications`, `/reports` |

Các endpoint và kiểm tra quyền nằm trong [ui.routes.ts](backend/src/routes/ui.routes.ts). Client [http.ts](frontend/src/services/http.ts) xử lý JSON trực tiếp hoặc envelope `{success, data}`, đồng thời chuẩn hóa dữ liệu đăng nhập cho giao diện. [API_CONTRACT.md](frontend/API_CONTRACT.md) ghi các interface/frontend contract; phần cookie và trạng thái tích hợp trong tài liệu đó còn cần cập nhật theo triển khai JWT hiện tại.

### API legacy: `/api/v1` và alias `/api`

Các nhóm chính: `/auth`, `/routes`, `/stops`, `/trips`, `/seats`, `/operations`, `/ticketing`, `/tickets`, `/devices`, `/notifications`, `/users`. Mount cụ thể ở [app.ts](backend/src/app.ts).

Thanh toán có callback VNPay `GET /api/v1/ticketing/payments/vnpay/ipn` và MoMo `POST /api/v1/ticketing/payments/momo/ipn`. Các endpoint return/redirect của trình duyệt lấy trạng thái giao dịch từ backend. Health API: `GET /api/health`.

## Kiểm tra và build

Từ thư mục gốc, sau khi đã cài dependency:

```powershell
npm --prefix backend run typecheck
npm --prefix frontend run typecheck
npm run lint
npm test
npm run build
npm --prefix backend run test:postgres
npm --prefix backend run test:serverless
```

`test:postgres` dùng migrations thật trên PGlite, HTTP gateway giả và SMTP giả; không cần database Supabase hoặc credential merchant thật. Chạy backend build trước khi chạy bài kiểm tra này. Phạm vi bao gồm giữ ghế đồng thời, payment callback lặp, hủy/hoàn tiền, QR, quyền tài xế, GPS, báo cáo, RLS và xác minh/gửi email.

Nếu Vitest timeout khởi động worker trên Windows, chạy từ `frontend/`:

```powershell
node node_modules/vitest/vitest.mjs run --pool=threads --maxWorkers=1
```

Kiểm tra E2E demo:

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

Playwright tự chạy Vite ở chế độ demo. Đổi cổng bằng `$env:PLAYWRIGHT_PORT='3010'`; đặt `PLAYWRIGHT_EXECUTABLE_PATH` nếu dùng browser đã cài. Khi đang chạy Vite API trên cùng cổng, chọn cổng riêng cho E2E demo.

Workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) chạy typecheck backend, lint, unit tests, build, kiểm tra PostgreSQL và adapter Vercel khi push/PR tới `main` hoặc `develop`. Build frontend hiện còn cảnh báo kích thước chunk ExcelJS; build vẫn hoàn thành.

## Triển khai Vercel

Cấu hình project dùng repository root; [vercel.json](vercel.json) cài/build backend và frontend, xuất `frontend/dist`, đóng gói `backend/dist/**` trong function `api/adapter.js`.

Thiết lập biến backend trên Vercel: `DATABASE_URL`, `JWT_SECRET`, `DB_POOL_MAX`, `FRONTEND_PUBLIC_URL`, `SMTP_*`, các biến merchant/callback cần dùng và `PAYMENT_CRON_SECRET`. Biến frontend `VITE_APP_MODE=api`, `VITE_API_BASE_URL=/api/smartbus/v1`, `VITE_LEGACY_APP=false` được áp dụng lúc build. Chạy migration qua Session pooler/direct trước khi sử dụng phiên bản có migration mới.

| Liên kết đã cấu hình | URL                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Web app              | [smart-bus-ticketing-system.vercel.app](https://smart-bus-ticketing-system.vercel.app)                                               |
| Health API           | [smart-bus-ticketing-system.vercel.app/api/health](https://smart-bus-ticketing-system.vercel.app/api/health)                         |
| Alias                | [project-smart-bus-ticketing-system-ictu-e8pb9rofi.vercel.app](https://project-smart-bus-ticketing-system-ictu-e8pb9rofi.vercel.app) |

Trạng thái cloud và phiên bản đang phục vụ cần kiểm tra sau deploy. Hướng dẫn chi tiết: [Supabase/Vercel](docs/supabase-vercel.md).

## Cấu trúc repository và tài liệu

```text
api/adapter.js             Entrypoint Vercel, nạp Express đã build
backend/
  api/index.ts            Entrypoint TypeScript
  src/routes/ui.routes.ts API cho frontend mới
  src/controllers/        Auth, tuyến, trạm, chuyến, ghế
  src/services/           Booking, payment/refund, QR, GPS, email
  scripts/                Migration, tạo admin và kiểm tra API/database
frontend/
  src/features/           Nghiệp vụ và service của giao diện mới
  src/services/           HTTP/JWT, Query client và dữ liệu demo
  src/pages/              Trang mới và legacy
  tests/e2e/              Playwright
supabase/migrations/      PostgreSQL schema và RLS
.github/workflows/ci.yml  CI
docker-compose.yml       Chạy frontend, backend, Redis cục bộ
```

- [Hướng dẫn frontend](frontend/README.md) và [checklist S1–S6](frontend/IMPLEMENTATION.md).
- [Hợp đồng frontend](frontend/API_CONTRACT.md), đối chiếu endpoint thực tế trong `backend/src/routes/ui.routes.ts`.
- [Xác minh email và gửi vé](EMAIL_DELIVERY.md).
- [Supabase/Vercel](docs/supabase-vercel.md).
- [Sơ đồ ERD](docs/ERD_SMART_BUS_TICKETING_SYSTEM.md).
- [Báo cáo sửa lỗi và kiểm chứng](docs/AUDIT_FIXES_2026-10-11.md).

## Đội ngũ phát triển

| STT | Họ và tên              | Vai trò trong dự án          | Phân hệ phụ trách chính                                              |
| :-: | :--------------------- | :--------------------------- | :------------------------------------------------------------------- |
|  1  | **Trần Đặng Công Tâm** | **Scrum Master kiêm Leader** | Quản lý dự án, điều phối Sprint, Kiến trúc Cloud & Docker, Review PR |
|  2  | **Nguyễn Hoàng Đức**   | **Frontend Developer**       | Layout Auth, State Management (`AuthContext`), UI Đăng nhập & RBAC   |
|  3  | **Hà Quang Vinh**      | **Frontend Developer**       | Quản trị tuyến & Sắp xếp trạm dừng xe buýt kéo thả (`@dnd-kit`)      |
|  4  | **Triệu Văn Thiệp**    | **Frontend Developer**       | Giao diện Trang chủ, Tra cứu thông tin tuyến xe & Kết quả tìm kiếm   |
|  5  | **La Công Tuấn**       | **Backend Developer**        | Kiến trúc Backend API, Xử lý Đặt vé, Sơ đồ ghế & Sinh mã QR          |
|  6  | **Tào Hoàng Minh Vũ**  | **Backend Developer**        | Thiết kế CSDL PostgreSQL, Migration Supabase, Bảng mã UTF-8          |
|  7  | **Nguyễn Minh Đức**    | **Backend Developer**        | API Tìm kiếm chuyến xe (`US01`) & Tối ưu hóa truy vấn CSDL           |
|  8  | **Mạch Thị Ngọc Ánh**  | **Quality Assurance (QA)**   | Kiểm thử chất lượng phần mềm, lập Test Case, soát vé QR              |
|  9  | **Đinh Hữu Phúc**      | **Quality Assurance (QA)**   | Kiểm thử chức năng (Functional Testing), kiểm tra luồng API & UI     |
| 10  | **Hoàng Quốc Toản**    | **Quality Assurance (QA)**   | Kiểm thử hiệu năng, bảo mật và nghiệm thu tiêu chuẩn DoD             |

---

<p align="center">
  <sub>© 2026 Smart Bus Ticketing System. Đồ án Thực tập Cơ sở TTCS2026 — Khoa Công nghệ Thông tin, Đại học CNTT & TT Thái Nguyên (ICTU).</sub>
</p>
