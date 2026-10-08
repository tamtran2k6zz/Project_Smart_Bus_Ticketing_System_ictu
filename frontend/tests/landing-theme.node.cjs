const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, '../public/landing-theme.js'), 'utf8');
const key = 'smartbus-landing-theme';

function boot({ stored = null, dark = false, blocked = false, legacy = false } = {}) {
  const values = new Map(stored === null ? [] : [[key, stored]]);
  const mediaListeners = new Set();
  const events = new Map();
  const media = { matches: dark, addListener: fn => mediaListeners.add(fn) };
  if (!legacy) media.addEventListener = (_type, fn) => mediaListeners.add(fn);
  const root = { dataset: {}, style: {} };
  const meta = {
    setAttribute: (_name, value) => {
      meta.content = value;
    },
  };
  const window = {
    matchMedia: () => media,
    localStorage: {
      getItem: name => {
        if (blocked) throw new Error('Storage blocked');
        return values.get(name) ?? null;
      },
      setItem: (name, value) => {
        if (blocked) throw new Error('Storage blocked');
        values.set(name, value);
      },
    },
    addEventListener: (type, fn) => events.set(type, fn),
  };
  runInNewContext(source, {
    window,
    document: { documentElement: root, querySelector: () => meta },
  });
  return {
    api: window.SmartBusTheme,
    root,
    values,
    meta,
    changeSystem(value) {
      media.matches = value;
      mediaListeners.forEach(fn => fn());
    },
    storage(value, name = key) {
      events.get('storage')({ key: name, newValue: value });
    },
  };
}

test('defaults to system and follows live OS changes', () => {
  const app = boot();
  assert.equal(app.api.getSnapshot(), 'system:light');
  assert.equal(app.root.style.colorScheme, 'light');
  app.changeSystem(true);
  assert.equal(app.api.getSnapshot(), 'system:dark');
  assert.equal(app.root.dataset.theme, 'dark');
  assert.equal(app.meta.content, '#080d18');
});

test('restores a saved explicit preference instead of the OS theme', () => {
  const app = boot({ stored: 'light', dark: true });
  assert.equal(app.api.getSnapshot(), 'light:light');
  app.changeSystem(false);
  app.changeSystem(true);
  assert.equal(app.root.dataset.theme, 'light');
});

test('saves choices and resuming system mode uses the current OS setting', () => {
  const app = boot({ dark: true });
  app.api.setPreference('light');
  assert.equal(app.values.get(key), 'light');
  assert.equal(boot({ stored: app.values.get(key), dark: true }).root.dataset.theme, 'light');
  app.api.setPreference('system');
  assert.equal(app.api.getSnapshot(), 'system:dark');
  assert.equal(app.values.get(key), 'system');
});

test('works when browser storage is unavailable', () => {
  const app = boot({ blocked: true });
  app.api.setPreference('dark');
  assert.equal(app.root.dataset.theme, 'dark');
  app.api.setPreference('system');
  app.changeSystem(true);
  assert.equal(app.api.getSnapshot(), 'system:dark');
});

test('invalid stored values fall back to the OS setting', () => {
  const app = boot({ stored: 'invalid', dark: true });
  assert.equal(app.api.getSnapshot(), 'system:dark');
});

test('syncs another tab and resetting storage restores system mode', () => {
  const app = boot();
  app.storage('dark');
  assert.equal(app.api.getSnapshot(), 'dark:dark');
  app.storage('light', 'unrelated-key');
  assert.equal(app.api.getSnapshot(), 'dark:dark');
  app.storage(null, null);
  assert.equal(app.api.getSnapshot(), 'system:light');
});

test('subscribers update only for effective changes and can unsubscribe', () => {
  const app = boot();
  let calls = 0;
  const unsubscribe = app.api.subscribe(() => calls++);
  app.api.setPreference('dark');
  app.changeSystem(true);
  assert.equal(calls, 1);
  unsubscribe();
  app.api.setPreference('light');
  assert.equal(calls, 1);
});

test('supports older mobile media-query listeners', () => {
  const app = boot({ legacy: true });
  app.changeSystem(true);
  assert.equal(app.api.getSnapshot(), 'system:dark');
});
