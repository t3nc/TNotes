import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastHost } from '../ui/toast';
import { useUiStore } from '../../store/ui';
import { useVaultStore } from '../../store/vault';
import { useNotesStore } from '../../store/notes';
import { useOrganizeStore } from '../../store/organize';

export function AppShell() {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const lock = useVaultStore((state) => state.lock);
  const loadNotes = useNotesStore((state) => state.load);
  const loadOrganize = useOrganizeStore((state) => state.load);

  useEffect(() => {
    loadNotes().catch((error: unknown) => {
      console.error('[tnotes] 加载笔记失败', error);
    });
    loadOrganize().catch((error: unknown) => {
      console.error('[tnotes] 加载分类失败', error);
    });
  }, [loadNotes, loadOrganize]);

  return (
    <div className="h-full w-full overflow-hidden">
      <TopBar onMenu={() => toggleSidebar(true)} onLock={lock} />
      <div className="flex h-full pt-14 pb-16 lg:pb-0">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <ToastHost />
    </div>
  );
}
