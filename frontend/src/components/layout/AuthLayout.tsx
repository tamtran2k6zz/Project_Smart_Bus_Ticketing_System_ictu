import React, { ReactNode } from 'react';
import './AuthLayout.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-layout-container">
      {/* Banner bên trái */}
      <div className="auth-banner-side">
        <div className="auth-banner-pattern" />

        <div className="auth-brand-header">
          <div className="auth-brand-logo-icon">🚌</div>
          <div>
            <span className="auth-brand-logo-text">SmartBus ICTU</span>
            <span className="auth-brand-badge">Sprint 1</span>
          </div>
        </div>

        <div className="auth-banner-content">
          <div className="auth-banner-badge-live">
            <span className="pulse-dot" />
            Hệ thống bán vé & điều hành xe buýt thông minh
          </div>
          <h1 className="auth-banner-title">
            Di chuyển hiện đại, <span>chạm là đi.</span>
          </h1>
          <p className="auth-banner-desc">
            Nền tảng số hóa quản lý chuyến, tra cứu lộ trình, đặt vé điện tử và
            phân quyền hệ thống đa tầng cho Admin, Quản lý, Tài xế và Hành khách.
          </p>

          <div className="auth-feature-list">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <div className="auth-feature-text">
                <strong>Vé điện tử QR:</strong> Quét nhanh dưới 1 giây, bảo mật không thể làm giả.
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <div className="auth-feature-text">
                <strong>Quản lý Tuyến & Trạm:</strong> Sắp xếp thứ tự trạm trực quan bằng kéo-thả (SBT-22).
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <div className="auth-feature-text">
                <strong>Phân quyền RBAC đa cấp:</strong> Bảo mật an toàn với Access Token & Protected Routes.
              </div>
            </div>
          </div>
        </div>

        <div className="auth-banner-footer">
          <span>© 2026 Smart Bus Ticketing System. Team 5 ICTU.</span>
          <span>Bảo mật ISO/IEC 27001</span>
        </div>
      </div>

      {/* Cột Form bên phải */}
      <div className="auth-form-side">
        <div className="auth-card-wrapper">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
