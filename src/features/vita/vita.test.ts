// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { SseParser } from './api/sse';
import { VitaClient, VitaError, type VitaStreamEvent } from './api/vitaClient';
import { canOpen, screenContext } from './screens';
import { toBlocks } from './markdown';

// ------------------------------------------------------------------ SSE parser

describe('SseParser', () => {
  it('parses events split across chunks and skips keepalives', () => {
    const p = new SseParser();
    expect(p.push('id: 1-0\nevent: tok')).toEqual([]);
    const a = p.push('en\ndata: {"text":"Hi"}\n\n: keepalive\n\nevent: done\ndata: {}\n\n');
    expect(a).toEqual([
      { id: '1-0', event: 'token', data: '{"text":"Hi"}' },
      { id: null, event: 'done', data: '{}' },
    ]);
  });

  it('handles CRLF and multi-line data', () => {
    const p = new SseParser();
    expect(p.push('event: x\r\ndata: a\r\ndata: b\r\n\r\n')).toEqual([{ id: null, event: 'x', data: 'a\nb' }]);
  });
});

// ------------------------------------------------------------------ client against a fake Vita

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function fakeVita(routes: Record<string, Handler>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const path = url.replace('https://vita.test', '');
    const key = `${init.method ?? 'GET'} ${path.split('?')[0]}`;
    const h = routes[key];
    if (!h) return new Response(JSON.stringify({ detail: 'not_found' }), { status: 404 });
    return h(url, init);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const session = (n: number) =>
  json(
    {
      sessionId: `s${n}`,
      accessToken: `tok${n}`,
      expiresIn: 900,
      user: { userId: 'u', hospitalId: 'h', permissions: ['billing'] },
      mode: 'ask',
      doModeOn: false,
      locale: 'en',
    },
    201,
  );

// Delivers chunks one read at a time; with `fail`, the connection drops after the last chunk
// was read (controller.error() would otherwise discard chunks not yet read).
const sseBody = (chunks: string[], fail = false) => {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(c) {
      if (i < chunks.length) c.enqueue(enc.encode(chunks[i++]));
      else if (fail) c.error(new TypeError('network drop'));
      else c.close();
    },
  });
};

const auth = (init: RequestInit) => new Headers(init.headers).get('Authorization');

