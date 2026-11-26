import { useEffect, useRef } from 'react';
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react';
import type { Content, Editor as EditorInstance } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { AttachmentImageView } from './ImageNodeView';

export interface EditorProps {
  doc: unknown;
  editable: boolean;
  onChange: (doc: unknown) => void;
  onPasteImage: (file: File) => Promise<string | null>;
  onStats?: (words: number, characters: number) => void;
  onEditorReady?: (instance: EditorInstance | null) => void;
}

const AttachmentImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentImageView);
  },
});

export function Editor({ doc, editable, onChange, onPasteImage, onStats, onEditorReady }: EditorProps) {
  const onChangeRef = useRef(onChange);
  const onStatsRef = useRef(onStats);
  onChangeRef.current = onChange;
  onStatsRef.current = onStats;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      AttachmentImage.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
      Placeholder.configure({
        placeholder: '开始记录… 支持 Markdown 快捷输入：# 标题、- 列表、[] 待办、> 引用、``` 代码块',
      }),
      CharacterCount,
    ],
    content: (doc ?? {}) as Content,
    editable,
    editorProps: {
      attributes: {
        class: 'note-prose min-h-[220px] focus:outline-none',
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));
        if (!imageItem) return false;
        const file = imageItem.getAsFile();
        if (!file) return false;
        onPasteImage(file)
          .then((attachmentId) => {
            if (!attachmentId) return;
            editor
              ?.chain()
              .focus()
              .setImage({ src: 'attachment:' + attachmentId, alt: file.name })
              .run();
          })
          .catch((error: unknown) => {
            console.error('[tnotes] 插入图片失败', error);
          });
        return true;
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChangeRef.current(instance.getJSON());
      const counter = instance.storage.characterCount as { words: () => number; characters: () => number };
      onStatsRef.current?.(counter.words(), counter.characters());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editable, editor]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || !doc) return;
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(doc)) return;
    editor.commands.setContent((doc ?? {}) as Content, false);
  }, [doc, editor]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <EditorContent editor={editor} />
    </div>
  );
}
