export interface SearchDoc {
  id: string;
  title: string;
  plain: string;
  tags: string[];
  updatedAt: number;
  wordCount: number;
}

export interface SearchHit {
  id: string;
  score: number;
  snippet: string;
  title: string;
  tags: string[];
  updatedAt: number;
}

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function splitTerms(query: string): string[] {
  return normalizeText(query)
    .split(' ')
    .filter((term) => term.length > 0);
}

function buildSnippet(plain: string, terms: string[]): string {
  for (const term of terms) {
    const index = plain.indexOf(term);
    if (index >= 0) {
      const start = Math.max(0, index - 40);
      const end = Math.min(plain.length, index + term.length + 60);
      return (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '');
    }
  }
  return plain.slice(0, 120);
}

export function searchDocs(docs: SearchDoc[], rawQuery: string): SearchHit[] {
  const terms = splitTerms(rawQuery);
  if (!terms.length) return [];
  const hits: SearchHit[] = [];

  for (const doc of docs) {
    const title = normalizeText(doc.title);
    const plain = normalizeText(doc.plain);
    const tags = normalizeText(doc.tags.join(' '));
    let score = 0;
    let matchedAll = true;

    for (const term of terms) {
      const inTitle = title.includes(term);
      const inTags = tags.includes(term);
      const inBody = plain.includes(term);
      if (!inTitle && !inTags && !inBody) {
        matchedAll = false;
        break;
      }
      if (inTitle) score += 10;
      if (inTags) score += 6;
      if (inBody) score += 3;
    }
    if (!matchedAll) continue;

    score += Math.min(5, doc.wordCount / 400);
    hits.push({
      id: doc.id,
      score,
      snippet: buildSnippet(plain, terms),
      title: doc.title,
      tags: doc.tags,
      updatedAt: doc.updatedAt,
    });
  }

  return hits.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt);
}

export function highlightSegments(text: string, query: string): { text: string; match: boolean }[] {
  const terms = splitTerms(query);
  if (!terms.length || !text) return [{ text, match: false }];
  const lower = text.toLowerCase();
  const marks = new Array<boolean>(text.length).fill(false);

  for (const term of terms) {
    let index = lower.indexOf(term);
    while (index >= 0) {
      for (let i = index; i < index + term.length; i += 1) marks[i] = true;
      index = lower.indexOf(term, index + term.length);
    }
  }

  const segments: { text: string; match: boolean }[] = [];
  let current = '';
  let currentMatch = marks[0] ?? false;
  for (let i = 0; i < text.length; i += 1) {
    if (marks[i] === currentMatch) {
      current += text[i];
    } else {
      segments.push({ text: current, match: currentMatch });
      current = text[i];
      currentMatch = marks[i];
    }
  }
  if (current) segments.push({ text: current, match: currentMatch });
  return segments;
}
