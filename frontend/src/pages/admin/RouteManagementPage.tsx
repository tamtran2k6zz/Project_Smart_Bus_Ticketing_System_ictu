import { useMemo, useState } from 'react';
import Header from '../../components/admin/Header';
import RouteTable from '../../components/admin/RouteTable';
import RouteModal from '../../components/admin/RouteModal';
import type { BusRoute } from '../../types/route';

const mockRoutes: BusRoute[] = [
  {
    id: '1',
    code: 'R01',
    name: 'Bến xe Mỹ Đình - Long Biên',
    status: 'ACTIVE',
    stations: [
      {
        id: 's1',
        name: 'Bến xe Mỹ Đình',
        address: 'Phạm Hùng, Nam Từ Liêm',
        order: 1,
      },
      {
        id: 's2',
        name: 'Cầu Giấy',
        address: 'Cầu Giấy, Hà Nội',
        order: 2,
      },
      {
        id: 's3',
        name: 'Long Biên',
        address: 'Long Biên, Hà Nội',
        order: 3,
      },
    ],
  },
  {
    id: '2',
    code: 'R02',
    name: 'Hà Đông - Nội Bài',
    status: 'ACTIVE',
    stations: [
      {
        id: 's4',
        name: 'Hà Đông',
        address: 'Hà Đông, Hà Nội',
        order: 1,
      },
      {
        id: 's5',
        name: 'Thanh Xuân',
        address: 'Thanh Xuân, Hà Nội',
        order: 2,
      },
    ],
  },
  {
    id: '3',
    code: 'R03',
    name: 'Cầu Giấy - Gia Lâm',
    status: 'INACTIVE',
    stations: [
      {
        id: 's6',
        name: 'Cầu Giấy',
        address: 'Cầu Giấy, Hà Nội',
        order: 1,
      },
    ],
  },
];

function RouteManagementPage() {
  const [routes, setRoutes] =
    useState<BusRoute[]>(mockRoutes);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] =
    useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalOpen, setModalOpen] =
    useState(false);

  const [modalMode, setModalMode] =
    useState<'add' | 'edit'>('add');

  const [selectedRoute, setSelectedRoute] =
    useState<BusRoute | null>(null);

  const filteredRoutes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return routes.filter((route) => {
      const matchesSearch =
        !keyword ||
        route.code.toLowerCase().includes(keyword) ||
        route.name.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'ALL' ||
        route.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [routes, search, statusFilter]);

  const handleAdd = () => {
    setModalMode('add');
    setSelectedRoute(null);
    setModalOpen(true);
  };

  const handleEdit = (route: BusRoute) => {
    setModalMode('edit');
    setSelectedRoute(route);
    setModalOpen(true);
  };

  const handleDelete = (route: BusRoute) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tuyến ${route.code} không?`,
    );

    if (!confirmed) {
      return;
    }

    setRoutes((current) =>
      current.filter(
        (item) => item.id !== route.id,
      ),
    );
  };

  const handleViewStations = (route: BusRoute) => {
    setModalMode('edit');
    setSelectedRoute(route);
    setModalOpen(true);
  };

  const handleSave = (route: BusRoute) => {
    setRoutes((current) => {
      const exists = current.some(
        (item) => item.id === route.id,
      );

      if (exists) {
        return current.map((item) =>
          item.id === route.id ? route : item,
        );
      }

      return [...current, route];
    });

    setModalOpen(false);
    setSelectedRoute(null);
  };

  return (
    <div className="main-content">
      <Header />

      <main className="page-content">
        <div className="page-title-row">
          <div>
            <h2>Danh sách tuyến</h2>

            <p>
              Quản lý tuyến xe buýt trong hệ thống
            </p>
          </div>

          <button
            className="primary-button"
            onClick={handleAdd}
          >
            + Thêm tuyến
          </button>
        </div>

        <div className="toolbar">
          <input
            className="search-input"
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Tìm kiếm theo mã hoặc tên tuyến..."
          />

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as
                  | 'ALL'
                  | 'ACTIVE'
                  | 'INACTIVE',
              )
            }
          >
            <option value="ALL">
              Tất cả trạng thái
            </option>

            <option value="ACTIVE">
              Hoạt động
            </option>

            <option value="INACTIVE">
              Tạm dừng
            </option>
          </select>
        </div>

        <div className="content-card">
          <RouteTable
            routes={filteredRoutes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onViewStations={handleViewStations}
          />
        </div>
      </main>

      <RouteModal
        open={modalOpen}
        mode={modalMode}
        route={selectedRoute}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}

export default RouteManagementPage;