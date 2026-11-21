/** Guide Mode: what Vita sends (SSE `guide` event or GET /v1/guides/{id}). See Vita docs/GUIDE-MODE.md. */

export type GuideAction = 'navigate' | 'click' | 'fill' | 'choose' | 'review';
export type GuideDone = 'route' | 'click' | 'input' | 'next';
export type TargetKind = 'button' | 'field' | 'tab' | 'region' | 'link' | 'option';

export interface GuideTarget {
  /** English label as 1HMS shows it. */
  label: string;
  /** 1HMS i18n key: the dock asks 1HMS's own i18n for the label in the screen's language. */
  key?: string | null;
  kind: TargetKind;
  /** Same button on every row: ring them all, any click counts. */
  many?: boolean;
  match?: 'exact' | 'prefix';
  /** Only look inside an open dialog / menu. */
  within?: 'dialog' | 'menu' | null;
  /** Other spellings of the label (e.g. the Hindi screen label). */
  alt?: string[];
}

export interface GuideStep {
  id: string;
  /** `route` may hold a parameter (`/pathology/orders/:orderId`): a page opened from a list. Then
   *  `openFrom` is the screen it is opened from, which the dock can take the user to. */
  screen: { id: string; route: string; label: string; openFrom?: { id: string; route: string; label: string } | null } | null;
  action: GuideAction;
  done: GuideDone;
  /** One sentence, already in the user's language; `{label}` = the target's label. */
  say: string;
  note?: string | null;
  optional?: boolean;
  target: GuideTarget | null;
  /** Do mode: Vita does this step itself (a screen, a tab, a button that opens a form). Never
   *  set for fields, choices or a button that saves, pays or deletes. */
  auto?: boolean;
}

export interface GuidePayload {
  id: string;
  runId?: string;
  source: 'playbook' | 'generated';
  title: string;
  lang: string;
  steps: GuideStep[];
  cites?: { docId: string; section: string }[];
  /** Do mode: the runner does the `auto` steps itself; the user fills in and saves. */
  drive?: boolean;
  /** Vita picked this guide itself: show its title and steps with Start / Not this first. */
  preview?: boolean;
  /** A line shown with the guide, e.g. after a "before you start" answer. */
  note?: string;
  /** Shown when every step is done: Vita's closing line and what staff usually do next (only
   *  tasks this user may open). */
  done?: { say: string; nextHeader?: string | null; next: GuideOffer[] };
}

export interface GuideOffer {
  guideId: string;
  title: string;
  steps?: number;
}

export type GuideRunEventType =
  | 'started'
  | 'step_done'
  | 'target_missing'
  | 'back'
  | 'skip'
  | 'completed'
  | 'abandoned'
  | 'rated'
  /** Do mode: Vita did this step itself / the user took over (paused Vita). */
  | 'auto'
  | 'paused';

export interface GuideRunEvent {
  type: GuideRunEventType;
  step?: string;
  ms?: number;
  rating?: 'up' | 'down';
}