describe('VitaClient', () => {
  it('creates a session from the 1HMS token and sends questions with the Vita token', async () => {
    let made = 0;
    const { fetchImpl, calls } = fakeVita({
      'POST /v1/sessions': (_u, init) => {
        expect(JSON.parse(String(init.body)).hmsToken).toBe('hms-1');
        return session(++made);
      },
      'POST /v1/chat': (_u, init) => {
        expect(auth(init)).toBe('Bearer tok1');
        return json({ turnId: 't1', conversationId: 'c1', streamUrl: '/v1/turns/t1/events' }, 202);
      },
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test/', getHmsToken: () => 'hms-1', fetchImpl });
    const acc = await c.ask('How do I bill?', { screen: { route: '/billing', screenId: 'billing' } });
    expect(acc.turnId).toBe('t1');
    await c.ask('again');
    expect(made).toBe(1); // session reused
    expect(JSON.parse(String(calls[1].init.body)).screen).toEqual({ route: '/billing', screenId: 'billing' });
  });

  it('starts a new session once when Vita says the old one expired', async () => {
    let made = 0;
    let chats = 0;
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': () => session(++made),
      'POST /v1/chat': (_u, init) =>
        ++chats === 1
          ? json({ detail: 'session_expired' }, 401)
          : (expect(auth(init)).toBe('Bearer tok2'), json({ turnId: 't', conversationId: 'c', streamUrl: '' }, 202)),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'hms', fetchImpl });
    await c.ask('q');
    expect(made).toBe(2);
  });

  it('starts a new session when the 1HMS token changes (re-login)', async () => {
    let hms = 'a';
    let made = 0;
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': (_u, init) => {
        expect(JSON.parse(String(init.body)).hmsToken).toBe(hms);
        return session(++made);
      },
      'POST /v1/chat': () => json({ turnId: 't', conversationId: 'c', streamUrl: '' }, 202),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => hms, fetchImpl });
    await c.ask('q');
    hms = 'b';
    await c.ask('q');
    expect(made).toBe(2);
  });

  it('asks for the hospital selected in 1HMS and starts a new session when it changes', async () => {
    let hospital: string | null = 'h-a';
    const asked: (string | undefined)[] = [];
    let made = 0;
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': (_u, init) => {
        asked.push(JSON.parse(String(init.body)).hospitalId);
        return session(++made);
      },
      'POST /v1/chat': () => json({ turnId: 't', conversationId: 'c', streamUrl: '' }, 202),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'hms', getHospitalId: () => hospital, fetchImpl });
    await c.ask('q');
    await c.ask('q');
    hospital = 'h-b';
    await c.ask('q');
    hospital = null;
    await c.ask('q');
    expect(asked).toEqual(['h-a', 'h-b', undefined]);
  });

  it('explains when 1HMS says the user is not in the selected hospital', async () => {
    const { fetchImpl } = fakeVita({ 'POST /v1/sessions': () => json({ detail: 'hospital_not_allowed' }, 403) });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'hms', getHospitalId: () => 'x', fetchImpl });
    await expect(c.ask('q')).rejects.toMatchObject({ code: 'hospital_not_allowed', message: expect.stringContaining('hospital') });
  });

  it('reports when patient details were removed, and explains hospital limits', async () => {
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'POST /v1/chat': () => json({ turnId: 't', conversationId: 'c', streamUrl: '', removed: ['name', 'phone'] }, 202),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'hms', fetchImpl });
    expect((await c.ask('refund for patient Ramesh 9876543210')).removed).toEqual(['name', 'phone']);
    const busy = fakeVita({
      'POST /v1/sessions': () => session(1),
      'POST /v1/chat': () => json({ detail: 'hospital_rate_limited' }, 429),
    });
    const b = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'hms', fetchImpl: busy.fetchImpl });
    await expect(b.ask('q')).rejects.toMatchObject({ code: 'hospital_rate_limited', message: expect.stringContaining('hospital') });
  });

  it('turns API errors into friendly messages', async () => {
    const { fetchImpl } = fakeVita({ 'POST /v1/sessions': () => json({ detail: 'hms_token_rejected' }, 401) });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'x', fetchImpl });
    await expect(c.ask('q')).rejects.toMatchObject({ code: 'hms_token_rejected', message: expect.stringContaining('log in') });
    const none = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => null, fetchImpl });
    await expect(none.ask('q')).rejects.toBeInstanceOf(VitaError);
  });

  it('streams a reply and maps every event type', async () => {
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'GET /v1/turns/t1/events': () =>
        new Response(
          sseBody([
            'id: 1-0\nevent: turn.started\ndata: {}\n\n',
            'id: 2-0\nevent: status\ndata: {"stage":"searching"}\n\n',
            'id: 3-0\nevent: token\ndata: {"text":"Go to "}\n\nid: 4-0\nevent: token\ndata: {"text":"Billing."}\n\n',
            'id: 5-0\nevent: citation\ndata: {"docId":"PRD-10","section":"4.1","title":"Billing"}\n\n',
            'id: 6-0\nevent: suggest_screen\ndata: {"route":"/billing","screenId":"billing","label":"Billing"}\n\n',
            'id: 7-0\nevent: ui_action\ndata: {"type":"navigate","route":"/billing","screenId":"billing","label":"Billing"}\n\n',
            'id: 8-0\nevent: done\ndata: {"messageId":"m1","text":"Go to Billing.","route":"extractive"}\n\n',
            'id: 9-0\nevent: token\ndata: {"text":"never read"}\n\n',
          ]),
          { headers: { 'Content-Type': 'text/event-stream' } },
        ),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', fetchImpl });
    const evs: VitaStreamEvent[] = [];
    for await (const e of c.stream('t1')) evs.push(e);
    expect(evs.map((e) => e.type)).toEqual(['started', 'status', 'token', 'token', 'citation', 'suggest_screen', 'navigate', 'done']);
    expect(evs[evs.length - 1]).toMatchObject({ type: 'done', messageId: 'm1', text: 'Go to Billing.' });
  });

  it('maps Vita\'s choices, keeping only well-formed ones, and the preview flag on a guide', async () => {
    const choices = {
      purpose: 'ask',
      header: null,
      other: true,
      otherLabel: 'Something else',
      items: [
        { kind: 'card', id: 'appt-cancel', label: 'Cancel an appointment' },
        { kind: 'guide', id: 'cancel-admission', label: 'Cancel an admission' },
        { kind: 'script', id: 'x', label: 'bad kind' },
        { kind: 'card', id: '../etc', label: 'bad id' },
        { kind: 'card', id: 'lab-cancel', label: '   ' },
      ],
    };
    const guide = { id: 'book-appointment', source: 'playbook', title: 'Book', lang: 'en', steps: [], preview: true };
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'GET /v1/turns/t1/events': () =>
        new Response(
          sseBody([
            `id: 1-0\nevent: choices\ndata: ${JSON.stringify(choices)}\n\n`,
            'id: 2-0\nevent: choices\ndata: {"items":[{"kind":"other","id":"","label":"x"}]}\n\n',
            `id: 3-0\nevent: guide\ndata: ${JSON.stringify(guide)}\n\n`,
            'id: 4-0\nevent: done\ndata: {"messageId":"m1","text":"Which?","card":"appt-book"}\n\n',
          ]),
          { headers: { 'Content-Type': 'text/event-stream' } },
        ),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', fetchImpl });
    const evs: VitaStreamEvent[] = [];
    for await (const e of c.stream('t1')) evs.push(e);
    expect(evs.map((e) => e.type)).toEqual(['choices', 'guide', 'done']);
    const ch = evs[0] as Extract<VitaStreamEvent, { type: 'choices' }>;
    expect(ch.choices.items.map((i) => i.id)).toEqual(['appt-cancel', 'cancel-admission']);
    expect(ch.choices).toMatchObject({ purpose: 'ask', other: true, otherLabel: 'Something else', header: null });
    expect((evs[1] as Extract<VitaStreamEvent, { type: 'guide' }>).guide.preview).toBe(true);
    expect(evs[2]).toMatchObject({ type: 'done', card: 'appt-book' });
  });

  it('sends a tapped choice as ids only', async () => {
    const { fetchImpl, calls } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'POST /v1/chat': () => json({ turnId: 't', conversationId: 'c', streamUrl: '/v1/turns/t/events' }, 202),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', fetchImpl });
    const choice = { kind: 'card', id: 'appt-cancel', label: 'not sent' } as const;
    await c.ask('Cancel an appointment', { choice });
    const body = JSON.parse(String(calls.find((x) => x.url.endsWith('/v1/chat'))!.init.body));
    expect(body).toMatchObject({ message: 'Cancel an appointment', choice: { kind: 'card', id: 'appt-cancel' } });
    expect(body.choice.label).toBeUndefined();
  });

  it('resumes a dropped stream from the last event id without repeating text', async () => {
    let n = 0;
    const seen: (string | null)[] = [];
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'GET /v1/turns/t1/events': (_u, init) => {
        seen.push(new Headers(init.headers).get('Last-Event-ID'));
        return ++n === 1
          ? new Response(sseBody(['id: 1-0\nevent: token\ndata: {"text":"Hel"}\n\n'], true))
          : new Response(sseBody(['id: 2-0\nevent: token\ndata: {"text":"lo"}\n\nid: 3-0\nevent: done\ndata: {"messageId":"m","text":"Hello"}\n\n']));
      },
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', fetchImpl });
    let text = '';
    for await (const e of c.stream('t1')) if (e.type === 'token') text += e.text;
    expect(text).toBe('Hello');
    expect(seen).toEqual([null, '1-0']);
  });

  it('gives up with connection_lost after repeated drops', async () => {
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'GET /v1/turns/t1/events': () => new Response(sseBody([], true)),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', fetchImpl });
    const evs: VitaStreamEvent[] = [];
    for await (const e of c.stream('t1', undefined, 1)) evs.push(e);
    expect(evs).toEqual([{ type: 'error', code: 'connection_lost', message: expect.any(String) }]);
  });

  it('sends the name 1HMS shows at login, and only when there is one', async () => {
    const bodies: Record<string, unknown>[] = [];
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': (_u, init) => {
        bodies.push(JSON.parse(String(init.body)));
        return session(bodies.length);
      },
      'POST /v1/chat': () => json({ turnId: 't1', conversationId: 'c1', streamUrl: '/v1/turns/t1/events' }, 202),
    });
    await new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', getDisplayName: () => ' Dr. Asha Verma ', fetchImpl }).ask('hi');
    await new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', getDisplayName: () => null, fetchImpl }).ask('hi');
    expect(bodies[0].displayName).toBe('Dr. Asha Verma');
    expect('displayName' in bodies[1]).toBe(false);
  });

  it("returns Vita's reply to a rating", async () => {
    const { fetchImpl } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'POST /v1/messages/m1/feedback': () => json({ messageId: 'm1', rating: 'down', followUp: 'Sorry, I got that wrong.' }),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', fetchImpl });
    expect((await c.feedback('m1', 'down', 'wrong')).followUp).toBe('Sorry, I got that wrong.');
  });

  it('sends feedback', async () => {
    const { fetchImpl, calls } = fakeVita({
      'POST /v1/sessions': () => session(1),
      'POST /v1/messages/m1/feedback': () => json({ messageId: 'm1', rating: 'down' }),
    });
    const c = new VitaClient({ baseUrl: 'https://vita.test', getHmsToken: () => 'h', fetchImpl });
    await c.feedback('m1', 'down', 'incomplete', 'missing step');
    expect(JSON.parse(String(calls[calls.length - 1].init.body))).toEqual({ rating: 'down', reason: 'incomplete', comment: 'missing step' });
  });
});

