import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = '#2563eb', text }) => {
  const sizePx = size === 'sm' ? 18 : size === 'lg' ? 40 : 26;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <div
        style={{
          width: sizePx,
          height: sizePx,
          border: `3px solid rgba(0, 0, 0, 0.1)`,
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'smartbus-spin 0.8s linear infinite',
        }}
      />
      {text && <span style={{ fontSize: 13, color: '#64748b' }}>{text}</span>}
      <style>{`
        @keyframes smartbus-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
