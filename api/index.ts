let app;
try {
  // @ts-ignore
  app = require('../backend/dist/app').default || require('../backend/dist/app');
} catch {
  // @ts-ignore
  app = require('../backend/src/app').default || require('../backend/src/app');
}

export const config = { maxDuration: 30 };

export default app;
