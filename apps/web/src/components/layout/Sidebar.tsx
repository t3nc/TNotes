import { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  FileText,
  Heart,
  Pencil,
  Plus,
  Settings,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFilterStore } from '../../store/filter';
import { useNotesStore } from '../../store/notes';
import { useOrganizeStore } from '../../store/organize';
import { useUiStore } from '../../store/ui';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';

type DialogState = {
  kind: 'notebook' | 'tag';
  mode: 'create' | 'rename';
  id?: string;
  initial?: string;
} | null;

const TAG_COLORS = ['#7C6CF6', '#F0B429', '#3FB27F', '#3B82F6', '#E5484D', '#F5A524'];

export function Sidebar() {
  const navigate = useNavigate();
  const meta = useNotesStore((state) => state.meta);
  const notebooks = useOrganizeStore((state) => state.notebooks);
  const tags = useOrganizeStore((state) => state.tags);
  const addNotebook = useOrganizeStore((state) => state.addNotebook);
  const renameNotebook = useOrganizeStore((state) => state.renameNotebook);
  const removeNotebook = useOrganizeStore((state) => state.removeNotebook);
  const addTag = useOrganizeStore((state) => state.addTag);
  const renameTag = useOrganizeStore((state) => state.renameTag);
  const removeTag = useOrganizeStore((state) => state.removeTag);
  const filter = useFilterStore();
  const open = useUiStore((state) => state.sidebarOpen);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const pushToast = useUiStore((state) => state.pushToast);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState('');

  const activeCount = meta.filter((note) => !note.deletedAt).length;
  const favoriteCount = meta.filter((note) => note.favorited && !note.deletedAt).length;
  const trashCount = meta.filter((note) => note.deletedAt).length;

  const pick = (action: () => void) => {
    action();
    toggleSidebar(false);
  };

  const submitDialog = () => {
    const name = draft.trim();
    if (!dialog || !name) return;
    if (dialog.kind === 'notebook') {
      if (dialog.mode === 'create') {
        addNotebook(name).then(() => pushToast('已创建笔记本', 'success'));
      } else if (dialog.id) {
        renameNotebook(dialog.id, name).then(() => pushToast('已重命名', 'success'));
      }
    } else if (dialog.mode === 'create') {
      addTag(name, TAG_COLORS[tags.length % TAG_COLORS.length]).then(() => pushToast('已创建标签', 'success'));
    } else if (dialog.id) {
      renameTag(dialog.id, name, '#7C6CF6').then(() => pushToast('已重命名', 'success'));
    }
    setDialog(null);
    setDraft('');
  };

  const navItem = (active: boolean, icon: React.ReactNode, label: string, count: number | null, onClick: () => void) => (
    <button
      type="button"
      onClick={() => pick(onClick)}
      className={
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition ' +
        (active
          ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgb(var(--primary)/0.25)]'
          : 'text-muted hover:bg-surface2 hover:text-text')
      }
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate text-left">{label}</span>
      {count !== null ? <span className="text-[11px] tabular-nums text-faint">{count}</span> : null}
    </button>
  );
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="关闭导航"
          onClick={() => toggleSidebar(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={
          'fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-line/70 bg-surface/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:z-auto lg:w-[264px] lg:translate-x-0 lg:bg-surface/60 ' +
          (open ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-deep text-[15px] font-bold text-white shadow-[0_8px_20px_-8px_rgb(var(--primary)/0.9)]">
              T
            </span>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight text-text">TNotes</div>
              <div className="text-[11px] text-faint">端到端加密笔记库</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSidebar(false)}
            aria-label="关闭导航"
            className="rounded-lg p-1.5 text-faint transition hover:bg-surface2 hover:text-text lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {navItem(
              filter.scope === 'all' && !filter.notebookId && !filter.tagId,
              <FileText size={16} />,
              '全部笔记',
              activeCount,
              () => {
                filter.setScope('all');
                navigate('/app');
              },
            )}
            {navItem(filter.scope === 'favorite', <Heart size={16} />, '收藏', favoriteCount, () => {
              filter.setScope('favorite');
              navigate('/app');
            })}
            {navItem(filter.scope === 'trash', <Trash2 size={16} />, '回收站', trashCount, () => {
              filter.setScope('trash');
              navigate('/app');
            })}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between px-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">笔记本</span>
              <button
                type="button"
                aria-label="新建笔记本"
                onClick={() => {
                  setDraft('');
                  setDialog({ kind: 'notebook', mode: 'create' });
                }}
                className="rounded-lg p-1 text-faint transition hover:bg-surface2 hover:text-primary"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="space-y-1">
              {notebooks.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-faint">还没有笔记本，点击 + 创建</div>
              ) : null}
              {notebooks.map((notebook) => (
                <div key={notebook.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => pick(() => {
                      filter.setNotebook(notebook.id);
                      navigate('/app');
                    })}
                    className={
                      'flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] transition ' +
                      (filter.notebookId === notebook.id
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted hover:bg-surface2 hover:text-text')
                    }
                  >
                    <BookOpen size={15} className="shrink-0" />
                    <span className="truncate">{notebook.name}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="重命名笔记本"
                    onClick={() => {
                      setDraft(notebook.name);
                      setDialog({ kind: 'notebook', mode: 'rename', id: notebook.id });
                    }}
                    className="rounded-lg p-1.5 text-faint opacity-0 transition hover:text-primary group-hover:opacity-100"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label="删除笔记本"
                    onClick={() => {
                      removeNotebook(notebook.id).then(() => pushToast('已删除笔记本', 'success'));
                    }}
                    className="rounded-lg p-1.5 text-faint opacity-0 transition hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between px-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">标签</span>
              <button
                type="button"
                aria-label="新建标签"
                onClick={() => {
                  setDraft('');
                  setDialog({ kind: 'tag', mode: 'create' });
                }}
                className="rounded-lg p-1 text-faint transition hover:bg-surface2 hover:text-primary"
              >
                <Plus size={15} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 px-3">
              {tags.length === 0 ? <span className="text-[12px] text-faint">还没有标签</span> : null}
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="group inline-flex items-center gap-1 rounded-full border border-line bg-surface2/70 px-2.5 py-1 text-[12px] text-muted transition hover:border-primary/40 hover:text-text"
                >
                  <button
                    type="button"
                    onClick={() => pick(() => {
                      filter.setTag(tag.id);
                      navigate('/app');
                    })}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                  </button>
                  <button
                    type="button"
                    aria-label="重命名标签"
                    onClick={() => {
                      setDraft(tag.name);
                      setDialog({ kind: 'tag', mode: 'rename', id: tag.id });
                    }}
                    className="opacity-0 transition hover:text-primary group-hover:opacity-100"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    type="button"
                    aria-label="删除标签"
                    onClick={() => {
                      removeTag(tag.id).then(() => pushToast('已删除标签', 'success'));
                    }}
                    className="opacity-0 transition hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1 border-t border-line/70 px-3 py-3">
          {navItem(false, <BarChart3 size={16} />, '统计', null, () => navigate('/app/stats'))}
          {navItem(false, <Settings size={16} />, '设置', null, () => navigate('/app/settings'))}
          <div className="px-3 pt-2 text-[11px] leading-relaxed text-faint">
            笔记内容在浏览器内加密后上传，服务器只保存密文。
          </div>
        </div>
      </aside>

      <Modal
        open={dialog !== null}
        title={dialog?.mode === 'create' ? '新建' : '重命名'}
        onClose={() => setDialog(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(null)}>
              取消
            </Button>
            <Button onClick={submitDialog}>保存</Button>
          </>
        }
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <TagIcon size={14} />
            {dialog?.kind === 'notebook' ? '笔记本名称' : '标签名称'}
          </div>
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitDialog();
            }}
            placeholder="输入名称"
          />
        </div>
      </Modal>
    </>
  );
}
