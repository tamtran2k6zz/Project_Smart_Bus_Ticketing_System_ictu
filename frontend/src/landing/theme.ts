import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

declare global {
  interface Window {
    SmartBusTheme: {
      getSnapshot: () => string;
      subscribe: (listener: () => void) => () => void;
      setPreference: (preference: ThemePreference) => void;
    };
  }
}

export function useTheme() {
  const snapshot = useSyncExternalStore(
    window.SmartBusTheme.subscribe,
    window.SmartBusTheme.getSnapshot,
    () => 'system:light'
  );
  const [preference, resolved] = snapshot.split(':') as [ThemePreference, ResolvedTheme];
  return { preference, resolved, setPreference: window.SmartBusTheme.setPreference };
}
