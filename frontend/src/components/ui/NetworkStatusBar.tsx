import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { appConfig } from '@/configs/app.config';

export function NetworkStatusBar() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setJustReconnected(true);
      const timer = setTimeout(() => setJustReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !justReconnected) {
    return null;
  }

  if (justReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          background: '#15803d',
          color: '#ffffff',
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
        }}
      >
        <CheckCircle2 size={16} />
        <span>Đã khôi phục kết nối mạng Internet thành công. Dữ liệu đang được đồng bộ.</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        background: '#b91c1c',
        color: '#ffffff',
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <WifiOff size={18} />
        <span>
          Mất kết nối Internet! Bạn đang ở chế độ ngoại tuyến. {appConfig.demo ? 'Dữ liệu demo vẫn hoạt động bình thường trên thiết bị này.' : 'Vui lòng kiểm tra đường truyền mạng.'}
        </span>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff',
          borderRadius: 4,
          padding: '3px 10px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <RefreshCw size={12} /> Thử lại
      </button>
    </div>
  );
}
