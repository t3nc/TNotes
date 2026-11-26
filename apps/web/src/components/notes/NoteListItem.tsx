import { Heart } from 'lucide-react';
import { cn } from '../../lib/cn';
import { formatRelativeTime } from '../../lib/format';

export interface ListNote {
  id: string;
  title: string;
  snippet: string;
  tags: { id: string; name: string; color: string }[];
  favorited: boolean;
  updatedAt: number;
  wordCount: number;
}

export function NoteListItem({
  note,
  active,
  onSelect,
}: {
  note: ListNote;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(note.id)}
      className={cn(
        'group relative w-full rounded-xl border px-3.5 py-3 text-left transition-all duration-150',
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-transparent hover:border-line hover:bg-surface2/60',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              'truncate text-[14px] font-semibold',
              note.title ? 'text-text' : 'italic text-faint',
            )}
          >
            {note.title || '无标题'}
          </div>
          {note.snippet ? (
            <div className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
              {note.snippet}
            </div>
          ) : null}
        </div>
        {note.favorited ? (
          <Heart size={14} className="mt-0.5 shrink-0 fill-accent text-accent" />
        ) : null}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-faint">
        <span>{formatRelativeTime(note.updatedAt)}</span>
        <span>·</span>
        <span>{note.wordCount} 字</span>
        <div className="ml-auto flex gap-1 overflow-hidden">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-surface2 px-2 py-0.5 text-[10.5px] text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
              {tag.name}
            </span>
          ))}
        </div>
      </div>
      {active ? (
        <span className="absolute left-0 top-3 h-6 w-[3px] rounded-r-full bg-primary" />
      ) : null}
    </button>
  );
}
