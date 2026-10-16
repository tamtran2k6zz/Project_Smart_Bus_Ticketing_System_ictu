import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { gzipSync } from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(
  process.env.SPRINT4_OUTPUT_DIR || path.join(root, 'test-results/sprint4-lighthouse')
);
const runs = Number(process.env.SPRINT4_LIGHTHOUSE_RUNS || 3);
if (!Number.isInteger(runs) || runs < 1 || runs > 5)
  throw new Error('Use 1–5 Lighthouse runs per page.');
const pages = ['/', '/login'];
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};
let server;
let base = process.env.SPRINT4_WEB_URL;
if (base) {
  const url = new URL(base);
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !['http:', 'https:'].includes(url.protocol)
  )
    throw new Error('Only an isolated localhost website can be audited by this script.');
} else {
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html')))
    throw new Error('Run npm run build before auditing.');
  const responses = new Map();
  server = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (pathname.startsWith('/api/')) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end('{"message":"Static performance audit; API unavailable"}');
      return;
    }
    let target = path.resolve(dist, '.' + pathname);
    if (!target.startsWith(dist + path.sep) && target !== dist) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      if (path.extname(pathname)) {
        res.writeHead(404);
        res.end();
        return;
      }
      target = path.join(dist, 'index.html');
    }
    // Match the Docker Nginx compression policy. Cache bytes, not application data.
    if (!responses.has(target)) {
      const body = fs.readFileSync(target);
      const compressible = /\.(html|js|css|json|svg)$/.test(target) && body.length >= 1024;
      responses.set(target, { body, gzip: compressible ? gzipSync(body, { level: 6 }) : null });
    }
    const cached = responses.get(target);
    const compressed = cached.gzip && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    const body = compressed ? cached.gzip : cached.body;
    res.writeHead(200, {
      'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
      'Content-Length': body.length,
      Vary: 'Accept-Encoding',
      'Cache-Control': pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
      ...(compressed ? { 'Content-Encoding': 'gzip' } : {}),
    });
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
}
const runDir = path.join(output, new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(runDir, { recursive: true });
const evidence = {
  at: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  }).trim(),
  mode: server ? 'local production build, static server, public pages only' : 'local website',
  formFactor: 'mobile',
  runs,
  results: [],
  limitations: [
    'Not proof of all authenticated screens or deployment network performance.',
    'Observed load is reported separately from LCP; performance varies with machine/network.',
  ],
};
try {
  for (const page of pages) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const prefix = path.join(runDir, (page === '/' ? 'home' : 'login') + '-' + (i + 1));
      console.log('Lighthouse mobile ' + page + ' ' + (i + 1) + '/' + runs);
      await new Promise((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            path.join(root, 'node_modules/lighthouse/cli/index.js'),
            new URL(page, base).href,
            '--only-categories=performance',
            '--chrome-flags=--headless',
            '--output=json',
            '--output=html',
            '--output-path=' + prefix,
            '--quiet',
          ],
          { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true }
        );
        child.once('error', reject);
        child.once('exit', code =>
          code === 0 ? resolve() : reject(new Error('Lighthouse exited ' + code))
        );
      });
      const report = JSON.parse(fs.readFileSync(prefix + '.report.json', 'utf8'));
      if (report.runtimeError) throw new Error(report.runtimeError.message);
      const metrics = report.audits.metrics.details.items[0];
      samples.push({
        performance: report.categories.performance.score * 100,
        lcpMs: report.audits['largest-contentful-paint'].numericValue,
        observedLoadMs: metrics.observedLoad ?? null,
        fcpMs: report.audits['first-contentful-paint'].numericValue,
        totalBlockingMs: report.audits['total-blocking-time'].numericValue,
        lighthouseVersion: report.lighthouseVersion,
        report: path.basename(prefix + '.report.html'),
      });
    }
    const median = key => {
      const values = samples
        .map(s => s[key])
        .filter(v => v !== null)
        .sort((a, b) => a - b);
      return values.length ? values[Math.floor(values.length / 2)] : null;
    };
    evidence.results.push({
      page,
      samples,
      medianPerformance: median('performance'),
      medianLcpMs: median('lcpMs'),
      medianObservedLoadMs: median('observedLoadMs'),
      passed:
        median('performance') > 85 &&
        median('observedLoadMs') !== null &&
        median('observedLoadMs') < 2000,
    });
  }
  evidence.passed = evidence.results.every(r => r.passed);
  if (!evidence.passed) process.exitCode = 1;
} catch (error) {
  evidence.passed = false;
  evidence.error = error.message;
  process.exitCode = 1;
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  console.log('Evidence: ' + runDir);
}
