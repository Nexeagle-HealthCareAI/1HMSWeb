import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GuideCard } from './GuideCard';
import { GUIDE_T } from './text';
import type { RunnerState } from './runner';
import type { GuidePayload } from './types';

const guide = (extra: Partial<GuidePayload> = {}): GuidePayload => ({
  id: 'book-appointment',
  source: 'playbook',
  title: 'Book an appointment',
  lang: 'en',
  steps: [{ id: 's1', screen: null, action: 'review', done: 'next', say: 'Check and finish.', target: null }],
  ...extra,
});

const finished = (g: GuidePayload): RunnerState => ({
  guide: g,
  index: 1,
  step: null,
  status: 'finished',
  found: null,
  missing: false,
  wrongScreen: false,
  done: 1,
  driving: false,
  paused: false,
  acting: false,
});

const card = (g: GuidePayload, onStartNext?: (id: string) => void) =>
  render(
    <GuideCard
      state={finished(g)}
      t={GUIDE_T.en}
      canOpenScreen={() => true}
      onOpenScreen={() => {}}
      onBack={() => {}}
      onNext={() => {}}
      onStop={() => {}}
      onRate={() => {}}
      onClose={() => {}}
      onStartNext={onStartNext}
    />,
  );

describe('GuideCard done', () => {
  it("shows Vita's closing line and starts a next task", () => {
    const start = vi.fn();
    card(
      guide({
        done: {
          say: '**Book an appointment**: every step done. Nicely done, Priya.',
          nextHeader: 'Usually next:',
          next: [{ guideId: 'print-token', title: 'Print a token slip', steps: 1 }],
        },
      }),
      start,
    );
    expect(screen.getByTestId('guide-done').textContent).toContain('Nicely done, Priya.');
    expect(screen.queryByText(GUIDE_T.en.doneSub)).toBeNull();
    expect(screen.getByText('Usually next:')).toBeTruthy();
    fireEvent.click(screen.getByTestId('guide-next-task'));
    expect(start).toHaveBeenCalledWith('print-token');
  });

  it('falls back to the old text when Vita sent no closing line', () => {
    card(guide());
    expect(screen.getByTestId('guide-done').textContent).toBe(GUIDE_T.en.done);
    expect(screen.getByText(GUIDE_T.en.doneSub)).toBeTruthy();
    expect(screen.queryByTestId('guide-next-tasks')).toBeNull();
  });
});
