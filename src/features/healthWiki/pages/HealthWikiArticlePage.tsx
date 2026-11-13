import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Eye, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { healthWikiErrorMessage } from '../api/healthWikiApi';
import { useHealthWikiBase } from '../baseContext';
import ArticlePreview from '../components/ArticlePreview';
import { HealthWikiHeader, HealthWikiPage, headerPrimaryBtn } from '../components/HealthWikiHeader';
import { liveArticleUrl } from '../liveUrl';
import ViewsChart from '../components/ViewsChart';
import { useArticle, useReview } from '../hooks';
import { MIN_CHANGE_COMMENT, type ArticleDetail } from '../types';

const num = (n: number | null) => (n ?? 0).toLocaleString('en-IN');

function DecisionPanel({ article }: { article: ArticleDetail }) {
  const navigate = useNavigate();
  const base = useHealthWikiBase();
  const review = useReview(article.slug);
  const [checked, setChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const r = article.reviewer;

  const done = (title: string) => { toast({ title }); navigate(base); };
  const fail = (e: unknown) => toast({ title: healthWikiErrorMessage(e), variant: 'destructive' });

  const approve = () => review.mutate({ decision: 'APPROVE', accuracyConfirmed: true }, {
    onSuccess: (res) => done(res.outcome === 'APPROVED_AWAITING_VERIFICATION' ? 'Approved. It goes live once your registration is verified.' : 'Published on Doctor Dekho.'),
    onError: fail,
  });
  const requestChanges = () => {
    if (comment.trim().length < MIN_CHANGE_COMMENT) return setCommentError('Add a short comment so the writer knows what to change.');
    setCommentError('');
    review.mutate({ decision: 'REQUEST_CHANGES', comment: comment.trim() }, { onSuccess: () => done('Sent back to the writer with your comment.'), onError: fail });
  };

  return (
    <aside aria-label="Your review" className="space-y-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 lg:sticky lg:top-4">
      <h2 className="font-bold text-slate-900 dark:text-zinc-50">Your review</h2>
      <div className="space-y-0.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800 p-3 text-xs text-slate-500 dark:text-zinc-400">
        <p className="font-semibold text-slate-900 dark:text-zinc-50">The badge will show</p>
        <p>{r.name}</p>
        {(r.qualification || r.speciality) && <p>{[r.qualification, r.speciality].filter(Boolean).join(' • ')}</p>}
        {r.registrationNumber ? <p>Reg. {r.registrationNumber}{r.registrationCouncil ? ` · ${r.registrationCouncil}` : ''}</p> : <p className="text-amber-700 dark:text-amber-300">No registration number on your profile yet.</p>}
      </div>

      {confirming ? (
        <div role="alertdialog" aria-label="Confirm approval" className="space-y-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4">
          <p className="font-semibold text-emerald-900 dark:text-emerald-100">Publish this article now?</p>
          <p className="text-sm text-emerald-900 dark:text-emerald-100">It goes live on Doctor Dekho right away, with your name as the reviewer. This cannot be undone from here.</p>
          <div className="flex gap-2">
            <Button onClick={approve} disabled={review.isPending} className="bg-emerald-600 hover:bg-emerald-700">Publish</Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={review.isPending}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-900 dark:text-zinc-50">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-600" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>I have checked this article for medical accuracy.</span>
          </label>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!checked || review.isPending} onClick={() => setConfirming(true)}>Approve and publish</Button>

          <div className="space-y-1.5 border-t border-slate-200 dark:border-zinc-800 pt-4">
            <label htmlFor="hw-changes" className="block text-sm font-semibold text-slate-900 dark:text-zinc-50">Need changes?</label>
            <Textarea id="hw-changes" rows={4} placeholder="Tell the writer what to fix. For example: add when to see a doctor." value={comment} onChange={(e) => setComment(e.target.value)} />
            {commentError && <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">{commentError}</p>}
          </div>
          <Button variant="outline" className="w-full border-amber-500 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40" disabled={review.isPending} onClick={requestChanges}>Request changes</Button>
        </>
      )}
    </aside>
  );
}

function PerformancePanel({ article }: { article: ArticleDetail }) {
  return (
    <aside aria-label="Performance" className="space-y-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 lg:sticky lg:top-4">
      <h2 className="font-bold text-slate-900 dark:text-zinc-50">Performance</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-zinc-800 p-3"><p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400"><Eye className="h-3.5 w-3.5" aria-hidden="true" /> Views so far</p><p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">{num(article.views)}</p></div>
        <div className="rounded-xl bg-slate-50 dark:bg-zinc-800 p-3"><p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400"><Heart className="h-3.5 w-3.5" aria-hidden="true" /> Likes</p><p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-zinc-50">{num(article.likes)}</p></div>
      </div>
      {article.dailyViews.length > 0 ? (
        <div><p className="mb-1 text-sm font-semibold text-slate-900 dark:text-zinc-50">Views, last {article.dailyViews.length} days</p><ViewsChart values={article.dailyViews} /></div>
      ) : (
        <p className="text-sm text-slate-500 dark:text-zinc-400">Daily views appear once people start reading.</p>
      )}
      <p className="rounded-xl bg-slate-50 dark:bg-zinc-800 p-3 text-xs text-slate-500 dark:text-zinc-400">Shown as <b>Medically reviewed by {article.reviewer.name}</b>{article.publishedAt ? ` since ${new Date(article.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.</p>
    </aside>
  );
}

export default function HealthWikiArticlePage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const base = useHealthWikiBase();
  const { data, isLoading, error, refetch } = useArticle(slug);

  if (isLoading) return <div className="p-6 text-center text-slate-500 dark:text-zinc-400" role="status">Loading…</div>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center" role="alert">
        <p className="font-semibold text-slate-900 dark:text-zinc-50">Could not load this article</p>
        <p className="mb-4 text-sm text-slate-500 dark:text-zinc-400">{healthWikiErrorMessage(error, 'It may have been moved or you may not have access.')}</p>
        <div className="flex justify-center gap-2"><Button variant="outline" onClick={() => void refetch()}>Try again</Button><Button variant="outline" onClick={() => navigate(base)}>Back to Health Wiki</Button></div>
      </div>
    );
  }

  return (
    <HealthWikiPage>
      <HealthWikiHeader
        icon={BookOpen}
        title={data.title}
        back={{ label: 'Health Wiki', onClick: () => navigate(base) }}
        actions={data.status === 'PUBLISHED' ? <a href={liveArticleUrl(data.slug)} className={headerPrimaryBtn}>View on Doctor Dekho</a> : undefined}
        subtitle={data.status === 'IN_REVIEW' ? `Written by ${data.authorName}${data.waitingDays !== null ? ` · sent for your review ${data.waitingDays} ${data.waitingDays === 1 ? 'day' : 'days'} ago` : ''}` : 'Published · reviewed by you'}
      />
      {data.status === 'IN_REVIEW' && !data.canDecide && <p role="status" className="rounded-xl bg-sky-50 dark:bg-sky-950/40 px-4 py-3 text-sm text-sky-900 dark:text-sky-100">This article is not assigned to you, so you can read it but not decide.</p>}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ArticlePreview article={data} />
        {data.status === 'IN_REVIEW' ? (data.canDecide ? <DecisionPanel article={data} /> : null) : <PerformancePanel article={data} />}
      </div>
    </HealthWikiPage>
  );
}
