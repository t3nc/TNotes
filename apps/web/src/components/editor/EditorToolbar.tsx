import type { Editor } from '@tiptap/react';
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import { cn } from '../../lib/cn';

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition',
        active ? 'bg-primary/20 text-primary' : 'text-muted hover:bg-surface2 hover:text-text',
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, onPickImage }: { editor: Editor | null; onPickImage: () => void }) {
  if (!editor) return null;
  const chain = () => editor.chain().focus();

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b border-line/70 px-2 py-1.5">
      <ToolButton label="加粗" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()}>
        <Bold size={16} />
      </ToolButton>
      <ToolButton label="斜体" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()}>
        <Italic size={16} />
      </ToolButton>
      <ToolButton
        label="删除线"
        active={editor.isActive('strike')}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </ToolButton>
      <ToolButton
        label="标题 1"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={16} />
      </ToolButton>
      <ToolButton
        label="标题 2"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={16} />
      </ToolButton>
      <ToolButton
        label="无序列表"
        active={editor.isActive('bulletList')}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolButton>
      <ToolButton
        label="有序列表"
        active={editor.isActive('orderedList')}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolButton>
      <ToolButton
        label="待办清单"
        active={editor.isActive('taskList')}
        onClick={() => chain().toggleTaskList().run()}
      >
        <ListTodo size={16} />
      </ToolButton>
      <ToolButton
        label="引用"
        active={editor.isActive('blockquote')}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote size={16} />
      </ToolButton>
      <ToolButton
        label="代码块"
        active={editor.isActive('codeBlock')}
        onClick={() => chain().toggleCodeBlock().run()}
      >
        <Code2 size={16} />
      </ToolButton>
      <ToolButton
        label="链接"
        active={editor.isActive('link')}
        onClick={() => {
          const previous = editor.getAttributes('link').href as string | undefined;
          const href = window.prompt('请输入链接地址', previous ?? 'https://');
          if (href === null) return;
          if (!href) {
            chain().unsetLink().run();
            return;
          }
          chain().setLink({ href }).run();
        }}
      >
        <Link2 size={16} />
      </ToolButton>
      <ToolButton label="插入图片" onClick={onPickImage}>
        <ImagePlus size={16} />
      </ToolButton>
      <div className="mx-1 h-5 w-px bg-line" />
      <ToolButton label="撤销" onClick={() => chain().undo().run()}>
        <Undo2 size={16} />
      </ToolButton>
      <ToolButton label="重做" onClick={() => chain().redo().run()}>
        <Redo2 size={16} />
      </ToolButton>
    </div>
  );
}
