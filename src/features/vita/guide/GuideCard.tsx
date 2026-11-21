import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  ExternalLink,
  Hand,
  MousePointerClick,
  Pause,
  Play,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BoldText } from './GuideOverlay';
import { openableScreen, type RunnerState } from './runner';
import { stepText, type GuideStrings } from './text';
import { VITA_Z } from '../components/VitaLayer';

/**
 * Small card that replaces the Vita panel while a guide runs, so the 1HMS screen stays free.
 * The user can always go Back, press Next / Skip, or Stop.
 */
/** Do mode: who does this step. Vita (with Pause), the user ("Your turn"), or paused. */
const DriveStatus: React.FC<{
  state: RunnerState;
  t: GuideStrings;
  onPause?: () => void;
  onResume?: () => void;
}> = ({ state, t, onPause, onResume }) => {
  const step = state.step!;
  const label = state.found?.shown || step.target?.label || step.screen?.label || '';
  if (state.paused)
    return (
      <div data-testid="guide-drive" data-drive="paused" className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <Hand className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">{t.paused}</span>
        <button type="button" data-testid="guide-resume" onClick={onResume} className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 font-semibold text-white">
          <Play className="h-3 w-3" /> {t.resume}
        </button>
      </div>
    );
  if (step.auto)
    return (
      <div data-testid="guide-drive" data-drive="vita" className="flex items-center gap-2 rounded-lg bg-violet-50 px-2 py-1.5 text-xs text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
        <MousePointerClick className={cn('h-3.5 w-3.5 shrink-0', state.acting && 'animate-pulse')} />
        <span className="flex-1">{step.action === 'navigate' ? t.actingNav(label) : t.acting(label)}</span>
        <button type="button" data-testid="guide-pause" onClick={onPause} className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-2 py-1 font-semibold dark:border-violet-800">
          <Pause className="h-3 w-3" /> {t.pause}
        </button>
      </div>
    );
  const finalPress = step.action === 'click';
  return (
    <div data-testid="guide-drive" data-drive="you" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
      <Hand className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{finalPress ? t.yourTurnSave : t.yourTurn}</span>
    </div>
  );
};

