import React from 'react';

export type AdminTab = 'dashboard' | 'routes' | 'tickets' | 'users' | 'operations';

interface SidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🚌</div>
        <div>
          <strong>Smart Bus</strong>
          <span>Admin Panel (MySQL)</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <button
          className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          📊 Báo cáo & Thống kê
        </button>
        <button
          className={`menu-item ${activeTab === 'routes' ? 'active' : ''}`}
          onClick={() => onTabChange('routes')}
        >
          🚌 Tuyến & Trạm dừng
        </button>
        <button
          className={`menu-item ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => onTabChange('tickets')}
        >
          🎫 Đặt vé & Soát vé QR
        </button>
        <button
          className={`menu-item ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => onTabChange('users')}
        >
          👥 Người dùng & Duyệt HSSV
        </button>
        <button
          className={`menu-item ${activeTab === 'operations' ? 'active' : ''}`}
          onClick={() => onTabChange('operations')}
        >
          ⚠️ Sự cố & Đánh giá
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;