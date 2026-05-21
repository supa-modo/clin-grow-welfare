import React from 'react';
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'brand' | 'secondary' | 'white' | 'gray';
}

const SIZE = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, variant = 'brand' }) => (
  <div
    className={clsx(
      'rounded-full border-b-2',
      variant === 'brand' && 'border-brand-600',
      variant === 'secondary' && 'border-secondary-600',
      variant === 'white' && 'border-white',
      variant === 'gray' && 'border-gray-600',
      SIZE[size],
      className,
    )}
    style={{ animation: 'spin 0.9s linear infinite' }}
  />
);

export default Spinner;
