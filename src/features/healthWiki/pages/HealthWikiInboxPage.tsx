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
import { HealthWikiHeader, HealthWikiPage, HealthWikiTabs, headerGhostBtn, headerPrimaryBtn } from '../components/HealthWikiHeader';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const num = (n: number | null) => (n ?? 0).toLocaleString('en-IN');

function Cover({ a }: { a: InboxArticle }) {
  return a.coverImageUrl ? (
    <img src={a.coverImageUrl} alt="" className="aspect-video w-28 shrink-0 rounded-lg border border-slate-200 dark:border-zinc-800 object-cover sm:w-36" />
  ) : (
    <div aria-hidden="true" className="aspect-video w-28 shrink-0 rounded-lg bg-gradient-to-br from-muted to-accent sm:w-36" />
  );
}

function Row({ a, tab, onOpen }: { a: InboxArticle; tab: InboxTab; onOpen: () => void }) {
  const late = (a.waitingDays ?? 0) >= 3;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-3 text-left transition hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:p-4">
        <Cover a={a} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug text-slate-900 dark:text-zinc-50">{a.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500 dark:text-zinc-400">{a.description}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
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
          <span className="flex shrink-0 gap-4 font-semibold tabular-nums text-slate-900 dark:text-zinc-50" aria-label={`${num(a.views)} views and ${num(a.likes)} likes`}>
            <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4 text-slate-500 dark:text-zinc-400" aria-hidden="true" />{num(a.views)}</span>
            <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-slate-500 dark:text-zinc-400" aria-hidden="true" />{num(a.likes)}</span>
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

  if (isLoading) return <div className="p-6 text-center text-slate-500 dark:text-zinc-400" role="status">Loading…</div>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center" role="alert">
        <p className="font-semibold text-slate-900 dark:text-zinc-50">Could not load your Health Wiki</p>
        <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">{healthWikiErrorMessage(error, 'Try again in a moment.')}</p>
        <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  const views = data.published.reduce((s, a) => s + (a.views ?? 0), 0);
  const likes = data.published.reduce((s, a) => s + (a.likes ?? 0), 0);
  const list = tab === 'pending' ? data.pending : data.published;

  const tabs: { key: InboxTab; label: string; sub: string; count: number }[] = [
    { key: 'pending', label: 'Pending at you', sub: 'Waiting for your review', count: data.pending.length },
    { key: 'published', label: 'Published', sub: `${num(views)} views · ${num(likes)} likes`, count: data.published.length },
  ];

  return (
    <HealthWikiPage>
      <HealthWikiHeader
        icon={BookOpen}
        title="Health Wiki"
        subtitle="Articles for Doctor Dekho that need your medical review, and the ones you approved."
        actions={(
          <>
            <button type="button" className={headerGhostBtn} onClick={() => navigate(`${base}/topics`)}><Lightbulb className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Suggest a topic</button>
            <button type="button" className={headerPrimaryBtn} onClick={() => write('write')} disabled={handoff.isPending}><PenLine className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{handoff.isPending ? 'Opening…' : 'Write an article'}</button>
          </>
        )}
      >
        <HealthWikiTabs label="Health Wiki" active={tab} onChange={(k) => setTab(k as InboxTab)} tabs={tabs} />
      </HealthWikiHeader>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-10 text-center" role="tabpanel">
          <p className="font-semibold text-slate-900 dark:text-zinc-50">{tab === 'pending' ? 'You are all caught up' : 'Nothing published yet'}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{tab === 'pending' ? 'New articles that need your review will show up here.' : 'Approved articles and how many people read them appear here.'}</p>
        </div>
      ) : (
        <ul className="space-y-3" role="tabpanel">
          {list.map((a) => <Row key={a.slug} a={a} tab={tab} onOpen={() => navigate(`${base}/${a.slug}`)} />)}
        </ul>
      )}
    </HealthWikiPage>
  );
}
