# 🚌 Smart Bus Ticketing System - ICTU

<p align="center">
  <img src="https://img.shields.io/badge/React-19.3.0-61dafb?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.3.1-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/NestJS-10.3.8-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-5.22.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

> **Đồ án Thực tập Cơ sở 2026 - Nhóm 5 (N5 Innovators)**  
> **Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU)**  
> **Hệ thống đặt vé và điều hành xe buýt thông minh** - Ứng dụng chuyển đổi số giao thông công cộng đô thị, tích hợp phân quyền RBAC, quản lý trạm xe buýt kéo thả, tìm kiếm chuyến xe thời gian thực và đồng bộ cơ sở dữ liệu Supabase Cloud.

---

## 📌 Bảng mục lục
1. [Giới thiệu dự án](#-1-giới-thiệu-dự-án)
2. [Các tính năng nổi bật (Sprint 1)](#-2-các-tính-năng-nổi-bật-sprint-1)
3. [Kiến trúc hệ thống & Công nghệ](#-3-kiến-trúc-hệ-thống--công-nghệ)
4. [Tài khoản Demo kiểm thử](#-4-tài-khoản-demo-kiểm-thử)
5. [Cấu trúc thư mục Monorepo](#-5-cấu-trúc-thư-mục-monorepo)
6. [Hướng dẫn cài đặt & Chạy cục bộ (Local Setup)](#-6-hướng-dẫn-cài-đặt--chạy-cục-bộ-local-setup)
7. [Tích hợp Supabase & Cơ sở dữ liệu](#-7-tích-hợp-supabase--cơ-sở-dữ-liệu)
8. [Triển khai Vercel & CI/CD Pipeline](#-8-triển-khai-vercel--cicd-pipeline)
9. [Đội ngũ phát triển (Team 5 - N5 Innovators)](#-9-đội-ngũ-phát-triển-team-5---n5-innovators)

---

## 📖 1. Giới thiệu dự án

Hệ thống **Smart Bus Ticketing System** được thiết kế nhằm hiện đại hóa hoạt động quản lý vận tải hành khách công cộng bằng xe buýt:
- **Dành cho hành khách:** Dễ dàng tra cứu thông tin các tuyến buýt, lộ trình trạm dừng, lịch trình chuyến xe và đặt vé trực tuyến nhanh chóng.
- **Dành cho ban quản lý & điều hành (Admin/Manager):** Thiết lập mạng lưới tuyến đường linh hoạt, sắp xếp thứ tự trạm đón trả khách bằng thao tác kéo thả trực quan, quản lý xe và tài xế.
- **Bảo mật & Hiệu năng cao:** Kiến trúc tách biệt Frontend (SPA React 19) và Backend (NestJS REST API), phân quyền RBAC chặt chẽ với JWT & Protected Routes, đồng bộ Database PostgreSQL trên nền tảng Supabase Cloud.

---

## ✨ 2. Các tính năng nổi bật (Sprint 1)

### 🔐 A. Phân hệ Xác thực & Phân quyền (Authentication & RBAC)
- **Auth Layout hiện đại:** Thiết kế Split-screen với hero banner phương tiện công cộng, huy hiệu Live trạng thái hệ thống.
- **Form Đăng nhập UX cao cấp:** Hỗ trợ đăng nhập bằng Email hoặc Số điện thoại, nút ẩn/hiện mật khẩu, ghi nhớ phiên làm việc (`localStorage`).
- **Bộ chuyển nhanh tài khoản Demo:** 1-Click đăng nhập nhanh với các vai trò Admin, Quản lý, Tài xế hoặc Hành khách để chấm điểm & review Sprint thuận tiện.
- **Route Guards (Bảo vệ tuyến đường):**
  - `ProtectedRoute`: Kiểm tra đăng nhập và vai trò (`ADMIN`, `MANAGER`). Tự động ghi nhớ vị trí cũ để redirect sau khi đăng nhập.
  - `PublicRoute`: Tự động chuyển hướng người dùng đã đăng nhập vào trang làm việc tương ứng, tránh việc vào lại trang login.
  - `UnauthorizedPage (403)`: Trang báo lỗi phân quyền thân thiện, hiển thị thông tin tài khoản hiện tại và nút quay lại / đổi tài khoản.

### 🚌 B. Quản trị Tuyến & Trạm dừng xe buýt (Route & Stop Management)
- Xem danh sách tuyến buýt, thông tin cự ly, thời gian giãn cách và trạng thái hoạt động.
- Sắp xếp thứ tự đón/trả khách giữa các trạm dừng bằng thư viện `@dnd-kit` kéo thả (Drag and Drop) mượt mà.
- Tìm kiếm trạm dừng nhanh theo tên phố, địa danh.

### 🔍 C. Tra cứu Tuyến xe & Tìm kiếm Chuyến đi (Trip Search)
- Giao diện tra cứu lộ trình tuyến xe cho người dân.
- Backend API (`US01`) tìm kiếm chuyến xe theo điểm xuất phát, điểm đến và ngày giờ di chuyển, được tối ưu hóa chỉ mục (Indexes) trong cơ sở dữ liệu PostgreSQL.

### ☁️ D. Đồng bộ Cơ sở dữ liệu Supabase Cloud
- Tích hợp Prisma ORM kết nối trực tiếp đến PostgreSQL trên Supabase.
- Tự động hóa schema qua `npx prisma db push`, bảo đảm toàn bộ quan hệ khóa ngoại (Foreign Keys) toàn vẹn.

---

## 🛠️ 3. Kiến trúc hệ thống & Công nghệ

| Tầng (Layer) | Công nghệ chính | Thư viện & Công cụ bổ trợ |
| :--- | :--- | :--- |
| **Frontend** | **React 19**, **TypeScript 5** | **Vite 8**, **React Router v6**, `@dnd-kit/core`, `@dnd-kit/sortable`, `@supabase/supabase-js`, Modern CSS |
| **Backend** | **NestJS 10**, **Node.js 20+** | **Prisma ORM 5**, TypeScript, `class-validator`, `bcrypt`, `jsonwebtoken`, `cors` |
| **Database** | **PostgreSQL 15+** | Lưu trữ trên **Supabase Cloud**, hỗ trợ Supavisor Connection Pooler |
| **DevOps & Deploy** | **Vercel**, **Docker** | GitHub Actions (CI Lint & Test), Vercel SPA Rewrites, Nginx |

---

## 🔑 4. Tài khoản Demo kiểm thử

Tại màn hình đăng nhập (`/login`), bạn có thể gõ thông tin hoặc bấm trực tiếp vào các nút chuyển đổi tài khoản mẫu:

| Vai trò (Role) | Tài khoản / Email | Mật khẩu mẫu | Quyền hạn truy cập |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@smartbus.ictu.vn` | `Admin@12345` | Truy cập toàn bộ hệ thống (`/admin/routes`, cấu hình trạm, phân quyền). |
| **Quản lý điều hành (Manager)** | `manager@smartbus.ictu.vn` | `Manager@123` | Quản lý tuyến đường, xe buýt, phân lịch trình chuyến đi. |
| **Tài xế / Phụ xe (Driver)** | `0987654321` | `Driver@123` | Phân hệ vận hành chuyến xe (Bị chặn 403 khi vào trang Admin). |
| **Hành khách (Passenger)** | `khachhang@gmail.com` | `User@123` | Đặt vé, tra cứu tuyến xe (Bị chặn 403 khi vào trang Admin). |

---

## 📂 5. Cấu trúc thư mục Monorepo

```plaintext
Project_Smart_Bus_Ticketing_System_ictu/
├── .agents/skills/                 # Agent Skills (Supabase & Postgres Best Practices)
├── .github/
│   └── workflows/
│       └── deploy-staging.yml      # CI/CD GitHub Actions kiểm tra tự động
├── backend/                        # Backend RESTful API (NestJS + Prisma)
│   ├── prisma/
│   │   └── schema.prisma           # Cấu trúc Database PostgreSQL chuẩn
│   ├── src/
│   │   ├── modules/
│   │   │   ├── trips/              # API tìm kiếm chuyến xe buýt (US01)
│   │   │   ├── routes/             # API tuyến & trạm xe buýt
│   │   │   └── prisma/             # Prisma Service & Database Connection
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example                # File mẫu biến môi trường backend
│   └── package.json
├── frontend/                       # Giao diện người dùng Web SPA (React 19 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/              # Header, Sidebar, Route Manager
│   │   │   ├── layout/             # AuthLayout (Split-screen banner)
│   │   │   └── routes/             # ProtectedRoute, PublicRoute Guards
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Quản lý State đăng nhập toàn cục & RBAC
│   │   ├── pages/
│   │   │   ├── admin/              # Trang quản trị Tuyến & Trạm
│   │   │   ├── auth/               # Trang đăng nhập LoginPage
│   │   │   └── error/              # Trang lỗi UnauthorizedPage (403)
│   │   ├── routes/
│   │   │   └── AppRoutes.tsx       # Định tuyến bảo mật bằng React Router
│   │   ├── types/
│   │   │   └── auth.ts             # Định nghĩa Type User, RoleCode, Tokens
│   │   └── utils/
│   │       └── supabase/client.ts  # Khởi tạo Supabase Client
│   ├── .env.example
│   ├── vercel.json                 # Cấu hình rewrite SPA cho Vercel
│   └── package.json
├── package.json                    # Root package quản lý build monorepo
├── vercel.json                     # Root Vercel deployment configuration
└── README.md
```

---

## 💻 6. Hướng dẫn cài đặt & Chạy cục bộ (Local Setup)

### Yêu cầu tiên quyết:
- **Node.js:** Phiên bản `>= 20.x`
- **npm:** Phiên bản `>= 10.x`
- **Git**

### Bước 1: Clone dự án về máy
```bash
git clone https://github.com/tamtran2k6zz/Project_Smart_Bus_Ticketing_System_ictu.git
cd Project_Smart_Bus_Ticketing_System_ictu
```

### Bước 2: Cài đặt và chạy Backend (NestJS API)
```bash
cd backend

# Cài đặt các gói phụ thuộc
npm install

# Tạo file cấu hình môi trường từ mẫu
cp .env.example .env
# (Điền chuỗi kết nối DATABASE_URL của Supabase hoặc PostgreSQL local vào .env)

# Đồng bộ Database với Prisma
npx prisma db push

# Khởi chạy máy chủ Backend ở chế độ phát triển
npm run start:dev
```
> Backend API sẽ chạy tại: `http://localhost:5000`

### Bước 3: Cài đặt và chạy Frontend (React + Vite)
Mở một cửa sổ terminal mới:
```bash
cd frontend

# Cài đặt các gói phụ thuộc
npm install

# Khởi chạy máy chủ Frontend
npm run dev
```
> Truy cập ứng dụng tại: `http://localhost:5173`
> Đường dẫn đăng nhập: `http://localhost:5173/login`
> Đường dẫn quản trị: `http://localhost:5173/admin/routes`

---

## ☁️ 7. Tích hợp Supabase & Cơ sở dữ liệu

Dự án sử dụng cơ sở dữ liệu **PostgreSQL** được host trên hạ tầng điện toán đám mây **Supabase**:
- **Host:** `db.uhoznqcpaasartfvdynx.supabase.co:5432`
- **Các bảng dữ liệu chính đã khởi tạo:**
  - `User`, `Role`, `UserRole`: Lưu trữ thông tin tài khoản, phân quyền quản trị viên, quản lý, tài xế, khách hàng.
  - `BusRoute`, `BusStop`, `RouteStop`: Quản lý danh mục tuyến xe buýt và thứ tự các trạm dừng theo chiều đi/về.
  - `Bus`, `Trip`: Quản lý đầu xe và lịch trình chuyến buýt thực tế.
  - `Booking`, `Ticket`, `Payment`: Quản lý vé đặt, vị trí ghế và trạng thái thanh toán.

Mỗi khi cập nhật cấu trúc bảng trong [`backend/prisma/schema.prisma`](file:///d:/ICTU/TTCS2026/Team%205/Final_Project/backend/prisma/schema.prisma), chỉ cần chạy:
```bash
cd backend
npx prisma db push
```
Hệ thống sẽ tự động đồng bộ lên Supabase Cloud trong vòng vài giây.

---

## 🚀 8. Triển khai Vercel & CI/CD Pipeline

### Triển khai Frontend lên Vercel:
Dự án đã được tích hợp sẵn 2 file cấu hình [`vercel.json`](file:///d:/ICTU/TTCS2026/Team%205/Final_Project/vercel.json) ở thư mục gốc và [`frontend/vercel.json`](file:///d:/ICTU/TTCS2026/Team%205/Final_Project/frontend/vercel.json):
- Tự động nhận diện thư mục `frontend` và chạy lệnh `npm run build`.
- Rewrite tất cả các đường dẫn (`/*`) về `/index.html`, tránh hoàn toàn lỗi `404 Not Found` khi F5 lại trang trên các route con (`/login`, `/admin/routes`, `/unauthorized`).

### Quy trình CI/CD GitHub Actions:
- Mỗi khi tạo Pull Request vào nhánh `develop` hoặc push vào `main`, pipeline tự động kích hoạt:
  - Kiểm tra cú pháp và định dạng mã nguồn (**ESLint**).
  - Chạy kiểm thử tự động (**Unit Tests**).
  - Đảm bảo mã nguồn đạt 100% tiêu chuẩn chất lượng (Definition of Done) trước khi cho phép hợp nhất (merge).

---

## 👥 9. Đội ngũ phát triển (Team 5 - N5 Innovators)

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
