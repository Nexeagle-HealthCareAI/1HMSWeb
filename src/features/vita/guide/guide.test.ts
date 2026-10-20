// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findTarget, labelNorm } from './finder';
import { GuideRunner, openableScreen, routeMatches, type RunnerState } from './runner';
import { stepText } from './text';
import type { GuidePayload, GuideRunEvent, GuideTarget } from './types';

const T = (label: string, extra: Partial<GuideTarget> = {}): GuideTarget => ({ label, kind: 'button', ...extra });

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('finder', () => {
  it('finds a button by its label, ignoring icons, case and the Vita dock', () => {
    document.body.innerHTML = `
      <section data-vita-ui="dock" role="dialog"><button id="vita">Book Appointment</button></section>
      <header><button id="b1"><svg></svg><span class="uppercase">Book Appointment</span></button></header>`;
    const f = findTarget(T('book appointment'));
    expect(f?.el.id).toBe('b1');
    expect(f?.shown).toBe('Book Appointment');
  });

  it('prefers the exact label, then a label at the start', () => {
    document.body.innerHTML = `
      <button id="a">Book Appointment for another day</button>
      <button id="b">Book Appointment (F2)</button>
      <button id="c">Book Appointment</button>`;
    expect(findTarget(T('Book Appointment'))?.el.id).toBe('c');
    document.getElementById('c')!.remove();
    expect(findTarget(T('Book Appointment'))?.el.id).toBe('b');
    expect(findTarget(T('Something Else'))).toBeNull();
  });

  it('skips hidden elements (responsive duplicates, closed menus)', () => {
    document.body.innerHTML = `
      <button id="h" style="display:none">Book Appointment</button>
      <div hidden><button id="h2">Book Appointment</button></div>
      <button id="v">Book Appointment</button>`;
    expect(findTarget(T('Book Appointment'))?.el.id).toBe('v');
  });

  it('uses the 1HMS i18n label when the screen is in Hindi, and the alternatives', () => {
    document.body.innerHTML = `<button id="hi">अपॉइंटमेंट बुक करें</button>`;
    const t = T('Book Appointment', { key: 'appointmentDashboard.bookAppointment' });
    expect(findTarget(t)).toBeNull();
    const translate = (k: string) => (k === 'appointmentDashboard.bookAppointment' ? 'अपॉइंटमेंट बुक करें' : null);
    expect(findTarget(t, { translate })?.el.id).toBe('hi');
    expect(findTarget({ ...t, alt: ['अपॉइंटमेंट बुक करें'] })?.el.id).toBe('hi');
  });

  it('resolves a field from its label (for=, nested, or the next input), or its placeholder', () => {
    document.body.innerHTML = `
      <div><label for="n">Patient Name *</label><input id="n" /></div>
      <div><span>Mobile Number</span><input id="m" /></div>
      <label>Age <input id="a" /></label>
      <input id="s" placeholder="Search by name, patient ID, or mobile number" />`;
    expect(findTarget(T('Patient Name', { kind: 'field' }))?.el.id).toBe('n');
    expect(findTarget(T('Patient Name', { kind: 'field' }))?.shown).toBe('Patient Name');
    expect(findTarget(T('Mobile Number', { kind: 'field' }))?.el.id).toBe('m');
    expect(findTarget(T('Age', { kind: 'field' }))?.el.id).toBe('a');
    expect(findTarget(T('Search by name, patient ID, or mobile number', { kind: 'field' }))?.el.id).toBe('s');
  });

  it('resolves a region from its heading to the section around it', () => {
    document.body.innerHTML = `
      <div id="sec">
        <div class="row"><div>🏢</div><span class="uppercase">🏥 Department Selection</span></div>
        <div class="grid"><button>General Medicine</button><button>Ortho</button></div>
      </div>`;
    expect(findTarget(T('Department Selection', { kind: 'region' }))?.el.id).toBe('sec');
  });

  it('looks only inside an open dialog when asked, and prefers the dialog when one is open', () => {
    document.body.innerHTML = `
      <button id="page">Book Appointment</button>
      <div role="dialog"><form><button id="dlg">Book Appointment</button></form></div>`;
    expect(findTarget(T('Book Appointment', { within: 'dialog' }))?.el.id).toBe('dlg');
    expect(findTarget(T('Book Appointment'))?.el.id).toBe('dlg');
  });

  it('rings every row for a "many" target', () => {
    document.body.innerHTML = `<table><tr><td><button>Vitals</button></td></tr><tr><td><button>Vitals</button></td></tr></table>`;
    expect(findTarget(T('Vitals', { many: true }))?.all).toHaveLength(2);
    expect(findTarget(T('Vitals'))?.all).toHaveLength(1);
  });

  it('normalises labels like Vita does', () => {
    expect(labelNorm('  Book Appointment… ')).toBe('book appointment');
    expect(labelNorm('Collect ₹500!')).toBe('collect 500');
    expect(labelNorm('अपॉइंटमेंट बुक करें')).toBe('अपॉइंटमेंट बुक करें');
  });
});

