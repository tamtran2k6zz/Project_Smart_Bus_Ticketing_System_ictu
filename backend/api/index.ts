export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  const app = require('../dist/app').default || require('../dist/app');
  return app(req, res);
}
