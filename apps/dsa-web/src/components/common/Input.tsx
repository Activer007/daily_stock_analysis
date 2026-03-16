import type React from 'react';
import { useId, useState } from 'react';
import { Lock, Key } from 'lucide-react';
import { cn } from '../../utils/cn';
import { EyeToggleIcon } from './EyeToggleIcon';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  trailingAction?: React.ReactNode;
  /** 启用内置的密码显隐切换功能 */
  allowTogglePassword?: boolean;
  /** 左侧装饰图标类型 */
  iconType?: 'password' | 'key' | 'none';
}

export const Input = ({ 
  label, 
  hint, 
  error, 
  className = '', 
  id, 
  trailingAction, 
  allowTogglePassword,
  iconType = 'none',
  ...props 
}: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? props.name ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [props['aria-describedby'], errorId ?? hintId].filter(Boolean).join(' ') || undefined;
  const ariaInvalid = props['aria-invalid'] ?? (error ? true : undefined);

  // 内部管理密码显隐状态
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  const isPasswordInput = props.type === 'password';
  const effectiveType = isPasswordInput && allowTogglePassword && isPasswordVisible ? 'text' : props.type;

  // 根据 iconType 选择图标
  const renderLeadingIcon = () => {
    if (iconType === 'password') {
      return <Lock className="h-4 w-4 text-muted-text/70" />;
    }
    if (iconType === 'key') {
      return <Key className="h-4 w-4 text-muted-text/70" />;
    }
    return null;
  };

  const leadingIcon = renderLeadingIcon();

  const defaultTrailingAction = isPasswordInput && allowTogglePassword ? (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2',
        'hover:border-warning/40 hover:text-warning hover:shadow-[0_0_10px_rgba(255,170,0,0.15)]',
        isPasswordVisible
          ? 'border-warning/40 bg-warning/15 text-warning shadow-[0_0_10px_rgba(255,170,0,0.15)]'
          : 'border-white/10 bg-white/5 text-muted-text focus:ring-cyan/30'
      )}
      onClick={() => setIsPasswordVisible((prev) => !prev)}
      aria-label={isPasswordVisible ? '隐藏内容' : '显示内容'}
      tabIndex={-1}
      title={isPasswordVisible ? '隐藏' : '显示'}
    >
      <EyeToggleIcon visible={isPasswordVisible} />
    </button>
  ) : null;

  const finalTrailingAction = trailingAction || defaultTrailingAction;

  return (
    <div className="flex flex-col">
      {label ? <label htmlFor={inputId} className="mb-2 text-sm font-medium text-white">{label}</label> : null}
      <div className="relative flex items-center">
        {leadingIcon && (
          <div className="absolute left-3.5 z-10 pointer-events-none">
            {leadingIcon}
          </div>
        )}
        <input
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
          className={cn(
            'h-11 w-full rounded-xl border border-white/10 bg-card px-4 text-sm text-foreground shadow-soft-card transition-all',
            'placeholder:text-muted-text focus:outline-none focus:ring-4 focus:ring-cyan/15 focus:border-cyan/40',
            error ? 'border-danger/30 focus:border-danger/40 focus:ring-danger/10' : 'hover:border-white/18',
            leadingIcon ? 'pl-10' : '',
            finalTrailingAction ? 'pr-12' : '',
            className,
          )}
          {...props}
          type={effectiveType}
        />
        {finalTrailingAction ? (
          <div className="absolute inset-y-0 right-2 flex items-center">
            {finalTrailingAction}
          </div>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-2 text-xs text-secondary-text">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
