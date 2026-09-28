import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🚌</div>
        <div>
          <strong>Smart Bus</strong>
          <span>Admin Panel</span>
        </div>
      </div>

      <nav className="sidebar-menu">
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
        >
          📊 Dashboard
        </NavLink>
        <NavLink
          to="/admin/routes"
          className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
        >
          🚌 Tuyến / Trạm
        </NavLink>
        <NavLink
          to="/admin/fares"
          className={({ isActive }) => `menu-item${isActive ? ' active' : ''}`}
        >
          🎫 Vé xe
        </NavLink>
        <button
          className="menu-item menu-item-disabled"
          type="button"
          disabled
          title="Chức năng chưa được triển khai"
        >
          👥 Người dùng <span>Chưa có</span>
        </button>
        <button
          className="menu-item menu-item-disabled"
          type="button"
          disabled
          title="Chức năng chưa được triển khai"
        >
          🚍 Xe buýt <span>Chưa có</span>
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
