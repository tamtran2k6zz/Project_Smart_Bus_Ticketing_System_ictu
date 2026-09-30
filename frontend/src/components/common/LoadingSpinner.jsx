import React from 'react';

export const LoadingSpinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-slate-400 border-t-transparent',
  };

  return (
    <div
      role="status"
      aria-label="loading"
      className={`inline-block animate-spin rounded-full ${sizeClasses[size] || sizeClasses.md} ${
        colorClasses[color] || colorClasses.primary
      } ${className}`}
    />
  );
};

export default LoadingSpinner;
