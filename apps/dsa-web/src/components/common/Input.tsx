import type React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input: React.FC<InputProps> = ({ className = '', label, error, hint, ...props }) => {
  return (
    <div className="w-full space-y-2">
      {label ? <label className="text-sm font-medium text-foreground">{label}</label> : null}
      <input
        className={cn(
          'flex h-10 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground shadow-sm transition-all',
          'placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10',
          'disabled:cursor-not-allowed disabled:opacity-60',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/10',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
};

export default Input;
