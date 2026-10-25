import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';
import type { ArticleDetail } from '../types';
import { ARTICLE_TYPE_LABEL } from '../types';
import ArticleBody from './ArticleBody';

const initials = (name: string) => name.replace(/^dr\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** The article as readers will see it on Doctor Dekho, with the signed-in doctor named as reviewer. */
export default function ArticlePreview({ article }: { article: ArticleDetail }) {
  const r = article.reviewer;
  const reg = r.registrationNumber ? `Reg. ${r.registrationNumber}${r.registrationCouncil ? ` · ${r.registrationCouncil}` : ''}` : null;
  const refs = (article.references ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

  return (
    <article className="min-w-0 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm sm:p-8">
      <span className="mb-4 inline-block rounded-full border border-sky-100 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
        {ARTICLE_TYPE_LABEL[article.type]}
      </span>
      <h2 className="mb-4 break-words text-3xl font-extrabold leading-tight text-slate-900 dark:text-zinc-50">{article.title}</h2>
      {article.description && <p className="mb-6 text-lg leading-relaxed text-slate-500 dark:text-zinc-400">{article.description}</p>}
      {article.coverImageUrl && <img src={article.coverImageUrl} alt={article.coverImageAlt ?? ''} className="mb-6 aspect-video w-full rounded-2xl border border-slate-200 dark:border-zinc-800 object-cover" />}

      <div className="mb-8 flex flex-col gap-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 p-5 sm:flex-row sm:gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 font-bold text-primary-foreground">{initials(r.name)}</div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Medically reviewed by</p>
            <p className="text-sm font-bold text-slate-900 dark:text-zinc-50">{r.name}</p>
            {(r.qualification || r.speciality) && <p className="break-words text-xs text-slate-500 dark:text-zinc-400">{[r.qualification, r.speciality].filter(Boolean).join(' • ')}</p>}
            {reg && <p className="break-words text-xs text-slate-500 dark:text-zinc-400">{reg}</p>}
          </div>
        </div>
        <div className="hidden w-px bg-slate-50 dark:bg-zinc-800 sm:block" aria-hidden="true" />
        <div className="flex flex-col justify-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" aria-hidden="true" /> Updated {fmt(article.updatedAt)}</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" /> Evidence based</span>
        </div>
      </div>

      {article.disclosure && <p className="mb-6 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"><b>Disclosure: </b>{article.disclosure}</p>}
      <ArticleBody markdown={article.content} />
      {refs.length > 0 && (
        <section aria-labelledby="hw-refs" className="mt-8 border-t border-slate-200 dark:border-zinc-800 pt-5">
          <h3 id="hw-refs" className="mb-2 text-lg font-bold text-slate-900 dark:text-zinc-50">References</h3>
          <ol className="ml-5 list-decimal space-y-1 text-sm text-slate-500 dark:text-zinc-400">{refs.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </section>
      )}
    </article>
  );
}
