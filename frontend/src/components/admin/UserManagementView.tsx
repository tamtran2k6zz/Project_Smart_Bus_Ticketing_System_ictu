import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl, apiFetch } from '../../api/client';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  status: string;
  discountType: string;
  discountStatus: string;
  discountProofUrl?: string;
  createdAt: string;
}

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const res = await apiFetch(getApiUrl('/api/v1/users'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      setUsers(Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleApproveDiscount = async (userId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const token = localStorage.getItem('smartbus_access_token');
      const res = await apiFetch(getApiUrl(`/api/v1/users/${userId}/discount-approval`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Cập nhật trạng thái duyệt thất bại trong cơ sở dữ liệu!');
      }

      setActionMessage(
        newStatus === 'APPROVED'
          ? '✅ Đã duyệt giá vé ưu đãi HSSV thành công vào cơ sở dữ liệu!'
          : '❌ Đã từ chối hồ sơ ưu đãi trong cơ sở dữ liệu!',
      );

      await fetchUsers();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="liquid-glass" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '26px', margin: '0 0 6px' }}>
            Phân quyền & Duyệt đối tượng ưu đãi HSSV (US 17, US 22)
          </h3>
          <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', margin: 0 }}>
            Danh sách tài khoản và hồ sơ xét duyệt ưu đãi trực tiếp từ bảng <code style={{ color: '#38bdf8' }}>users</code> trong cơ sở dữ liệu
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="secondary-button"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          🔄 Tải lại
        </button>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: '12px 18px',
            marginBottom: '20px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            fontWeight: 500,
            fontSize: '13.5px',
          }}
        >
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
          Đang nạp dữ liệu người dùng từ cơ sở dữ liệu...
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="route-table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Email / SĐT</th>
                <th>Vai trò (RBAC)</th>
                <th>Loại đối tượng</th>
                <th>Trạng thái duyệt</th>
                <th>Thao tác duyệt (US 17)</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(users) ? users : []).map((u) => {
                const isStudentOrElderly = u.discountType !== 'NONE';
                const roleBadgeStyle =
                  u.role === 'ADMIN'
                    ? { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }
                    : u.role === 'MANAGER'
                    ? { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }
                    : u.role === 'DRIVER'
                    ? { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)', color: '#818cf8' }
                    : { bg: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.7)' };

                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600, color: '#ffffff' }}>{u.fullName}</td>
                    <td style={{ color: 'rgba(255, 255, 255, 0.65)' }}>
                      <div>{u.email}</div>
                      <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '2px' }}>{u.phoneNumber || '--'}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          background: roleBadgeStyle.bg,
                          border: `1px solid ${roleBadgeStyle.border}`,
                          color: roleBadgeStyle.color,
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                      {u.discountType === 'STUDENT' ? '🎓 Sinh viên / Học sinh' : u.discountType === 'ELDERLY' ? '👴 Người cao tuổi' : 'Hành khách thường'}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          u.discountStatus === 'APPROVED' ? 'active' : 'inactive'
                        }`}
                        style={{
                          backgroundColor:
                            u.discountStatus === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : u.discountStatus === 'PENDING'
                              ? 'rgba(251, 191, 36, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color:
                            u.discountStatus === 'APPROVED'
                              ? '#34d399'
                              : u.discountStatus === 'PENDING'
                              ? '#fbbf24'
                              : 'rgba(255, 255, 255, 0.5)',
                          borderColor:
                            u.discountStatus === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.3)'
                              : u.discountStatus === 'PENDING'
                              ? 'rgba(251, 191, 36, 0.3)'
                              : 'rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {u.discountStatus === 'APPROVED' ? 'Đã duyệt' : u.discountStatus === 'PENDING' ? 'Chờ xét duyệt' : u.discountStatus === 'REJECTED' ? 'Bị từ chối' : 'Chưa đăng ký'}
                      </span>
                    </td>
                    <td>
                      {isStudentOrElderly && u.discountStatus === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleApproveDiscount(u.id, 'APPROVED')}
                            className="primary-button"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              borderRadius: '9999px',
                            }}
                          >
                            ✓ Duyệt
                          </button>
                          <button
                            onClick={() => handleApproveDiscount(u.id, 'REJECTED')}
                            className="action-button delete"
                            style={{
                              padding: '5px 12px',
                              fontSize: '12px',
                              borderRadius: '9999px',
                            }}
                          >
                            ✕ Từ chối
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px' }}>Không có yêu cầu chờ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
