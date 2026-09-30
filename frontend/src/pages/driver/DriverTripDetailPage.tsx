import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Passenger {
  id: number;
  name: string;
  seat: string;
}

const trip = {
  route: 'Hà Nội → Thái Nguyên',
  date: '30/09/2026',
  departureTime: '08:00',
};

const passengers: Passenger[] = [
  { id: 1, name: 'Nguyễn Văn An', seat: 'A01' },
  { id: 2, name: 'Trần Thị Bình', seat: 'A02' },
  { id: 3, name: 'Lê Văn Cường', seat: 'A03' },
  { id: 4, name: 'Phạm Thị Dung', seat: 'B01' },
  { id: 5, name: 'Hoàng Văn Đức', seat: 'B02' },
  { id: 6, name: 'Vũ Thị Hà', seat: 'B03' },
];

const DriverTripDetailPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px',
        background: '#f5f7fb',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Chi tiết lịch chạy</h1>
          <p style={{ marginTop: '8px', color: '#666' }}>
            Thông tin chuyến xe và danh sách hành khách
          </p>
        </div>

        <button
          onClick={() => navigate('/driver/portal')}
          style={{
            padding: '10px 16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          ← Về cổng tài xế
        </button>
      </div>

      {/* Thông tin chuyến */}
      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Thông tin chuyến xe</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          <div>
            <p style={{ color: '#777', marginBottom: '6px' }}>Tuyến xe</p>
            <strong>{trip.route}</strong>
          </div>

          <div>
            <p style={{ color: '#777', marginBottom: '6px' }}>Ngày chạy</p>
            <strong>{trip.date}</strong>
          </div>

          <div>
            <p style={{ color: '#777', marginBottom: '6px' }}>
              Giờ xuất bến
            </p>
            <strong>{trip.departureTime}</strong>
          </div>

          <div>
            <p style={{ color: '#777', marginBottom: '6px' }}>
              Số hành khách
            </p>
            <strong>{passengers.length} khách</strong>
          </div>
        </div>
      </section>

      {/* Danh sách hành khách */}
      <section
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Danh sách hành khách</h2>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '16px',
            }}
          >
            <thead>
              <tr>
                <th style={tableHeaderStyle}>STT</th>
                <th style={tableHeaderStyle}>Họ và tên</th>
                <th style={tableHeaderStyle}>Vị trí ghế</th>
              </tr>
            </thead>

            <tbody>
              {passengers.map((passenger) => (
                <tr key={passenger.id}>
                  <td style={tableCellStyle}>{passenger.id}</td>
                  <td style={tableCellStyle}>{passenger.name}</td>
                  <td style={tableCellStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#eef4ff',
                        fontWeight: 600,
                      }}
                    >
                      {passenger.seat}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '14px',
  borderBottom: '2px solid #eee',
};

const tableCellStyle: React.CSSProperties = {
  padding: '14px',
  borderBottom: '1px solid #eee',
};

export default DriverTripDetailPage;