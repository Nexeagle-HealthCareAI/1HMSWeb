import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Eye, Heart, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useInbox } from '../hooks';
import { ARTICLE_TYPE_LABEL, type InboxArticle, type InboxTab } from '../types';
import { healthWikiErrorMessage } from '../api/healthWikiApi';
import { useHealthWikiBase } from '../baseContext';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const num = (n: number | null) => (n ?? 0).toLocaleString('en-IN');

function Cover({ a }: { a: InboxArticle }) {
  return a.coverImageUrl ? (
    <img src={a.coverImageUrl} alt="" className="aspect-video w-28 shrink-0 rounded-lg border border-slate-200 object-cover sm:w-36" />
  ) : (
    <div aria-hidden="true" className="aspect-video w-28 shrink-0 rounded-lg bg-gradient-to-br from-indigo-100 to-emerald-100 sm:w-36" />
  );
}

function Row({ a, tab, onOpen }: { a: InboxArticle; tab: InboxTab; onOpen: () => void }) {
  const late = (a.waitingDays ?? 0) >= 3;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 sm:p-4">
        <Cover a={a} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold leading-snug text-slate-900">{a.title}</span>
          <span className="mt-0.5 line-clamp-2 block text-sm text-slate-500">{a.description}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="rounded-full bg-sky-50 px-2 py-0.5 font-semibold text-sky-700">{ARTICLE_TYPE_LABEL[a.type]}</span>
            {tab === 'pending' ? (
              <>
                <span>Written by {a.authorName}</span>
                {a.waitingDays !== null && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', late ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700')}>
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
          <span className="hidden rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white sm:inline-block">Review</span>
        ) : (
          <span className="flex shrink-0 gap-4 font-semibold tabular-nums text-slate-700" aria-label={`${num(a.views)} views and ${num(a.likes)} likes`}>
            <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4 text-slate-400" aria-hidden="true" />{num(a.views)}</span>
            <span className="inline-flex items-center gap-1.5"><Heart className="h-4 w-4 text-slate-400" aria-hidden="true" />{num(a.likes)}</span>
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

  if (isLoading) return <div className="p-6 text-center text-slate-500" role="status">Loading…</div>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center" role="alert">
        <p className="font-semibold text-slate-900">Could not load your Health Wiki</p>
        <p className="mb-4 text-sm text-slate-600">{healthWikiErrorMessage(error, 'Try again in a moment.')}</p>
        <Button variant="outline" onClick={() => void refetch()}>Try again</Button>
      </div>
    );
  }

  const views = data.published.reduce((s, a) => s + (a.views ?? 0), 0);
  const likes = data.published.reduce((s, a) => s + (a.likes ?? 0), 0);
  const list = tab === 'pending' ? data.pending : data.published;

  const tabs: { key: InboxTab; label: string; sub: string; count: number; tone: string }[] = [
    { key: 'pending', label: 'Pending at you', sub: 'Waiting for your review', count: data.pending.length, tone: 'text-amber-600' },
    { key: 'published', label: 'Published', sub: `${num(views)} views · ${num(likes)} likes`, count: data.published.length, tone: 'text-emerald-600' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><BookOpen className="h-6 w-6 text-indigo-600" aria-hidden="true" /> Health Wiki</h1>
        <p className="text-sm text-slate-500">Articles for Doctor Dekho that need your medical review, and the ones you approved.</p>
      </header>

      <div role="tablist" aria-label="Health Wiki" className="grid gap-3 sm:grid-cols-2">
        {tabs.map((t) => (
          <button
            key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={cn('flex items-center gap-4 rounded-xl border-[1.5px] p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500', tab === t.key ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300')}
          >
            <span className={cn('min-w-[2ch] text-3xl font-bold tabular-nums', t.tone)}>{t.count}</span>
            <span>
              <span className="block font-semibold text-slate-900">{t.label}</span>
              <span className="block text-xs text-slate-500">{t.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center" role="tabpanel">
          <p className="font-semibold text-slate-900">{tab === 'pending' ? 'You are all caught up' : 'Nothing published yet'}</p>
          <p className="mt-1 text-sm text-slate-500">{tab === 'pending' ? 'New articles that need your review will show up here.' : 'Approved articles and how many people read them appear here.'}</p>
        </div>
      ) : (
        <ul className="space-y-3" role="tabpanel">
          {list.map((a) => <Row key={a.slug} a={a} tab={tab} onOpen={() => navigate(`${base}/${a.slug}`)} />)}
        </ul>
      )}
    </div>
  );
}
