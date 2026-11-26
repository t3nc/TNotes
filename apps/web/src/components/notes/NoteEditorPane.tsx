import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, FileText, Heart, RotateCcw, Trash2 } from 'lucide-react';
import type { Editor as EditorInstance } from '@tiptap/core';
import { Editor } from '../editor/Editor';
import { EditorToolbar } from '../editor/EditorToolbar';
import { MarkdownPanel } from '../editor/MarkdownPanel';
import { EMPTY_DOC, useNotesStore } from '../../store/notes';
import { useOrganizeStore } from '../../store/organize';
import { useUiStore } from '../../store/ui';
import { compressImage, blobToUint8Array } from '../../lib/image';
import { uploadAttachment } from '../../lib/attachments';
import { formatRelativeTime } from '../../lib/format';
import { ConfirmDialog } from '../ui/confirm';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty';
import { Modal } from '../ui/modal';

export function NoteEditorPane({ noteId }: { noteId: string }) {
  const navigate = useNavigate();
  const meta = useNotesStore((state) => state.meta);
  const contentMap = useNotesStore((state) => state.content);
  const titles = useNotesStore((state) => state.titles);
  const updateContent = useNotesStore((state) => state.updateContent);
  const moveToTrash = useNotesStore((state) => state.moveToTrash);
  const restoreNote = useNotesStore((state) => state.restoreNote);
  const setFavorite = useNotesStore((state) => state.setFavorite);
  const assignTags = useNotesStore((state) => state.assignTags);
  const assignNotebook = useNotesStore((state) => state.assignNotebook);
  const loadOne = useNotesStore((state) => state.loadOne);
  const saving = useNotesStore((state) => state.saving);
  const lastSavedAt = useNotesStore((state) => state.lastSavedAt);
  const notebooks = useOrganizeStore((state) => state.notebooks);
  const tags = useOrganizeStore((state) => state.tags);
  const pushToast = useUiStore((state) => state.pushToast);

  const note = meta.find((item) => item.id === noteId);
  const content = contentMap[noteId];

  const [editor, setEditor] = useState<EditorInstance | null>(null);
  const [title, setTitle] = useState(titles[noteId] ?? '');
  const [doc, setDoc] = useState<unknown>(content?.doc ?? EMPTY_DOC);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef({ title, doc });

  useEffect(() => {
    latestRef.current = { title, doc };
  }, [title, doc]);

  useEffect(() => {
    if (content) {
      setTitle(titles[noteId] ?? content.title ?? '');
      setDoc(content.doc ?? EMPTY_DOC);
      return;
    }
    loadOne(noteId).catch((error: unknown) => {
      console.error('[tnotes] 加载笔记失败', error);
    });
  }, [noteId, content, titles, loadOne]);

  const flush = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const snapshot = latestRef.current;
    updateContent(noteId, { title: snapshot.title, doc: snapshot.doc })
      .catch((error: unknown) => {
        console.error('[tnotes] 保存失败', error);
        pushToast('保存失败，请检查网络', 'error');
      });
  };

  const scheduleSave = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, 800);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleImage = async (file: File): Promise<string | null> => {
    const compressed = await compressImage(file);
    const bytes = await blobToUint8Array(compressed.blob);
    const attachment = await uploadAttachment(noteId, bytes, compressed.mime);
    return attachment.id;
  };

  const insertImage = (file: File) => {
    handleImage(file)
      .then(() => {
        pushToast('图片已加密上传', 'success');
      })
      .catch((error: unknown) => {
        console.error('[tnotes] 图片上传失败', error);
        pushToast('图片上传失败', 'error');
      });
  };
  if (!note) {
    return (
      <EmptyState
        icon={<FileText size={26} />}
        title="笔记不存在"
        description="它可能已被彻底删除，或者链接已失效。"
        action={
          <Button onClick={() => navigate('/app')} className="mt-1">
            返回笔记列表
          </Button>
        }
      />
    );
  }

  const isTrashed = note.deletedAt !== null;
  const noteTags = tags.filter((tag) => note.tagIds.includes(tag.id));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start gap-3 px-4 pb-2 pt-3 md:px-6 md:pt-5">
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            scheduleSave();
          }}
          placeholder="无标题"
          disabled={isTrashed}
          className="min-w-0 flex-1 bg-transparent text-heading font-bold tracking-tight text-text placeholder:text-faint outline-none disabled:opacity-60"
        />
        <div className="flex shrink-0 items-center gap-1.5 pt-1">
          <button
            type="button"
            aria-label="收藏"
            onClick={() => setFavorite(noteId, !note.favorited)}
            className={
              'rounded-xl p-2 transition ' +
              (note.favorited ? 'text-accent' : 'text-faint hover:bg-surface2 hover:text-text')
            }
          >
            <Heart size={18} className={note.favorited ? 'fill-accent' : ''} />
          </button>
          <Button variant="ghost" size="sm" onClick={() => setShowMarkdown(true)}>
            Markdown
          </Button>
          {isTrashed ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<RotateCcw size={15} />}
              onClick={() => {
                restoreNote(noteId).then(() => pushToast('已从回收站恢复', 'success'));
              }}
            >
              恢复
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 size={15} />}
              onClick={() => setConfirmTrash(true)}
            >
              删除
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-2 md:px-6">
        <span className="relative inline-flex items-center">
          <select
            value={note.notebookId ?? ''}
            onChange={(event) => {
              const value = event.target.value || null;
              assignNotebook(noteId, value).catch((error: unknown) => {
                console.error('[tnotes] 设置笔记本失败', error);
              });
            }}
            className="h-7 w-full cursor-pointer appearance-none rounded-lg border border-line bg-surface2/50 pl-2 pr-7 text-[12px] text-muted outline-none transition hover:border-primary/40 focus:border-primary/60"
            aria-label="选择笔记本"
          >
            <option value="">无笔记本</option>
            {notebooks.map((notebook) => (
              <option key={notebook.id} value={notebook.id}>
                {notebook.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2 text-faint"
            aria-hidden="true"
          />
        </span>

        <button
          type="button"
          onClick={() => setShowTags(true)}
          className="flex h-7 items-center gap-1.5 rounded-lg border border-line bg-surface2/50 px-2 text-[12px] text-muted transition hover:border-primary/40"
        >
          标签
          {noteTags.length ? <span className="text-primary">{noteTags.length}</span> : null}
        </button>

        <div className="flex flex-wrap gap-1.5">
          {noteTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface2/60 px-2.5 py-0.5 text-[11.5px] text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
              {tag.name}
            </span>
          ))}
        </div>
      </div>

      <EditorToolbar editor={editor} onPickImage={() => fileRef.current?.click()} />

      <Editor
        doc={doc}
        editable={!isTrashed}
        onChange={(nextDoc) => {
          setDoc(nextDoc);
          scheduleSave();
        }}
        onPasteImage={handleImage}
        onEditorReady={setEditor}
      />

      <div className="flex items-center justify-between gap-3 border-t border-line/70 px-4 py-2 text-[11.5px] text-faint md:px-6">
        <span>
          {saving ? '正在加密保存…' : lastSavedAt ? '已保存 · ' + formatRelativeTime(lastSavedAt) : '已加密保存'}
        </span>
        <div className="flex items-center gap-3">
          <span>{note.wordCount} 字</span>
          {note.attachmentCount > 0 ? <span>{note.attachmentCount} 张图片</span> : null}
          <span>{formatRelativeTime(note.updatedAt)}</span>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) insertImage(file);
          event.target.value = '';
        }}
      />

      <MarkdownPanel doc={doc} open={showMarkdown} onClose={() => setShowMarkdown(false)} />

      <Modal open={showTags} title="选择标签" onClose={() => setShowTags(false)}>
        <div className="space-y-1.5">
          {tags.length === 0 ? <div className="text-[13px] text-faint">还没有标签</div> : null}
          {tags.map((tag) => {
            const checked = note.tagIds.includes(tag.id);
            return (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-muted transition hover:bg-surface2"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? note.tagIds.filter((tagId) => tagId !== tag.id)
                      : [...note.tagIds, tag.id];
                    assignTags(noteId, next).catch((error: unknown) => {
                      console.error('[tnotes] 更新标签失败', error);
                    });
                  }}
                  className="ui-checkbox h-4 w-4 cursor-pointer"
                />
                <span className="h-2 w-2 rounded-full" style={{ background: tag.color }} />
                {tag.name}
              </label>
            );
          })}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmTrash}
        title="移入回收站？"
        description="笔记会进入回收站，可以在回收站里恢复。彻底删除后无法恢复。"
        confirmText="移入回收站"
        onCancel={() => setConfirmTrash(false)}
        onConfirm={() => {
          setConfirmTrash(false);
          moveToTrash(noteId)
            .then(() => {
              pushToast('已移入回收站', 'success');
              navigate('/app');
            })
            .catch((error: unknown) => {
              console.error('[tnotes] 删除失败', error);
            });
        }}
      />
    </div>
  );
}
