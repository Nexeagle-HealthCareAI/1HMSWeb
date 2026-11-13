/**
 * Guide runner: walks the user through a guide on the real screen.
 *
 * Guide mode: it only watches. It never clicks, types or reads a value: a "fill" step is done
 * when the user types in the highlighted field (the input event), whatever they type.
 *
 * Do mode (guide.drive): it also does the steps the server marked `auto` (going to a screen, a
 * tab, a button that opens a form), after a short pause so the user sees what is clicked, and
 * puts the cursor in each field the user has to fill. It still never types or reads a value,
 * never picks a row or an option, and never presses a button that saves, pays or deletes. A real
 * press or key anywhere on the page while Vita is about to act pauses it: the user is in control.
 *
 *   navigate  done when the page route is the step's screen (skipped if already there)
 *   click     done when the user clicks the highlighted element (or anything inside it)
 *   fill      done when the user has typed in the highlighted field (or changed a select)
 *   choose    done when the user clicks anything inside the highlighted section
 *   review    done when the user presses Next
 *
 * The user can always press Next (e.g. Vita can't find the button) or Back.
 */
import type { FoundTarget } from './finder';
import type { GuidePayload, GuideRunEvent, GuideStep, GuideTarget } from './types';

export type RunnerStatus = 'running' | 'finished' | 'stopped';

export interface RunnerState {
  guide: GuidePayload;
  index: number;
  step: GuideStep | null;
  status: RunnerStatus;
  found: FoundTarget | null;
  /** The step's target could not be found for a while: show "can't find it, press Next". */
  missing: boolean;
  /** The step happens on another screen than the one the user is on. */
  wrongScreen: boolean;
  done: number;
  /** Do mode and not paused: Vita does the auto steps. */
  driving: boolean;
  /** Do mode was paused (the user took over, or pressed Pause). */
  paused: boolean;
  /** Vita is about to do this step (the short pause before its click). */
  acting: boolean;
}

export interface RunnerHooks {
  find: (t: GuideTarget) => FoundTarget | null;
  getPath: () => string;
  report: (e: GuideRunEvent) => void;
  onChange: (s: RunnerState) => void;
  now?: () => number;
  /** How long a target may be missing before the user is told (ms). */
  missingAfterMs?: number;
  /** Quiet time after typing before a fill step counts as done (ms). */
  typingIdleMs?: number;
  /** Do mode: how Vita clicks and goes to a screen. Without it, Do mode behaves like Guide mode. */
  act?: { click: (el: HTMLElement) => void; navigate: (route: string) => void };
  /** Do mode: pause before Vita acts, so the user sees the ring first (ms). */
  actDelayMs?: number;
}

export function routeMatches(path: string, route: string): boolean {
  const clean = (p: string) => p.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const a = clean(path).split('/');
  const b = clean(route).split('/');
  // A ":param" segment of the route matches any one segment of the path.
  return a.length === b.length && b.every((seg, i) => (seg.startsWith(':') ? a[i] !== '' : seg === a[i]));
}

/** Where "Take me there" goes: the screen itself, or for a page opened from a list, that list. */
type ScreenRef = { id?: string; route: string; label: string };
export function openableScreen(screen: (ScreenRef & { openFrom?: ScreenRef | null }) | null): ScreenRef | null {
  if (!screen) return null;
  if (!screen.route.includes(':')) return screen;
  return screen.openFrom ?? null;
}

export class GuideRunner {
  private index = 0;
  private status: RunnerStatus = 'running';
  private found: FoundTarget | null = null;
  private missing = false;
  private reportedMissing = new Set<string>();
  private doneSteps = new Set<string>();
  private stepStarted = 0;
  private missingTimer: ReturnType<typeof setTimeout> | null = null;
  private typingTimer: ReturnType<typeof setTimeout> | null = null;
  private pressed: { el: Node; at: number } | null = null;
  private paused = false;
  private actTimer: ReturnType<typeof setTimeout> | null = null;
  private acted = new Set<string>();
  private focused = new Set<string>();
  /** True while Vita's own click runs (its events are not the user taking over). */
  private selfActing = false;
  private readonly now: () => number;
  private readonly onClick = (e: Event) => this.handleClick(e);
  private readonly onInput = (e: Event) => this.handleInput(e, false);
  private readonly onChangeEv = (e: Event) => this.handleInput(e, true);
  private readonly onUser = (e: Event) => this.handleUser(e);

  constructor(
    readonly guide: GuidePayload,
    private readonly hooks: RunnerHooks,
    private readonly doc: Document = document,
  ) {
    this.now = hooks.now ?? (() => Date.now());
  }

