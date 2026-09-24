import React, { ReactNode } from 'react';
import './AuthLayout.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-layout-container">
      {/* Cột Banner bên trái */}
      <div className="auth-banner-side">
        <div className="auth-banner-pattern" />
        <div className="auth-banner-glow" />

        {/* Brand Header */}
        <div className="auth-brand-header">
          <div className="auth-brand-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6v6"/>
              <path d="M15 6v6"/>
              <path d="M2 12h19.6"/>
              <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.6-.2-1.2-.5-1.7-.5-1-1.6-1.3-2.5-1.3H4c-1 0-2 .4-2.5 1.3-.3.5-.5 1.1-.5 1.7 0 .4.1.8.2 1.2.3 1.1.8 2.8.8 2.8h3"/>
              <circle cx="7" cy="18" r="2"/>
              <path d="M9 18h5"/>
              <circle cx="16" cy="18" r="2"/>
            </svg>
          </div>
          <div>
            <span className="auth-brand-logo-text">SmartBus ICTU</span>
            <span className="auth-brand-badge">Sprint 1</span>
          </div>
        </div>

        {/* Nội dung giới thiệu */}
        <div className="auth-banner-content">
          <div className="auth-banner-badge-live">
            <span className="pulse-dot" />
            Hệ thống bán vé & điều hành thông minh
          </div>
          <h1 className="auth-banner-title">
            Di chuyển văn minh, <span>chạm là đi.</span>
          </h1>
          <p className="auth-banner-desc">
            Nền tảng số hóa bán vé xe buýt toàn diện: Đặt vé trực tuyến, chọn sơ đồ ghế,
            thanh toán không tiền mặt và soát vé tức thì bằng mã QR.
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
                <strong>Theo dõi GPS Real-time:</strong> Biết chính xác vị trí xe buýt và thời gian đến trạm.
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">✓</div>
              <div className="auth-feature-text">
                <strong>Phân quyền đa tầng RBAC:</strong> Quản trị viên, Quản lý, Tài xế và Hành khách.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Banner */}
        <div className="auth-banner-footer">
          <span>© 2026 Smart Bus Ticketing System. Team 5 ICTU.</span>
          <span>Bảo mật chuẩn ISO/IEC 27001</span>
        </div>
      </div>

      {/* Cột Form bên phải */}
      <div className="auth-form-side">
        <div className="auth-card-wrapper">{children}</div>
      </div>
    </div>
  );
};
