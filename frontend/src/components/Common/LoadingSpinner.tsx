import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const borderClasses = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-4'
  };

  return (
    <div
      className={`
        inline-block animate-spin rounded-full
        ${sizeClasses[size]}
        ${borderClasses[size]}
        border-blue-500 border-t-transparent
        ${className}
      `}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;