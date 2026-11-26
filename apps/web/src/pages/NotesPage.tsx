import { useParams } from 'react-router-dom';
import { NoteList } from '../components/notes/NoteList';
import { NoteEditorPane } from '../components/notes/NoteEditorPane';
import { EmptyState } from '../components/ui/empty';
import { useIsMobile } from '../lib/hooks';
import { FileText } from 'lucide-react';
import { cn } from '../lib/cn';

export function NotesPage() {
  const { id } = useParams();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-full min-h-0">
      <section
        className={cn(
          'h-full min-h-0 w-full shrink-0 md:w-[320px] md:border-r md:border-line/70',
          isMobile && id ? 'hidden' : 'block',
        )}
      >
        <NoteList />
      </section>
      <section
        className={cn(
          'min-h-0 min-w-0 flex-1',
          isMobile && !id ? 'hidden' : 'block',
        )}
      >
        {id ? (
          <NoteEditorPane noteId={id} />
        ) : (
          <EmptyState
            icon={<FileText size={28} />}
            title="选择一条笔记开始"
            description="左侧是笔记列表，选中一条即可编辑。所有内容在本地加密后保存。"
            className="hidden md:flex"
          />
        )}
      </section>
    </div>
  );
}
