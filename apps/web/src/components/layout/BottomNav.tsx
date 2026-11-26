import { BarChart3, FileText, Search, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: 'notes', label: '笔记', icon: FileText, path: '/app', active: location.pathname === '/app' },
    {
      key: 'search',
      label: '搜索',
      icon: Search,
      path: '/app?focus=search',
      active: location.pathname === '/app' && location.search.includes('focus=search'),
    },
    { key: 'stats', label: '统计', icon: BarChart3, path: '/app/stats', active: location.pathname === '/app/stats' },
    {
      key: 'settings',
      label: '设置',
      icon: Settings,
      path: '/app/settings',
      active: location.pathname === '/app/settings',
    },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/90 backdrop-blur-xl safe-bottom lg:hidden">
      <div className="grid grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => navigate(item.path)}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition',
                item.active ? 'text-primary' : 'text-faint hover:text-muted',
              )}
            >
              <Icon size={19} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
