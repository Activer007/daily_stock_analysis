import type React from 'react';
import { BarChart3, BriefcaseBusiness, Home, LogOut, MessageSquareQuote, Settings2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAgentChatStore } from '../../stores/agentChatStore';
import { cn } from '../../utils/cn';

type SidebarNavProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

type NavItem = {
  key: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: 'completion';
};

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: '首页', to: '/', icon: Home, exact: true },
  { key: 'chat', label: '问股', to: '/chat', icon: MessageSquareQuote, badge: 'completion' },
  { key: 'portfolio', label: '持仓', to: '/portfolio', icon: BriefcaseBusiness },
  { key: 'backtest', label: '回测', to: '/backtest', icon: BarChart3 },
  { key: 'settings', label: '设置', to: '/settings', icon: Settings2 },
];

export const SidebarNav: React.FC<SidebarNavProps> = ({ collapsed = false, onNavigate }) => {
  const { authEnabled, logout } = useAuth();
  const completionBadge = useAgentChatStore((state) => state.completionBadge);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-gradient text-[hsl(var(--primary-foreground))] shadow-[0_12px_28px_rgba(0,212,255,0.24)]">
          <BarChart3 className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Daily Stock Analysis</p>
            <p className="mt-0.5 text-xs text-secondary-text">Terminal Workspace</p>
          </div>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5" aria-label="主导航">
        {NAV_ITEMS.map(({ key, label, to, icon: Icon, exact, badge }) => (
          <NavLink
            key={key}
            to={to}
            end={exact}
            onClick={onNavigate}
            aria-label={label}
            className={({ isActive }) =>
              cn(
                'group relative flex h-11 items-center gap-3 rounded-2xl border px-3 text-sm transition-all',
                collapsed ? 'justify-center px-2' : '',
                isActive
                  ? 'border-cyan/25 bg-cyan/10 text-foreground shadow-[0_12px_28px_rgba(0,212,255,0.12)]'
                  : 'border-transparent text-secondary-text hover:border-border/70 hover:bg-hover hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-cyan' : 'text-current')} />
                {!collapsed ? <span className="truncate">{label}</span> : null}
                {badge === 'completion' && completionBadge ? (
                  <span
                    data-testid="chat-completion-badge"
                    className={cn(
                      'absolute right-3 h-2.5 w-2.5 rounded-full border-2 border-background bg-cyan',
                      collapsed ? 'right-2 top-2' : ''
                    )}
                    aria-label="问股有新消息"
                  />
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {authEnabled ? (
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void logout();
          }}
          className={cn(
            'mt-5 flex h-11 items-center gap-3 rounded-2xl border border-transparent px-3 text-sm text-secondary-text transition-colors hover:border-border/70 hover:bg-hover hover:text-foreground',
            collapsed ? 'justify-center px-2' : ''
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed ? <span>退出登录</span> : null}
        </button>
      ) : null}
    </div>
  );
};
