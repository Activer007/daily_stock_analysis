import type React from 'react';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Drawer } from '../common/Drawer';
import { SidebarNav } from './SidebarNav';
import { ShellHeader } from './ShellHeader';
import { cn } from '../../utils/cn';

type ShellProps = {
  children?: React.ReactNode;
};

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ShellHeader
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        onOpenMobileNav={() => setMobileOpen(true)}
      />

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1680px] px-4 py-4 sm:px-6 lg:px-8">
        <aside
          className={cn(
            'hidden shrink-0 overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/70 p-3 shadow-soft-card backdrop-blur-sm transition-[width] duration-200 lg:flex',
            collapsed ? 'w-[92px]' : 'w-[272px]'
          )}
          aria-label="桌面侧边导航"
        >
          <SidebarNav collapsed={collapsed} />
        </aside>

        <main className="min-w-0 flex-1 lg:pl-6">
          <div className="shell-page-frame min-h-full rounded-[1.75rem] border border-border/50 bg-card/35 shadow-soft-card backdrop-blur-[6px]">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      <Drawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="导航菜单"
        width="max-w-xs"
        zIndex={90}
        side="left"
      >
        <SidebarNav onNavigate={() => setMobileOpen(false)} />
      </Drawer>
    </div>
  );
};
