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
        <button className="menu-item">📊 Dashboard</button>
        <button className="menu-item active">🚌 Tuyến / Trạm</button>
        <button className="menu-item">🎫 Vé xe</button>
        <button className="menu-item">👥 Người dùng</button>
        <button className="menu-item">🚍 Xe buýt</button>
      </nav>
    </aside>
  );
}

export default Sidebar;
