import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/admin/Header';
import { getFares, type FareConfiguration, type TicketType } from '../../services/fares';

const ticketTypeLabels: Record<TicketType, string> = {
  SINGLE: 'Vé lượt',
  MONTHLY_STUDENT: 'Vé tháng học sinh, sinh viên',
  MONTHLY_REGULAR: 'Vé tháng người lớn',
  PRIORITY: 'Vé ưu tiên',
};

const formatCurrency = (amount: number | string) => `${Number(amount).toLocaleString('vi-VN')} đ`;

function FareManagementPage() {
  const [fares, setFares] = useState<FareConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [ticketType, setTicketType] = useState<TicketType | 'ALL'>('ALL');

  useEffect(() => {
    let cancelled = false;

    getFares()
      .then(data => {
        if (!cancelled) {
          setFares(data);
        }
      })
      .catch(reason => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách giá vé.');
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

  const filteredFares = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return fares.filter(fare => {
      const matchesSearch =
        !keyword ||
        fare.route?.code.toLowerCase().includes(keyword) ||
        fare.route?.name.toLowerCase().includes(keyword) ||
        fare.fromStop?.name.toLowerCase().includes(keyword) ||
        fare.toStop?.name.toLowerCase().includes(keyword);
      return matchesSearch && (ticketType === 'ALL' || fare.ticketType === ticketType);
    });
  }, [fares, search, ticketType]);

  return (
    <div className="main-content">
      <Header title="Quản lý giá vé" subtitle="Tra cứu giá vé theo tuyến, loại vé và chặng" />
      <main className="page-content">
        <div className="page-title-row">
          <div>
            <h2>Danh sách giá vé</h2>
            <p>Giá vé hiện hành trong hệ thống</p>
          </div>
        </div>

        <div className="toolbar">
          <input
            className="search-input"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Tìm theo mã tuyến, tên tuyến hoặc trạm..."
          />
          <select
            className="filter-select"
            value={ticketType}
            onChange={event => setTicketType(event.target.value as TicketType | 'ALL')}
            aria-label="Lọc theo loại vé"
          >
            <option value="ALL">Tất cả loại vé</option>
            {Object.entries(ticketTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <section className="content-card">
          {error && (
            <div className="page-error" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <p className="table-message" role="status">
              Đang tải danh sách giá vé...
            </p>
          ) : filteredFares.length === 0 ? (
            <p className="table-message">
              {fares.length === 0
                ? 'Chưa có cấu hình giá vé trong hệ thống.'
                : 'Không tìm thấy giá vé phù hợp.'}
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tuyến</th>
                    <th>Loại vé</th>
                    <th>Chặng</th>
                    <th>Giá vé</th>
                    <th>Hiệu lực</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(filteredFares) ? filteredFares : []).map(fare => (
                    <tr key={fare.id}>
                      <td>
                        {fare.route?.code} — {fare.route?.name}
                      </td>
                      <td>{ticketTypeLabels[fare.ticketType]}</td>
                      <td>
                        {fare.fareType === 'STAGE_FARE'
                          ? `${fare.fromStop?.name ?? '—'} → ${fare.toStop?.name ?? '—'}`
                          : 'Toàn tuyến'}
                      </td>
                      <td>{formatCurrency(fare.amount)}</td>
                      <td>
                        {new Date(fare.effectiveFrom).toLocaleDateString('vi-VN')}
                        {fare.effectiveTo
                          ? ` – ${new Date(fare.effectiveTo).toLocaleDateString('vi-VN')}`
                          : ''}
                      </td>
                      <td>
                        <span className={`status-badge${fare.isActive ? '' : ' inactive'}`}>
                          {fare.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="page-hint">
          Trang này hiển thị cấu hình giá vé. Tạo, sửa hoặc ngừng áp dụng vé cần phiên quản trị được
          backend xác thực.
        </p>
      </main>
    </div>
  );
}

export default FareManagementPage;
