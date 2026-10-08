import { useRef, type ButtonHTMLAttributes } from 'react';
import { animate } from 'animejs';
import { useAnimeScope } from '@/hooks/useAnimeScope';
import s from './Ui.module.css';
export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const root = useRef<HTMLButtonElement>(null);
  const scope = useAnimeScope(root, self => {
    self.add('tap', () =>
      animate(root.current!, { scale: [1, 0.97, 1], duration: 180, ease: 'out(2)' })
    );
  });
  return (
    <button
      {...props}
      ref={root}
      className={s.button + ' ' + s[variant] + ' ' + (props.className || '')}
      onClick={e => {
        scope.current?.methods.tap();
        props.onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}
