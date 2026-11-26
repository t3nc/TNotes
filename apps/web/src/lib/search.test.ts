import { describe, expect, it } from 'vitest';
import { highlightSegments, searchDocs, splitTerms } from './search';

const docs = [
  {
    id: 'a',
    title: 'Cloudflare 部署笔记',
    plain: '使用 wrangler deploy 部署到免费层，配合 D1 存储。',
    tags: ['部署', 'Cloudflare'],
    updatedAt: 200,
    wordCount: 120,
  },
  {
    id: 'b',
    title: '购物清单',
    plain: '牛奶、鸡蛋、面包。',
    tags: ['生活'],
    updatedAt: 100,
    wordCount: 10,
  },
];

describe('客户端搜索', () => {
  it('按空白切词', () => {
    expect(splitTerms('  CloudFlare   部署 ')).toEqual(['cloudflare', '部署']);
  });

  it('标题命中优先于正文命中', () => {
    const hits = searchDocs(docs, '部署');
    expect(hits[0].id).toBe('a');
  });

  it('多词需要全部命中', () => {
    expect(searchDocs(docs, '部署 D1')).toHaveLength(1);
    expect(searchDocs(docs, '部署 不存在的词')).toHaveLength(0);
  });

  it('标签也能命中', () => {
    const hits = searchDocs(docs, '生活');
    expect(hits.map((hit) => hit.id)).toContain('b');
  });

  it('高亮片段标注命中位置', () => {
    const segments = highlightSegments('部署到 Cloudflare', '部署');
    expect(segments.some((segment) => segment.match && segment.text === '部署')).toBe(true);
  });
});
