import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { RunnerState } from './runner';
import { stepText } from './text';
import { VITA_Z } from '../components/VitaLayer';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 6;
const NONE: HTMLElement[] = [];

function boxesOf(els: HTMLElement[]): Box[] {
  return els
    .slice(0, 12)
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }));
}

const same = (a: Box[], b: Box[]) =>
  a.length === b.length &&
  a.every((x, i) => Math.abs(x.top - b[i].top) < 1 && Math.abs(x.left - b[i].left) < 1 && Math.abs(x.width - b[i].width) < 1 && Math.abs(x.height - b[i].height) < 1);

/**
 * Ring around the step's target + a short bubble next to it. Nothing here takes clicks
 * (pointer-events: none), so the user clicks the real 1HMS element underneath.
 */
export const GuideOverlay: React.FC<{ state: RunnerState }> = ({ state }) => {
  const all = state.found?.all;
  const els = useMemo(() => (state.status === 'running' && all ? all : NONE), [state.status, all]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const boxesRef = useRef<Box[]>([]);
  const scrolledFor = useRef<string | null>(null);

  // Follow the element while the page scrolls, resizes or animates.
  useEffect(() => {
    if (!els.length) {
      if (boxesRef.current.length) {
        boxesRef.current = [];
        setBoxes([]);
      }
      return;
    }
    let raf = 0;
    const tick = () => {
      const next = boxesOf(els);
      if (!same(next, boxesRef.current)) {
        boxesRef.current = next;
        setBoxes(next);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [els]);

  // Bring the target into view once per step.
  useLayoutEffect(() => {
    const step = state.step;
    const el = els[0];
    if (!step || !el || scrolledFor.current === step.id) return;
    scrolledFor.current = step.id;
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [state.step, els]);

  if (!state.step || !boxes.length) return null;
  const pos = bubbleSpot(boxes[0]);

  return createPortal(
    <div data-vita-ui="overlay" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: VITA_Z.overlay, pointerEvents: 'none' }}>
      {boxes.map((b, i) => (
        <div
          key={i}
          data-vita-ring=""
          className="vita-guide-ring"
          style={{
            position: 'fixed',
            top: b.top,
            left: b.left,
            width: b.width,
            height: b.height,
            borderRadius: 12,
            border: '3px solid #7c3aed',
            boxShadow: '0 0 0 4px rgba(124,58,237,0.25), 0 0 24px rgba(124,58,237,0.45)',
            animation: 'vitaGuidePulse 1.6s ease-in-out infinite',
          }}
        />
      ))}
      <div
        data-vita-bubble=""
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: pos.above ? 'translateY(-100%)' : undefined,
          maxWidth: BUBBLE_W,
          background: '#4c1d95',
          color: '#fff',
          borderRadius: 12,
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: 1.35,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        }}
      >
        <span style={{ opacity: 0.75, fontSize: 11, display: 'block' }}>
          {state.index + 1} / {state.guide.steps.length}
        </span>
        <BoldText text={stepText(state.step, state.found?.shown)} />
      </div>
      <style>{'@keyframes vitaGuidePulse{0%,100%{opacity:1}50%{opacity:.55}}'}</style>
    </div>,
    document.body,
  );
};

const BUBBLE_W = 290;

/**
 * Where the bubble goes: beside the target if there is room (so it never covers the next button
 * in a form), otherwise below, otherwise above.
 */
function bubbleSpot(b: Box): { top: number; left: number; above: boolean } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.min(Math.max(8, b.top), vh - 120);
  if (b.left + b.width + 12 + BUBBLE_W < vw) return { top, left: b.left + b.width + 12, above: false };
  if (b.left - 12 - BUBBLE_W > 0) return { top, left: b.left - 12 - BUBBLE_W, above: false };
  const left = Math.min(Math.max(8, b.left), vw - BUBBLE_W - 8);
  if (b.top + b.height + 130 < vh) return { top: b.top + b.height + 10, left, above: false };
  return { top: Math.max(8, b.top - 10), left, above: true };
}

/** **bold** only; everything else is plain text (no HTML from the server is ever rendered). */
export const BoldText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>,
    )}
  </>
);