// ------------------------------------------------------------------ screens

describe('screens', () => {
  it('sends the route pattern, never a record id', () => {
    expect(screenContext('/patient/7f1c2a9e-1111-2222-3333-444455556666')).toEqual({
      route: '/patient/:patientId',
      screenId: 'patient-detail',
    });
    expect(screenContext('/billing')).toEqual({ route: '/billing', screenId: 'billing' });
    expect(screenContext('/unknown/page')).toBeNull();
  });

  it('opens only real boards the user may use', () => {
    const billing = { route: '/billing', screenId: 'billing', label: 'Billing' };
    expect(canOpen(billing, ['billing'])).toBe(true);
    expect(canOpen(billing, ['pharmacy'])).toBe(false);
    expect(canOpen({ route: '/patient/:patientId', screenId: 'x', label: 'x' }, ['patients'])).toBe(false);
    expect(canOpen({ route: 'https://evil.example', screenId: 'x', label: 'x' }, ['billing'])).toBe(false);
    expect(canOpen({ route: '/not-a-board', screenId: 'x', label: 'x' }, ['billing'])).toBe(false);
  });
});

// ------------------------------------------------------------------ markdown

describe('VitaMarkdown blocks', () => {
  it('splits paragraphs, lists and tables', () => {
    const b = toBlocks('From the guide (4.1):\n\n- Step one\n- **Step** two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n1. first\n2. second');
    expect(b.map((x) => x.kind)).toEqual(['p', 'ul', 'table', 'ol']);
    expect(b[2]).toEqual({ kind: 'table', head: ['A', 'B'], rows: [['1', '2']] });
  });
});
