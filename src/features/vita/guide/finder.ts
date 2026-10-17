/**
 * Finds the real 1HMS element a guide step points at, by its visible label.
 *
 * Guides never carry CSS selectors or code: a target is "the button that says Book Appointment"
 * (or its Hindi label when 1HMS is in Hindi). The finder looks at what the user can see -
 * buttons, tabs, links, menu items, fields and their labels, section headings - outside the Vita
 * dock, and picks the best match:
 *
 *   exact label  >  label at the start ("Book Appointment (F2)")  >  label inside a short text
 *
 * Fields resolve from their label to the input. A region (a section of the page, e.g. "Available
 * Time Slots") resolves from its heading to the box around it.
 */
import type { GuideTarget } from './types';

export interface FoundTarget {
  /** Element to ring (first one when `many`). */
  el: HTMLElement;
  /** Every element that counts (more than one only for `many` targets). */
  all: HTMLElement[];
  /** The label as the screen shows it (for "{label}" in the step text). */
  shown: string;
}

export interface FindOptions {
  root?: Document | Element;
  /** 1HMS i18n lookup: key -> label in the screen's current language. */
  translate?: (key: string) => string | null;
  /** Override for tests (jsdom has no layout). */
  isVisible?: (el: Element) => boolean;
}

const VITA_UI = '[data-vita-ui]';
const INTERACTIVE =
  'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [role="option"], ' +
  '[role="link"], [role="switch"], [role="checkbox"], [role="radio"], input[type="button"], input[type="submit"], summary';
const FIELD =
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]), textarea, select, [role="combobox"], [contenteditable="true"]';
const LABELS = 'label, legend, [data-slot="label"]';
const TEXTY = 'h1, h2, h3, h4, h5, h6, legend, label, span, p, div, strong, b, dt, th, summary';
const DIALOG = '[role="dialog"], [role="alertdialog"], dialog[open]';
const MENU = '[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

/** Same rules as Vita's label_norm: case, emoji, punctuation and spacing ignored. */
export function labelNorm(text: string): string {
  const t = text.normalize('NFKC').toLowerCase().replace(/…|\.\.\./g, '');
  return (t.match(/[\p{L}\p{N}\p{M}]+/gu) ?? []).join(' ');
}

export function defaultIsVisible(el: Element): boolean {
  if (!el.isConnected) return false;
  const anyEl = el as Element & { checkVisibility?: (o?: object) => boolean };
  if (typeof anyEl.checkVisibility === 'function') {
    if (!anyEl.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  // No layout engine (tests): walk up for display:none / visibility:hidden / hidden.
  for (let n: Element | null = el; n; n = n.parentElement) {
    if ((n as HTMLElement).hidden || n.getAttribute('aria-hidden') === 'true') return false;
    const s = n.ownerDocument?.defaultView?.getComputedStyle(n);
    if (s && (s.display === 'none' || s.visibility === 'hidden')) return false;
  }
  return true;
}

function textsOf(el: Element): string[] {
  const out: string[] = [];
  const aria = el.getAttribute('aria-label');
  if (aria) out.push(aria);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.placeholder) out.push(el.placeholder);
    if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit') && el.value) out.push(el.value);
  } else {
    // textContent, not innerText: 1HMS headings use CSS uppercase, innerText would shout.
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (t && t.length <= 160) out.push(t);
  }
  const title = el.getAttribute('title');
  if (title) out.push(title);
  return out;
}

interface Wanted {
  norm: string;
  /** As written (1HMS i18n text or the guide's label): what "{label}" shows. */
  raw: string;
}

/** 3 exact, 2 starts with, 1 contained in a short text, 0 no match; plus which label matched. */
function score(candidate: string, wanted: Wanted[], prefix: boolean): { s: number; w: Wanted | null } {
  const c = labelNorm(candidate);
  let best = { s: 0, w: null as Wanted | null };
  if (!c) return best;
  for (const w of wanted) {
    if (c === w.norm) return { s: 3, w };
    if (c.startsWith(w.norm) && (prefix || c.length <= w.norm.length + 25)) {
      if (best.s < 2) best = { s: 2, w };
    } else if (w.norm.length >= 4 && c.includes(w.norm) && c.length <= w.norm.length * 2 + 10) {
      if (best.s < 1) best = { s: 1, w };
    }
  }
  return best;
}

function wantedLabels(t: GuideTarget, translate?: (k: string) => string | null): Wanted[] {
  const out = new Map<string, Wanted>();
  const add = (raw: string | null | undefined) => {
    const clean = (raw ?? '').replace(/\s*\*\s*$/, '').trim();
    const norm = labelNorm(clean);
    if (norm && !out.has(norm)) out.set(norm, { norm, raw: clean });
  };
  if (t.key && translate) add(translate(t.key));
  add(t.label);
  for (const a of t.alt ?? []) add(a);
  return [...out.values()];
}

function fieldFor(label: Element): HTMLElement | null {
  const forId = label.getAttribute('for');
  if (forId) {
    const el = label.ownerDocument.getElementById(forId);
    if (el) return el;
  }
  const inside = label.querySelector(FIELD);
  if (inside) return inside as HTMLElement;
  // 1HMS forms: <div><Label>Patient Name *</Label><Input/></div>
  for (let box = label.parentElement, i = 0; box && i < 3; box = box.parentElement, i++) {
    const fields = box.querySelectorAll(FIELD);
    if (fields.length === 1) return fields[0] as HTMLElement;
    if (fields.length > 1) {
      // The first field after the label in document order.
      for (const f of Array.from(fields)) {
        if (label.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING) return f as HTMLElement;
      }
    }
  }
  return null;
}

