import type React from 'react';
import { useRef, useCallback, useEffect } from 'react';
import type { HistoryItem } from '../../types/analysis';
import { getSentimentColor } from '../../types/analysis';
import { formatDateTime } from '../../utils/format';
import { Button, Badge } from '../common';

interface HistoryListProps {
  items: HistoryItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  selectedId?: number;  // 当前选中的历史记录 ID
  selectedIds: Set<number>;
  isDeleting?: boolean;
  onItemClick: (recordId: number) => void;  // 点击记录的回调
  onLoadMore: () => void;
  onToggleItemSelection: (recordId: number) => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
  className?: string;
}

/**
 * 历史记录列表组件 (升级版)
 * 使用新设计系统组件实现，支持批量选择和滚动加载
 */
export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  selectedId,
  selectedIds,
  isDeleting = false,
  onItemClick,
  onLoadMore,
  onToggleItemSelection,
  onToggleSelectAll,
  onDeleteSelected,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;
  const allVisibleSelected = items.length > 0 && selectedCount === items.length;
  const someVisibleSelected = selectedCount > 0 && !allVisibleSelected;

  // 使用 IntersectionObserver 检测滚动到底部
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
        const container = scrollContainerRef.current;
        if (container && container.scrollHeight > container.clientHeight) {
          onLoadMore();
        }
      }
    },
    [hasMore, isLoading, isLoadingMore, onLoadMore]
  );

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    const container = scrollContainerRef.current;
    if (!trigger || !container) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: container,
      rootMargin: '20px',
      threshold: 0.1,
    });

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const getOperationBadgeLabel = (advice?: string) => {
    const normalized = advice?.trim();
    if (!normalized) {
      return '情绪';
    }
    if (normalized.includes('减仓')) {
      return '减仓';
    }
    if (normalized.includes('卖')) {
      return '卖出';
    }
    if (normalized.includes('观望') || normalized.includes('等待')) {
      return '观望';
    }
    if (normalized.includes('买') || normalized.includes('布局')) {
      return '买入';
    }
    return normalized.split(/[，。；、\s]/)[0] || '建议';
  };

  return (
    <aside className={`glass-card overflow-hidden flex flex-col ${className}`}>
      <div ref={scrollContainerRef} className="p-4 flex-1 overflow-y-auto">
        <div className="mb-5 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-secondary-text uppercase tracking-[0.24em] flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史分析
            </h2>
            {selectedCount > 0 && (
              <Badge variant="history" size="sm" className="animate-in fade-in zoom-in duration-200">
                已选 {selectedCount}
              </Badge>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-white/6 bg-elevated/60 px-2.5 py-2">
              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  disabled={isDeleting}
                  aria-label="全选当前已加载历史记录"
                  className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-purple focus:ring-purple/40 cursor-pointer disabled:opacity-50"
                />
                <span className="text-[11px] text-secondary-text select-none">全选当前已加载记录</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={onDeleteSelected}
                disabled={selectedCount === 0 || isDeleting}
                isLoading={isDeleting}
                className="h-8 text-[11px] px-3.5"
              >
                {isDeleting ? '删除中' : '删除'}
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-cyan/10 border-t-cyan rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="mx-auto w-11 h-11 rounded-full bg-white/5 flex items-center justify-center text-muted-text/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-secondary-text">暂无历史分析记录</p>
              <p className="text-xs text-muted-text">完成首次分析后，这里会保留最近结果。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 group">
                <div className="pt-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleItemSelection(item.id)}
                    disabled={isDeleting}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-transparent text-purple focus:ring-purple/40 cursor-pointer disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onItemClick(item.id)}
                  className={`flex-1 text-left px-3 py-2 rounded-2xl transition-all duration-200 border relative overflow-hidden group/item ${
                    selectedId === item.id 
                      ? 'bg-cyan/8 border-cyan/55 shadow-soft-card'
                      : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="absolute inset-0 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none">
                    <div className="absolute inset-0 p-[1px] rounded-2xl bg-gradient-to-br from-cyan/12 via-transparent to-purple/10" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude' }} />
                  </div>
                  <div className="flex items-start gap-2.5 relative z-10">
                    {item.sentimentScore !== undefined && (
                      <div 
                        className="mt-0.5 w-1 h-9 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: getSentimentColor(item.sentimentScore),
                          boxShadow: `0 0 10px ${getSentimentColor(item.sentimentScore)}40` 
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <span className="block font-semibold text-white truncate text-[13px] leading-5 tracking-tight">
                            {item.stockName || item.stockCode}
                          </span>
                          <div className="flex items-center gap-1.5 overflow-hidden text-[10px] whitespace-nowrap">
                            <span className="rounded-full border border-cyan/45 bg-cyan/10 px-1.5 py-0.5 font-mono leading-none text-cyan">
                              {item.stockCode}
                            </span>
                          </div>
                        </div>
                        {item.sentimentScore !== undefined && (
                          <span 
                            className="mt-0.5 shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border leading-none sm:text-[11px]"
                            style={{ 
                              color: getSentimentColor(item.sentimentScore),
                              borderColor: `${getSentimentColor(item.sentimentScore)}30`,
                              backgroundColor: `${getSentimentColor(item.sentimentScore)}10`
                            }}
                          >
                            {getOperationBadgeLabel(item.operationAdvice)} {item.sentimentScore}
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] leading-none text-muted-text sm:text-[10px]">
                        {formatDateTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            ))}

            <div ref={loadMoreTriggerRef} className="h-4" />
            
            {isLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-cyan/10 border-t-cyan rounded-full animate-spin" />
              </div>
            )}

            {!hasMore && items.length > 0 && (
              <div className="text-center py-5">
                <div className="h-px bg-white/5 w-full mb-3" />
                <span className="text-[10px] text-muted-text/50 uppercase tracking-[0.2em]">已到底部</span>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
