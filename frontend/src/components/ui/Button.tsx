import type { ButtonHTMLAttributes } from 'react';
import s from './Ui.module.css';
export function Button({
  children,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button {...props} className={s.button + ' ' + s[variant] + ' ' + (props.className || '')}>
      {children}
    </button>
  );
}
