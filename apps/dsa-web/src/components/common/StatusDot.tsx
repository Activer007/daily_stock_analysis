import type React from 'react';
import { cn } from '../../utils/cn';

type StatusDotTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusDotProps {
  tone?: StatusDotTone;
  pulse?: boolean;
  className?: string;
}

const TONE_STYLES: Record<StatusDotTone, string> = {
  success: 'bg-success shadow-[0_0_0_3px_hsl(var(--success)/0.12)]',
  warning: 'bg-warning shadow-[0_0_0_3px_hsl(var(--warning)/0.14)]',
  danger: 'bg-danger shadow-[0_0_0_3px_hsl(var(--destructive)/0.12)]',
  info: 'bg-cyan shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]',
  neutral: 'bg-muted-text shadow-[0_0_0_3px_hsl(var(--muted-text)/0.12)]',
};

export const StatusDot: React.FC<StatusDotProps> = ({
  tone = 'neutral',
  pulse = false,
  className = '',
}) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-2.5 w-2.5 shrink-0 rounded-full',
        TONE_STYLES[tone],
        pulse ? 'animate-pulse' : '',
        className,
      )}
    />
  );
};
