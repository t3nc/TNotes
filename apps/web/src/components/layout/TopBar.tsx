import { Lock, Menu, Search, Settings, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useFilterStore } from '../../store/filter';
import { cn } from '../../lib/cn';

export function TopBar({
  onMenu,
  onLock,
  onSearch,
}: {
  onMenu: () => void;
  onLock: () => void;
  onSearch?: (value: string) => void;
}) {
  const query = useFilterStore((state) => state.query);
  const setQuery = useFilterStore((state) => state.setQuery);
  const navigate = useNavigate();
  const location = useLocation();
  const inEditor = location.pathname.includes('/n/');

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line/70 bg-surface/80 backdrop-blur-xl safe-top">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={onMenu}
          aria-label="打开导航"
          className="rounded-xl p-2 text-muted transition hover:bg-surface2 hover:text-text lg:hidden"
        >
          <Menu size={20} />
        </button>

        {inEditor ? (
          <button
            type="button"
            onClick={() => navigate('/app')}
            aria-label="返回列表"
            className="rounded-xl px-2 py-1.5 text-[13px] font-medium text-muted transition hover:bg-surface2 hover:text-text"
          >
            返回
          </button>
        ) : null}

        <div className="flex items-center gap-2 lg:hidden">
          <span className="text-[15px] font-semibold tracking-tight text-text">TNotes</span>
        </div>

        <div className="relative hidden flex-1 items-center md:flex">
          <Search size={16} className="absolute left-3.5 text-faint" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onSearch?.(event.target.value);
            }}
            placeholder="搜索标题、正文与标签…"
            className="h-9 w-full max-w-md rounded-xl border border-line bg-surface2/50 pl-9 pr-3 text-[14px] text-text placeholder:text-faint outline-none transition focus:border-primary/50 focus:bg-surface2 focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="hidden items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success sm:inline-flex">
            <ShieldCheck size={13} />
            端到端加密
          </span>
          <button
            type="button"
            onClick={onLock}
            aria-label="锁定笔记库"
            title="锁定笔记库"
            className="rounded-xl p-2 text-muted transition hover:bg-surface2 hover:text-text"
          >
            <Lock size={18} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/app/settings')}
            aria-label="设置"
            title="设置"
            className={cn(
              'rounded-xl p-2 text-muted transition hover:bg-surface2 hover:text-text',
              location.pathname === '/app/settings' && 'text-primary',
            )}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
