import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  autoFocusSearch?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = '请选择',
  disabled = false,
  className = '',
  searchable = false,
  searchPlaceholder = '请输入关键词搜索',
  emptyText = '无选项',
  autoFocusSearch = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredOptions = !searchable || !normalizedQuery
    ? options
    : options.filter((option) => option.label.toLowerCase().includes(normalizedQuery) || option.value.toLowerCase().includes(normalizedQuery));

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current || typeof window === 'undefined') {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const dropdownWidth = rect.width;
    const left = Math.min(rect.left, Math.max(8, viewportWidth - dropdownWidth - 8));

    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: Math.max(8, left),
      width: dropdownWidth,
      zIndex: 90,
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setSearchQuery('');
    setIsOpen(false);
  };

  const dropdown = isOpen && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
        >
          {searchable ? (
            <div className="border-b border-border p-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-4 focus:ring-primary/10"
                autoFocus={autoFocusSearch}
              />
            </div>
          ) : null}
          <ul className="max-h-60 overflow-auto py-1 text-base focus:outline-none sm:text-sm" tabIndex={-1} role="listbox">
            {filteredOptions.length === 0 ? (
              <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-muted-foreground italic">{emptyText}</li>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    className="relative cursor-default select-none py-2.5 pl-10 pr-4 text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                  >
                    <span className={cn('block truncate', isSelected ? 'font-semibold' : 'font-normal')}>{option.label}</span>

                    {isSelected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={cn('flex flex-col', className)} ref={containerRef}>
      {label ? <label className="mb-2 block text-sm font-medium leading-6 text-foreground">{label}</label> : null}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            'relative w-full rounded-xl border border-input bg-background py-2.5 pl-3 pr-10 text-left text-foreground shadow-sm transition-all',
            'focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 sm:text-sm sm:leading-6',
            disabled ? 'cursor-not-allowed bg-muted opacity-50' : 'cursor-pointer',
          )}
          onClick={() => {
            if (!disabled) {
              setSearchQuery('');
              setIsOpen((previous) => !previous);
            }
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          disabled={disabled}
        >
          <span className={cn('block truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </button>
      </div>
      {dropdown}
    </div>
  );
};
