import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NetworkStatusContext = createContext(null);

export const NetworkStatusProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [reconnectedToastVisible, setReconnectedToastVisible] = useState(false);
  const [lastOfflineAt, setLastOfflineAt] = useState(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline) {
      setReconnectedToastVisible(true);
      // Dispatch app-wide reconnected event so active pages can re-sync data
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app:network-reconnected'));
      }
      const timer = setTimeout(() => {
        setReconnectedToastVisible(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
    setLastOfflineAt(new Date());
    setReconnectedToastVisible(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Manual trigger to check connection
  const checkConnection = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
      setWasOffline(true);
      return false;
    }
    // Probe check
    try {
      if (typeof fetch !== 'undefined') {
        await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-store' });
      }
      setIsOnline(true);
      if (wasOffline) {
        handleOnline();
      }
      return true;
    } catch (_err) {
      // If probe fails and offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        handleOffline();
        return false;
      }
      return isOnline;
    }
  }, [wasOffline, handleOnline, handleOffline, isOnline]);

  const dismissReconnectedToast = useCallback(() => {
    setReconnectedToastVisible(false);
  }, []);

  const value = {
    isOnline,
    wasOffline,
    reconnectedToastVisible,
    lastOfflineAt,
    checkConnection,
    dismissReconnectedToast,
    // Testing helper to simulate network switch
    _setSimulatedOnline: status => {
      if (status) {
        handleOnline();
      } else {
        handleOffline();
      }
    },
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      wasOffline: false,
      reconnectedToastVisible: false,
      lastOfflineAt: null,
      checkConnection: async () => true,
      dismissReconnectedToast: () => {},
    };
  }
  return context;
};

export default NetworkStatusContext;
