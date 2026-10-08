import { useEffect, useRef, type RefObject } from 'react';
import { createScope, type Scope } from 'animejs';
import { useReducedMotion } from './useReducedMotion';
export function useAnimeScope(root: RefObject<HTMLElement | null>, setup: (scope: Scope) => void) {
  const reduced = useReducedMotion();
  const scope = useRef<Scope | null>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  useEffect(() => {
    if (reduced || !root.current) return;
    const current = createScope({ root });
    scope.current = current;
    current.add(() => setupRef.current(current));
    return () => {
      current.revert();
      scope.current = null;
    };
  }, [root, reduced]);
  return scope;
}
