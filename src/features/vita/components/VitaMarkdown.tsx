import React from 'react';
import { cn } from '@/lib/utils';
import { toBlocks } from '../markdown';

/**
 * Small, safe renderer for Vita's answers: paragraphs, bullet / numbered lists, **bold**,
 * `code` and pipe tables. Builds React elements only (no innerHTML), so nothing in an answer
 * can inject markup.
 */
export const VitaMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const blocks = toBlocks(text);
  return (
    <div className="space-y-2 text-sm leading-relaxed break-words">
      {blocks.map((b, i) => {
        if (b.kind === 'ul' || b.kind === 'ol') {
          const List = b.kind;
          return (
            <List key={i} className={cn('pl-5 space-y-1', b.kind === 'ul' ? 'list-disc' : 'list-decimal')}>
              {b.items.map((it, j) => (
                <li key={j}>{inline(it)}</li>
              ))}
            </List>
          );
        }
        if (b.kind === 'table')
          return (
            <div key={i} className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {b.head.map((c, j) => (
                      <th key={j} className="px-2 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-200">
                        {inline(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, j) => (
                    <tr key={j} className="border-t border-gray-100 dark:border-gray-800 align-top">
                      {row.map((c, k) => (
                        <td key={k} className="px-2 py-1.5 text-gray-700 dark:text-gray-300">
                          {inline(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        const text = 'text' in b ? b.text : '';
        return b.kind === 'h' ? (
          <p key={i} className="font-semibold text-gray-900 dark:text-gray-100">
            {inline(text)}
          </p>
        ) : (
          <p key={i}>{inline(text)}</p>
        );
      })}
    </div>
  );
};

function inline(s: string): React.ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))
      return (
        <code key={i} className="rounded bg-gray-100 px-1 py-0.5 text-[0.85em] dark:bg-gray-800">
          {p.slice(1, -1)}
        </code>
      );
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}