  get state(): RunnerState {
    const step = this.status === 'running' ? (this.guide.steps[this.index] ?? null) : null;
    return {
      guide: this.guide,
      index: this.index,
      step,
      status: this.status,
      found: this.found,
      missing: this.missing,
      wrongScreen: !!step && this.onWrongScreen(step),
      done: this.doneSteps.size,
      driving: this.drives && !this.paused,
      paused: this.drives && this.paused,
      acting: !!this.actTimer,
    };
  }

  /** Do mode is on for this guide (and the dock can act). */
  private get drives(): boolean {
    return !!this.guide.drive && !!this.hooks.act;
  }

  /** Stop doing steps; the user carries on (Guide mode behaviour) until Resume. */
  pause(): void {
    if (!this.drives || this.paused) return;
    this.paused = true;
    this.clearAct();
    this.hooks.report({ type: 'paused', step: this.current()?.id });
    this.emit();
  }

  resume(): void {
    if (!this.drives || !this.paused) return;
    this.paused = false;
    this.maybeAct();
    this.emit();
  }

  start(): void {
    this.doc.addEventListener('click', this.onClick, true);
    // 1HMS dropdowns (Radix Select / menus) open on press and never send a click to the
    // element that was pressed: a press on the target counts too.
    this.doc.addEventListener('pointerdown', this.onClick, true);
    this.doc.addEventListener('input', this.onInput, true);
    this.doc.addEventListener('change', this.onChangeEv, true);
    if (this.drives) {
      this.doc.addEventListener('pointerdown', this.onUser, true);
      this.doc.addEventListener('keydown', this.onUser, true);
    }
    this.hooks.report({ type: 'started' });
    this.enter(0);
  }

  /** Next / Skip pressed. */
  next(): void {
    const step = this.current();
    if (!step) return;
    if (step.done === 'next') this.complete(step);
    else {
      this.hooks.report({ type: 'skip', step: step.id });
      this.advance();
    }
  }

  back(): void {
    if (this.status !== 'running' || this.index === 0) return;
    this.hooks.report({ type: 'back', step: this.guide.steps[this.index - 1].id });
    this.enter(this.index - 1, false);
  }

  stop(): void {
    if (this.status !== 'running') return;
    this.status = 'stopped';
    this.hooks.report({ type: 'abandoned', step: this.current()?.id });
    this.teardown();
    this.emit();
  }

  /** The page route changed. */
  locationChanged(): void {
    const step = this.current();
    if (!step) return;
    if (step.done === 'route' && step.screen && routeMatches(this.hooks.getPath(), step.screen.route)) {
      this.complete(step);
      return;
    }
    this.refresh();
  }

  /** The page re-rendered: find the target again (it may have appeared, moved or gone). */
  refresh(): void {
    const step = this.current();
    if (!step) return;
    const before = this.found?.el;
    this.found = step.target ? this.hooks.find(step.target) : null;
    if (this.found) {
      this.clearMissing();
    } else if (step.target && !this.missingTimer && !this.missing) {
      this.missingTimer = setTimeout(() => this.markMissing(), this.hooks.missingAfterMs ?? 2500);
    }
    this.maybeAct();
    if (before !== this.found?.el || !this.found) this.emit();
  }

  destroy(): void {
    this.teardown();
  }

  // ---------------------------------------------------------------- internals

  private current(): GuideStep | null {
    return this.status === 'running' ? (this.guide.steps[this.index] ?? null) : null;
  }

  private onWrongScreen(step: GuideStep): boolean {
    if (!step.screen || step.action === 'navigate') return false;
    if (routeMatches(this.hooks.getPath(), step.screen.route)) return false;
    return !this.found; // the target is visible anyway (e.g. a dialog on another route): fine
  }

  private enter(i: number, autoSkip = true): void {
    this.clearMissing();
    this.clearTyping();
    this.clearAct();
    this.index = i;
    this.stepStarted = this.now();
    const step = this.current();
    if (!step) return;
    // Already on the right screen: nothing to do for a "go to this screen" step.
    if (autoSkip && step.done === 'route' && step.screen && routeMatches(this.hooks.getPath(), step.screen.route)) {
      this.complete(step);
      return;
    }
    this.found = null;
    this.refresh();
    this.emit();
  }

  private complete(step: GuideStep): void {
    this.clearTyping();
    this.clearAct();
    this.doneSteps.add(step.id);
    this.hooks.report({ type: 'step_done', step: step.id, ms: Math.max(0, Math.round(this.now() - this.stepStarted)) });
    this.advance();
  }

  private advance(): void {
    if (this.index + 1 >= this.guide.steps.length) {
      this.status = 'finished';
      this.found = null;
      this.hooks.report({ type: 'completed' });
      this.teardown();
      this.emit();
      return;
    }
    this.enter(this.index + 1);
  }

