import { useEffect, useState } from 'react';
import Header from '../../components/admin/Header';
import { getBusStops, type BusStopSummary } from '../../services/adminDashboard';
import { getRoutes } from '../../services/routes';
import type { BusRoute } from '../../types/route';

function DashboardPage() {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<BusStopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([getRoutes(), getBusStops()])
      .then(([routeData, stopData]) => {
        if (!cancelled) {
          setRoutes(routeData);
          setStops(stopData);
        }
      })
      .catch(reason => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Không thể tải tổng quan.');
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

  const activeRoutes = routes.filter(route => route.status === 'ACTIVE').length;
  const activeStops = stops.filter(stop => stop.isActive).length;

  return (
    <div className="main-content">
      <Header title="Dashboard" subtitle="Tổng quan hoạt động hệ thống xe buýt" />
      <main className="page-content">
        {error && (
          <div className="page-error" role="alert">
            {error}
          </div>
        )}
        {loading ? (
          <p role="status">Đang tải số liệu tổng quan...</p>
        ) : (
          <>
            <section className="dashboard-grid" aria-label="Số liệu hệ thống">
              <article className="dashboard-stat">
                <span>Tổng số tuyến</span>
                <strong>{routes.length}</strong>
              </article>
              <article className="dashboard-stat">
                <span>Tuyến đang hoạt động</span>
                <strong>{activeRoutes}</strong>
              </article>
              <article className="dashboard-stat">
                <span>Tổng số trạm</span>
                <strong>{stops.length}</strong>
              </article>
              <article className="dashboard-stat">
                <span>Trạm đang hoạt động</span>
                <strong>{activeStops}</strong>
              </article>
            </section>

            <section className="content-card">
              <h2 className="section-heading">Tuyến mới cập nhật</h2>
              {routes.length === 0 ? (
                <p className="table-message">Chưa có tuyến xe nào.</p>
              ) : (
                <div className="table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Mã tuyến</th>
                        <th>Tên tuyến</th>
                        <th>Số trạm</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routes.slice(0, 5).map(route => (
                        <tr key={route.id}>
                          <td>{route.code}</td>
                          <td>{route.name}</td>
                          <td>{route.stations.length}</td>
                          <td>
                            <span
                              className={`status-badge${route.status === 'ACTIVE' ? '' : ' inactive'}`}
                            >
                              {route.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default DashboardPage;
