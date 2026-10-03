import { useMemo, useState, useEffect, useCallback } from 'react';
import Header from '../../components/admin/Header';
import RouteTable from '../../components/admin/RouteTable';
import RouteModal from '../../components/admin/RouteModal';
import Sidebar, { AdminTab } from '../../components/admin/Sidebar';
import DashboardView from '../../components/admin/DashboardView';
import TicketBookingView from '../../components/admin/TicketBookingView';
import UserManagementView from '../../components/admin/UserManagementView';
import OperationsView from '../../components/admin/OperationsView';
import type { BusRoute } from '../../types/route';
import { getApiUrl, apiFetch } from '../../api/client';
import type { ApiRoute } from '../../types/api';
import { getErrorMessage } from '../../utils/errorMessage';

function RouteManagementPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('routes');
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedRoute, setSelectedRoute] = useState<BusRoute | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Lấy dữ liệu tuyến xe buýt trực tiếp từ cơ sở dữ liệu cơ sở dữ liệu thật
  const fetchRoutesFromDatabase = useCallback(async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const res = await apiFetch(getApiUrl('/api/v1/routes'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Lỗi nạp dữ liệu từ cơ sở dữ liệu: HTTP ${res.status}`);
      }

      const json = await res.json();
      const rawList: ApiRoute[] = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      const mapped: BusRoute[] = rawList.map(r => ({
        id: String(r.id),
        code: r.code,
        name: r.name,
        status: r.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        stations: (Array.isArray(r.stops) ? r.stops : Array.isArray(r.routeStops) ? r.routeStops : []).map(rs => ({
          id: String(rs.stopId || rs.stop?.id || rs.id || `rs-${rs.stopOrder ?? 0}`),
          name: rs.name || rs.stop?.name || 'Trạm đón trả',
          address: rs.address || rs.stop?.address || '',
          order: rs.stopOrder ?? 0,
        })),
      }));

      setRoutes(mapped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể kết nối cơ sở dữ liệu!';
      setDbError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutesFromDatabase();
  }, [fetchRoutesFromDatabase]);

  const filteredRoutes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return (Array.isArray(routes) ? routes : []).filter((route) => {
      const matchesSearch =
        !keyword ||
        route.code.toLowerCase().includes(keyword) ||
        route.name.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'ALL' || route.status === statusFilter;

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
      `Bạn có chắc chắn muốn xóa tuyến ${route.code} (${route.name}) khỏi cơ sở dữ liệu cơ sở dữ liệu không?`,
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('smartbus_access_token');
      const res = await apiFetch(getApiUrl(`/api/v1/routes/${route.id}`), {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || 'Không thể xóa tuyến trong cơ sở dữ liệu!');
      }

      await fetchRoutesFromDatabase();
    } catch (err: unknown) {
      alert(`Lỗi xóa tuyến: ${getErrorMessage(err, 'Không thể xóa tuyến.')}`);
    }
  };

  const handleViewStations = (route: BusRoute) => {
    setModalMode('edit');
    setSelectedRoute(route);
    setModalOpen(true);
  };

  const handleSave = async (route: BusRoute) => {
    const token = localStorage.getItem('smartbus_access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      if (modalMode === 'add') {
        // Ghi mới tuyến xe vào cơ sở dữ liệu qua POST /api/v1/routes
        const res = await apiFetch(getApiUrl('/api/v1/routes'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            code: route.code,
            name: route.name,
            status: route.status,
            description: `Tuyến xe ${route.name}`,
            distanceKm: 15.0,
            estimatedDurationMin: 40,
            stations: route.stations.map(({ name, address, order }) => ({
              name,
              address,
              order,
            })),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || 'Không thể tạo mới tuyến trong cơ sở dữ liệu!');
        }
      } else {
        // Cập nhật tuyến xe trong cơ sở dữ liệu qua PATCH /api/v1/routes/:id
        const res = await apiFetch(getApiUrl(`/api/v1/routes/${route.id}`), {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            code: route.code,
            name: route.name,
            status: route.status,
            stations: route.stations.map(({ id, name, address, order }) => ({
              id,
              name,
              address,
              order,
            })),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || 'Không thể cập nhật tuyến trong cơ sở dữ liệu!');
        }
      }

      setModalOpen(false);
      setSelectedRoute(null);
      await fetchRoutesFromDatabase();
    } catch (err: unknown) {
      alert(`Thao tác cơ sở dữ liệu thất bại: ${getErrorMessage(err, 'Không thể lưu tuyến.')}`);
    }
  };

  return (
    <div className="admin-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="main-content">
        <Header />

        <main className="content">
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: dbError ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                  color: dbError ? '#fca5a5' : '#34d399',
                  border: dbError ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                  boxShadow: dbError ? '0 0 16px rgba(239, 68, 68, 0.2)' : '0 0 16px rgba(16, 185, 129, 0.2)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <span
                  className={dbError ? '' : 'pulse-dot'}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: dbError ? '#ef4444' : '#10b981',
                    boxShadow: dbError ? '0 0 10px #ef4444' : undefined,
                  }}
                />
                {dbError ? `Lỗi kết nối CSDL: ${dbError}` : 'Kết nối trực tiếp: cơ sở dữ liệu'}
              </span>
            </div>

            <button
              onClick={fetchRoutesFromDatabase}
              className="secondary-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              🔄 Tải lại dữ liệu cơ sở dữ liệu
            </button>
          </div>

          {activeTab === 'dashboard' && <DashboardView />}

          {activeTab === 'routes' && (
            <>
              <RouteTable
                routes={filteredRoutes}
                search={search}
                statusFilter={statusFilter}
                onSearchChange={setSearch}
                onStatusFilterChange={setStatusFilter}
                onAdd={handleAdd}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewStations={handleViewStations}
              />

              {isLoading && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#6B7280' }}>
                  Đang truy vấn dữ liệu từ cơ sở dữ liệu...
                </div>
              )}

              <RouteModal
                open={modalOpen}
                mode={modalMode}
                route={selectedRoute}
                onClose={() => {
                  setModalOpen(false);
                  setSelectedRoute(null);
                }}
                onSave={handleSave}
              />
            </>
          )}

          {activeTab === 'tickets' && <TicketBookingView />}

          {activeTab === 'users' && <UserManagementView />}

          {activeTab === 'operations' && <OperationsView />}
        </main>
      </div>
    </div>
  );
}

export default RouteManagementPage;