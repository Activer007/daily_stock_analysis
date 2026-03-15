import type React from 'react';
import { Card, Badge } from '../common';
import { getCategoryDescriptionZh, getCategoryTitleZh } from '../../utils/systemConfigI18n';
import type { SystemConfigCategorySchema, SystemConfigItem } from '../../types/systemConfig';
import { cn } from '../../utils/cn';

interface SettingsCategoryNavProps {
  categories: SystemConfigCategorySchema[];
  itemsByCategory: Record<string, SystemConfigItem[]>;
  activeCategory: string;
  onSelect: (category: string) => void;
}

export const SettingsCategoryNav: React.FC<SettingsCategoryNavProps> = ({
  categories,
  itemsByCategory,
  activeCategory,
  onSelect,
}) => {
  return (
    <Card className="h-full" padding="sm" variant="bordered">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-text">配置分类</p>
        <p className="mt-1 text-sm text-secondary-text">按模块整理系统设置与认证能力。</p>
      </div>

      <div className="space-y-2">
        {categories.map((category) => {
          const isActive = category.category === activeCategory;
          const count = (itemsByCategory[category.category] || []).length;
          const title = getCategoryTitleZh(category.category, category.title);
          const description = getCategoryDescriptionZh(category.category, category.description);

          return (
            <button
              key={category.category}
              type="button"
              className={cn(
                'w-full rounded-xl border px-3 py-3 text-left transition-all',
                isActive
                  ? 'border-cyan/35 bg-cyan/9 shadow-soft-card'
                  : 'border-border/50 bg-card/45 hover:border-cyan/18 hover:bg-hover/80',
              )}
              onClick={() => onSelect(category.category)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', isActive ? 'text-foreground' : 'text-secondary-text')}>
                    {title}
                  </p>
                  {description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-text">{description}</p>
                  ) : null}
                </div>
                <Badge variant={isActive ? 'info' : 'default'} size="sm">
                  {count}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
