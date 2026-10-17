import { useEffect, useRef, type RefObject } from 'react';
import { createScope, type Scope } from 'animejs';
import { useReducedMotion } from './useReducedMotion';
export function useAnimeScope(
  root: RefObject<HTMLElement | null>,
  setup: (scope: Scope) => void,
  { mobile = false }: { mobile?: boolean } = {}
) {
  const reduced = useReducedMotion();
  const scope = useRef<Scope | null>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  useEffect(() => {
    // Content reveals stay desktop-only; individual motion demos can opt into mobile.
    if (reduced || !root.current || (!mobile && window.matchMedia('(max-width: 900px)').matches))
      return;
    const current = createScope({ root });
    scope.current = current;
    current.add(() => setupRef.current(current));
    return () => {
      current.revert();
      scope.current = null;
    };
  }, [root, reduced, mobile]);
  return scope;
}
