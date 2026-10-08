import type { RefObject } from 'react';
import { createTimeline } from 'animejs';
import { useAnimeScope } from '@/hooks/useAnimeScope';
export function useHeroAnimation(root: RefObject<HTMLElement | null>) {
  return useAnimeScope(root, () => {
    createTimeline({ defaults: { duration: 500, ease: 'out(3)' } })
      .add('[data-hero-badge]', { y: [12, 0], opacity: [0, 1] }, 0)
      .add('[data-hero-title]', { y: [20, 0], opacity: [0, 1] }, 100)
      .add('[data-hero-copy]', { y: [16, 0], opacity: [0, 1] }, 200)
      .add('[data-hero-cta], [data-hero-benefits]', { y: [12, 0], opacity: [0, 1] }, 300)
      .add('[data-hero-bus]', { x: [30, 0], opacity: [0, 1], duration: 650 }, 350)
      .add('[data-hero-card]', { y: [12, 0], opacity: [0, 1], duration: 350 }, 650);
  });
}
