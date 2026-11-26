import { Editor } from '@tiptap/core';
import { DOMParser } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Markdown } from 'tiptap-markdown';

const baseExtensions = [StarterKit, TaskList, TaskItem, Image, Link];

function createEditor(): Editor {
  return new Editor({
    extensions: [
      ...baseExtensions,
      Markdown.configure({
        html: false,
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: '',
  });
}

export function docToMarkdown(doc: unknown): string {
  const editor = createEditor();
  try {
    const node = editor.schema.nodeFromJSON(doc);
    const tr = editor.state.tr.replaceWith(0, editor.state.doc.content.size, node.content);
    editor.view.dispatch(tr);
    return editor.storage.markdown.getMarkdown();
  } finally {
    editor.destroy();
  }
}

export function markdownToDoc(markdown: string): unknown {
  const editor = createEditor();
  try {
    const html = editor.storage.markdown.parser.parse(markdown);
    const holder = document.createElement('div');
    holder.innerHTML = html;
    const parsed = DOMParser.fromSchema(editor.schema).parse(holder);
    return parsed.toJSON();
  } finally {
    editor.destroy();
  }
}
