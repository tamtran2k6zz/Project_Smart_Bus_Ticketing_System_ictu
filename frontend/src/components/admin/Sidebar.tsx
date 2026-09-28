export type AdminSection = 'dashboard' | 'routes' | 'tickets' | 'users' | 'buses';

interface SidebarProps {
  activeSection: AdminSection;
  onNavigate: (section: AdminSection) => void;
}

function Sidebar({ activeSection, onNavigate }: SidebarProps) {
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
        <button
          className={`menu-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`menu-item ${activeSection === 'routes' ? 'active' : ''}`}
          onClick={() => onNavigate('routes')}
        >
          🚌 Tuyến / Trạm
        </button>
        <button
          className={`menu-item ${activeSection === 'tickets' ? 'active' : ''}`}
          onClick={() => onNavigate('tickets')}
        >
          🎫 Vé xe
        </button>
        <button
          className={`menu-item ${activeSection === 'users' ? 'active' : ''}`}
          onClick={() => onNavigate('users')}
        >
          👥 Người dùng
        </button>
        <button
          className={`menu-item ${activeSection === 'buses' ? 'active' : ''}`}
          onClick={() => onNavigate('buses')}
        >
          🚍 Xe buýt
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
