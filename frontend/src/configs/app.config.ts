export const appConfig = {
  demo: import.meta.env.VITE_APP_MODE !== 'api',
  apiUrl: import.meta.env.VITE_API_BASE_URL || '/api/smartbus/v1',
  timezone: 'Asia/Ho_Chi_Minh',
  demoStorageKey: 'smartbus.demo.v1',
};
