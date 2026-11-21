import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAddTopicDetail, useCreateTopic, useTopics, useWriteHandoff } from '../hooks';
import { ARTICLE_TYPE_LABEL, OPEN_TOPIC_LIMIT, TOPIC_STATUS_LABEL, type ArticleType, type TopicRequest } from '../types';
import { healthWikiErrorMessage } from '../api/healthWikiApi';
import { useHealthWikiBase } from '../baseContext';
import { HealthWikiHeader, HealthWikiPage, headerGhostBtn, headerPrimaryBtn } from '../components/HealthWikiHeader';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fieldClass = 'w-full rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-slate-900 dark:text-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
const TONE: Record<TopicRequest['status'], string> = {
  SUBMITTED: 'bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-zinc-50', NEEDS_DETAIL: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300', ACCEPTED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  DECLINED: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300', ARTICLE_STARTED: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
};

function SuggestForm({ onDone }: { onDone: () => void }) {
  const create = useCreateTopic();
  const [type, setType] = useState<ArticleType>('MEDICAL');
  const [title, setTitle] = useState('');
  const [outline, setOutline] = useState('');
  const [why, setWhy] = useState('');
  const [references, setReferences] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !outline.trim() || !why.trim()) {
      setError('Fill in the topic, what you would write about, and why readers need it.');
      return;
    }
    setError('');
    create.mutate(
      { title: title.trim(), type, outline: outline.trim(), whyItMatters: why.trim(), references: references.trim() || null, requestWriter: true },
      {
        onSuccess: () => { toast({ title: 'Sent to the team. You will hear back on WhatsApp.' }); onDone(); },
        onError: (err) => setError(healthWikiErrorMessage(err)),
      },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4 sm:p-6" aria-label="Suggest a topic">
      <h2 className="font-semibold text-slate-900 dark:text-zinc-50">Suggest a topic</h2>
      <div>
        <label htmlFor="tp-type" className="mb-1 block text-sm font-medium text-slate-900 dark:text-zinc-50">Type</label>
        <select id="tp-type" className={fieldClass} value={type} onChange={(e) => setType(e.target.value as ArticleType)}>
          <option value="MEDICAL">{ARTICLE_TYPE_LABEL.MEDICAL}: a doctor reviews it</option>
          <option value="SECTOR_UPDATE">{ARTICLE_TYPE_LABEL.SECTOR_UPDATE}: news and trends, no medical advice</option>
        </select>
      </div>
      <div>
        <label htmlFor="tp-title" className="mb-1 block text-sm font-medium text-slate-900 dark:text-zinc-50">Topic</label>
        <input id="tp-title" className={fieldClass} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Recognising a silent heart attack" />
      </div>
      <div>
        <label htmlFor="tp-outline" className="mb-1 block text-sm font-medium text-slate-900 dark:text-zinc-50">What would you write about?</label>
        <textarea id="tp-outline" rows={4} className={fieldClass} maxLength={2000} value={outline} onChange={(e) => setOutline(e.target.value)} />
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">A few lines on the main points.</p>
      </div>
      <div>
        <label htmlFor="tp-why" className="mb-1 block text-sm font-medium text-slate-900 dark:text-zinc-50">Why does it matter?</label>
        <textarea id="tp-why" rows={3} className={fieldClass} maxLength={1000} value={why} onChange={(e) => setWhy(e.target.value)} />
      </div>
      <div>
        <label htmlFor="tp-refs" className="mb-1 block text-sm font-medium text-slate-900 dark:text-zinc-50">References <span className="font-normal text-slate-500 dark:text-zinc-400">(optional)</span></label>
        <textarea id="tp-refs" rows={2} className={fieldClass} value={references} onChange={(e) => setReferences(e.target.value)} />
      </div>
      <p className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 p-3 text-sm text-slate-900 dark:text-zinc-50">
        <b>The NexEagle team writes this one.</b>{' '}
        The team picks a writer{type === 'MEDICAL' ? ', and you review the article before it goes live' : ''}. If you would rather write an article yourself, use <i>Write an article</i>: as a verified doctor you can publish it directly.
      </p>
      {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Sending…' : 'Send to the team'}</Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={create.isPending}>Cancel</Button>
      </div>
    </form>
  );
}

