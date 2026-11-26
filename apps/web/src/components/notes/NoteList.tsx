import { useEffect, useMemo } from 'react';
import { FileText, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFilterStore } from '../../store/filter';
import type { SortKey } from '../../store/filter';
import { useNotesStore } from '../../store/notes';
import { useOrganizeStore } from '../../store/organize';
import { useUiStore } from '../../store/ui';
import { NoteListItem } from './NoteListItem';
import type { ListNote } from './NoteListItem';
import { EmptyState } from '../ui/empty';
import { searchDocs } from '../../lib/search';
import type { SearchDoc } from '../../lib/search';
import { docToPlainText } from '../../lib/plain-text';
import { cn } from '../../lib/cn';

const sortLabels: { key: SortKey; label: string }[] = [
  { key: 'updated', label: '最近更新' },
  { key: 'created', label: '创建时间' },
  { key: 'title', label: '标题' },
  { key: 'words', label: '字数' },
];

export function NoteList() {
  const navigate = useNavigate();
  const { id } = useParams();
  const meta = useNotesStore((state) => state.meta);
  const titles = useNotesStore((state) => state.titles);
  const content = useNotesStore((state) => state.content);
  const contentLoaded = useNotesStore((state) => state.contentLoaded);
  const loadAllContent = useNotesStore((state) => state.loadAllContent);
  const createNote = useNotesStore((state) => state.createNote);
  const filter = useFilterStore();
  const tagItems = useOrganizeStore((state) => state.tags);
  const notebookItems = useOrganizeStore((state) => state.notebooks);
  const pushToast = useUiStore((state) => state.pushToast);

  const query = filter.query.trim();

  useEffect(() => {
    if (!query || contentLoaded) return;
    loadAllContent().catch((error: unknown) => {
      console.error('[tnotes] 加载正文失败', error);
    });
  }, [query, contentLoaded, loadAllContent]);

  const tagMap = useMemo(() => new Map(tagItems.map((tag) => [tag.id, tag])), [tagItems]);
  const notebookMap = useMemo(
    () => new Map(notebookItems.map((notebook) => [notebook.id, notebook])),
    [notebookItems],
  );

  const visible = useMemo(() => {
    const list = meta.filter((note) => {
      if (filter.scope === 'trash') return note.deletedAt !== null;
      if (note.deletedAt) return false;
      if (filter.scope === 'favorite') return note.favorited;
      if (filter.notebookId) return note.notebookId === filter.notebookId;
      if (filter.tagId) return note.tagIds.includes(filter.tagId);
      return true;
    });

    const sorted = [...list];
    if (filter.sort === 'created') {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    } else if (filter.sort === 'title') {
      sorted.sort((a, b) => (titles[a.id] ?? '').localeCompare(titles[b.id] ?? '', 'zh-CN'));
    } else if (filter.sort === 'words') {
      sorted.sort((a, b) => b.wordCount - a.wordCount);
    } else {
      sorted.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return sorted;
  }, [meta, filter, titles]);

  const docs = useMemo<SearchDoc[]>(
    () =>
      meta
        .filter((note) => !note.deletedAt)
        .map((note) => ({
          id: note.id,
          title: titles[note.id] ?? '',
          plain: content[note.id] ? docToPlainText(content[note.id].doc) : '',
          tags: note.tagIds.map((tagId) => tagMap.get(tagId)?.name ?? '').filter(Boolean),
          updatedAt: note.updatedAt,
          wordCount: note.wordCount,
        })),
    [meta, titles, content, tagMap],
  );

  const hits = useMemo(() => (query ? searchDocs(docs, query) : []), [docs, query]);
  const hitIds = useMemo(() => new Set(hits.map((hit) => hit.id)), [hits]);

  const listItems: ListNote[] = useMemo(
    () =>
      visible
        .filter((note) => !query || hitIds.has(note.id))
        .map((note) => ({
          id: note.id,
          title: titles[note.id] ?? '',
          snippet: content[note.id] ? docToPlainText(content[note.id].doc).slice(0, 90) : '',
          tags: note.tagIds
            .map((tagId) => tagMap.get(tagId))
            .filter((tag): tag is { id: string; name: string; color: string } => Boolean(tag)),
          favorited: note.favorited,
          updatedAt: note.updatedAt,
          wordCount: note.wordCount,
        })),
    [visible, query, hitIds, titles, content, tagMap],
  );
  const scopeTitle =
    filter.scope === 'trash'
      ? '回收站'
      : filter.scope === 'favorite'
        ? '收藏'
        : filter.notebookId
          ? (notebookMap.get(filter.notebookId)?.name ?? '笔记本')
          : filter.tagId
            ? (tagMap.get(filter.tagId)?.name ?? '标签')
            : query
              ? '搜索结果'
              : '全部笔记';

  const onCreate = () => {
    createNote()
      .then((newId) => navigate('/app/n/' + newId))
      .catch((error: unknown) => {
        console.error('[tnotes] 新建笔记失败', error);
        pushToast('新建笔记失败', 'error');
      });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-text">{scopeTitle}</div>
          <div className="text-[11px] text-faint">{visible.length} 篇笔记</div>
        </div>
        <label className="relative flex items-center">
          <SlidersHorizontal size={13} className="pointer-events-none absolute left-2 text-faint" />
          <select
            value={filter.sort}
            onChange={(event) => filter.setSort(event.target.value as SortKey)}
            className="h-8 cursor-pointer appearance-none rounded-lg border border-line bg-surface2/60 pl-7 pr-2 text-[12px] text-muted outline-none transition hover:border-primary/40 focus:border-primary/60"
            aria-label="排序方式"
          >
            {sortLabels.map((option) => (
              <option key={option.key} value={option.key} className="bg-surface text-text">
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onCreate}
          aria-label="新建笔记"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-[12.5px] font-medium text-white transition hover:bg-primary-soft active:scale-[0.97]"
        >
          <Plus size={15} />
          新建
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
        {listItems.length === 0 ? (
          <EmptyState
            icon={query ? <Search size={26} /> : <FileText size={26} />}
            title={query ? '没有匹配的笔记' : filter.scope === 'trash' ? '回收站是空的' : '还没有笔记'}
            description={
              query
                ? '换个关键词试试，搜索只匹配已解密的内容。'
                : '点击右上角「新建」开始记录你的第一条笔记。'
            }
            action={
              !query && filter.scope !== 'trash' ? (
                <button
                  type="button"
                  onClick={onCreate}
                  className="mt-1 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-white transition hover:bg-primary-soft"
                >
                  新建笔记
                </button>
              ) : null
            }
          />
        ) : (
          <div className={cn('flex flex-col gap-1')}>
            {listItems.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                active={note.id === id}
                onSelect={(noteId) => navigate('/app/n/' + noteId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
