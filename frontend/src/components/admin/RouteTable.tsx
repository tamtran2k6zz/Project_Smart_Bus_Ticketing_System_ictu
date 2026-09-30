import type { BusRoute } from '../../types/route';

interface RouteTableProps {
  routes: BusRoute[];
  onEdit: (route: BusRoute) => void;
  onDelete: (route: BusRoute) => void;
  onViewStations: (route: BusRoute) => void;
}

function RouteTable({
  routes,
  onEdit,
  onDelete,
  onViewStations,
}: RouteTableProps) {
  return (
    <div className="table-wrapper">
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
