import type React from 'react';
import { useId } from 'react';
import { cn } from '../../utils/cn';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  containerClassName?: string;
}

/**
 * 定制化的大尺寸勾选框组件
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  id,
  className = '',
  containerClassName = '',
  ...props
}) => {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;

  return (
    <div className={cn('flex items-center gap-3', containerClassName)}>
      <div className="relative flex items-center justify-center">
        <input
          id={checkboxId}
          type="checkbox"
          className={cn(
            'h-4 w-4 cursor-pointer appearance-none rounded border border-white/20 bg-white/5 text-cyan transition-all',
            'checked:border-cyan checked:bg-cyan focus:outline-none focus:ring-4 focus:ring-cyan/15',
            'transform scale-150', // 放大 1.5 倍
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {/* 自定义勾选图标（SVG），确保在大尺寸下依然清晰 */}
        <svg
          className="pointer-events-none absolute h-3 w-3 text-black opacity-0 transition-opacity peer-checked:opacity-100"
          style={{ 
            // 这里的 scale 抵消掉父级的缩放效果，保持图标比例
            transform: 'scale(1.2)' 
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.5"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      {label && (
        <label
          htmlFor={checkboxId}
          className="cursor-pointer select-none text-sm font-medium text-white"
        >
          {label}
        </label>
      )}
    </div>
  );
};
