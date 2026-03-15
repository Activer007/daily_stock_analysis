import type React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'gradient';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  padding = 'md',
}) => {
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const variantStyles = {
    default: 'border border-border bg-card shadow-sm',
    bordered: 'border border-border bg-card shadow-sm',
    gradient: 'border border-primary/20 bg-card shadow-sm ring-1 ring-primary/10',
  };

  return (
    <div className={cn('rounded-2xl', variantStyles[variant], hoverable && 'transition-all hover:-translate-y-0.5 hover:shadow-md', paddingStyles[padding], className)}>
      {(title || subtitle) && (
        <div className="mb-3">
          {subtitle ? <span className="label-uppercase">{subtitle}</span> : null}
          {title ? <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3> : null}
        </div>
      )}
      {children}
    </div>
  );
};
