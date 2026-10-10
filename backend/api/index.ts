let app;
try {
  // @ts-ignore
  app = require('../dist/app').default || require('../dist/app');
} catch {
  // @ts-ignore
  app = require('../src/app').default || require('../src/app');
}

export const config = { maxDuration: 30 };

export default app;
