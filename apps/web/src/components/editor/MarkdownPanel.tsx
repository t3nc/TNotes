import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { docToMarkdown } from '../../lib/markdown';

export function MarkdownPanel({
  doc,
  open,
  onClose,
}: {
  doc: unknown;
  open: boolean;
  onClose: () => void;
}) {
  const [markdown, setMarkdown] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    try {
      setMarkdown(docToMarkdown(doc));
    } catch (error: unknown) {
      console.error('[tnotes] 生成 Markdown 失败', error);
      setMarkdown('');
    }
  }, [doc, open]);

  const copy = () => {
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch((error: unknown) => {
        console.error('[tnotes] 复制失败', error);
      });
  };

  return (
    <Modal
      open={open}
      wide
      title="Markdown 源码"
      description="导出的备份文件即为以下 Markdown 内容，可直接复制到其它工具。"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          <Button onClick={copy} icon={copied ? <Check size={16} /> : <Copy size={16} />}>
            {copied ? '已复制' : '复制 Markdown'}
          </Button>
        </>
      }
    >
      <textarea
        readOnly
        value={markdown}
        spellCheck={false}
        className="h-[52vh] w-full resize-none rounded-xl border border-line bg-surface2/50 p-3 font-mono text-[13px] leading-relaxed text-text outline-none"
      />
    </Modal>
  );
}
