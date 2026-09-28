# 🚌 Smart Bus Ticketing System - ICTU

<p align="center">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
  <img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL 8.0" />
  <img src="https://img.shields.io/badge/phpMyAdmin-8080-6C78AF?style=for-the-badge&logo=phpmyadmin&logoColor=white" alt="phpMyAdmin" />
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-TypeScript-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Nginx-Reverse_Proxy-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
</p>

> **Đồ án Thực tập Cơ sở 2026 - Nhóm 5 (N5 Innovators)**  
> **Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)**  
> **Hệ thống đặt vé và điều hành xe buýt thông minh** — Toàn bộ dữ liệu kết nối và truy vấn trực tiếp vào **MySQL 8.0 thật 100% (Zero Mock Data)**, tích hợp hạ tầng Docker Compose đa dịch vụ, xác thực phân quyền RBAC đa cấp độ, giao diện kính mờ Liquid Glass sang trọng và hệ thống vé điện tử mã QR thời gian thực.

---

## 📌 Bảng mục lục
1. [Kiến trúc hệ thống & Hạ tầng Docker](#-1-kiến-trúc-hệ-thống--hạ-tầng-docker)
2. [Các phân hệ & Tính năng hoàn chỉnh](#-2-các-phân-hệ--tính-năng-hoàn-chỉnh)
3. [Tài khoản Demo kiểm thử hệ thống](#-3-tài-khoản-demo-kiểm-thử-hệ-thống)
4. [Hướng dẫn cài đặt & Khởi chạy (1 Lệnh Docker)](#-4-hướng-dẫn-cài-đặt--khởi-chạy-1-lệnh-docker)
5. [Cấu trúc thư mục mã nguồn](#-5-cấu-trúc-thư-mục-mã-nguồn)
6. [Danh mục RESTful API Backend](#-6-danh-mục-restful-api-backend)
7. [Đội ngũ phát triển (Team 5 - N5 Innovators)](#-7-đội-ngũ-phát-triển-team-5---n5-innovators)

---

## 🏗️ 1. Kiến trúc hệ thống & Hạ tầng Docker

Hệ thống được đóng gói hoàn chỉnh bằng **Docker Compose** với 4 container hoạt động độc lập và liên kết qua mạng nội bộ:

```
                                  [ Người dùng / Trình duyệt ]
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     │                                                     │
               Cổng 3000 (HTTP)                                      Cổng 8080 (HTTP)
                     │                                                     │
         ┌───────────▼───────────┐                             ┌───────────▼───────────┐
         │   smartbus_frontend   │                             │  smartbus_phpmyadmin  │
         │  (Nginx:alpine + SPA) │                             │   (Quản trị CSDL web) │
         └───────────┬───────────┘                             └───────────┬───────────┘
                     │ (Reverse Proxy /api/ -> backend:5000)               │
                     │                                                     │
         ┌───────────▼───────────┐                                         │
         │   smartbus_backend    │                                         │
         │ (Node.js/Express:5000)│                                         │
         └───────────┬───────────┘                                         │
                     │ (Kết nối TCP pool utf8mb4:3306)                     │
                     │                                                     │
                     └──────────────────┐       ┌──────────────────────────┘
                                        │       │
                                  ┌─────▼───────▼─────┐
                                  │  smartbus_mysql   │
                                  │    (MySQL 8.0)    │
                                  │ Cổng host: 3308   │
                                  └───────────────────┘
```

| Dịch vụ Container | Image / Công nghệ | Cổng Host | Vai trò & Trách nhiệm |
| :--- | :--- | :--- | :--- |
| **`smartbus_frontend`** | `nginx:alpine` + React 19 / Vite | **`3000`** | Web Client SPA, Nginx Reverse Proxy điều hướng `/api/` về Backend, bắt lỗi bằng React `ErrorBoundary`. |
| **`smartbus_backend`** | Node.js 20 / TypeScript / Express | **`5000`** | RESTful API, mã hóa mật khẩu `bcrypt`, cấp phát JWT, kết nối MySQL Connection Pool (Zero Mock). |
| **`smartbus_mysql`** | `mysql:8.0` | **`3308`** | CSDL quan hệ chính thức, bảng mã tiếng Việt `utf8mb4_unicode_ci`, lưu trữ người dùng, tuyến, trạm, vé, sự cố. |
| **`smartbus_phpmyadmin`** | `phpmyadmin:latest` | **`8080`** | Giao diện quản trị trực quan cơ sở dữ liệu trên trình duyệt (User: `root` / Pass: `root_pass`). |

---

## ✨ 2. Các phân hệ & Tính năng hoàn chỉnh

### 🔐 A. Phân hệ Xác thực & Phân quyền RBAC (US 22)
- **Đăng ký tài khoản:** Tự động mã hóa mật khẩu qua thuật toán `bcrypt` (Salt rounds = 10), gán vai trò `PASSENGER` và lưu vào MySQL.
- **Đăng nhập linh hoạt:** Đăng nhập bằng Email hoặc Số điện thoại, cấp phát mã thông hành JWT Bearer Token (thời hạn 24 giờ).
- **Bộ chuyển đổi nhanh tài khoản mẫu:** 4 nút bấm chọn nhanh dành cho Giảng viên / Hội đồng kiểm thử tại `/login`.
- **Bảo mật tuyến đường:**
  - `ProtectedRoute`: Kiểm tra Token và phân quyền theo mảng quyền hạn cho phép.
  - `PublicRoute`: Tự động điều hướng người dùng đã đăng nhập vào phân hệ tương ứng.

### 🚍 B. Phân hệ Quản trị Tuyến & Trạm xe buýt (US 12 - Admin & Manager)
- Quản lý danh sách tuyến buýt, cự ly (km), biểu phí gốc, thời gian hành trình.
- Sắp xếp lộ trình trạm dừng đón/trả khách bằng thao tác kéo thả (**Drag & Drop** qua `@dnd-kit`).
- Cấu hình trạm dừng, tìm kiếm trạm theo tọa độ GPS và tên đường.

### 🎟️ C. Phân hệ Đặt vé & Sinh mã QR Điện tử (US 02, 03, 04, 06)
- Hiển thị trực quan sơ đồ 40 chỗ ngồi trên xe (Ghế trống / Đang chọn / Đã đặt).
- Cơ chế giữ chỗ 10 phút, tự động tạo mã vé điện tử định dạng chuẩn (VD: `TKT-A08-8888`).
- **Tạo mã QR trực quan nét cao:** Hiển thị khung ảnh mã QR scannable và chuỗi mã số vé tương thích camera quét của tài xế.
- Nút tiện ích *"Điền nhanh mã vé vào ô Soát vé"* giúp kiểm tra quy trình tức thì.

### 📱 D. Phân hệ Cổng thông tin Tài xế (Driver Portal)
- **Soát vé QR thời gian thực (US 15):** Quét chuỗi QR hoặc nhập mã vé, kiểm tra tình trạng vé trong MySQL, ngăn chặn vé tái sử dụng (chuyển trạng thái `CHECKED_IN`).
- **Báo cáo sự cố đường sá (US 11):** Tài xế gửi báo cáo tắc đường, tai nạn hoặc trễ chuyến kèm số phút trễ dự kiến.

### 👤 E. Phân hệ Cổng thông tin Hành khách (Passenger Portal)
- Đặt vé trực tuyến có hỗ trợ chính sách trợ giá sinh viên ICTU.
- Xem vé điện tử đã đặt cùng hình ảnh mã QR soát vé.
- **Đánh giá & Phản ánh chất lượng (US 24):** Gửi đánh giá số sao (1–5 sao) và nội dung nhận xét lưu trực tiếp vào CSDL MySQL.
- **Đăng ký ưu đãi HSSV (US 17):** Gửi hồ sơ thẻ sinh viên để nhận trợ giá 50% giá vé lượt.

### 🔍 F. Phân hệ Tra cứu Tuyến & Chuyến xe (US 01)
- Tra cứu chuyến xe theo điểm đi, điểm đến và ngày khởi hành.
- Thuật toán tìm kiếm tối ưu trên MySQL hiển thị giờ xuất bến, giờ đến bến và số ghế trống còn lại.

---

## 🔑 3. Tài khoản Demo kiểm thử hệ thống

Hệ thống đã tạo sẵn 4 tài khoản mẫu thực tế trong CSDL MySQL (mật khẩu đã băm bcrypt):

| Vai trò (Role) | Tài khoản / Email | Mật khẩu | Phân hệ truy cập mặc định |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@smartbus.ictu.vn` | `Admin@12345` | `/admin/routes` (Toàn quyền hệ thống) |
| **Quản lý điều phối (Manager)** | `manager@smartbus.ictu.vn` | `Manager@123` | `/admin/routes` (Điều độ tuyến, chuyến, nhân sự) |
| **Tài xế (Driver)** | `driver@smartbus.ictu.vn`<br>*(hoặc SĐT `0987654321`)* | `Driver@123` | `/driver/portal` (Soát vé QR & Báo cáo sự cố) |
| **Hành khách (Passenger)** | `khachhang@gmail.com` | `User@123` | `/passenger/booking` (Đặt vé, QR & Đánh giá) |

---

## 🚀 4. Hướng dẫn cài đặt & Khởi chạy (1 Lệnh Docker)

### Yêu cầu tiên quyết:
- Máy tính đã cài đặt **Docker Desktop** (hoặc Docker Engine + Docker Compose).

### Bước 1: Clone kho mã nguồn
```bash
git clone https://github.com/tamtran2k6zz/Project_Smart_Bus_Ticketing_System_ictu.git
cd Project_Smart_Bus_Ticketing_System_ictu
```

### Bước 2: Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
docker compose up -d --build
```

### Bước 3: Truy cập các cổng dịch vụ
- 🌐 **Giao diện Web App (Frontend):** [http://localhost:3000](http://localhost:3000)
- 🔐 **Trang Đăng nhập:** [http://localhost:3000/login](http://localhost:3000/login)
- 📋 **Backend API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- 🗄️ **Quản trị CSDL phpMyAdmin:** [http://localhost:8080](http://localhost:8080)
  - *Tài khoản:* `root`
  - *Mật khẩu:* `root_pass`
  - *Server:* `mysql` (cổng nội bộ 3306)

*(Lưu ý: Cổng MySQL trên máy Host được cấu hình là `3308` để tránh xung đột với các dịch vụ MySQL cài sẵn trên Windows).*

---

## 📂 5. Cấu trúc thư mục mã nguồn

```plaintext
Project_Smart_Bus_Ticketing_System_ictu/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts            # MySQL Connection Pool (charset utf8mb4)
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts     # Xử lý Đăng nhập / Đăng ký RBAC
│   │   │   ├── routes.controller.ts   # CRUD Tuyến xe
│   │   │   ├── stops.controller.ts    # CRUD Trạm dừng
│   │   │   └── trips.controller.ts    # Tra cứu chuyến xe (US01)
│   │   ├── routes/
│   │   │   ├── auth.routes.ts         # Routes xác thực
│   │   │   ├── routes.routes.ts       # Routes tuyến xe
│   │   │   ├── stops.routes.ts        # Routes trạm xe
│   │   │   ├── trips.routes.ts        # Routes chuyến xe
│   │   │   ├── ticketing.routes.ts    # Sơ đồ ghế, Đặt vé & Soát vé QR
│   │   │   └── operations.routes.ts   # Dashboard, Sự cố & Đánh giá
│   │   └── server.ts                  # Điểm khởi chạy HTTP Express Server (5000)
│   ├── Dockerfile                     # Dockerfile đóng gói backend
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts              # Axios Client & Helper getApiUrl
│   │   ├── components/
│   │   │   ├── admin/                 # DashboardView, TicketBookingView, RouteTable...
│   │   │   ├── layout/                # Navbar, AuthLayout
│   │   │   └── routes/                # ProtectedRoute, PublicRoute
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Quản lý phiên đăng nhập và Token
│   │   ├── pages/
│   │   │   ├── admin/                 # RouteManagementPage
│   │   │   ├── auth/                  # LoginPage, RegisterPage
│   │   │   ├── driver/                # DriverPortalPage
│   │   │   ├── passenger/             # PassengerPortalPage
│   │   │   └── trips/                 # SearchResultsPage
│   │   ├── App.tsx                    # React ErrorBoundary & Root Routes
│   │   └── main.tsx
│   ├── nginx.conf                     # Nginx Reverse Proxy /api/ -> backend:5000
│   ├── Dockerfile                     # Multi-stage build Nginx Alpine
│   └── package.json
├── init.sql                           # Script khởi tạo CSDL MySQL 8.0 (UTF-8 Multibyte)
├── docker-compose.yml                 # Cấu hình điều phối 4 container dịch vụ
└── README.md                          # Tài liệu hướng dẫn đồ án
```

---

## 📡 6. Danh mục RESTful API Backend

Tất cả endpoint đều hỗ trợ cả tiền tố `/api` và `/api/v1`:

### 1. Xác thực & Tài khoản (`/api/v1/auth`)
- `POST /login`: Đăng nhập bằng Email/SĐT + Mật khẩu, trả về JWT Token.
- `POST /register`: Đăng ký tài khoản hành khách mới vào MySQL.
- `GET /me`: Lấy thông tin tài khoản hiện tại từ JWT Header.

### 2. Tuyến & Trạm dừng (`/api/v1/routes`, `/api/v1/stops`)
- `GET /routes`: Lấy toàn bộ danh sách tuyến buýt đang hoạt động kèm trạm dừng.
- `GET /stops`: Lấy danh mục tất cả trạm dừng xe buýt trên mạng lưới.

### 3. Tra cứu Chuyến xe (`/api/v1/trips`)
- `GET /trips/search?origin_stop_id=...&destination_stop_id=...&departure_date=...`: Tìm kiếm chuyến xe xuất bến theo tiêu chí hành khách.

### 4. Đặt vé & Soát vé QR (`/api/v1/ticketing`)
- `GET /trips/:tripId/seats`: Lấy sơ đồ 40 ghế và tình trạng trống/đã đặt.
- `POST /bookings`: Đặt vé, lưu vào CSDL MySQL, sinh mã QR soát vé.
- `POST /verify`: Soát vé bằng mã QR hoặc chuỗi mã vé, cập nhật trạng thái `CHECKED_IN`.

### 5. Vận hành & Sự cố (`/api/v1/operations`)
- `GET /dashboard/summary`: Thống kê tổng hợp số chuyến, tuyến, tỷ lệ lấp đầy ghế.
- `GET /incidents` & `POST /incidents`: Quản lý báo cáo sự cố đường sá từ tài xế.
- `GET /feedbacks` & `POST /feedbacks`: Gửi và xem đánh giá chất lượng từ hành khách.

---

## 👥 7. Đội ngũ phát triển (Team 5 - N5 Innovators)

| STT | Họ và tên | Vai trò trong dự án | Phân hệ phụ trách chính |
| :---: | :--- | :--- | :--- |
| 1 | **Trần Đặng Công Tâm** | **Scrum Master kiêm Leader** | Quản lý dự án, điều phối Sprint, Kiến trúc Docker, Review PR |
| 2 | **Nguyễn Hoàng Đức** | **Frontend Developer** | Layout Auth, State Management (`AuthContext`), UI Đăng nhập & RBAC |
| 3 | **Hà Quang Vinh** | **Frontend Developer** | Quản trị tuyến & Sắp xếp trạm dừng xe buýt kéo thả (`@dnd-kit`) |
| 4 | **Triệu Văn Thiệp** | **Frontend Developer** | Giao diện Trang chủ, Tra cứu thông tin tuyến xe & Kết quả tìm kiếm |
| 5 | **La Công Tuấn** | **Backend Developer** | Kiến trúc Backend API, Xử lý Đặt vé, Sơ đồ ghế & Sinh mã QR |
| 6 | **Tào Hoàng Minh Vũ** | **Backend Developer** | Thiết kế CSDL MySQL, Migration, Bảng mã Tiếng Việt `utf8mb4` |
| 7 | **Nguyễn Minh Đức** | **Backend Developer** | API Tìm kiếm chuyến xe (`US01`) & Tối ưu hóa truy vấn CSDL |
| 8 | **Mạch Thị Ngọc Ánh** | **Quality Assurance (QA)** | Kiểm thử chất lượng phần mềm, lập Test Case, soát vé QR |
| 9 | **Đinh Hữu Phúc** | **Quality Assurance (QA)** | Kiểm thử chức năng (Functional Testing), kiểm tra luồng API & UI |
| 10 | **Hoàng Quốc Toản** | **Quality Assurance (QA)** | Kiểm thử hiệu năng, bảo mật và nghiệm thu tiêu chuẩn DoD |

---

<p align="center">
  <sub>© 2026 Smart Bus Ticketing System. Đồ án Thực tập Cơ sở TTCS2026 — Khoa Công nghệ Thông tin, Đại học CNTT & TT Thái Nguyên (ICTU).</sub>
</p>
