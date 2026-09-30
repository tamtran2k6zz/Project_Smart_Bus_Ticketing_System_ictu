import React from 'react';
import { Ticket, QrCode, Clock, MapPin, Calendar } from 'lucide-react';
import Button from '../../components/common/Button';

export const TicketsPage = () => {
  const tickets = [
    {
      id: 'TCK-2026-001',
      code: 'ICTU-BUS01-A12',
      route: 'Tuyến số 01: Cổng ICTU ⇄ Bến xe Thái Nguyên',
      from: 'Điểm dừng ICTU',
      to: 'Bến xe Trung tâm Thái Nguyên',
      date: '29/09/2026',
      time: '07:30',
      seat: 'A12',
      busPlate: '20B-123.45',
      price: '15.000 đ',
      status: 'VALID',
    },
    {
      id: 'TCK-2026-002',
      code: 'ICTU-BUS03-B04',
      route: 'Tuyến số 03: ICTU ⇄ ĐH Nông Lâm Thái Nguyên',
      from: 'Điểm dừng ICTU',
      to: 'Cổng ĐH Nông Lâm',
      date: '30/09/2026',
      time: '17:15',
      seat: 'B04',
      busPlate: '20B-987.65',
      price: '10.000 đ',
      status: 'VALID',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-blue-600" />
            Vé xe của tôi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách vé điện tử đã đặt. Xuất trình mã QR khi lên xe buýt.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {tickets.map(t => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row"
          >
            {/* Left Ticket Info */}
            <div className="flex-1 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Vé hợp lệ • Sẵn sàng sử dụng
                </span>
                <span className="font-mono text-xs text-slate-500 font-semibold">{t.code}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{t.route}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t.from}</span>
                  <span>→</span>
                  <span>{t.to}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Ngày đi
                  </span>
                  <span className="font-semibold text-slate-800">{t.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Giờ chạy
                  </span>
                  <span className="font-semibold text-slate-800">{t.time}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Số ghế</span>
                  <span className="font-bold text-blue-600 text-sm">{t.seat}</span>
                </div>
              </div>
            </div>

            {/* Right QR Stub */}
            <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center w-full md:w-56 shrink-0">
              <div className="w-24 h-24 bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center mb-2">
                <QrCode className="w-20 h-20 text-slate-800" />
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Quét mã khi lên xe</span>
              <span className="text-sm font-bold text-blue-600 mt-1">{t.price}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TicketsPage;
