export const appConfig = {
  demo: import.meta.env.VITE_APP_MODE === 'demo',
  quickLogin: import.meta.env.DEV || import.meta.env.VITE_ENABLE_QUICK_LOGIN === 'true',
  apiUrl: import.meta.env.VITE_API_BASE_URL || '/api/smartbus/v1',
  timezone: 'Asia/Ho_Chi_Minh',
  demoStorageKey: 'smartbus.demo.v1',
};