function regionFor(heading: Element, labelLength: number): HTMLElement {
  let box: Element = heading;
  for (let i = 0; i < 5 && box.parentElement; i++) {
    box = box.parentElement;
    if (box.matches('body, main, [role="dialog"]')) break;
    const text = (box.textContent ?? '').trim().length;
    if (box.querySelector(INTERACTIVE + ', ' + FIELD) && text > labelLength + 3) return box as HTMLElement;
  }
  return (heading.parentElement ?? heading) as HTMLElement;
}

function leafText(el: Element, max: number): boolean {
  // An element whose text is (about) just the label, not a whole section.
  const t = (el.textContent ?? '').trim();
  return t.length > 0 && t.length <= max;
}

function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const h = el.ownerDocument.defaultView?.innerHeight ?? 0;
  return r.bottom > 0 && r.top < h;
}

/** Finds the element for a target, or null if it is not on the screen right now. */
export function findTarget(target: GuideTarget, opts: FindOptions = {}): FoundTarget | null {
  const root = opts.root ?? document;
  const visible = opts.isVisible ?? defaultIsVisible;
  const wanted = wantedLabels(target, opts.translate);
  if (!wanted.length) return null;
  const prefix = target.match === 'prefix';
  const maxLeaf = Math.max(...wanted.map((w) => w.norm.length)) * 2 + 20;

  const openDialogs = Array.from(root.querySelectorAll(DIALOG)).filter((d) => !d.closest(VITA_UI) && visible(d));
  const scope = (el: Element): boolean => {
    if (el.closest(VITA_UI)) return false;
    if (target.within === 'dialog') return !!el.closest(DIALOG) && !el.closest(VITA_UI);
    if (target.within === 'menu') return !!el.closest(MENU);
    return true;
  };

  type Hit = { el: HTMLElement; s: number; order: number; shown: string };
  const hits: Hit[] = [];
  let order = 0;
  const consider = (match: Element, resolve: (m: Element) => HTMLElement | null) => {
    order++;
    if (!scope(match) || !visible(match)) return;
    let best = 0;
    let shown = '';
    for (const t of textsOf(match)) {
      const { s, w } = score(t, wanted, prefix);
      if (s > best && w) {
        best = s;
        // The element's own words, without icon text or marks around them ("+Book Appointment",
        // "Patient Name *").
        shown = t.replace(/^[^\p{L}\p{N}\p{M}(]+|[^\p{L}\p{N}\p{M})]+$/gu, '') || w.raw;
      }
    }
    if (!best) return;
    const el = resolve(match);
    if (!el || !scope(el) || !visible(el)) return;
    let s = best;
    // When a dialog is open the page behind it can't be used: prefer what's in the dialog.
    if (openDialogs.length && openDialogs.some((d) => d.contains(el))) s += 0.5;
    hits.push({ el, s, order, shown: shown.replace(/\s*\*\s*$/, '').trim() });
  };

  const kind = target.kind;
  if (kind === 'field') {
    root.querySelectorAll(FIELD).forEach((f) => consider(f, (m) => m as HTMLElement));
    root.querySelectorAll(LABELS).forEach((l) => consider(l, fieldFor));
    root.querySelectorAll(TEXTY).forEach((t) => {
      if (!t.matches(LABELS) && leafText(t, maxLeaf) && !t.querySelector(TEXTY)) consider(t, fieldFor);
    });
  } else if (kind === 'region') {
    root.querySelectorAll(TEXTY).forEach((t) => {
      if (leafText(t, maxLeaf) && !t.closest(INTERACTIVE)) {
        consider(t, (m) => regionFor(m, (m.textContent ?? '').trim().length));
      }
    });
  } else {
    const sel = kind === 'tab' ? '[role="tab"], ' + INTERACTIVE : kind === 'option' ? '[role="option"], option, li, ' + INTERACTIVE : INTERACTIVE;
    root.querySelectorAll(sel).forEach((b) => consider(b, (m) => m as HTMLElement));
  }
  if (!hits.length) return null;

  // Same element found twice (label + field): keep its best score.
  const byEl = new Map<HTMLElement, Hit>();
  for (const h of hits) {
    const prev = byEl.get(h.el);
    if (!prev || h.s > prev.s) byEl.set(h.el, h);
  }
  // A button inside another matching button (icon + text): keep the outer, clickable one.
  const unique = [...byEl.values()].filter((h) => ![...byEl.keys()].some((o) => o !== h.el && o.contains(h.el) && o.matches(INTERACTIVE)));
  const top = Math.max(...unique.map((h) => h.s));
  const best = unique
    .filter((h) => h.s === top)
    .sort((a, b) => {
      if (kind === 'tab') {
        const ta = a.el.getAttribute('role') === 'tab' ? 0 : 1;
        const tb = b.el.getAttribute('role') === 'tab' ? 0 : 1;
        if (ta !== tb) return ta - tb;
      }
      const va = inViewport(a.el) ? 0 : 1;
      const vb = inViewport(b.el) ? 0 : 1;
      // Closest wording first ("Book Appointment (F2)" before "Book Appointment for another day").
      return va - vb || labelNorm(a.shown).length - labelNorm(b.shown).length || a.order - b.order;
    });
  const all = target.many ? best.map((h) => h.el) : [best[0].el];
  return { el: all[0], all, shown: best[0].shown };
}
