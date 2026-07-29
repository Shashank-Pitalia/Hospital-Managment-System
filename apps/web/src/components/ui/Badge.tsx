import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
}) => {
  return (
    <span className={`badge badge-${variant} ${dot ? 'badge-dot' : ''} ${className}`}>
      {children}
    </span>
  );
};
