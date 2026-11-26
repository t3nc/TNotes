export function docToPlainText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (node: { type?: string; text?: string; content?: unknown[] }) => {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      parts.push(node.text);
      return;
    }
    if (node.type === 'paragraph' || node.type === 'heading') parts.push('\n');
    if (node.type === 'hardBreak') parts.push('\n');
    const children = Array.isArray(node.content) ? node.content : [];
    for (const child of children) walk(child as { type?: string; text?: string; content?: unknown[] });
  };
  walk(doc as { type?: string; text?: string; content?: unknown[] });
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

export function countWordsFromDoc(doc: unknown): number {
  const text = docToPlainText(doc);
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const chinese = (trimmed.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  const latin = (trimmed.match(/[a-zA-Z0-9]+/g) ?? []).length;
  return chinese + latin;
}
