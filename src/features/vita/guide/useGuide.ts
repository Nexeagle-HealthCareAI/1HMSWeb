import { useCallback, useEffect, useRef, useState } from 'react';
import i18n from 'i18next';
import type { VitaClient } from '../api/vitaClient';
import { findTarget } from './finder';
import { GuideRunner, type RunnerState } from './runner';
import type { GuidePayload, GuideRunEvent } from './types';

/** Label of a 1HMS i18n key in the screen's current language (1HMS's own i18next instance). */
export function translateKey(key: string): string | null {
  try {
    if (!i18n.isInitialized || !i18n.exists(key)) return null;
    const v = i18n.t(key);
    return typeof v === 'string' && v !== key ? v : null;
  } catch {
    return null;
  }
}

const FLUSH_MS = 1500;

/**
 * Runs one guide at a time on the page and reports progress to Vita (batched).
 * `pathname` is the router's current path: route steps finish when it matches.
 */
export function useGuide(client: VitaClient | null, pathname: string) {
  const [state, setState] = useState<RunnerState | null>(null);
  const runner = useRef<GuideRunner | null>(null);
  const runId = useRef<string | null>(null);
  const queue = useRef<GuideRunEvent[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observer = useRef<MutationObserver | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const id = runId.current;
    const events = queue.current.splice(0, 50);
    if (!client || !id || !events.length) return;
    void client.guideEvents(id, events).catch(() => {
      /* progress is best effort: the guide keeps working offline */
    });
    if (queue.current.length) timer.current = setTimeout(flush, FLUSH_MS);
  }, [client]);

  const report = useCallback(
    (e: GuideRunEvent) => {
      queue.current.push(e);
      if (e.type === 'completed' || e.type === 'abandoned' || e.type === 'rated') flush();
      else if (!timer.current) timer.current = setTimeout(flush, FLUSH_MS);
    },
    [flush],
  );

  const detach = useCallback(() => {
    observer.current?.disconnect();
    observer.current = null;
    runner.current?.destroy();
  }, []);

  const start = useCallback(
    (guide: GuidePayload) => {
      if (runner.current && runner.current.state.status === 'running') runner.current.stop();
      detach();
      flush();
      runId.current = guide.runId ?? null;
      const r = new GuideRunner(guide, {
        find: (t) => findTarget(t, { translate: translateKey }),
        getPath: () => window.location.pathname,
        report,
        onChange: (s) => setState(s),
      });
      runner.current = r;
      r.start();
      // 1HMS re-renders all the time (dialogs open, lists load): look for the target again,
      // at most every 200 ms.
      let pending = false;
      const mo = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        setTimeout(() => {
          pending = false;
          runner.current?.refresh();
        }, 200);
      });
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'data-state', 'open'] });
      observer.current = mo;
    },
    [detach, flush, report],
  );

  useEffect(() => {
    runner.current?.locationChanged();
  }, [pathname]);

  useEffect(
    () => () => {
      if (runner.current?.state.status === 'running') runner.current.stop();
      detach();
      flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const rate = useCallback((rating: 'up' | 'down') => report({ type: 'rated', rating }), [report]);

  const close = useCallback(() => {
    if (runner.current?.state.status === 'running') runner.current.stop();
    detach();
    runner.current = null;
    setState(null);
  }, [detach]);

  return {
    state,
    active: !!state,
    start,
    next: () => runner.current?.next(),
    back: () => runner.current?.back(),
    stop: () => runner.current?.stop(),
    rate,
    close,
  };
}
