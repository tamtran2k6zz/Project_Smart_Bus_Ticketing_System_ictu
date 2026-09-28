function Header() {
  return (
    <header className="header">
      <div>
        <h1>Quản trị tuyến & trạm</h1>
        <p>Quản lý các tuyến xe và thứ tự trạm dừng</p>
      </div>

      <div className="admin-profile">
        <div className="avatar">A</div>
        <div>
          <strong>Admin</strong>
          <span>Quản trị viên</span>
        </div>
      </div>
    </header>
  );
}

export default Header;