// ---------------------------------------------------------------- runner

const guide: GuidePayload = {
  id: 'book-appointment',
  runId: 'r1',
  source: 'playbook',
  title: 'Book an appointment',
  lang: 'en',
  steps: [
    { id: 's1', screen: { id: 'appointment-dashboard', route: '/appointment-dashboard', label: 'Appointments' }, action: 'navigate', done: 'route', say: 'Open Appointments.', target: null },
    { id: 's2', screen: { id: 'appointment-dashboard', route: '/appointment-dashboard', label: 'Appointments' }, action: 'click', done: 'click', say: 'Click {label}.', target: T('Book Appointment') },
    { id: 's3', screen: { id: 'appointment-dashboard', route: '/appointment-dashboard', label: 'Appointments' }, action: 'fill', done: 'input', say: 'Type the name.', target: T('Patient Name', { kind: 'field' }) },
    { id: 's4', screen: null, action: 'review', done: 'next', say: 'Check and finish.', target: null },
  ],
};

function setup(path = '/billing') {
  let p = path;
  const events: GuideRunEvent[] = [];
  const states: RunnerState[] = [];
  const r = new GuideRunner(guide, {
    find: (t) => findTarget(t),
    getPath: () => p,
    report: (e) => events.push(e),
    onChange: (s) => states.push(s),
    missingAfterMs: 100,
    typingIdleMs: 50,
  });
  return {
    r,
    events,
    states,
    go: (np: string) => {
      p = np;
      r.locationChanged();
    },
    last: () => states[states.length - 1],
  };
}

describe('runner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('walks a guide: route, click, typing, Next', () => {
    document.body.innerHTML = `<button id="book">Book Appointment</button><div><label for="n">Patient Name</label><input id="n"/></div>`;
    const { r, events, go, last } = setup('/billing');
    r.start();
    expect(last().step?.id).toBe('s1');
    go('/appointment-dashboard');
    expect(last().step?.id).toBe('s2');
    expect(last().found?.el.id).toBe('book');

    document.body.click(); // a click elsewhere does nothing
    vi.advanceTimersByTime(100);
    expect(last().step?.id).toBe('s2');
    document.getElementById('book')!.querySelector('*')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('book')!.click();
    vi.advanceTimersByTime(100);
    expect(last().step?.id).toBe('s3');

    const input = document.getElementById('n') as HTMLInputElement;
    input.value = 'x';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(10);
    expect(last().step?.id).toBe('s3'); // still typing
    vi.advanceTimersByTime(100);
    expect(last().step?.id).toBe('s4');

    r.next();
    expect(last().status).toBe('finished');
    expect(events.map((e) => e.type)).toEqual(['started', 'step_done', 'step_done', 'step_done', 'step_done', 'completed']);
    expect(events.every((e) => !('value' in e))).toBe(true); // never what the user typed
  });

  it('skips "open this screen" when the user is already there', () => {
    document.body.innerHTML = `<button>Book Appointment</button>`;
    const { r, last } = setup('/appointment-dashboard');
    r.start();
    expect(last().step?.id).toBe('s2');
  });

  it('says when it cannot find the target, reports it once, and recovers when it appears', () => {
    const { r, events, last } = setup('/appointment-dashboard');
    r.start();
    expect(last().missing).toBe(false);
    vi.advanceTimersByTime(150);
    expect(last().missing).toBe(true);
    expect(events.filter((e) => e.type === 'target_missing')).toEqual([{ type: 'target_missing', step: 's2' }]);
    document.body.innerHTML = `<button id="late">Book Appointment</button>`;
    r.refresh();
    expect(last().missing).toBe(false);
    expect(last().found?.el.id).toBe('late');
  });

  it('knows when a step is on another screen', () => {
    const { r, last } = setup('/appointment-dashboard');
    r.start(); // s1 auto-done, now s2 with no button on this page
    const s = setup('/billing');
    s.r.start();
    s.r.next(); // skip s1
    expect(s.last().step?.id).toBe('s2');
    expect(s.last().wrongScreen).toBe(true);
    expect(last().wrongScreen).toBe(false);
  });

  it('goes back and can be stopped', () => {
    document.body.innerHTML = `<button>Book Appointment</button>`;
    const { r, events, last } = setup('/appointment-dashboard');
    r.start();
    r.back();
    expect(last().step?.id).toBe('s1');
    r.stop();
    expect(last().status).toBe('stopped');
    expect(events.map((e) => e.type)).toEqual(['started', 'step_done', 'back', 'abandoned']);
    document.querySelector('button')!.click(); // listeners are gone
    vi.advanceTimersByTime(100);
    expect(events).toHaveLength(4);
  });

  it('ignores clicks inside the Vita dock', () => {
    document.body.innerHTML = `<button id="book">Book Appointment</button><div data-vita-ui="guide-card"><button id="next">Next</button></div>`;
    const { r, last } = setup('/appointment-dashboard');
    r.start();
    document.getElementById('next')!.click();
    vi.advanceTimersByTime(100);
    expect(last().step?.id).toBe('s2');
  });
});

