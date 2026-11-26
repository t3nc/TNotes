import { describe, expect, it } from 'vitest';
import { buildZip, parseZip, replaceImageSources, rewriteAttachmentRefs } from './export';

describe('备份导出', () => {
  it('导出后可重新解析出笔记', () => {
    const zip = buildZip(
      [
        {
          id: 'note-1',
          title: '第一篇',
          markdown: '# 第一篇\n\n内容',
          tags: ['标签'],
          notebook: '工作',
          createdAt: 1,
          updatedAt: 2,
          attachments: [],
        },
      ],
      1700000000000,
    );
    const parsed = parseZip(zip);
    expect(parsed.meta.count).toBe(1);
    expect(parsed.notes[0].title).toBe('第一篇');
    expect(parsed.notes[0].markdown).toContain('内容');
    expect(parsed.notes[0].tags).toEqual(['标签']);
  });

  it('附件引用可重写为备份内路径', () => {
    const markdown = '![图](attachment:abc123)';
    const rewritten = rewriteAttachmentRefs(markdown, { abc123: 'note-1-abc.png' });
    expect(rewritten).toBe('![图](attachments/note-1-abc.png)');
  });

  it('导入时可替换图片源', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
        { type: 'image', attrs: { src: 'attachments/a.png' } },
      ],
    };
    const replaced = replaceImageSources(doc, { 'a.png': 'new-id' }) as {
      content: { attrs?: { src?: string } }[];
    };
    expect(replaced.content[1].attrs?.src).toBe('attachment:new-id');
  });
});
