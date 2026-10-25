import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, Heart, Clock, PenLine, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useInbox, useWriteHandoff } from '../hooks';
import { ARTICLE_TYPE_LABEL, type InboxArticle, type InboxTab } from '../types';
import { healthWikiErrorMessage } from '../api/healthWikiApi';
import { useHealthWikiBase } from '../baseContext';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const num = (n: number | null) => (n ?? 0).toLocaleString('en-IN');

function Cover({ a }: { a: InboxArticle }) {
  return a.coverImageUrl ? (
    <img src={a.coverImageUrl} alt="" className="aspect-video w-28 shrink-0 rounded-lg border border-border object-cover sm:w-36" />
  ) : (
    <div aria-hidden="true" className="aspect-video w-28 shrink-0 rounded-lg bg-gradient-to-br from-muted to-accent sm:w-36" />
  );
}

function Row({ a, tab, onOpen }: { a: InboxArticle; tab: InboxTab; onOpen: () => void }) {
  const late = (a.waitingDays ?? 0) >= 3;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-4">
        <Cover a={a} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug text-foreground">{a.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{a.description}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="rounded-full bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 font-semibold text-sky-700 dark:text-sky-300">{ARTICLE_TYPE_LABEL[a.type]}</span>
            {tab === 'pending' ? (
              <>
                <span>Written by {a.authorName}</span>
                {a.waitingDays !== null && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', late ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300')}>
                    <Clock className="h-3 w-3" aria-hidden="true" /> {a.waitingDays === 0 ? 'Sent today' : `Waiting ${a.waitingDays} ${a.waitingDays === 1 ? 'day' : 'days'}`}
                  </span>
                )}
              </>
            ) : (
              a.publishedAt && <span>Published {fmt(a.publishedAt)}</span>
            )}
          </span>
        </span>
        {tab === 'pending' ? (
          <span className="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:inline-block">Review</span>
        ) : (
          <span className="flex shrink-0 gap-4 font-semibold tabular-nums text-foreground" aria-label={`${num(a.views)} views and ${num(a.likes)} likes`}>
            <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{num(a.views)}</span>
            <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{num(a.likes)}</span>
          </span>
        )}
      </button>
    </li>
  );
}

export default function HealthWikiInboxPage() {
  const navigate = useNavigate();
  const base = useHealthWikiBase();
  const { data, isLoading, error, refetch } = useInbox();
  const [tab, setTab] = useState<InboxTab>('pending');
  const handoff = useWriteHandoff();
  // Doctor Dekho signs the doctor in with a one-time address, so no WhatsApp code is needed.
  const write = (to: 'write' | 'drafts') => handoff.mutate(to, {
    onSuccess: (r) => window.location.assign(r.url),
    onError: (e) => toast({ title: healthWikiErrorMessage(e), variant: 'destructive' }),
  });

  if (isLoading) return <div className="p-6 text-center text-muted-foreground" role="status">Loading…</div>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center" role="alert">
        <p className="font-semibold text-foreground">Could not load your Health Wiki</p>
        <p className="mb-4 text-sm text-muted-foreground">{healthWikiErrorMessage(error, 'Try again in a moment.')}</p>
        <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  const views = data.published.reduce((s, a) => s + (a.views ?? 0), 0);
  const likes = data.published.reduce((s, a) => s + (a.likes ?? 0), 0);
  const list = tab === 'pending' ? data.pending : data.published;

  const tabs: { key: InboxTab; label: string; sub: string; count: number; tone: string }[] = [
    { key: 'pending', label: 'Pending at you', sub: 'Waiting for your review', count: data.pending.length, tone: 'text-amber-600 dark:text-amber-400' },
    { key: 'published', label: 'Published', sub: `${num(views)} views · ${num(likes)} likes`, count: data.published.length, tone: 'text-emerald-600 dark:text-emerald-400' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><BookOpen className="h-6 w-6 text-primary" aria-hidden="true" /> Health Wiki</h1>
          <p className="text-sm text-muted-foreground">Articles for Doctor Dekho that need your medical review, and the ones you approved.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`${base}/topics`)}><Lightbulb className="mr-2 h-4 w-4" aria-hidden="true" />Suggest a topic</Button>
          <Button onClick={() => write('write')} disabled={handoff.isPending}><PenLine className="mr-2 h-4 w-4" aria-hidden="true" />{handoff.isPending ? 'Opening…' : 'Write an article'}</Button>
        </div>
      </header>

      <div role="tablist" aria-label="Health Wiki" className="grid gap-3 sm:grid-cols-2">
        {tabs.map((t) => (
          <button
            key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={cn('flex items-center gap-4 rounded-xl border-[1.5px] p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary', tab === t.key ? 'border-primary bg-muted' : 'border-border bg-card hover:border-primary')}
          >
            <span className={cn('min-w-[2ch] text-3xl font-bold tabular-nums', t.tone)}>{t.count}</span>
            <span>
              <span className="block font-semibold text-foreground">{t.label}</span>
              <span className="block text-xs text-muted-foreground">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center" role="tabpanel">
          <p className="font-semibold text-foreground">{tab === 'pending' ? 'You are all caught up' : 'Nothing published yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{tab === 'pending' ? 'New articles that need your review will show up here.' : 'Approved articles and how many people read them appear here.'}</p>
        </div>
      ) : (
        <ul className="space-y-3" role="tabpanel">
          {list.map((a) => <Row key={a.slug} a={a} tab={tab} onOpen={() => navigate(`${base}/${a.slug}`)} />)}
        </ul>
      )}
    </div>
  );
}
