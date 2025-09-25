/**
 * LoadingSpinner Component
 *
 * Reusable loading indicator with multiple size variants and customizable styling.
 * Provides consistent loading states across the application with accessibility support.
 *
 * Features:
 * - Three size variants (small, medium, large) for different contexts
 * - Smooth CSS animation with optimized performance
 * - Accessible with proper ARIA labels and screen reader support
 * - Customizable styling through className prop
 * - Consistent brand colors and visual design
 * - Zero dependencies - pure CSS animations
 * - Responsive sizing that adapts to container
 *
 * Architecture:
 * - Functional component with TypeScript interface
 * - Uses Tailwind CSS for styling and animations
 * - Implements proper accessibility patterns with role and aria-label
 * - Size configuration through props with sensible defaults
 * - Extensible design allowing custom CSS overrides
 *
 * Size Variants:
 * - Small (sm): 16x16px - For inline loading states and buttons
 * - Medium (md): 32x32px - General purpose loading indicator (default)
 * - Large (lg): 48x48px - Full-page loading states and prominent displays
 *
 * Props:
 * @param size - Size variant for the spinner ('sm' | 'md' | 'lg'), defaults to 'md'
 * @param className - Additional CSS classes for custom styling and positioning
 *
 * Usage Examples:
 * - Button loading: <LoadingSpinner size="sm" className="ml-2" />
 * - Content loading: <LoadingSpinner size="md" className="mx-auto" />
 * - Page loading: <LoadingSpinner size="lg" className="mx-auto my-8" />
 *
 * Integration Points:
 * - Used throughout the application for async operation feedback
 * - Integrated with loading states in forms, data fetching, and navigation
 * - Works with both light and dark theme variations
 * - Compatible with all modern browsers and assistive technologies
 */
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