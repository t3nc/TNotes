// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { docToMarkdown, markdownToDoc } from './markdown';

const doc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '标题' }] },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: '正文' },
        { type: 'text', marks: [{ type: 'bold' }], text: '加粗' },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: '条目' }] }],
        },
      ],
    },
  ],
};

describe('Markdown 序列化', () => {
  it('文档可导出为 Markdown', () => {
    const markdown = docToMarkdown(doc);
    expect(markdown).toContain('# 标题');
    expect(markdown).toContain('正文');
    expect(markdown).toContain('**加粗**');
    expect(markdown).toContain('条目');
  });

  it('Markdown 可解析回文档结构', () => {
    const parsed = markdownToDoc('# 标题\n\n正文') as { type?: string; content?: unknown[] };
    expect(parsed.type).toBe('doc');
    expect(Array.isArray(parsed.content)).toBe(true);
  });
});
