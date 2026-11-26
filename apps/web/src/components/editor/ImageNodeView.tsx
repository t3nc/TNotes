import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { loadAttachmentObjectUrl } from '../../lib/attachments';

export function AttachmentImageView({ node }: NodeViewProps) {
  const src = String(node.attrs.src ?? '');
  const id = src.startsWith('attachment:') ? src.slice('attachment:'.length) : '';
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    loadAttachmentObjectUrl(id)
      .then((objectUrl) => {
        if (active) setUrl(objectUrl);
      })
      .catch((error: unknown) => {
        console.error('[tnotes] 图片解密失败', error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <NodeViewWrapper className="my-4 block">
      {url ? (
        <img
          src={url}
          alt={String(node.attrs.alt ?? '')}
          className="max-h-[440px] w-auto rounded-xl border border-line/80 shadow-card"
        />
      ) : (
        <div className="flex h-32 items-center justify-center gap-2 rounded-xl border border-dashed border-line text-[12.5px] text-faint">
          <ImageIcon size={15} />
          {failed ? '图片解密失败' : '正在解密图片…'}
        </div>
      )}
    </NodeViewWrapper>
  );
}

export { ReactNodeViewRenderer };
