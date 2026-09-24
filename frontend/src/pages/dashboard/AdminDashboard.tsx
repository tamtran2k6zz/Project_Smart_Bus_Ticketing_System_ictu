import React, { useState } from 'react';
import { Navbar } from '../../components/layout/Navbar';
import { RoleCode } from '../../types/auth';

interface ManagedUser {
  id: string;
  name: string;
  emailOrPhone: string;
  role: RoleCode;
  status: 'ACTIVE' | 'SUSPENDED';
}

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([
    { id: '1', name: 'Trần Đặng Công Tâm', emailOrPhone: 'admin@smartbus.ictu.vn', role: 'ADMIN', status: 'ACTIVE' },
    { id: '2', name: 'Nguyễn Văn Quản Lý', emailOrPhone: 'manager@smartbus.ictu.vn', role: 'MANAGER', status: 'ACTIVE' },
    { id: '3', name: 'Lê Văn Tài Xế', emailOrPhone: '0987654321', role: 'DRIVER', status: 'ACTIVE' },
    { id: '4', name: 'Hoàng Thị Hành Khách', emailOrPhone: '0912345678', role: 'PASSENGER', status: 'ACTIVE' },
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  const handleRoleChange = (id: string, newRole: RoleCode) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
    setNotification(`Đã cập nhật vai trò thành ${newRole} cho người dùng #${id}`);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar />
      <main style={{ maxWidth: '1100px', margin: '32px auto', padding: '0 20px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              Quản trị Hệ thống & Phân quyền Tài khoản
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              Thực thi User Story N5-22: Phân quyền tài khoản (Admin, Quản lý, Tài xế, Hành khách)
            </p>
          </div>
          <span style={{
            background: '#dcfce7',
            color: '#15803d',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
          }}>
            RBAC Enabled
          </span>
        </div>

        {notification && (
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            fontWeight: 600,
          }}>
            ✓ {notification}
          </div>
        )}

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '14px 20px' }}>Họ và Tên</th>
                <th style={{ padding: '14px 20px' }}>Định danh (Email/SĐT)</th>
                <th style={{ padding: '14px 20px' }}>Vai trò hiện tại</th>
                <th style={{ padding: '14px 20px' }}>Trạng thái</th>
                <th style={{ padding: '14px 20px' }}>Thao tác phân quyền</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e293b' }}>{u.name}</td>
                  <td style={{ padding: '14px 20px', color: '#64748b' }}>{u.emailOrPhone}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background:
                        u.role === 'ADMIN' ? '#fee2e2' :
                        u.role === 'MANAGER' ? '#fef3c7' :
                        u.role === 'DRIVER' ? '#e0e7ff' : '#dcfce7',
                      color:
                        u.role === 'ADMIN' ? '#b91c1c' :
                        u.role === 'MANAGER' ? '#b45309' :
                        u.role === 'DRIVER' ? '#3730a3' : '#15803d',
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '13px' }}>● {u.status}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as RoleCode)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="PASSENGER">Hành khách (PASSENGER)</option>
                      <option value="DRIVER">Tài xế (DRIVER)</option>
                      <option value="MANAGER">Quản lý (MANAGER)</option>
                      <option value="ADMIN">Quản trị (ADMIN)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