describe('helpers', () => {
  it('matches routes and fills {label}', () => {
    expect(routeMatches('/billing/', '/billing')).toBe(true);
    expect(routeMatches('/billing/ledger', '/billing')).toBe(false);
    expect(routeMatches('/billing?x=1', '/billing')).toBe(true);
    expect(stepText(guide.steps[1], 'अपॉइंटमेंट बुक करें')).toBe('Click **अपॉइंटमेंट बुक करें**.');
    expect(stepText(guide.steps[1])).toBe('Click **Book Appointment**.');
  });
});

describe('pages opened from a list', () => {
  it('matches a route with a parameter and offers the list screen instead', () => {
    expect(routeMatches('/pathology/orders/ORD-1', '/pathology/orders/:orderId')).toBe(true);
    expect(routeMatches('/pathology/orders', '/pathology/orders/:orderId')).toBe(false);
    expect(routeMatches('/pathology', '/pathology/orders/:orderId')).toBe(false);
    const from = { id: 'pathology', route: '/pathology', label: 'Pathology Lab' };
    expect(openableScreen({ id: 'pathology-order', route: '/pathology/orders/:orderId', label: 'Lab order', openFrom: from })).toEqual(from);
    expect(openableScreen({ id: 'billing', route: '/billing', label: 'Billing' })?.route).toBe('/billing');
    expect(openableScreen({ id: 'x', route: '/x/:id', label: 'X' })).toBeNull();
  });
});

describe('press counts as a click (1HMS dropdowns open on press)', () => {
  const steps = [
    { id: 's1', screen: null, action: 'click', done: 'click', say: 'Click {label}.', note: null, optional: false, target: { label: 'Next', key: null, kind: 'button', many: false, match: 'exact', within: null, alt: [] } },
    { id: 's2', screen: null, action: 'click', done: 'click', say: 'Click {label}.', note: null, optional: false, target: { label: 'Next', key: null, kind: 'button', many: false, match: 'exact', within: null, alt: [] } },
  ];
  it('a press completes the step, and the click of the same press does not complete the next one', async () => {
    document.body.innerHTML = '<button id="n">Next</button>';
    const btn = document.getElementById('n')!;
    let t = 1000;
    const r = new GuideRunner({ id: 'g', title: 'G', source: 'playbook', steps } as never, {
      find: () => ({ el: btn, all: [btn], shown: 'Next' }),
      getPath: () => '/',
      report: () => {},
      onChange: () => {},
      now: () => t,
    });
    r.start();
    btn.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 80));
    expect(r.state.index).toBe(1);
    t += 120;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 80));
    expect(r.state.index).toBe(1); // still on step 2
    t += 2000;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 80));
    expect(r.state.status).toBe('finished');
    r.destroy();
  });
});

// ---------------------------------------------------------------- Do mode