function DetailForm({ t }: { t: TopicRequest }) {
  const add = useAddTopicDetail();
  const [outline, setOutline] = useState(t.outline);
  const [why, setWhy] = useState(t.whyItMatters);
  const [error, setError] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outline.trim() || !why.trim()) { setError('The outline and why it matters cannot be empty.'); return; }
    add.mutate({ id: t.id, outline: outline.trim(), whyItMatters: why.trim() }, {
      onSuccess: () => toast({ title: 'Sent back to the team.' }),
      onError: (err) => setError(healthWikiErrorMessage(err)),
    });
  };
  return (
    <form onSubmit={submit} noValidate className="mt-3 space-y-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3" aria-label={`Add detail to ${t.title}`}>
      <p className="text-sm text-amber-900 dark:text-amber-100"><b>The team asks:</b> {t.decisionNote}</p>
      <label htmlFor={`d-outline-${t.id}`} className="block text-sm font-medium text-slate-900 dark:text-zinc-50">What would you write about?</label>
      <textarea id={`d-outline-${t.id}`} rows={3} className={fieldClass} value={outline} onChange={(e) => setOutline(e.target.value)} />
      <label htmlFor={`d-why-${t.id}`} className="block text-sm font-medium text-slate-900 dark:text-zinc-50">Why does it matter?</label>
      <textarea id={`d-why-${t.id}`} rows={2} className={fieldClass} value={why} onChange={(e) => setWhy(e.target.value)} />
      {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      <Button type="submit" size="sm" disabled={add.isPending}>Send the detail</Button>
    </form>
  );
}

export default function HealthWikiTopicsPage() {
  const navigate = useNavigate();
  const base = useHealthWikiBase();
  const { data, isLoading, error, refetch } = useTopics();
  const handoff = useWriteHandoff();
  const [adding, setAdding] = useState(false);

  const openCount = (data ?? []).filter((t) => t.status === 'SUBMITTED' || t.status === 'NEEDS_DETAIL').length;
  const full = openCount >= OPEN_TOPIC_LIMIT;

  const write = () => handoff.mutate('write', {
    onSuccess: (r) => window.location.assign(r.url),
    onError: (e) => toast({ title: healthWikiErrorMessage(e), variant: 'destructive' }),
  });

  if (isLoading) return <div className="p-6 text-center text-slate-500 dark:text-zinc-400" role="status">Loading…</div>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center" role="alert">
        <p className="font-semibold text-slate-900 dark:text-zinc-50">Could not load your topics</p>
        <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">{healthWikiErrorMessage(error, 'Try again in a moment.')}</p>
        <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  return (
    <HealthWikiPage>
      <HealthWikiHeader
        icon={Lightbulb}
        title="My topic suggestions"
        subtitle="Suggest what Doctor Dekho should cover. The NexEagle team writes it and you review it."
        back={{ label: 'Health Wiki', onClick: () => navigate(base) }}
        actions={(
          <>
            <button type="button" className={headerGhostBtn} onClick={write} disabled={handoff.isPending}><PenLine className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{handoff.isPending ? 'Opening…' : 'Write an article'}</button>
            <button type="button" className={headerPrimaryBtn} onClick={() => setAdding(true)} disabled={adding || full}>Suggest a topic</button>
          </>
        )}
      />

      {full && <p className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">You already have {OPEN_TOPIC_LIMIT} open requests. Wait for a decision before you send another.</p>}
      {adding && <SuggestForm onDone={() => setAdding(false)} />}

      {data.length === 0 && !adding ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-10 text-center">
          <p className="font-semibold text-slate-900 dark:text-zinc-50">No suggestions yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Use Suggest a topic to send your first one.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((t) => (
            <li key={t.id} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold leading-snug text-slate-900 dark:text-zinc-50">{t.title}</p>
                <span className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 text-sky-700 dark:text-sky-300">{ARTICLE_TYPE_LABEL[t.type]}</span>
                  {t.requestWriter && <span className="rounded-full bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 text-violet-700 dark:text-violet-300">Writer requested</span>}
                  <span className={cn('rounded-full px-2 py-0.5', TONE[t.status])}>{TOPIC_STATUS_LABEL[t.status]}</span>
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-zinc-400">{t.outline}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Sent {fmt(t.createdAt)}</p>
              {t.status === 'DECLINED' && t.decisionNote && <p className="mt-3 rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200"><b>Not taken up:</b> {t.decisionNote}</p>}
              {t.status === 'NEEDS_DETAIL' && <DetailForm t={t} />}
              {(t.status === 'ACCEPTED' || t.status === 'ARTICLE_STARTED') && (
                <p className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                  {t.requestWriter
                    ? 'The team accepted this and is arranging a writer. You will get a WhatsApp message when the article is ready for your review.'
                    : 'The team accepted this. A draft is waiting for you on Doctor Dekho: choose Write an article, then open My drafts.'}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </HealthWikiPage>
  );
}
