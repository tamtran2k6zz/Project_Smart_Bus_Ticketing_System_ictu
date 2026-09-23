-- ============================================================================
-- SMART BUS TICKETING SYSTEM - AUTHENTICATION & RBAC SCHEMA
-- User Story: N5-22 / US 22: Phân quyền tài khoản (Admin, Quản lý, Tài xế, Hành khách)
-- Database Engine: PostgreSQL 15+
-- ============================================================================

-- Bật extension tạo UUID v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum trạng thái người dùng
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- 1. Bảng User: Lưu thông tin tài khoản người dùng
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index tra cứu đăng nhập theo Email hoặc SĐT
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);

-- 2. Bảng Role: Danh mục vai trò trong hệ thống (ADMIN, MANAGER, DRIVER, PASSENGER)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,      -- 'ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'
    name VARCHAR(100) NOT NULL,            -- 'Quản trị viên', 'Quản lý điều hành', 'Tài xế / Phụ xe', 'Hành khách'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Permission: Định nghĩa các quyền hạn cụ thể (hành động trên tài nguyên)
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,     -- 'ticket:validate_qr', 'route:manage', 'report:view'
    resource VARCHAR(50) NOT NULL,         -- 'tickets', 'routes', 'schedules', 'reports', 'users'
    action VARCHAR(50) NOT NULL,           -- 'create', 'read', 'update', 'delete', 'validate'
    name VARCHAR(100) NOT NULL,            -- Tên quyền hiển thị
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index tra cứu quyền theo tài nguyên
CREATE INDEX idx_permissions_resource ON permissions(resource);

-- 4. Bảng Trung Gian User - Role (Quan hệ n-n giữa Người dùng và Vai trò)
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- 5. Bảng Trung Gian Role - Permission (Quan hệ n-n giữa Vai trò và Quyền hạn)
CREATE TABLE role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 6. Bảng Refresh Token: Quản lý phiên đăng nhập và thu hồi token (Token Rotation)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    family_id UUID NOT NULL DEFAULT uuid_generate_v4(), -- Quản lý refresh token rotation
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family_id ON refresh_tokens(family_id);

-- ============================================================================
-- SEED DATA BAN ĐẦU THEO PRODUCT BACKLOG
-- ============================================================================

-- Thêm các Roles chuẩn
INSERT INTO roles (code, name, description) VALUES
('ADMIN', 'Quản trị viên hệ thống', 'Toàn quyền cấu hình hệ thống và quản lý tài khoản'),
('MANAGER', 'Quản lý điều hành', 'Quản lý tuyến đường, trạm dừng, xe buýt, lịch trình và báo cáo doanh thu'),
('DRIVER', 'Tài xế / Phụ xe', 'Xem lịch phân công xe buýt, cập nhật sự cố và quét mã QR soát vé'),
('PASSENGER', 'Hành khách', 'Tra cứu tuyến, đặt vé, chọn ghế, thanh toán và quản lý vé cá nhân');

-- Thêm các Permissions mẫu tương ứng các Features trong Product Backlog
INSERT INTO permissions (code, resource, action, name, description) VALUES
-- Admin
('user:manage', 'users', 'manage', 'Quản lý người dùng', 'Tạo, sửa, khóa và phân quyền tài khoản'),
('role:assign', 'roles', 'update', 'Gán vai trò', 'Gán hoặc thu hồi vai trò của người dùng'),

-- Quản lý
('route:manage', 'routes', 'manage', 'Quản lý tuyến đường', 'Thêm, sửa, xóa tuyến xe và trạm dừng'),
('schedule:manage', 'schedules', 'manage', 'Quản lý lịch trình', 'Lập lịch trình chạy và phân công xe buýt'),
('report:view_revenue', 'reports', 'read', 'Xem báo cáo doanh thu', 'Xem thống kê doanh thu và tỷ lệ lấp đầy xe'),
('report:export', 'reports', 'read', 'Xuất báo cáo', 'Xuất báo cáo PDF/Excel'),
('discount:manage', 'discounts', 'manage', 'Quản lý ưu đãi', 'Duyệt hồ sơ học sinh/sinh viên và quản lý voucher'),

-- Tài xế
('ticket:validate_qr', 'tickets', 'validate', 'Soát vé QR', 'Quét và xác thực mã QR vé trên ứng dụng mobile'),
('trip:report_incident', 'trips', 'update', 'Báo cáo sự cố', 'Cập nhật tình trạng trễ chuyến, sự cố đường xá'),

-- Hành khách
('ticket:booking', 'tickets', 'create', 'Đặt vé', 'Đặt vé trực tuyến và chọn chỗ ngồi'),
('ticket:read_own', 'tickets', 'read', 'Xem vé của tôi', 'Xem danh sách và mã QR vé đã mua'),
('ticket:cancel', 'tickets', 'update', 'Hủy vé', 'Yêu cầu hủy hoặc đổi vé');
