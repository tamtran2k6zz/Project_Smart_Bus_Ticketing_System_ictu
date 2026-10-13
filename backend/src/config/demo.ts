import { isProduction, readEnv } from '../config/env';
export function localDemoEnabled() {
  return (
    readEnv('LOCAL_DEMO_ENABLED') === 'true' &&
    !isProduction() &&
    readEnv('VERCEL_ENV') !== 'production'
  );
}
