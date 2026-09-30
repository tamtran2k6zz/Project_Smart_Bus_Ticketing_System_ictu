import React, { useState } from 'react';
import { WifiOff, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useNetworkStatus } from '../../contexts/NetworkStatusContext';

export const OfflineBanner = () => {
  const {
    isOnline,
    reconnectedToastVisible,
    lastOfflineAt,
    checkConnection,
    dismissReconnectedToast,
  } = useNetworkStatus();
  const [isChecking, setIsChecking] = useState(false);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await checkConnection();
    } finally {
      setIsChecking(false);
    }
  };

  // Reconnected Toast (temporary green banner when connection is restored)
  if (isOnline && reconnectedToastVisible) {
    return (
      <div
        data-testid="reconnected-banner"
        role="status"
        aria-live="polite"
        className="bg-emerald-600 text-white shadow-md transition-all animate-in slide-in-from-top duration-300 relative z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
            </div>
            <p className="font-medium">
              <strong className="font-semibold">Đã khôi phục kết nối Internet!</strong>{' '}
              <span className="hidden sm:inline">Dữ liệu vé và giao dịch đang được tự động đồng bộ lại.</span>
            </p>
          </div>
          <button
            type="button"
            data-testid="btn-dismiss-reconnected"
            onClick={dismissReconnectedToast}
            aria-label="Đóng thông báo khôi phục mạng"
            className="p-1 rounded-md text-emerald-100 hover:text-white hover:bg-emerald-700/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Offline Warning Banner
  if (!isOnline) {
    return (
      <div
        data-testid="offline-banner"
        role="alert"
        aria-live="assertive"
        className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white shadow-lg border-b border-rose-800 transition-all animate-in slide-in-from-top duration-300 relative z-50"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <WifiOff className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base flex items-center gap-1.5">
                  Mất kết nối Internet
                </span>
                <span className="text-[11px] font-semibold bg-white text-rose-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Chế độ Ngoại tuyến
                </span>
                {lastOfflineAt && (
                  <span className="text-[11px] text-rose-100 opacity-90 hidden md:inline">
                    (Từ {lastOfflineAt.toLocaleTimeString('vi-VN')})
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-100 mt-0.5 max-w-3xl leading-snug">
                Hệ thống đang hoạt động với bộ nhớ tạm (Cache). Bạn vẫn có thể xem danh sách vé, lịch trình và dữ liệu đối soát đã tải. Các cập nhật sẽ tự động đồng bộ khi có mạng trở lại.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              data-testid="btn-retry-connection"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-800 hover:bg-rose-50 shadow-sm active:scale-95 transition-all disabled:opacity-70 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Đang kiểm tra...' : 'Thử kết nối lại'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineBanner;