export const GuideCard: React.FC<{
  state: RunnerState;
  t: GuideStrings;
  canOpenScreen: (route: string) => boolean;
  onOpenScreen: (route: string) => void;
  onBack: () => void;
  onNext: () => void;
  onStop: () => void;
  onRate: (r: 'up' | 'down') => void;
  onClose: () => void;
  /** Start one of the "usually next" guides from the done card. */
  onStartNext?: (guideId: string) => void;
  onPause?: () => void;
  onResume?: () => void;
}> = ({ state, t, canOpenScreen, onOpenScreen, onBack, onNext, onStop, onRate, onClose, onStartNext, onPause, onResume }) => {
  const [rated, setRated] = useState<'up' | 'down' | null>(null);
  const { guide, step } = state;
  const target = openableScreen(step?.screen ?? null);
  const n = guide.steps.length;
  const finished = state.status === 'finished';
  const pct = finished ? 100 : Math.round((state.index / n) * 100);

  return (
    <section
      data-vita-ui="guide-card"
      role="region"
      aria-label="Vita guide"
      aria-live="polite"
      // 1HMS dialogs (Radix) turn off pointer events outside themselves and close when the user
      // presses outside: keep the card usable and don't close the 1HMS dialog the guide is about.
      style={{ zIndex: VITA_Z.card, pointerEvents: 'auto' }}
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-x-2 bottom-2 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[360px] rounded-2xl border border-violet-200 bg-white shadow-2xl dark:border-violet-900 dark:bg-gray-900"
    >
      <header className="flex items-center gap-2 rounded-t-2xl bg-gradient-to-r from-violet-600 to-brand-600 px-3 py-2 text-white">
        <Compass className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 truncate text-sm font-semibold" title={guide.title}>
          {guide.title}
        </div>
        <button
          type="button"
          onClick={finished ? onClose : onStop}
          className="rounded-md p-1 hover:bg-white/15"
          aria-label={finished ? t.close : t.stop}
          title={finished ? t.close : t.stop}
        >
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="h-1 bg-violet-100 dark:bg-violet-950">
        <div className="h-1 bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-2 px-3 py-3 text-sm text-gray-800 dark:text-gray-100">
        {finished ? (
          <div className="space-y-2 text-center">
            <div className="text-base font-bold" data-testid="guide-done">
              {guide.done?.say ? <BoldText text={guide.done.say} /> : t.done}
            </div>
            {!guide.done?.say && <div className="text-xs text-gray-500">{t.doneSub}</div>}
            {onStartNext && !!guide.done?.next?.length && (
              <div className="space-y-1 pt-1 text-left" data-testid="guide-next-tasks">
                {guide.done.nextHeader && <div className="text-[11px] font-medium text-gray-500">{guide.done.nextHeader}</div>}
                {guide.done.next.map((g) => (
                  <button
                    key={g.guideId}
                    type="button"
                    data-testid="guide-next-task"
                    onClick={() => onStartNext(g.guideId)}
                    className="flex w-full items-center gap-2 rounded-lg border border-violet-200 px-2 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-200 dark:hover:bg-violet-900/30"
                  >
                    <Compass className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{g.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-center gap-2 pt-1">
              {(['up', 'down'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={!!rated}
                  onClick={() => {
                    setRated(r);
                    onRate(r);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs',
                    rated === r ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-violet-300',
                  )}
                >
                  {r === 'up' ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                  {r === 'up' ? t.helpful : t.notHelpful}
                </button>
              ))}
            </div>
            {rated && <div className="text-[11px] text-gray-400">{t.thanks}</div>}
            <button type="button" onClick={onClose} className="mt-1 text-xs font-semibold text-violet-700">
              {t.close}
            </button>
          </div>
        ) : step ? (
          <>
            <div className="flex items-center justify-between text-[11px] font-medium text-gray-500">
              <span data-testid="guide-step">{t.step(state.index + 1, n)}</span>
              {step.optional && <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">{t.optional}</span>}
            </div>
            <p className="leading-snug" data-testid="guide-say">
              <BoldText text={stepText(step, state.found?.shown)} />
            </p>
            {(state.driving || state.paused) && (
              <DriveStatus state={state} t={t} onPause={onPause} onResume={onResume} />
            )}
            {step.note && <p className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">{step.note}</p>}
            {(state.wrongScreen || step.action === 'navigate') && step.screen && (
              <div className="space-y-1 rounded-lg bg-violet-50 px-2 py-1.5 text-xs text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
                {state.wrongScreen && <div>{t.wrongScreen(step.screen.label)}</div>}
                {target && canOpenScreen(target.route) && (
                  <button
                    type="button"
                    data-testid="guide-take-me"
                    onClick={() => onOpenScreen(target.route)}
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    <ExternalLink className="h-3 w-3" /> {t.takeMe(target.label)}
                  </button>
                )}
              </div>
            )}
            {state.missing && !state.wrongScreen && (
              <p className="rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300" data-testid="guide-missing">
                {t.missing}
              </p>
            )}
            {guide.source === 'generated' && <p className="text-[10.5px] text-gray-400">{t.generated}</p>}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onBack}
                disabled={state.index === 0}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> {t.back}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={onNext}
                data-testid="guide-next"
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold',
                  step.done === 'next' || state.missing
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'border border-gray-200 text-gray-600 hover:border-violet-300 dark:border-gray-700 dark:text-gray-300',
                )}
              >
                {step.done === 'next' || state.missing ? (
                  <>
                    {state.index + 1 === n ? <Check className="h-3.5 w-3.5" /> : null}
                    {t.next} <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    {t.skip} <SkipForward className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};
