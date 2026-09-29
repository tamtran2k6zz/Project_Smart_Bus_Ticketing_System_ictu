import React, { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../api/client';

export const OperationsView: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form báo cáo sự cố tài xế
  const [incidentDescription, setIncidentDescription] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [incidentType, setIncidentType] = useState('TRAFFIC_JAM');
  const [incidentMsg, setIncidentMsg] = useState<string | null>(null);

  // Form gửi phản ánh
  const [ratingStars, setRatingStars] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, fbRes] = await Promise.all([
        fetch(getApiUrl('/api/v1/operations/incidents')),
        fetch(getApiUrl('/api/v1/operations/feedbacks')),
      ]);
      const incJson = await incRes.json();
      const fbJson = await fbRes.json();
      setIncidents(Array.isArray(incJson?.data) ? incJson.data : Array.isArray(incJson) ? incJson : []);
      setFeedbacks(Array.isArray(fbJson?.data) ? fbJson.data : Array.isArray(fbJson) ? fbJson : []);
    } catch (err) {
      console.error(err);
      setIncidents([]);
      setFeedbacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gửi báo cáo sự cố đường sá (US 11 - Tài xế)
  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDescription.trim()) {
      alert('Vui lòng nhập chi tiết sự cố!');
      return;
    }

    try {
      const token = localStorage.getItem('smartbus_access_token');
      const dashRes = await fetch(getApiUrl('/api/v1/operations/dashboard/summary'));
      const dashJson = await dashRes.json();
      const firstTripId = dashJson.tripOccupancy?.[0]?.id || 'trip-1';

      const res = await fetch(getApiUrl('/api/v1/operations/incidents'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId: firstTripId,
          incidentType,
          description: incidentDescription.trim(),
          delayMinutes: Number(delayMinutes),
          severity: 'MEDIUM',
        }),
      });

      if (!res.ok) throw new Error('Báo cáo sự cố thất bại vào MySQL!');

      setIncidentMsg('✅ Đã gửi báo cáo sự cố thành công vào CSDL MySQL!');
      setIncidentDescription('');
      await fetchData();
      setTimeout(() => setIncidentMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Gửi đánh giá phản ánh (US 24 - Hành khách)
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) {
      alert('Vui lòng nhập nội dung đánh giá!');
      return;
    }

    try {
      const token = localStorage.getItem('smartbus_access_token');
      const userStr = localStorage.getItem('smartbus_user');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      const dashRes = await fetch(getApiUrl('/api/v1/operations/dashboard/summary'));
      const dashJson = await dashRes.json();
      const firstTripId = dashJson.tripOccupancy?.[0]?.id || 'trip-1';

      const res = await fetch(getApiUrl('/api/v1/operations/feedbacks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          tripId: firstTripId,
          userId: currentUser?.id,
          ratingStars: Number(ratingStars),
          criteria: 'ThaiDoVaDungGio',
          content: feedbackContent.trim(),
        }),
      });

      if (!res.ok) throw new Error('Gửi đánh giá thất bại vào MySQL!');

      setFeedbackMsg('⭐ Cảm ơn bạn đã gửi đánh giá vào hệ thống!');
      setFeedbackContent('');
      await fetchData();
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Phân hệ Báo cáo sự cố đường sá (US 11) */}
      <div className="liquid-glass" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '26px', margin: '0 0 6px' }}>
          ⚠️ Báo cáo Sự cố đường sá & Trễ chuyến (US 11 - Tài xế)
        </h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', marginBottom: '22px' }}>
          Tài xế lập báo cáo ùn tắc, hư xe hoặc thời tiết để tự động cập nhật thời gian thực đến hành khách trên ứng dụng.
        </p>

        {incidentMsg && (
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
            {incidentMsg}
          </div>
        )}

        <form onSubmit={handleReportIncident} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
              Loại sự cố:
            </label>
            <select
              className="filter-select"
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', height: '44px' }}
            >
              <option value="TRAFFIC_JAM">Ùn tắc / Kẹt xe giờ cao điểm</option>
              <option value="BREAKDOWN">Sự cố kỹ thuật / Hư xe</option>
              <option value="BAD_WEATHER">Thời tiết xấu / Mưa bão</option>
              <option value="ACCIDENT">Va chạm giao thông trên tuyến</option>
              <option value="OTHER">Sự cố khác</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
              Dự kiến trễ (phút):
            </label>
            <input
              type="number"
              min="0"
              max="120"
              className="search-input"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
              style={{ width: '100%', borderRadius: '12px', height: '44px' }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
              Mô tả chi tiết:
            </label>
            <input
              type="text"
              className="search-input"
              placeholder="VD: Đoạn đường qua ngã tư đèn đỏ ùn ứ dài khoảng 1km..."
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              style={{ width: '100%', borderRadius: '12px', height: '44px' }}
            />
          </div>

          <div>
            <button
              type="submit"
              className="primary-button"
              style={{
                padding: '11px 24px',
                borderRadius: '9999px',
                background: 'rgba(245, 158, 11, 0.2)',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.25)',
                color: '#fbbf24',
              }}
            >
              ⚠️ Gửi báo cáo sự cố (Lưu MySQL)
            </button>
          </div>
        </form>

        <h4 style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
          Danh sách sự cố vừa ghi nhận:
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(Array.isArray(incidents) ? incidents : []).map((inc) => (
            <div
              key={inc.id}
              className="liquid-glass"
              style={{
                padding: '14px 18px',
                borderRadius: '14px',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                background: 'rgba(245, 158, 11, 0.05)',
                fontSize: '13.5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#fbbf24', flexWrap: 'wrap', gap: '8px' }}>
                <span>[{inc.incidentType}] Tuyến: {inc.trip?.route?.name || 'Tuyến buýt'} (Xe {inc.trip?.bus?.plateNumber || '--'})</span>
                <span style={{ color: '#f87171' }}>Trễ: +{inc.delayMinutes} phút</span>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.85)', marginTop: '6px' }}>{inc.description}</div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '6px' }}>
                Báo cáo bởi tài xế: {inc.driver?.fullName || 'Tài xế'} • {new Date(inc.reportedAt).toLocaleString('vi-VN')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phân hệ Gửi phản ánh chất lượng (US 24) */}
      <div className="liquid-glass" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '26px', margin: '0 0 6px' }}>
          💬 Đánh giá & Phản ánh chất lượng chuyến đi (US 24 - Hành khách)
        </h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(255, 255, 255, 0.55)', marginBottom: '22px' }}>
          Hành khách gửi chấm điểm số sao và phản ánh để nhà xe kiểm soát chất lượng vận hành trên từng chuyến.
        </p>

        {feedbackMsg && (
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
            {feedbackMsg}
          </div>
        )}

        <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
              Đánh giá số sao:
            </label>
            <select
              className="filter-select"
              value={ratingStars}
              onChange={(e) => setRatingStars(Number(e.target.value))}
              style={{ width: '100%', borderRadius: '12px', height: '44px' }}
            >
              <option value="5">⭐⭐⭐⭐⭐ 5 Sao (Rất hài lòng)</option>
              <option value="4">⭐⭐⭐⭐ 4 Sao (Hài lòng)</option>
              <option value="3">⭐⭐⭐ 3 Sao (Bình thường)</option>
              <option value="2">⭐⭐ 2 Sao (Chưa tốt)</option>
              <option value="1">⭐ 1 Sao (Rất thất vọng)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.75)', marginBottom: '8px' }}>
              Nội dung nhận xét:
            </label>
            <textarea
              rows={3}
              className="search-input"
              placeholder="VD: Xe chạy êm, máy lạnh mát mẻ, nhân viên thân thiện..."
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              style={{
                width: '100%',
                borderRadius: '16px',
                padding: '12px 16px',
                height: 'auto',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            style={{ alignSelf: 'flex-start', padding: '11px 26px' }}
          >
            Gửi đánh giá (Lưu MySQL) →
          </button>
        </form>

        <h4 style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
          Ý kiến phản hồi từ khách hàng:
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(Array.isArray(feedbacks) ? feedbacks : []).map((fb) => (
            <div
              key={fb.id}
              className="liquid-glass"
              style={{
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '13.5px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#ffffff' }}>{fb.user?.fullName || 'Hành khách'}</span>
                <span style={{ color: '#fbbf24', fontSize: '16px', textShadow: '0 0 10px rgba(251, 191, 36, 0.5)' }}>
                  {'★'.repeat(fb.ratingStars)}
                </span>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.75)', marginTop: '6px' }}>{fb.content}</div>
              {fb.responseFromStaff && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 14px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    borderRadius: '8px',
                    color: '#38bdf8',
                    fontSize: '12.5px',
                  }}
                >
                  <strong>Phản hồi từ nhà xe:</strong> {fb.responseFromStaff}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OperationsView;
