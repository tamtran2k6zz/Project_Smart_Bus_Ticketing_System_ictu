import type { BusRoute } from '../../types/route';

interface RouteTableProps {
  routes: BusRoute[];
  search?: string;
  statusFilter?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  onSearchChange?: (value: string) => void;
  onStatusFilterChange?: (value: 'ALL' | 'ACTIVE' | 'INACTIVE') => void;
  onAdd?: () => void;
  onEdit: (route: BusRoute) => void;
  onDelete: (route: BusRoute) => void;
  onViewStations: (route: BusRoute) => void;
}

function RouteTable({
  routes, search = '', statusFilter = 'ALL', onSearchChange, onStatusFilterChange, onAdd,
  onEdit,
  onDelete,
  onViewStations,
}: RouteTableProps) {
  return (
    <div className="table-wrapper">
      <div className="table-actions">
        {onSearchChange && <input aria-label="Tìm tuyến" value={search} onChange={e => onSearchChange(e.target.value)} placeholder="Tìm mã hoặc tên tuyến" />}
        {onStatusFilterChange && <select aria-label="Trạng thái tuyến" value={statusFilter} onChange={e => onStatusFilterChange(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
          <option value="ALL">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Tạm dừng</option>
        </select>}
        {onAdd && <button type="button" onClick={onAdd}>Thêm tuyến</button>}
      </div>
      <table className="route-table">
        <thead>
          <tr>
            <th>Mã tuyến</th>
            <th>Tên tuyến</th>
            <th>Số trạm</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {(Array.isArray(routes) ? routes : []).map((route) => (
            <tr key={route.id}>
              <td>
                <strong>{route.code}</strong>
              </td>

              <td>{route.name}</td>

              <td>{Array.isArray(route.stations) ? route.stations.length : 0} trạm</td>

              <td>
                <span
                  className={`status-badge ${
                    route.status === 'ACTIVE' ? 'active' : 'inactive'
                  }`}
                >
                  {route.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                </span>
              </td>

              <td>
                <div className="table-actions">
                  <button
                    className="action-button view"
                    onClick={() => onViewStations(route)}
                  >
                    Trạm
                  </button>

                  <button
                    className="action-button edit"
                    onClick={() => onEdit(route)}
                  >
                    Sửa
                  </button>

                  <button
                    className="action-button delete"
                    onClick={() => onDelete(route)}
                  >
                    Xóa
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RouteTable;
