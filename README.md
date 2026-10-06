# 🚌 Smart Bus Ticketing System — ICTU

<p align="center">
  <img src="https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Deployment" />
  <img src="https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-TypeScript-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/CSS-Liquid%20Glass-38B2AC?style=for-the-badge&logo=css&logoColor=white" alt="CSS Liquid Glass" />
</p>

> **Đồ án Thực tập Cơ sở 2026 — Nhóm 5 (N5 Innovators)**  
> **Trường Đại học Công nghệ Thông tin & Truyền thông — Đại học Thái Nguyên (ICTU)**  
> **Hệ thống Quản lý Bán vé & Điều hành Xe Buýt Thông Minh** — Triển khai Fullstack trên nền tảng **Vercel** và cơ sở dữ liệu đám mây **Supabase PostgreSQL** (100% Zero Mock Data), hỗ trợ kiến trúc đóng gói **Docker Compose** chạy cục bộ, xác thực phân quyền RBAC đa cấp độ, cơ chế khóa ghế nguyên tử (Atomic Seat Locking) và phát hành vé điện tử mã QR độ nét cao theo thời gian thực.

---

## 🌐 Trải nghiệm Trực tiếp (Live Production)

Hệ thống đã được đóng gói và xuất bản chính thức trên Cloud:

| Tài nguyên | Địa chỉ URL | Ghi chú |
| :--- | :--- | :--- |
| 🚀 **Giao diện Web App (Vercel)** | [https://smart-bus-ticketing-system.vercel.app](https://smart-bus-ticketing-system.vercel.app) | Bản chính thức phục vụ người dùng |
| 🔗 **Domain Dự phòng (Alias)** | [https://project-smart-bus-ticketing-system-ictu-e8pb9rofi.vercel.app](https://project-smart-bus-ticketing-system-ictu-e8pb9rofi.vercel.app) | Domain phụ liên kết Vercel |
| 🩺 **Backend Health Check API** | [https://smart-bus-ticketing-system.vercel.app/api/health](https://smart-bus-ticketing-system.vercel.app/api/health) | Trả về trạng thái kết nối PostgreSQL |
| 🗄️ **Supabase Cloud Project** | `uhoznqcpaasartfvdynx` | Quản trị bảng, RLS, Transaction Pooler |

---

## 📌 Bảng mục lục
1. [Kiến trúc hệ thống & Hạ tầng triển khai](#-1-kiến-trúc-hệ-thống--hạ-tầng-triển-khai)
2. [Các phân hệ & Tính năng hoàn chỉnh](#-2-các-phân-hệ--tính-năng-hoàn-chỉnh)
3. [Tạo tài khoản quản trị](#-3-tạo-tài-khoản-quản-trị)
4. [Hướng dẫn cài đặt & Khởi chạy cục bộ](#-4-hướng-dẫn-cài-đặt--khởi-chạy-cục-bộ)
5. [Cấu trúc thư mục mã nguồn](#-5-cấu-trúc-thư-mục-mã-nguồn)
6. [Danh mục RESTful API Backend](#-6-danh-mục-restful-api-backend)
7. [Cấu hình biến môi trường](#-7-cấu-hình-biến-môi-trường)
8. [Các tính năng nâng cao & Hoàn thiện hệ thống](#-8-các-tính-năng-nâng-cao--hoàn-thiện-hệ-thống-sprint-cuối)
9. [Đội ngũ phát triển (Team 5 - N5 Innovators)](#-9-đội-ngũ-phát-triển-team-5---n5-innovators)

---

## 🏗️ 1. Kiến trúc hệ thống & Hạ tầng triển khai

### A. Môi trường Đám mây (Production — Vercel + Supabase)
Hệ thống sử dụng mô hình kiến trúc Serverless Micro-Architecture kết hợp Single-Page Application (SPA):
* **Frontend:** Ứng dụng React 19 / Vite SPA phục vụ qua mạng phân phối toàn cầu Vercel Edge Network.
* **Backend API:** Entrypoint `api/index.ts` điều hướng toàn bộ yêu cầu `/api/*` tới Express Engine (Node.js Serverless Function).
* **Database:** **Supabase PostgreSQL** kết nối qua Transaction Pooler (PgBouncer cổng `6543`) tối ưu tài nguyên kết nối serverless; bảo mật toàn diện qua **Row-Level Security (RLS)** trên 14 bảng.

```
                              [ Người dùng / Trình duyệt ]
                                           │
                                           ▼ (HTTPS)
                     ┌───────────────────────────────────────────┐
                     │            Vercel Edge Network            │
                     │  https://smart-bus-ticketing-system.vercel.app  │
                     └─────────────────────┬─────────────────────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     │                                           │
              [ Định tuyến tĩnh ]                         [ Định tuyến API ]
                     │                                           │
                     ▼                                           ▼
       ┌───────────────────────────┐               ┌───────────────────────────┐
       │   Frontend SPA (dist/)    │               │    Serverless Function    │
       │   React 19 + CSS         │               │      (api/index.ts)       │
       │   Client-side Routing     │               │   Express RESTful Engine  │
       └───────────────────────────┘               └─────────────┬─────────────┘
                                                                 │
                                                    (PostgreSQL Connection Pool)
                                                                 │
                                                                 ▼
                                                   ┌───────────────────────────┐
                                                   │    Supabase PostgreSQL    │
                                                   │ (Transaction Pooler 6543) │
                                                   │ 14 Tables • RLS Protected │
                                                   └───────────────────────────┘
```

### B. Môi trường Cục bộ (Local — Docker Compose)
Docker Compose chạy frontend, Express API và Redis cục bộ; API kết nối tới PostgreSQL dùng chung trên Supabase qua `DATABASE_URL`. Máy chạy ứng dụng cần Internet và file `.env` riêng. Không khởi chạy PostgreSQL cục bộ; publishable key và Project URL không thay thế connection string của database.

---

## ✨ 2. Các phân hệ & Tính năng hoàn chỉnh

### 🔐 A. Phân hệ Xác thực & Phân quyền RBAC (US 22)
- **Đăng ký / Đăng nhập:** Hỗ trợ đăng nhập linh hoạt bằng Email hoặc Số điện thoại.
- **Mã hóa bảo mật:** Mật khẩu được băm qua thuật toán `bcrypt` (Salt rounds = 10), cấp phát mã thông hành JSON Web Token (JWT) thời hạn 24 giờ.
- **Phân quyền 4 vai trò:** `ADMIN`, `MANAGER`, `DRIVER`, `PASSENGER`.
- **Bảo mật tuyến đường:**
  - `ProtectedRoute`: Kiểm tra Token hợp lệ và đối soát mảng vai trò được cấp phép.
  - `PublicRoute`: Tự động nhận diện tài khoản đã đăng nhập để chuyển hướng vào cổng nghiệp vụ tương ứng.

### 🚍 B. Phân hệ Quản trị Tuyến & Trạm dừng (US 12 - Admin & Manager)
- Quản lý danh mục tuyến buýt, cự ly (km), biểu phí quy định và thời gian hành trình.
- Sắp xếp thứ tự các trạm dừng đón/trả khách thông minh qua cơ chế kéo thả trực quan (**Drag & Drop** thư viện `@dnd-kit`).
- Cấu hình trạm dừng, tọa độ GPS (kinh độ, vĩ độ) phục vụ định vị bản đồ.

### 🎟️ C. Phân hệ Sơ đồ ghế & Đặt vé thông minh (US 02, 03, 04, 06 & BE 1)
- **Sơ đồ 40 chỗ ngồi thời gian thực:** Hiển thị trực quan theo tầng và vị trí (ghế trống, ghế đang chọn, ghế đã bán).
- **Khóa ghế nguyên tử (Atomic Seat Locking):** Cơ chế chống Race Condition khi nhiều người cùng đặt 1 ghế trong cùng 1 thời điểm; ghế được giữ chỗ tối đa 10 phút.
- **Phát hành vé điện tử:** Tự động tạo mã vé chuẩn hóa (`TKT-A08-XXXX`) kèm giá vé và thông tin hành trình.
- **Mã QR Scannable độ nét cao:** Tích hợp bộ giải mã/tạo mã QR tương thích hoàn hảo với camera của tài xế và nhân viên soát vé.

### 📱 D. Phân hệ Cổng thông tin Tài xế (Driver Portal)
- **Soát vé QR tức thời (US 15):** Quét mã QR trực tiếp từ màn hình hành khách hoặc nhập mã vé. Kiểm tra đối soát trạng thái vé trong CSDL, ngăn ngừa gian lận vé trùng và chuyển trạng thái vé sang `CHECKED_IN`.
- **Báo cáo sự cố hành trình (US 11):** Cho phép tài xế gửi nhanh báo cáo ùn tắc, hỏng xe hoặc tai nạn kèm thời gian trễ dự kiến về trung tâm điều hành.

### 👤 E. Phân hệ Cổng thông tin Hành khách (Passenger Portal)
- Tra cứu danh sách vé điện tử đã đặt, xem chi tiết vé và xuất trình mã QR soát vé.
- **Đánh giá & Góp ý dịch vụ (US 24):** Chấm điểm sao (1 - 5 sao) và gửi phản ánh chất lượng phục vụ lưu trực tiếp vào CSDL.
- **Đăng ký trợ giá HSSV (US 17):** Gửi hồ sơ thẻ học sinh - sinh viên trực tuyến để xét duyệt chính sách giảm 50% giá vé.

### 🔍 F. Phân hệ Tra cứu Tuyến & Chuyến xe (US 01)
- Tra cứu chuyến xe xuất bến theo điểm xuất phát, điểm đến và ngày khởi hành mong muốn.
- Tự động tính toán số ghế trống còn lại theo thời gian thực và thời gian dự kiến đến từng trạm.

### 📊 G. Bảng điều khiển Vận hành & Báo cáo (Dashboard & Operations)
- Báo cáo tổng hợp số lượng tuyến, số lượt xe đang chạy, tỷ lệ lấp đầy ghế bình quân và doanh thu theo ngày/tháng.

### 💡 H. Các tính năng nâng cao & Cải tiến mới (Sprint Hoàn thiện)
- **Đặt vé nhiều lần & Giữ chuyến đến khi xuất bến:** Chuyến xe được duy trì trạng thái hoạt động cho đến thời điểm xuất phát, cho phép hành khách đặt nhiều vé, nhiều chỗ ngồi trên cùng một chuyến một cách linh hoạt.
- **Tải ảnh QR vé về máy:** Nút "Lưu ảnh QR về máy" cho phép xuất hình ảnh PNG chất lượng cao cho cả mã QR thông tin giao dịch đặt chỗ và mã QR soát vé.
- **Quản lý & Hủy vé trực tuyến / Hoàn tiền tự động (*Soft Refund*):** Hỗ trợ hủy vé cho cả trạng thái `RESERVED` (giữ chỗ) và `BOOKED` (đã xác nhận), tích hợp cơ chế hoàn tiền tự động và trả ghế trống về CSDL.
- **Vé của tôi & Lịch sử đặt vé toàn diện (`myTickets` / `GET /api/v1/ticketing/my-tickets`):** Lưu trữ và hiển thị đầy đủ toàn bộ lịch sử vé điện tử đã đặt của hành khách, đồng bộ hóa trực tiếp từ PostgreSQL và lưu trữ phiên qua `localStorage`.
- **Khôi phục đặt chỗ:** Lưu bản nháp chuyến, ghế và voucher theo tài khoản trong `sessionStorage`, có thời hạn 30 phút; lưu giao dịch đã tạo trong `localStorage` trước khi chuyển sang cổng thanh toán.
- **Xác nhận đăng ký tài khoản qua Email thật (`nodemailer`):** Gửi email thông tin khởi tạo tài khoản xác thực tới hộp thư thật của người dùng khi đăng ký mới.
- **Hỗ trợ Docker Desktop:** Đóng gói và chạy ổn định qua `docker compose` trên môi trường Docker Desktop.

### 💳 I. Luồng thanh toán VNPay / MoMo / QR demo

1. Vào `/passenger/booking`, chọn chuyến và một ghế trống. Nút **Tiếp tục thanh toán** mở `/payment`; bước này chưa tạo giao dịch hoặc giữ ghế.
2. Tại `/payment`, kiểm tra thông tin đặt chỗ và chọn **VNPay**, **MoMo** hoặc **QR (demo)**. Bấm xác nhận để gọi `POST /api/v1/ticketing/bookings`; máy chủ xác định giá vé và giữ ghế tối đa 10 phút. Nút gửi được khóa trong khi xử lý để tránh tạo nhiều giao dịch khi bấm liên tiếp.
3. Với VNPay/MoMo, trình duyệt chuyển sang URL HTTPS của cổng đã được cho phép. Kết quả được hiển thị tại `/payment/result`, đọc mã giao dịch từ `orderId` hoặc `paymentOrder` và tra cứu trạng thái từ API; không xác nhận thanh toán dựa trên query URL.
4. Với QR demo, người dùng quay về trang đặt vé để xem QR thông tin giao dịch. QR này không chuyển tiền. Nút **Hoàn thành chuyến đi (demo)** mô phỏng xác nhận thanh toán/vé và hoàn thành chuyến trên dữ liệu chung, sau đó mở phần đánh giá.
5. Trang kết quả hỗ trợ **Xem vé**, **Thử lại** khi giao dịch thất bại và tự kiểm tra giao dịch đang chờ tối đa 10 lần, mỗi 3 giây. **Xem vé** mở tab lịch sử và đánh dấu vé tương ứng; callback cũ về trang đặt vé được chuyển tiếp sang trang kết quả.

Khi tải lại hoặc mở `/payment` trong cùng tab, hệ thống khôi phục bản nháp còn hạn. Nếu bản nháp không còn nhưng có phiên giao dịch đã tạo, hệ thống mở kết quả giao dịch đó. Khi chưa có dữ liệu, trang vẫn có **Quay lại** và **Chọn chuyến xe**. Nút **Quay lại** giữ đúng chuyến, ghế và voucher; ghế chỉ được chọn lại nếu API xác nhận vẫn trống.

Sơ đồ ghế cập nhật mỗi 3 giây, có trạng thái đang tải, thông báo lỗi và nút **Thử lại tải ghế**. Khi ghế đã chọn không còn trống, lựa chọn bị xóa và nút tiếp tục bị vô hiệu hóa. Khi API trả `401`, người dùng có thể đăng nhập lại.

---

## 🔑 3. Tạo tài khoản quản trị

Không công bố hoặc cài sẵn tài khoản/mật khẩu demo. Khi khởi tạo database trống, tạo admin bằng
`ADMIN_EMAIL` và `ADMIN_PASSWORD` riêng theo hướng dẫn tại [docs/supabase-vercel.md](docs/supabase-vercel.md).
Nếu môi trường đã từng dùng tài khoản mẫu, hãy đổi mật khẩu hoặc vô hiệu hóa các tài khoản đó trong database.

---

## 🚀 4. Hướng dẫn cài đặt & Khởi chạy cục bộ

### Lựa chọn 1: Trải nghiệm Trực tiếp (Không cần cài đặt)
Truy cập ngay liên kết Production: [https://smart-bus-ticketing-system.vercel.app](https://smart-bus-ticketing-system.vercel.app).

---

### Lựa chọn 2: Khởi chạy bằng Docker Compose

**Yêu cầu:** Máy tính đã cài đặt [Docker Desktop](https://www.docker.com/).

```bash
# 1. Clone repository
git clone https://github.com/tamtran2k6zz/Project_Smart_Bus_Ticketing_System_ictu.git
cd Project_Smart_Bus_Ticketing_System_ictu

# 2. Tạo file môi trường riêng từ mẫu (PowerShell: Copy-Item .env.example .env)
cp .env.example .env

# 3. Mở .env và điền:
#    - DATABASE_URL: Transaction pooler URL từ Supabase > Connect.
#    - JWT_SECRET: chuỗi ngẫu nhiên ít nhất 32 ký tự. Có thể tạo bằng PowerShell:
#    Không dùng publishable key/service-role key thay DATABASE_URL.
#    Không commit .env; chỉ chia sẻ DATABASE_URL với tester đáng tin cậy.

# 4. Khởi chạy frontend, API và Redis; database dùng chung trên Supabase
docker compose up -d --build
```

Tạo `JWT_SECRET` ngẫu nhiên bằng PowerShell:

```powershell
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Mỗi backend cần có `JWT_SECRET` riêng tư tối thiểu 32 ký tự để ký token đăng nhập. Nếu cần một token được xác thực bởi nhiều backend, các backend đó phải dùng cùng secret; nếu mỗi tester chỉ dùng backend của máy mình thì có thể tự tạo secret riêng.

**Truy cập dịch vụ sau khi khởi chạy:**
* 🌐 **Frontend Web App:** [http://localhost:3000](http://localhost:3000)
* 🔐 **Backend Health Check:** [http://localhost:3000/api/health](http://localhost:3000/api/health)
* 🔌 **Backend API trực tiếp:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

Backend được publish ở cổng `5000` để máy host và callback dịch vụ thanh toán có thể truy cập trực tiếp; frontend vẫn gọi API qua Nginx. Redis chỉ được expose trong mạng Docker. Nếu cổng `3000` đã được dùng, đặt `FRONTEND_PORT=3001` (hoặc cổng trống khác) trong `.env` rồi truy cập `http://localhost:3001`.

Mọi máy dùng chung dữ liệu Supabase. Chỉ cấp `DATABASE_URL` cho người đáng tin cậy; backend dùng tài khoản database có quyền truy cập, vì vậy không commit URL/mật khẩu vào GitHub. Sao chép nguyên Transaction pooler URL từ Supabase và percent-encode ký tự đặc biệt trong mật khẩu. Chạy migration Supabase một lần bởi người quản lý database, không chạy lại từ từng máy clone. Sau khi cập nhật mã nguồn có migration mới, người quản lý chạy `npm run db:migrate` trong thư mục `backend` trước khi bật luồng QR.

Redis mặc định chạy riêng trên từng máy. Điều này phù hợp để chạy độc lập, nhưng Redis seat-lock không đồng bộ giữa các máy; nếu cần khóa ghế tạm thời dùng chung, cấu hình cùng một Redis URL riêng tư qua `REDIS_URL` trên các máy. Không đưa thông tin Redis bí mật vào repository.

---

### Lựa chọn 3: Chạy trực tiếp bằng Node.js / Vite (Phát triển tính năng)

**Yêu cầu:** Node.js `20.19+` hoặc `22.12+` (theo yêu cầu của Vite 8), cùng npm.

```bash
# 1. Cài đặt dependencies cho Backend
cd backend
npm ci
cp ../.env.example .env
# PowerShell: Copy-Item ..\.env.example .env
# (Điền DATABASE_URL và JWT_SECRET vào backend/.env)

# 2. Chạy migration CSDL
npm run db:migrate

# 3. Khởi chạy Backend Express Server (Cổng 5000)
npm run start:express
```

Mở một cửa sổ Terminal mới để khởi chạy Frontend:

```bash
# 4. Cài đặt dependencies và chạy Frontend (mặc định cổng 3000)
cd frontend
npm ci
npm run dev
```

---

### 🧪 Build & Bộ Kiểm thử Tự động (Automated Test Suite)

Chạy từ thư mục gốc repository sau khi đã cài dependencies cho cả `backend` và `frontend`:

```bash
npm run build:frontend
npm run build:backend
npm --prefix frontend run lint
npm test
```

`npm test` chạy Jest cho backend, các kiểm thử theme bằng Node.js và Vitest cho frontend. Kiểm thử thanh toán bao gồm khôi phục bản nháp theo tài khoản, dữ liệu lưu bị hỏng/hết hạn, gửi phương thức và voucher, QR demo, lỗi giữ ghế và giới hạn URL chuyển hướng.

Nếu backend build báo thiếu `qrcode` hoặc `@types/qrcode`, chạy lại `npm ci` trong thư mục `backend`. Hai package đã có trong `backend/package.json` và lockfile; không cần sửa mã nguồn để xử lý việc cài dependencies thiếu.

Dự án còn có bộ kiểm thử API với PostgreSQL nhúng (**PGlite**), không cần kết nối database bên ngoài:

```bash
npm --prefix backend run test:postgres
```

Bộ kiểm thử tự động xác minh:
* Quy trình đăng ký, đăng nhập và phân quyền JWT RBAC.
* Cơ chế tạo và quản trị Tuyến buýt & Trạm dừng.
* Khóa ghế nguyên tử chống đặt trùng lặp (Concurrency & Atomic Seat Locking).
* Phát hành vé, sinh mã QR và luồng soát vé `CHECKED_IN`.
* Kiểm tra chính sách Row-Level Security (RLS) chặn truy cập trái phép.

Kiểm thử tự động và kiểm tra trình duyệt dùng API/cổng giả lập không thay thế nghiệm thu giao dịch thật. Trước khi dùng VNPay/MoMo thực tế, cần cấu hình merchant, callback/IPN công khai và kiểm tra xác nhận, thất bại, hết hạn giữ ghế, hủy vé và hoàn tiền trong môi trường của cổng thanh toán.

---

## 📂 5. Cấu trúc thư mục mã nguồn

```plaintext
Project_Smart_Bus_Ticketing_System_ictu/
├── .vercel/                           # Cấu hình liên kết dự án Vercel
├── api/
│   └── index.ts                       # Entrypoint Vercel Serverless Function cho Express
├── backend/
│   ├── scripts/
│   │   ├── migrate-postgres.cjs       # Trình thực thi Migration PostgreSQL
│   │   ├── import-mysql.cjs           # Script chuyển đổi dữ liệu MySQL -> PostgreSQL
│   │   ├── test-postgres.cjs          # Kiểm thử API với PostgreSQL nhúng
│   │   └── create-admin.cjs           # Tiện ích tạo tài khoản quản trị viên
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts            # PostgreSQL Pool Client (node-postgres)
│   │   │   ├── auth.ts                # Cấu hình mã hóa JWT & Secret
│   │   │   ├── env.ts                 # Nguồn cấu hình duy nhất + kiểm tra biến môi trường
│   │   │   ├── logger.ts              # Log có cấu trúc key=value, tự che bí mật
│   │   │   └── redis.ts               # Redis client & khoá ghế tạm (tuỳ chọn)
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts     # Xử lý Đăng ký / Đăng nhập
│   │   │   ├── routes.controller.ts   # Quản lý Tuyến buýt
│   │   │   ├── stops.controller.ts    # Quản lý Trạm dừng
│   │   │   ├── trips.controller.ts    # Tìm kiếm chuyến xe
│   │   │   └── seats.controller.ts    # Sơ đồ 40 ghế & Khóa giữ chỗ
│   │   ├── middlewares/
│   │   │   └── auth.ts                # Middleware xác thực JWT & Phân quyền RBAC
│   │   ├── routes/                    # Định tuyến API Express
│   │   ├── services/
│   │   │   ├── booking.ts                   # Đặt vé & giữ ghế (khoá dòng PostgreSQL)
│   │   │   ├── payment-gateway.service.ts   # Ký & kiểm tra chữ ký VNPay / MoMo
│   │   │   └── payment-refund.service.ts     # Hoàn tiền VNPay / MoMo
│   │   ├── app.ts                     # Cấu hình Express App, CORS, Health, Error Handler
│   │   └── server.ts                  # Điểm khởi chạy Local HTTP Server (Port 5000)
│   ├── Dockerfile                     # Dockerfile đóng gói Backend Node.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts              # Axios Client tự động thích ứng Vercel/Local
│   │   ├── components/                # Giao diện tái sử dụng (Bảng, Form, Sơ đồ ghế)
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Quản lý phiên làm việc & Token toàn cục
│   │   ├── pages/                     # Màn hình theo phân hệ (Admin, Driver, Passenger)
│   │   │   └── payment/               # PaymentPage & PaymentResultPage
│   │   ├── routes/AppRoutes.tsx       # Route đặt vé và kết quả thanh toán
│   │   ├── services/payment.ts        # Tạo giao dịch & kiểm tra URL gateway
│   │   ├── utils/
│   │   │   ├── paymentDraft.ts        # Bản nháp theo tài khoản, hết hạn sau 30 phút
│   │   │   ├── bookingSession.ts      # Phiên giao dịch trước khi rời sang gateway
│   │   │   └── paymentResult.ts       # Phân loại trạng thái thanh toán/vé
│   │   ├── App.tsx                    # AuthProvider, BrowserRouter & ErrorBoundary
│   │   └── main.tsx
│   ├── nginx.conf                     # Cấu hình Nginx Reverse Proxy trong Docker
│   ├── Dockerfile                     # Dockerfile Multi-stage build Nginx Alpine
│   └── package.json
├── supabase/
│   └── migrations/                    # File Migration cấu trúc CSDL PostgreSQL & RLS
├── docs/                              # Tài liệu Báo cáo Sprint, Slide & Sơ đồ ERD
├── docker-compose.yml                 # Cấu hình điều phối Container cục bộ
├── vercel.json                        # Cấu hình điều phối Deployment trên Vercel
└── README.md                          # Tài liệu hướng dẫn đồ án
```

---

## 📡 6. Danh mục RESTful API Backend

Tất cả các API hỗ trợ đồng thời cả hai tiền tố định tuyến `/api` và `/api/v1`:

### 1. Phân hệ Xác thực & Tài khoản (`/api/v1/auth`)
* `POST /login`: Đăng nhập bằng Email/SĐT + Mật khẩu, trả về JWT Token và thông tin User.
* `POST /register`: Đăng ký tài khoản hành khách mới vào CSDL.
* `GET /me`: Lấy thông tin tài khoản hiện tại từ JWT Bearer Header.

### 2. Phân hệ Tuyến & Trạm dừng (`/api/v1/routes`, `/api/v1/stops`)
* `GET /routes`: Lấy toàn bộ danh sách tuyến buýt đang hoạt động kèm danh sách trạm.
* `POST /routes`: Tạo mới tuyến xe buýt (Quyền `ADMIN`, `MANAGER`).
* `GET /stops`: Lấy danh mục tất cả trạm dừng xe buýt trên mạng lưới.
* `POST /stops`: Tạo trạm dừng mới kèm tọa độ GPS.

### 3. Phân hệ Chuyến xe & Tra cứu (`/api/v1/trips`)
* `GET /trips/search?origin_stop_id=...&destination_stop_id=...&departure_date=...`: Tìm kiếm chuyến xe phù hợp với hành khách (US 01).
* `GET /trips/:tripId/seats`: Lấy toàn bộ sơ đồ ghế và trạng thái chi tiết theo chuyến.

### 4. Phân hệ Sơ đồ ghế & Khóa giữ chỗ (`/api/v1/seats`)
* `GET /seats/bus/:busId`: Lấy danh sách cấu hình ghế vật lý theo xe buýt.
* `GET /seats/trip/:tripId`: Lấy tình trạng ghế theo chuyến (`AVAILABLE`, `BOOKED`, `LOCKED`).
* `POST /seats/lock`: Khóa giữ chỗ ghế tạm thời trong 10 phút chống Race Condition.
* `POST /seats/unlock`: Hủy khóa ghế đã giữ chỗ.

### 5. Phân hệ Đặt vé & Soát vé QR (`/api/v1/ticketing`)
* `GET /trips/:tripId/seats`: Lấy sơ đồ ghế dùng bởi trang đặt vé.
* `POST /bookings`: Frontend gửi `tripId`, `seatNumber` và `paymentMethod` (`VNPAY`, `MOMO` hoặc `QR`), kèm `voucherCode` nếu có. Máy chủ lưu giao dịch/giá vé vào PostgreSQL và giữ ghế 10 phút. Response trả về `data.payment.orderId` — UUID của giao dịch; với VNPay/MoMo còn có `data.paymentUrl`. QR demo chỉ hiển thị dữ liệu và không tự xác nhận thanh toán.
* **Tương thích API cũ:** Nếu không truyền `paymentMethod`, backend đi theo nhánh đặt vé trực tiếp (`BOOKED`) thay vì tạo giao dịch chờ thanh toán. Luồng frontend hiện tại luôn truyền phương thức rõ ràng.
* `GET /my-tickets`: Lấy lịch sử vé của tài khoản đăng nhập.
* `POST /bookings/:ticketId/demo-complete`: Mô phỏng thanh toán QR và hoàn thành chuyến; không chuyển tiền thật.
* `POST /tickets/:ticketId/cancel`: Hủy vé/giữ chỗ và xử lý hoàn tiền nếu phù hợp.
* `POST /verify`: Soát vé điện tử bằng chuỗi mã QR hoặc mã vé, đổi trạng thái `CHECKED_IN`.

### 6. Phân hệ Thanh toán (`/api/v1/ticketing`)

Trang `/payment` cho phép chọn VNPay, MoMo hoặc QR demo. QR demo không yêu cầu thông tin merchant, không phát sinh chuyển tiền và giữ giao dịch ở `PENDING` cho đến khi được xác nhận bằng thao tác demo. VNPay/MoMo cần cấu hình merchant và callback/IPN công khai; giao dịch chỉ được coi là thành công khi API xác nhận thanh toán `SUCCESS` và vé `BOOKED`.

| Phương thức | Endpoint | Mục đích |
| :--- | :--- | :--- |
| `GET` | `/payments/vnpay/return` | Cổng thanh toán chuyển hướng trình duyệt về sau khi thanh toán |
| `GET` hoặc `POST` | `/payments/vnpay/ipn` | IPN máy chủ → máy chủ (đăng ký trong merchant portal VNPay) |
| `POST` | `/payments/momo/ipn` | IPN của MoMo |
| `GET` | `/payments/:orderId` | Tra cứu trạng thái giao dịch (yêu cầu đăng nhập) |
| `GET`/`POST` | `/release-expired` | Giải phóng ghế quá hạn (bearer token `PAYMENT_CRON_SECRET`) |

Các đường dẫn cũ `vnpay-return` và `vnpay-ipn` vẫn được định tuyến để tương thích, nhưng cấu hình
mới phải dùng đường dẫn trong bảng. Không có bảng `bookings`/`payments` riêng: `tickets.id` đóng
vai trò `payment_transactions.order_id`, nên `vnp_TxnRef` phải là UUID trả về từ `POST /bookings`
(các mã dạng `ORD-20261002-001` sẽ bị từ chối).

### 7. Phân hệ Vận hành & Sự cố (`/api/v1/operations`)
* `GET /dashboard/summary`: Thống kê tổng hợp số tuyến, số chuyến và tỷ lệ lấp đầy ghế.
* `GET /incidents` & `POST /incidents`: Gửi và xem danh sách báo cáo sự cố đường sá của tài xế.
* `GET /feedbacks` & `POST /feedbacks`: Gửi và tổng hợp đánh giá chất lượng từ hành khách.

---

## 📋 7. Cấu hình biến môi trường

Toàn bộ biến môi trường được đọc tại **một nơi duy nhất**: `backend/src/config/env.ts`. Khi khởi
động, API in ra tóm tắt cấu hình và cảnh báo mọi thiếu sót:

```powershell
npm --prefix backend run start:express
```

Nhóm biến chính:

* `DATABASE_URL` — **bắt buộc**, phải là `postgresql://` của Supabase. `DATABASE_URL` dạng
  `mysql://` khiến backend báo `environment_invalid` ngay khi khởi động.
* `JWT_SECRET` — bắt buộc, tối thiểu 32 ký tự.
* `REDIS_URL` — *tuỳ chọn*. Để trống nghĩa là chỉ dùng khoá dòng PostgreSQL (đây là hành vi đúng,
  không phải lỗi). Cũng chấp nhận bộ ba `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`.
* `PAYMENT_PUBLIC_BASE_URL` — origin HTTPS công khai của API để cổng thanh toán gọi callback/IPN; không có dấu `/` cuối.
* `VNPAY_*`, `MOMO_*` — thông tin merchant và URL callback cho phương thức tương ứng; không cần cho QR demo.
* `PAYMENT_RESULT_URL` — URL trang kết quả frontend, ví dụ `http://localhost:3000/payment/result` khi chạy Vite cục bộ; khi triển khai dùng `https://<frontend-domain>/payment/result`.
* `MOMO_REDIRECT_URL` — trang kết quả frontend cho MoMo, nên trỏ tới cùng `/payment/result`. Nếu không khai báo, backend dùng `${PAYMENT_PUBLIC_BASE_URL}/payment/result`; đặt URL đầy đủ khi frontend và API có origin khác nhau.
* `VITE_PAYMENT_GATEWAY_HOSTS` — danh sách hostname HTTPS được frontend cho phép chuyển hướng, cách nhau bằng dấu phẩy. Hai host sandbox `sandbox.vnpayment.vn` và `test-payment.momo.vn` đã được cho phép sẵn; bổ sung host merchant thực tế khi cần.

Mẫu `.env.example` hiện còn đặt `PAYMENT_RESULT_URL` về `/passenger/booking`. Khi tạo `.env` mới, đổi sang `/payment/result` như trên; route cũ vẫn được frontend hỗ trợ để giữ tương thích callback đã cấu hình. Các biến `VITE_*` đặt trong file môi trường của frontend và cần build lại để áp dụng.

Log ứng dụng dùng định dạng `key=value` và không bắt đầu bằng dấu `[`, nên có thể dán trực tiếp
vào PowerShell mà không bị lỗi cú pháp:

```text
2026-10-02T18:12:51.037Z INFO scope=smartbus.ticketing event=momo_ipn_received order_id=508d68c2-... result_code=0
```

---

## 🚀 8. Các tính năng nâng cao & Hoàn thiện hệ thống (Sprint cuối)

* **Tải ảnh QR vé (`Lưu ảnh QR về máy`)**: Tích hợp tính năng xuất tệp PNG chất lượng cao cho mã QR thông tin giao dịch đặt chỗ và mã QR vé điện tử đưa cho tài xế soát vé.
* **Hủy vé & Hoàn tiền trực tuyến**: Cho phép hành khách chủ động hủy vé/yêu cầu hoàn tiền đối với các vé đang ở trạng thái `RESERVED` (giữ chỗ) hoặc `BOOKED` (đã xác nhận), tự động hoàn trả ghế về trạng thái trống.
* **Lịch sử vé của tôi (`GET /api/v1/ticketing/my-tickets`)**: Quản lý toàn bộ vé điện tử đã đặt của tài khoản, đồng bộ trực tiếp từ cơ sở dữ liệu PostgreSQL và lưu trữ phiên qua `localStorage`.
* **Chọn phương thức thanh toán (`/payment`)**: Tách bước chọn ghế khỏi bước tạo giao dịch, hỗ trợ VNPay/MoMo/QR demo và khôi phục thông tin đặt chỗ.
* **Định tuyến kết quả thanh toán (`/payment/result`)**: Tra cứu trạng thái từ API, nhận cả `orderId`/`paymentOrder`, hỗ trợ xem vé, thử lại khi thất bại và kiểm tra giao dịch đang chờ.

---

## 👥 9. Đội ngũ phát triển (Team 5 - N5 Innovators)

| STT | Họ và tên | Vai trò trong dự án | Phân hệ phụ trách chính |
| :---: | :--- | :--- | :--- |
| 1 | **Trần Đặng Công Tâm** | **Scrum Master kiêm Leader** | Quản lý dự án, điều phối Sprint, Kiến trúc Cloud & Docker, Review PR |
| 2 | **Nguyễn Hoàng Đức** | **Frontend Developer** | Layout Auth, State Management (`AuthContext`), UI Đăng nhập & RBAC |
| 3 | **Hà Quang Vinh** | **Frontend Developer** | Quản trị tuyến & Sắp xếp trạm dừng xe buýt kéo thả (`@dnd-kit`) |
| 4 | **Triệu Văn Thiệp** | **Frontend Developer** | Giao diện Trang chủ, Tra cứu thông tin tuyến xe & Kết quả tìm kiếm |
| 5 | **La Công Tuấn** | **Backend Developer** | Kiến trúc Backend API, Xử lý Đặt vé, Sơ đồ ghế & Sinh mã QR |
| 6 | **Tào Hoàng Minh Vũ** | **Backend Developer** | Thiết kế CSDL PostgreSQL, Migration Supabase, Bảng mã UTF-8 |
| 7 | **Nguyễn Minh Đức** | **Backend Developer** | API Tìm kiếm chuyến xe (`US01`) & Tối ưu hóa truy vấn CSDL |
| 8 | **Mạch Thị Ngọc Ánh** | **Quality Assurance (QA)** | Kiểm thử chất lượng phần mềm, lập Test Case, soát vé QR |
| 9 | **Đinh Hữu Phúc** | **Quality Assurance (QA)** | Kiểm thử chức năng (Functional Testing), kiểm tra luồng API & UI |
| 10 | **Hoàng Quốc Toản** | **Quality Assurance (QA)** | Kiểm thử hiệu năng, bảo mật và nghiệm thu tiêu chuẩn DoD |

---

<p align="center">
  <sub>© 2026 Smart Bus Ticketing System. Đồ án Thực tập Cơ sở TTCS2026 — Khoa Công nghệ Thông tin, Đại học CNTT & TT Thái Nguyên (ICTU).</sub>
</p>