  private handleClick(e: Event): void {
    const step = this.current();
    if (!step || (step.done !== 'click' && step.done !== 'input')) return;
    const t = e.target as Node | null;
    if (!t || (t instanceof Element && t.closest('[data-vita-ui]'))) return;
    const hitEls = this.found?.all ?? [];
    const hit = hitEls.find((el) => el === t || el.contains(t));
    if (!hit) return;
    if (step.done === 'click') {
      // A press on a field (a dropdown) is the choice being made: wait for the click or the
      // chosen value instead. Buttons, tabs and menu items count on press or click.
      if (e.type === 'pointerdown' && hitEls.some((el) => el.matches('input, textarea, [contenteditable="true"]'))) return;
      // The click that ends the same press must not also complete the next step.
      if (e.type === 'click' && this.pressed && this.now() - this.pressed.at < 800 && this.pressed.el.contains(t)) return;
      if (e.type === 'pointerdown') this.pressed = { el: hit, at: this.now() };
      // Let 1HMS handle it first (it may open a dialog for the next step).
      setTimeout(() => {
        if (this.current() === step) this.complete(step);
      }, 60);
    }
  }

  private handleInput(e: Event, isChange: boolean): void {
    const step = this.current();
    if (!step || step.done !== 'input') return;
    const t = e.target as Node | null;
    const hitEls = this.found?.all ?? [];
    if (!t || !hitEls.some((el) => el === t || el.contains(t))) return;
    this.clearTyping();
    if (isChange && t instanceof HTMLSelectElement) {
      this.complete(step);
      return;
    }
    // The value is never read: only "the user typed here".
    this.typingTimer = setTimeout(() => {
      if (this.current() === step) this.complete(step);
    }, this.hooks.typingIdleMs ?? 1200);
  }

  /** Do mode: do this step (after a pause), or put the cursor in the field the user fills. */
  private maybeAct(): void {
    const step = this.current();
    const act = this.hooks.act;
    if (!step || !act || !this.drives || this.paused) return;
    if (step.action === 'fill' && this.found && !this.focused.has(step.id)) {
      const el = this.found.el;
      const field = el.matches('input, textarea, select') ? el : el.querySelector('input, textarea, select');
      if (field instanceof HTMLElement && !this.inVita(field)) {
        this.focused.add(step.id);
        field.focus({ preventScroll: false });
      }
      return;
    }
    if (!step.auto || this.actTimer || this.acted.has(step.id)) return;
    if (step.action === 'navigate') {
      const to = openableScreen(step.screen);
      if (!to || to.route.includes(':')) return;
      this.schedule(step, () => act.navigate(to.route));
      return;
    }
    if (step.action !== 'click' || !this.found) return;
    this.schedule(step, () => {
      const el = this.found?.el;
      if (!(el instanceof HTMLElement) || !el.isConnected || this.inVita(el)) return false;
      if ((el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return false;
      this.selfActing = true;
      try {
        act.click(el);
      } finally {
        this.selfActing = false;
      }
      return true;
    });
  }

  private schedule(step: GuideStep, run: () => boolean | void): void {
    this.actTimer = setTimeout(() => {
      this.actTimer = null;
      if (this.current() !== step || this.paused) return;
      this.acted.add(step.id);
      if (run() === false) {
        this.emit();
        return;
      }
      this.hooks.report({ type: 'auto', step: step.id });
      this.emit();
    }, this.hooks.actDelayMs ?? 700);
    this.emit();
  }

  /** A real press or key on the page while Vita is about to act: the user takes over. */
  private handleUser(e: Event): void {
    if (this.selfActing || !this.actTimer) return;
    const t = e.target;
    if (t instanceof Element && this.inVita(t)) return;
    this.pause();
  }

  private inVita(el: Element): boolean {
    return !!el.closest('[data-vita-ui]');
  }

  private clearAct(): void {
    if (this.actTimer) clearTimeout(this.actTimer);
    this.actTimer = null;
  }

  private markMissing(): void {
    this.missingTimer = null;
    const step = this.current();
    if (!step || this.found) return;
    this.missing = true;
    if (!this.reportedMissing.has(step.id)) {
      this.reportedMissing.add(step.id);
      this.hooks.report({ type: 'target_missing', step: step.id });
    }
    this.emit();
  }

  private clearMissing(): void {
    if (this.missingTimer) clearTimeout(this.missingTimer);
    this.missingTimer = null;
    this.missing = false;
  }

  private clearTyping(): void {
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = null;
  }

  private teardown(): void {
    this.clearMissing();
    this.clearTyping();
    this.clearAct();
    this.doc.removeEventListener('pointerdown', this.onUser, true);
    this.doc.removeEventListener('keydown', this.onUser, true);
    this.doc.removeEventListener('click', this.onClick, true);
    this.doc.removeEventListener('pointerdown', this.onClick, true);
    this.doc.removeEventListener('input', this.onInput, true);
    this.doc.removeEventListener('change', this.onChangeEv, true);
  }

  private emit(): void {
    this.hooks.onChange(this.state);
  }
}
