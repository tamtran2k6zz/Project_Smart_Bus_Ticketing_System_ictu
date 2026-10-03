(function () {
  const storageKey = 'smartbus-landing-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listeners = new Set();
  const normalize = value => (['light', 'dark', 'system'].includes(value) ? value : 'system');
  let preference = 'system';
  let snapshot = '';

  try {
    preference = normalize(window.localStorage.getItem(storageKey));
  } catch {
    // Private browsing may disable storage; the selected theme still works.
  }

  function apply() {
    const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    const nextSnapshot = `${preference}:${resolved}`;
    if (snapshot === nextSnapshot) return;
    snapshot = nextSnapshot;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', resolved === 'dark' ? '#080d18' : '#f7fafc');
    listeners.forEach(listener => listener());
  }

  window.SmartBusTheme = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setPreference(value) {
      preference = normalize(value);
      try {
        window.localStorage.setItem(storageKey, preference);
      } catch {
        // Storage is optional, never a reason to prevent a theme change.
      }
      apply();
    },
  };

  if (media.addEventListener) media.addEventListener('change', apply);
  else media.addListener(apply);
  window.addEventListener('storage', event => {
    if (event.key === storageKey || event.key === null) {
      preference = normalize(event.newValue);
      apply();
    }
  });
  apply();
})();
