# 🚌 Smart Bus Ticketing System - ICTU

<p align="center">
  <img src="https://img.shields.io/badge/React-19.3.0-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.3.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/NestJS-10.3.8-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Swagger-API%20Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
  <img src="https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

> **Đồ án Thực tập Cơ sở 2026 - Nhóm 5 (N5 Innovators)**  
> **Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)**  
> **Hệ thống đặt vé và điều hành xe buýt thông minh** - Ứng dụng chuyển đổi số giao thông công cộng đô thị, tích hợp phân quyền RBAC, quản lý trạm dừng kéo thả trực quan, tra cứu tuyến & tìm kiếm chuyến xe thời gian thực, đồng bộ cơ sở dữ liệu Supabase Cloud và triển khai tự động qua Vercel.

---

## 📌 Bảng mục lục
1. [Giới thiệu dự án](#-1-giới-thiệu-dự-án)
2. [Các phân hệ & Tính năng hoàn chỉnh](#-2-các-phân-hệ--tính-năng-hoàn-chỉnh)
3. [Kiến trúc hệ thống & Công nghệ](#-3-kiến-trúc-hệ-thống--công-nghệ)
4. [Tài khoản Demo kiểm thử hệ thống](#-4-tài-khoản-demo-kiểm-thử-hệ-thống)
5. [Cấu trúc thư mục Monorepo](#-5-cấu-trúc-thư-mục-monorepo)
6. [Hướng dẫn cài đặt & Khởi chạy cục bộ (Local Setup)](#-6-hướng-dẫn-cài-đặt--khởi-chạy-cục-bộ-local-setup)
7. [Cơ sở dữ liệu đám mây Supabase](#-7-cơ-sở-dữ-liệu-đám-mây-supabase)
8. [Tài liệu API Swagger](#-8-tài-liệu-api-swagger)
9. [Quy trình triển khai Vercel & CI Pipeline](#-9-quy-trình-triển-khai-vercel--ci-pipeline)
10. [Đội ngũ phát triển (Team 5 - N5 Innovators)](#-10-đội-ngũ-phát-triển-team-5---n5-innovators)

---

## 📖 1. Giới thiệu dự án

Hệ thống **Smart Bus Ticketing System** được phát triển nhằm giải quyết toàn diện bài toán điều hành và sử dụng phương tiện giao thông công cộng:
- **Dành cho hành khách:** Tra cứu lộ trình các tuyến xe buýt, thông tin trạm dừng, lịch trình chuyến xe theo thời gian thực và đặt vé trực tuyến.
- **Dành cho ban quản lý & điều hành (Admin/Manager):** Thiết lập mạng lưới tuyến buýt linh hoạt, sắp xếp thứ tự đón/trả khách tại các trạm dừng bằng thao tác kéo thả (Drag and Drop), quản lý giá vé và biểu phí linh hoạt.
- **Bảo mật & Hiệu năng cao:** Kiến trúc Monorepo tách bạch Frontend SPA (React 19) và Backend API (NestJS 10), xác thực phân quyền RBAC đa cấp với JWT Tokens & Route Guards, đồng bộ cơ sở dữ liệu PostgreSQL trên nền tảng Supabase Cloud.

---

## ✨ 2. Các phân hệ & Tính năng hoàn chỉnh

### 🔐 A. Phân hệ Xác thực & Phân quyền RBAC (Frontend & Backend)
- **Auth Layout hiện đại:** Thiết kế Split-screen với hero banner phương tiện công cộng, hiệu ứng live status badge.
- **Form Đăng nhập UX cao cấp:** Hỗ trợ đăng nhập linh hoạt bằng Email hoặc Số điện thoại, toggle ẩn/hiện mật khẩu, tự động lưu phiên làm việc qua `localStorage`.
- **Bộ chuyển đổi nhanh tài khoản Demo:** Nút chuyển 1-Click cho các vai trò Admin, Manager, Driver, Passenger giúp giảng viên và hội đồng kiểm thử nhanh chóng.
- **Route Guards bảo mật:**
  - `ProtectedRoute`: Kiểm tra token và quyền hạn (`ADMIN`, `MANAGER`). Tự động lưu URL đích để redirect sau khi đăng nhập thành công.
  - `PublicRoute`: Tự động chuyển hướng người dùng đã đăng nhập vào màn hình làm việc tương ứng, tránh quay lại trang login.
  - `UnauthorizedPage (403)`: Giao diện từ chối truy cập thân thiện, hiển thị thông tin tài khoản hiện tại kèm nút quay lại hoặc đăng xuất.

### 🚌 B. Quản trị Tuyến & Trạm dừng xe buýt (Admin Route & Stop Management)
- Xem danh sách tuyến xe buýt, thông tin cự ly, thời gian giãn cách, trạng thái hoạt động.
- Sắp xếp thứ tự các trạm đón/trả khách bằng thư viện `@dnd-kit` kéo thả (Drag & Drop) mượt mà.
- Tìm kiếm nhanh trạm dừng theo tên phố hoặc địa danh.
- Thiết lập biểu phí và giá vé (`fares`) theo từng chặng hoặc toàn tuyến.

### 🔍 C. Tra cứu Tuyến buýt & Tìm kiếm Chuyến xe (Trips Search API)
- Giao diện tra cứu lộ trình tuyến xe cho người dân.
- Backend API (`US01`) tìm kiếm chuyến xe theo trạm đi, trạm đến và ngày khởi hành, được tối ưu hóa chỉ mục (Composite & Partial Indexes) trong PostgreSQL.

### ☁️ D. Tích hợp Supabase Cloud & Agent Skills
- Tích hợp thư viện `@supabase/supabase-js` cho Frontend và Prisma ORM cho Backend.
- Cài đặt sẵn bộ Supabase Agent Skills (`.agents/skills/supabase`, `supabase-postgres-best-practices`) hỗ trợ tối ưu truy vấn SQL.

---

## 🛠️ 3. Kiến trúc hệ thống & Công nghệ

| Tầng (Layer) | Công nghệ chính | Thư viện & Công cụ bổ trợ |
| :--- | :--- | :--- |
| **Frontend** | **React 19**, **TypeScript 5** | **Vite 8**, **React Router v6**, `@dnd-kit/core`, `@dnd-kit/sortable`, `@supabase/supabase-js`, Modern CSS |
| **Backend** | **NestJS 10**, **Node.js 20+** | **Prisma ORM 5**, `@nestjs/swagger`, `passport-jwt`, `bcrypt`, `class-validator`, `dotenv`, `cors` |
| **Database** | **PostgreSQL 15+** | Lưu trữ trên **Supabase Cloud**, hỗ trợ kết nối trực tiếp & Supavisor Connection Pooler |
| **DevOps & CI** | **Vercel**, **GitHub Actions** | Vercel SPA Rewrites, GitHub Actions CI Pipeline (`npm ci`, lint, test, build) |

---

## 🔑 4. Tài khoản Demo kiểm thử hệ thống

Tại màn hình đăng nhập (`/login`), bạn có thể nhập thông tin hoặc nhấn trực tiếp các nút chọn tài khoản demo:

| Vai trò (Role) | Tài khoản / Email | Mật khẩu mẫu | Quyền hạn truy cập |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@smartbus.ictu.vn` | `Admin@12345` | Truy cập toàn bộ hệ thống (`/admin/routes`, cấu hình trạm, biểu phí, phân quyền). |
| **Quản lý điều hành (Manager)** | `manager@smartbus.ictu.vn` | `Manager@123` | Quản lý tuyến đường, xe buýt, phân lịch trình chuyến xe. |
| **Tài xế / Phụ xe (Driver)** | `0987654321` | `Driver@123` | Xem lịch trình phân công (Bị chặn 403 khi cố truy cập trang Admin). |
| **Hành khách (Passenger)** | `khachhang@gmail.com` | `User@123` | Đặt vé, tra cứu tuyến xe (Bị chặn 403 khi cố truy cập trang Admin). |

---

## 📂 5. Cấu trúc thư mục Monorepo

```plaintext
Project_Smart_Bus_Ticketing_System_ictu/
├── .agents/skills/                 # Supabase & Postgres Best Practices Agent Skills
├── .github/
│   └── workflows/
│       └── ci.yml                  # CI Pipeline: Kiểm tra Lint, Unit Test & Build tự động
├── backend/                        # Backend RESTful API (NestJS + Prisma)
│   ├── prisma/
│   │   ├── migrations/             # Lịch sử migration cơ sở dữ liệu
│   │   └── schema.prisma           # Cấu trúc Database PostgreSQL hoàn chỉnh
│   ├── src/
│   │   ├── bus-stops/              # Module quản lý trạm dừng xe buýt
│   │   ├── fares/                  # Module quản lý giá vé và biểu phí chặng
│   │   ├── routes/                 # Module tuyến buýt & sắp xếp trạm dừng
│   │   ├── modules/
│   │   │   ├── trips/              # API tìm kiếm chuyến xe buýt tối ưu (US01)
│   │   │   └── prisma/             # Prisma Service & kết nối CSDL
│   │   ├── common/                 # Filters, Interceptors, Guards, Decorators
│   │   ├── app.module.ts
│   │   └── main.ts                 # Bootstrap ứng dụng & Swagger API Docs
│   ├── .env.example                # File mẫu biến môi trường backend
│   └── package.json
├── frontend/                       # Giao diện người dùng Web SPA (React 19 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/              # Header, Sidebar, RouteTable, StationList
│   │   │   ├── layout/             # AuthLayout (Split-screen banner giao thông)
│   │   │   └── routes/             # ProtectedRoute, PublicRoute Guards
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # State Management AuthContext & RBAC
│   │   ├── pages/
│   │   │   ├── admin/              # Trang điều hành quản trị Tuyến & Trạm
│   │   │   ├── auth/               # Trang đăng nhập LoginPage
│   │   │   └── error/              # Trang lỗi phân quyền 403 UnauthorizedPage
│   │   ├── routes/
│   │   │   └── AppRoutes.tsx       # Cấu hình định tuyến bảo mật React Router v6
│   │   ├── types/
│   │   │   ├── auth.ts             # Định nghĩa Type User, RoleCode, Tokens
│   │   │   └── route.ts            # Định nghĩa Type Tuyến đường, Trạm dừng
│   │   └── utils/
│   │       └── supabase/client.ts  # Khởi tạo Supabase Client cho Frontend
│   ├── .env.example
│   ├── vercel.json                 # Cấu hình rewrite SPA cho Vercel
│   └── package.json
├── package.json                    # Root package quản lý build monorepo
├── vercel.json                     # Root Vercel deployment configuration
└── README.md                       # Tài liệu hướng dẫn dự án
```

---

## 💻 6. Hướng dẫn cài đặt & Khởi chạy cục bộ (Local Setup)

### Yêu cầu tiên quyết:
- **Node.js:** Phiên bản `>= 20.x`
- **npm:** Phiên bản `>= 10.x`
- **Git**

### Bước 1: Clone dự án về máy
```bash
git clone https://github.com/tamtran2k6zz/Project_Smart_Bus_Ticketing_System_ictu.git
cd Project_Smart_Bus_Ticketing_System_ictu
```

### Bước 2: Cài đặt và khởi chạy Backend (NestJS API)
```bash
cd backend

# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Khởi tạo file biến môi trường từ mẫu
cp .env.example .env
# (File .env đã được cấu hình sẵn kết nối tới CSDL Supabase Cloud)

# 3. Đồng bộ cấu trúc bảng lên cơ sở dữ liệu
npx prisma db push

# 4. Khởi chạy máy chủ Backend ở chế độ phát triển
npm run start:dev
```
> 🚀 Backend API chạy tại: `http://localhost:5000`  
> 📖 Tài liệu Swagger API tại: `http://localhost:5000/api/docs`

### Bước 3: Cài đặt và khởi chạy Frontend (React + Vite)
Mở một cửa sổ terminal mới:
```bash
cd frontend

# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Khởi chạy máy chủ Frontend
npm run dev
```
> 🌐 Truy cập Web App tại: `http://localhost:5173`  
> 🔑 Trang đăng nhập: `http://localhost:5173/login`  
> 🚌 Trang quản trị tuyến & trạm: `http://localhost:5173/admin/routes`

---

## ☁️ 7. Cơ sở dữ liệu đám mây Supabase

Hệ thống sử dụng cơ sở dữ liệu **PostgreSQL** trên hạ tầng đám mây **Supabase**:
- **Máy chủ kết nối:** `db.uhoznqcpaasartfvdynx.supabase.co:5432`
- **Toàn bộ cấu trúc bảng đã được tạo lập hoàn tất:**
  - `users`, `roles`, `user_roles`: Danh mục tài khoản và quyền hạn RBAC.
  - `bus_routes`, `bus_stops`, `route_stops`: Mạng lưới tuyến xe, danh sách trạm và thứ tự đón trả.
  - `fares`: Biểu phí và giá vé tương ứng theo chặng.
  - `buses`, `trips`: Phương tiện xe buýt và lịch trình chuyến chạy.
  - `bookings`, `tickets`, `payments`: Giao dịch đặt vé, chọn chỗ và thanh toán.

Mỗi khi có thay đổi trong [`backend/prisma/schema.prisma`](file:///d:/ICTU/TTCS2026/Team%205/Final_Project/backend/prisma/schema.prisma), chỉ cần chạy lệnh sau để đồng bộ tức thì:
```bash
cd backend
npx prisma db push
```

---

## 📖 8. Tài liệu API Swagger

Backend NestJS đã được tích hợp sẵn bộ tài liệu **Swagger OpenAPI**:
- Sau khi chạy Backend, truy cập: `http://localhost:5000/api/docs`
- Cung cấp giao diện trực quan cho phép kiểm thử trực tiếp các endpoint:
  - `GET /api/v1/routes`: Lấy danh sách các tuyến xe buýt công cộng.
  - `GET /api/v1/bus-stops`: Tra cứu danh sách trạm dừng.
  - `GET /api/v1/trips/search`: Tìm kiếm chuyến xe buýt (US01).
  - `PUT /api/v1/routes/:id/stops/reorder`: Kéo thả cập nhật thứ tự trạm dừng.
  - `POST /api/v1/fares`: Thiết lập biểu phí vé xe.

---

## 🚀 9. Quy trình triển khai Vercel & CI Pipeline

### Triển khai tự động hoàn toàn qua Vercel:
Dự án được tối ưu hóa để triển khai trực tiếp lên **Vercel** mà không cần bất kỳ máy chủ VPS hay cấu hình SSH phức tạp nào:
- File [`vercel.json`](file:///d:/ICTU/TTCS2026/Team%205/Final_Project/vercel.json) ở thư mục gốc tự động trỏ build vào `frontend` và cấu hình thư mục đầu ra `frontend/dist`.
- File [`frontend/vercel.json`](file:///d:/ICTU/TTCS2026/Team%205/Final_Project/frontend/vercel.json) áp dụng cơ chế URL Rewrite về `/index.html`, triệt tiêu hoàn toàn lỗi `404 Not Found` khi người dùng F5 hoặc truy cập trực tiếp các route con.
- Mỗi khi đẩy code lên nhánh `main` hoặc `develop`, Vercel sẽ tự động build và cập nhật phiên bản mới ngay lập tức.

### CI Pipeline tự động ([`.github/workflows/ci.yml`](file:///d:/ICTU/TTCS2026/Team%205/Final_Project/.github/workflows/ci.yml)):
- Tự động kích hoạt khi có Push hoặc Pull Request vào nhánh `main` và `develop`:
  - **Kiểm tra Backend:** Cài đặt phụ thuộc, sinh Prisma Client (`prisma generate`), chạy lint, unit test và build.
  - **Kiểm tra Frontend:** Cài đặt phụ thuộc, chạy lint, unit test và build Vite React.
  - Giúp bảo đảm 100% mã nguồn không phát sinh lỗi trước khi tích hợp.

---

## 👥 10. Đội ngũ phát triển (Team 5 - N5 Innovators)

| STT | Họ và tên | Vai trò trong dự án | Phân hệ phụ trách |
| :---: | :--- | :--- | :--- |
| 1 | **Trần Đặng Công Tâm** | **Scrum Master kiêm Leader** | Quản lý dự án, điều phối Sprint, Review PR, CI/CD Staging |
| 2 | **Nguyễn Hoàng Đức** | **Frontend Developer** | Layout Auth, State Management (AuthContext), UI Đăng nhập & Protected Routes |
| 3 | **Hà Quang Vinh** | **Frontend Developer** | Quản trị tuyến & Sắp xếp trạm dừng xe buýt (Route Station Drag & Drop) |
| 4 | **Triệu Văn Thiệp** | **Frontend Developer** | Giao diện Trang chủ & Tra cứu thông tin tuyến xe buýt |
| 5 | **La Công Tuấn** | **Backend Developer** | Thiết kế kiến trúc Backend API, tích hợp dịch vụ & kết nối hệ thống |
| 6 | **Tào Hoàng Minh Vũ** | **Backend Developer** | Thiết kế cơ sở dữ liệu (Database Schema), Tuyến/Trạm buýt & RESTful API |
| 7 | **Nguyễn Minh Đức** | **Backend Developer** | Phát triển API tìm kiếm chuyến xe (US01) & Tối ưu hóa Database Index |
| 8 | **Mạch Thị Ngọc Ánh** | **Quality Assurance (QA)** | Kiểm thử chất lượng phần mềm, lập Test Case, kiểm tra hồi quy |
| 9 | **Đinh Hữu Phúc** | **Quality Assurance (QA)** | Kiểm thử chức năng (Functional Testing), kiểm tra luồng API & UI |
| 10 | **Hoàng Quốc Toản** | **Quality Assurance (QA)** | Kiểm thử hiệu năng, bảo mật và nghiệm thu tiêu chuẩn Definition of Done (DoD) |

---

<p align="center">
  <sub>© 2026 Smart Bus Ticketing System. Đồ án môn học TTCS2026 - Khoa Công nghệ Thông tin, Đại học CNTT & TT Thái Nguyên (ICTU).</sub>
</p>
