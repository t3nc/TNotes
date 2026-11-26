import { useRef, useState } from 'react';
import {
  Download,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Moon,
  Palette,
  Smartphone,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useNotesStore } from '../store/notes';
import { useOrganizeStore } from '../store/organize';
import { useUiStore } from '../store/ui';
import { useVaultStore } from '../store/vault';
import { buildZip, mimeToExtension, parseZip, replaceImageSources, rewriteAttachmentRefs } from '../lib/export';
import type { ExportAttachment, ExportNote } from '../lib/export';
import { docToMarkdown, markdownToDoc } from '../lib/markdown';
import { downloadAttachment, listAttachments, uploadAttachment } from '../lib/attachments';
import { clearCache } from '../lib/idb';
import { changePassword } from '../lib/vault';

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line/70 bg-surface/70 p-4 backdrop-blur-xl md:p-5">
      <h2 className="text-subheading text-text">{title}</h2>
      {description ? <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{description}</p> : null}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const pushToast = useUiStore((state) => state.pushToast);
  const lock = useVaultStore((state) => state.lock);
  const logout = useVaultStore((state) => state.logout);
  const meta = useNotesStore((state) => state.meta);
  const titles = useNotesStore((state) => state.titles);
  const content = useNotesStore((state) => state.content);
  const loadAllContent = useNotesStore((state) => state.loadAllContent);
  const createNote = useNotesStore((state) => state.createNote);
  const updateContent = useNotesStore((state) => state.updateContent);
  const assignTags = useNotesStore((state) => state.assignTags);
  const assignNotebook = useNotesStore((state) => state.assignNotebook);
  const notebooks = useOrganizeStore((state) => state.notebooks);
  const tags = useOrganizeStore((state) => state.tags);
  const addTag = useOrganizeStore((state) => state.addTag);
  const addNotebook = useOrganizeStore((state) => state.addNotebook);

  const [busy, setBusy] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const importRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    setBusy(true);
    loadAllContent()
      .then(async () => {
        const exportNotes: ExportNote[] = [];
        for (const note of meta.filter((item) => !item.deletedAt)) {
          const body = content[note.id];
          if (!body) continue;
          let markdown = docToMarkdown(body.doc);
          const attachments: ExportAttachment[] = [];
          const mapping: Record<string, string> = {};
          const list = await listAttachments(note.id);
          for (const item of list) {
            const { bytes } = await downloadAttachment(item.id);
            const fileName =
              note.id.slice(0, 8) + '-' + item.id.slice(0, 8) + '.' + mimeToExtension(item.mime);
            attachments.push({ id: item.id, fileName, bytes });
            mapping[item.id] = fileName;
          }
          markdown = rewriteAttachmentRefs(markdown, mapping);
          exportNotes.push({
            id: note.id,
            title: titles[note.id] ?? '',
            markdown,
            tags: note.tagIds.map((tagId) => tags.find((tag) => tag.id === tagId)?.name ?? '').filter(Boolean),
            notebook: note.notebookId
              ? (notebooks.find((notebook) => notebook.id === note.notebookId)?.name ?? null)
              : null,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            attachments,
          });
        }
        const zip = buildZip(exportNotes, Date.now());
        const blob = new Blob([zip], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'tnotes-backup-' + new Date().toISOString().slice(0, 10) + '.zip';
        link.click();
        URL.revokeObjectURL(url);
        pushToast('已导出 ' + exportNotes.length + ' 篇笔记', 'success');
      })
      .catch((error: unknown) => {
        console.error('[tnotes] 导出失败', error);
        pushToast('导出失败', 'error');
      })
      .finally(() => setBusy(false));
  };
  const handleImport = (file: File) => {
    setBusy(true);
    file
      .arrayBuffer()
      .then((buffer) => parseZip(new Uint8Array(buffer)))
      .then(async (backup) => {
        let imported = 0;
        for (const entry of backup.notes) {
          const noteId = await createNote();
          const mapping: Record<string, string> = {};
          const fileNames = backup.meta.notes.find((item) => item.id === entry.id)?.attachments ?? [];
          for (const path of fileNames) {
            const bytes = backup.attachments[path];
            if (!bytes) continue;
            const fileName = path.replace('attachments/', '');
            const uploaded = await uploadAttachment(noteId, bytes, 'application/octet-stream');
            mapping[fileName] = uploaded.id;
          }
          const doc = replaceImageSources(markdownToDoc(entry.markdown), mapping);
          await updateContent(noteId, { title: entry.title, doc });

          const tagIds: string[] = [];
          for (const name of entry.tags) {
            const existing = tags.find((tag) => tag.name === name);
            const tagId = existing ? existing.id : await addTag(name, '#7C6CF6');
            tagIds.push(tagId);
          }
          if (tagIds.length) await assignTags(noteId, tagIds);

          if (entry.notebook) {
            const existingNotebook = notebooks.find((item) => item.name === entry.notebook);
            const notebookId = existingNotebook ? existingNotebook.id : await addNotebook(entry.notebook);
            await assignNotebook(noteId, notebookId);
          }
          imported += 1;
        }
        pushToast('已导入 ' + imported + ' 篇笔记', 'success');
      })
      .catch((error: unknown) => {
        console.error('[tnotes] 导入失败', error);
        pushToast('导入失败：文件格式不正确？', 'error');
      })
      .finally(() => setBusy(false));
  };

  const handleChangePassword = () => {
    if (newPassword.length < 8) {
      pushToast('新密码至少 8 位', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      pushToast('两次输入的新密码不一致', 'error');
      return;
    }
    setBusy(true);
    changePassword(oldPassword, newPassword)
      .then(() => {
        pushToast('密码已更新，内容无需重新加密', 'success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((error: unknown) => {
        console.error('[tnotes] 修改密码失败', error);
        pushToast('修改失败：当前密码不正确？', 'error');
      })
      .finally(() => setBusy(false));
  };
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 md:py-8">
        <header>
          <h1 className="text-heading text-text">设置</h1>
          <p className="mt-1 text-[13px] text-muted">账户安全、数据备份与应用偏好</p>
        </header>

        <SectionCard title="账户" description="改密码只会重新包裹内容密钥，不会重新加密全部笔记。">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              placeholder="当前密码"
              autoComplete="current-password"
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="新密码"
              autoComplete="new-password"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="确认新密码"
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={handleChangePassword} icon={<KeyRound size={16} />}>
              更新密码
            </Button>
            <Button variant="secondary" onClick={lock} icon={<Lock size={16} />}>
              立即锁定
            </Button>
            <Button variant="ghost" onClick={() => logout()} icon={<LogOut size={16} />}>
              登出
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="数据备份" description="导出的是解密后的明文 ZIP，请妥善保管。">
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={handleExport} icon={<Download size={16} />}>
              导出全部笔记（ZIP）
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => importRef.current?.click()}
              icon={<Upload size={16} />}
            >
              导入备份
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                clearCache()
                  .then(() => pushToast('已清除本地缓存', 'success'))
                  .catch((error: unknown) => console.error('[tnotes] 清理缓存失败', error));
              }}
              icon={<Trash2 size={16} />}
            >
              清除本地缓存
            </Button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleImport(file);
              event.target.value = '';
            }}
          />
          <p className="text-[12px] leading-relaxed text-faint">
            当前共 {meta.length} 篇笔记，其中 {meta.filter((note) => note.deletedAt).length} 篇在回收站。
          </p>
        </SectionCard>

        <SectionCard title="外观" description="深色适合夜间阅读，浅色提供纸感米白配色。">
          <div className="flex gap-2">
            <Button
              variant={theme === 'dark' ? 'primary' : 'secondary'}
              onClick={() => setTheme('dark')}
              icon={<Moon size={16} />}
            >
              深色
            </Button>
            <Button
              variant={theme === 'light' ? 'primary' : 'secondary'}
              onClick={() => setTheme('light')}
              icon={<Sun size={16} />}
            >
              浅色
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="安装到桌面 / 主屏" description="在浏览器菜单里选择「安装应用」即可像原生 App 一样打开。">
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
            <Smartphone size={16} />
            <span>iOS：Safari 分享 → 添加到主屏幕；Android / 桌面 Chrome：地址栏安装图标。</span>
          </div>
        </SectionCard>

        <SectionCard title="关于" description="TNotes · 单人端到端加密笔记库">
          <div className="space-y-1.5 text-[12.5px] leading-relaxed text-muted">
            <div className="flex items-center gap-2">
              <Palette size={15} className="text-primary" />
              <span>所有内容在浏览器内使用 AES-256-GCM 加密，服务器只保存密文与最小结构元数据。</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-primary" />
              <span>免费层配额：Workers 10 万请求/天，D1 5GB 存储、500 万行读/天。</span>
            </div>
            <div className="flex items-center gap-2 text-warn">
              <KeyRound size={15} />
              <span>忘记密码 = 内容密钥丢失，任何人都无法恢复你的笔记，请务必保存密码。</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
