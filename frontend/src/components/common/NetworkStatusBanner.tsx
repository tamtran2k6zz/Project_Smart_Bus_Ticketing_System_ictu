import { useEffect, useState } from 'react';

type NetworkStatus = 'offline' | 'online' | null;

function getInitialOnlineState() {
  if (typeof navigator === 'undefined') {
    return true;
  }

  return navigator.onLine;
}

function NetworkStatusBanner() {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    getInitialOnlineState() ? null : 'offline',
  );

  useEffect(() => {
    let onlineTimer: number | undefined;

    const handleOffline = () => {
      setStatus('offline');
    };

    const handleOnline = () => {
      setStatus('online');

      if (onlineTimer) {
        window.clearTimeout(onlineTimer);
      }

      onlineTimer = window.setTimeout(() => {
        setStatus(null);
      }, 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);

      if (onlineTimer) {
        window.clearTimeout(onlineTimer);
      }
    };
  }, []);

  if (status === 'offline') {
    return (
      <div
        className="network-status-banner network-status-offline"
        role="status"
        aria-live="assertive"
      >
        <span className="network-status-icon">⚠️</span>

        <div>
          <strong>Mất kết nối mạng</strong>
          <span>
            Một số dữ liệu có thể chưa được cập nhật.
          </span>
        </div>
      </div>
    );
  }

  if (status === 'online') {
    return (
      <div
        className="network-status-banner network-status-online"
        role="status"
        aria-live="polite"
      >
        <span className="network-status-icon">✓</span>

        <div>
          <strong>Đã kết nối lại</strong>
          <span>Dữ liệu sẽ được cập nhật trở lại.</span>
        </div>
      </div>
    );
  }

  return null;
}

export default NetworkStatusBanner;