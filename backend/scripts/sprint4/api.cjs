const fs = require('node:fs');
const path = require('node:path');
const { performance, monitorEventLoopDelay } = require('node:perf_hooks');
const { applyEnvironment } = require('./config.cjs');
const config = JSON.parse(process.env.SPRINT4_CHILD_CONFIG);
applyEnvironment(config, config.runDatabaseUrl);
const { dbPool } = require('../../dist/config/database');
const { connectRedis, closeRedis } = require('../../dist/config/redis');
const app = require('../../dist/app').default;
const fixtures = require('./fixtures.cjs');
let server, interval;
const metrics = [];
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
let previousCpu = process.cpuUsage(),
  previousAt = performance.now();

async function main() {
  await connectRedis();
  const data = await fixtures(dbPool, config.secret);
  server = app.listen(0, '127.0.0.1', () =>
    process.send({ type: 'ready', url: 'http://127.0.0.1:' + server.address().port, data })
  );
  eventLoop.enable();
  interval = setInterval(() => {
    const now = performance.now(),
      cpu = process.cpuUsage(),
      deltaUs = cpu.user + cpu.system - previousCpu.user - previousCpu.system;
    metrics.push({
      at: new Date().toISOString(),
      cpuPercentOneCore: (deltaUs / ((now - previousAt) * 1000)) * 100,
      ...process.memoryUsage(),
      poolTotal: dbPool.totalCount,
      poolIdle: dbPool.idleCount,
      poolWaiting: dbPool.waitingCount,
      eventLoopP95Ms: eventLoop.percentile(95) / 1e6,
    });
    previousCpu = cpu;
    previousAt = now;
    eventLoop.reset();
  }, 1000);
}
process.on('message', async message => {
  if (message?.type !== 'stop') return;
  clearInterval(interval);
  eventLoop.disable();
  try {
    if (server) await new Promise(resolve => server.close(resolve));
    // Audit logging completes after the response; let queued writes drain before closing the pool.
    await dbPool.query('SELECT 1');
    await dbPool.end();
    await closeRedis();
    fs.writeFileSync(
      path.join(config.runDir, 'server-metrics.json'),
      JSON.stringify(metrics, null, 2)
    );
    process.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    process.disconnect();
  }
});
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
  process.disconnect?.();
});
