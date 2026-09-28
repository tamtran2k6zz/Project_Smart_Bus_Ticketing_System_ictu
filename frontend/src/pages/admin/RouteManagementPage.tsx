import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/admin/Header';
import RouteTable from '../../components/admin/RouteTable';
import RouteModal from '../../components/admin/RouteModal';
import type { BusRoute } from '../../types/route';
import { deleteRoute, getRoutes, saveRoute } from '../../services/routes';

function RouteManagementPage() {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);

  useEffect(() => {
    let cancelled = false;

    getRoutes()
      .then(data => {
        if (!cancelled) {
          setRoutes(data);
          setPageError('');
        }
      })
      .catch(error => {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : 'Không thể tải danh sách tuyến.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleDelete = async (route: BusRoute) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tuyến ${route.code} không?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteRoute(route.id);
      setRoutes(current => current.filter(item => item.id !== route.id));
      setPageError('');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Không thể xóa tuyến.');
    }
  };

  const handleViewStations = (route: BusRoute) => {
    setModalMode('edit');
    setSelectedRoute(route);
    setModalOpen(true);
  };

  const handleSave = async (route: BusRoute) => {
    const savedRoute = await saveRoute(route);
    setRoutes(current => {
      const exists = current.some(item => item.id === savedRoute.id);
      return exists
        ? current.map(item => (item.id === savedRoute.id ? savedRoute : item))
        : [...current, savedRoute];
    });
    setPageError('');
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
          {pageError && <div className="form-error">{pageError}</div>}
          {loading ? (
            <p role="status">Đang tải danh sách tuyến...</p>
          ) : (
            <RouteTable
              routes={filteredRoutes}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewStations={handleViewStations}
            />
          )}
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