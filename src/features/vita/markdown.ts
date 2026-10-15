/** Splits Vita's answer text into blocks the dock renders (see VitaMarkdown.tsx). */
export type Block =
  | { kind: 'p' | 'h'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'table'; head: string[]; rows: string[][] };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

export function toBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    if (t.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const r = cells(lines[i]);
        if (!r.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(r);
        i++;
      }
      if (rows.length) out.push({ kind: 'table', head: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (/^[-*•]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^[-*•]\s+/, ''));
      out.push({ kind: 'ul', items });
      continue;
    }
    if (/^\d+[.)]\s+/.test(t)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) items.push(lines[i++].trim().replace(/^\d+[.)]\s+/, ''));
      out.push({ kind: 'ol', items });
      continue;
    }
    if (/^#{1,6}\s+/.test(t)) {
      out.push({ kind: 'h', text: t.replace(/^#{1,6}\s+/, '') });
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(\||[-*•]\s|\d+[.)]\s|#{1,6}\s)/.test(lines[i].trim())) para.push(lines[i++].trim());
    out.push({ kind: 'p', text: para.join(' ') });
  }
  return out;
}
