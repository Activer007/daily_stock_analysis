import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeStyles = {
    sm: 'h-9 rounded-lg px-3 text-sm',
    md: 'h-10 rounded-lg px-4 text-sm',
    lg: 'h-11 rounded-xl px-5 text-sm',
    xl: 'h-12 rounded-xl px-6 text-sm',
  };

  const variantStyles = {
    primary: 'border border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary/90 hover:bg-primary/90',
    secondary: 'border border-border bg-card text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-input bg-background text-foreground hover:border-primary/40 hover:text-primary',
    ghost: 'border border-transparent bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
    danger: 'border border-destructive bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          处理中...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