describe('Do mode: Vita clicks the safe steps, the user fills in and saves', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const drive: GuidePayload = {
    ...guide,
    drive: true,
    steps: [
      { ...guide.steps[0], auto: true },
      { ...guide.steps[1], auto: true },
      { ...guide.steps[2], auto: false },
      { id: 's4', screen: guide.steps[1].screen, action: 'click', done: 'click', say: 'Press {label}.', target: T('Save'), auto: false },
    ],
  };

  function run(g: GuidePayload, path = '/billing') {
    let p = path;
    const events: GuideRunEvent[] = [];
    const states: RunnerState[] = [];
    const clicked: string[] = [];
    const r: GuideRunner = new GuideRunner(g, {
      find: (t) => findTarget(t),
      getPath: () => p,
      report: (e) => events.push(e),
      onChange: (s) => states.push(s),
      typingIdleMs: 50,
      actDelayMs: 500,
      act: {
        click: (el) => {
          clicked.push(el.textContent ?? '');
          el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
          el.click();
        },
        navigate: (route) => {
          p = route;
          r.locationChanged();
        },
      },
    });
    return { r, events, clicked, last: () => states[states.length - 1] };
  }

  const page = () => {
    document.body.innerHTML = `<button id="book">Book Appointment</button><label for="n">Patient Name</label><input id="n"/><button id="save">Save</button>`;
  };

  it('opens the screen and the form itself, then hands the field and Save to the user', () => {
    page();
    const { r, events, clicked, last } = run(drive);
    r.start();
    expect(last()).toMatchObject({ driving: true, acting: true });
    vi.advanceTimersByTime(500); // Vita opens Appointments
    expect(last().step?.id).toBe('s2');
    vi.advanceTimersByTime(499);
    expect(clicked).toEqual([]); // the user sees the ring first
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(100);
    expect(clicked).toEqual(['Book Appointment']);
    expect(last().step?.id).toBe('s3');
    expect(document.activeElement?.id).toBe('n'); // the cursor waits in the field
    vi.advanceTimersByTime(5000);
    expect(last().step?.id).toBe('s3'); // never types
    const input = document.getElementById('n') as HTMLInputElement;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(100);
    expect(last().step?.id).toBe('s4');
    vi.advanceTimersByTime(5000);
    expect(clicked).toEqual(['Book Appointment']); // Save is never pressed by Vita
    document.getElementById('save')!.click();
    vi.advanceTimersByTime(100);
    expect(last().status).toBe('finished');
    expect(events.filter((e) => e.type === 'auto').map((e) => e.step)).toEqual(['s1', 's2']);
  });

  it('pauses when the user acts while Vita is about to, and resumes on request', () => {
    page();
    const { r, events, clicked, last } = run(drive, '/appointment-dashboard');
    r.start();
    expect(last()).toMatchObject({ acting: true });
    document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
    expect(last()).toMatchObject({ paused: true, driving: false, acting: false });
    vi.advanceTimersByTime(2000);
    expect(clicked).toEqual([]);
    expect(events.some((e) => e.type === 'paused')).toBe(true);
    r.resume();
    vi.advanceTimersByTime(600);
    expect(clicked).toEqual(['Book Appointment']);
  });

  it('a press inside Vita does not count as taking over; Pause does', () => {
    page();
    document.body.insertAdjacentHTML('beforeend', '<div data-vita-ui="guide-card"><button id="v">x</button></div>');
    const { r, clicked, last } = run(drive, '/appointment-dashboard');
    r.start();
    document.getElementById('v')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(last().paused).toBe(false);
    r.pause();
    vi.advanceTimersByTime(2000);
    expect(clicked).toEqual([]);
  });

  it('never presses a disabled button: the user can Skip', () => {
    document.body.innerHTML = `<button disabled>Book Appointment</button>`;
    const { r, clicked, last } = run(drive, '/appointment-dashboard');
    r.start();
    vi.advanceTimersByTime(2000);
    expect(clicked).toEqual([]);
    expect(last().step?.id).toBe('s2');
  });

  it('a guide without drive never acts, even with the dock able to', () => {
    page();
    const { r, clicked, last } = run({ ...drive, drive: false });
    r.start();
    vi.advanceTimersByTime(3000);
    expect(clicked).toEqual([]);
    expect(last()).toMatchObject({ driving: false, acting: false, step: expect.objectContaining({ id: 's1' }) });
  });
});
