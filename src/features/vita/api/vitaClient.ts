/**
 * Vita client for 1HMS web.
 *
 * - Exchanges the user's 1HMS token for a Vita session (Vita asks easyHMSAPI who the user is;
 *   the browser never tells Vita its own permissions).
 * - Keeps the short-lived Vita access token fresh and silently starts a new session when the
 *   old one ended (idle timeout, 1HMS token rotated, permissions revoked).
 * - Streams replies with fetch + SSE and resumes after a dropped connection (Last-Event-ID), so
 *   a flaky hospital Wi-Fi never runs the same question twice.
 */
import { SseParser } from './sse';
import type { GuideOffer, GuidePayload, GuideRunEvent } from '../guide/types';

export type VitaLocale = 'en' | 'hi';
export type VitaMode = 'ask' | 'guide' | 'do';

export interface VitaCitation {
  ref?: string;
  docId: string;
  section: string;
  title?: string;
}

export interface VitaScreenLink {
  route: string;
  screenId: string;
  label: string;
}

/** Where the user is in 1HMS. Layout only, never field values or record ids. */
export interface VitaScreenContext {
  route: string;
  screenId?: string;
}

export type VitaStreamEvent =
  | { type: 'started' }
  | { type: 'status'; stage: string }
  | { type: 'token'; text: string }
  | { type: 'citation'; citation: VitaCitation }
  | { type: 'suggest_screen'; screen: VitaScreenLink }
  | { type: 'navigate'; screen: VitaScreenLink }
  | { type: 'guide'; guide: GuidePayload }
  | { type: 'guide_offer'; offer: GuideOffer }
  | { type: 'done'; messageId: string | null; text: string; route?: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'cancelled' };

export interface VitaConversation {
  id: string;
  title: string;
  createdAt: string;
  lastTurnAt: string;
}

export interface VitaHistoryMessage {
  id: string;
  turnId: string;
  role: 'user' | 'assistant';
  text: string;
  citations: VitaCitation[];
  createdAt: string;
}

export interface VitaClientOptions {
  baseUrl: string;
  /** Current 1HMS login token (read fresh on every call; it rotates). */
  getHmsToken: () => string | null;
  /** Hospital currently selected in 1HMS (multi-hospital users). Vita checks membership with 1HMS. */
  getHospitalId?: () => string | null;
  locale?: VitaLocale;
  fetchImpl?: typeof fetch;
}

interface SessionState {
  sessionId: string;
  accessToken: string;
  expiresAt: number;
  hmsToken: string;
  /** Hospital asked for when the session was made (null = user's primary hospital). */
  requestedHospitalId: string | null;
  hospitalId: string;
  permissions: string[];
  features: Record<string, boolean>;
}

export class VitaError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'VitaError';
  }
}

const SESSION_LOST = new Set(['session_expired', 'session_revoked', 'invalid_token', 'missing_token']);
const TERMINAL = new Set(['done', 'error', 'cancelled']);

export class VitaClient {
  private session: SessionState | null = null;
  private creating: Promise<SessionState> | null = null;
  private readonly base: string;
  private readonly fetch: typeof fetch;
  locale: VitaLocale;

  constructor(private readonly opts: VitaClientOptions) {
    this.base = opts.baseUrl.replace(/\/+$/, '');
    this.fetch = opts.fetchImpl ?? ((...a) => globalThis.fetch(...a));
    this.locale = opts.locale ?? 'en';
  }

  get hospitalId(): string | null {
    return this.session?.hospitalId ?? null;
  }

  /** Features Vita has switched on for this session, e.g. { guide: true }. Opens a session if needed. */
  async features(): Promise<Record<string, boolean>> {
    return (await this.ensureSession()).features;
  }

  // ------------------------------------------------------------------ session

  private async ensureSession(): Promise<SessionState> {
    const hms = this.opts.getHmsToken();
    if (!hms) throw new VitaError(401, 'not_logged_in', 'Please log in to 1HMS first.');
    const wanted = this.opts.getHospitalId?.() || null;
    const s = this.session;
    if (s && s.hmsToken === hms && s.requestedHospitalId === wanted) {
      if (Date.now() < s.expiresAt - 30_000) return s;
      try {
        return await this.refresh(s);
      } catch {
        this.session = null; // fall through to a new session
      }
    } else if (s) {
      this.session = null; // 1HMS token or selected hospital changed: start over
    }
    this.creating ??= this.createSession(hms, wanted).finally(() => (this.creating = null));
    return this.creating;
  }

  private async createSession(hms: string, hospitalId: string | null): Promise<SessionState> {
    const r = await this.fetch(`${this.base}/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hmsToken: hms, locale: this.locale, hospitalId: hospitalId ?? undefined }),
    });
    const body = await readJson(r);
    if (!r.ok) throw toError(r.status, body);
    this.session = this.toState(body, hms, hospitalId);
    return this.session;
  }

  private async refresh(s: SessionState): Promise<SessionState> {
    const r = await this.fetch(`${this.base}/v1/sessions/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s.accessToken}` },
    });
    const body = await readJson(r);
    if (!r.ok) throw toError(r.status, body);
    this.session = this.toState(body, s.hmsToken, s.requestedHospitalId);
    return this.session;
  }

  private toState(raw: unknown, hms: string, requestedHospitalId: string | null): SessionState {
    const b = raw as SessionJson;
    return {
      sessionId: b.sessionId,
      accessToken: b.accessToken,
      expiresAt: Date.now() + (b.expiresIn ?? 900) * 1000,
      hmsToken: hms,
      requestedHospitalId,
      hospitalId: b.user?.hospitalId ?? '',
      permissions: b.user?.permissions ?? [],
      features: b.features ?? {},
    };
  }

  /** Authenticated request; one transparent retry with a new session if the old one is gone. */
  private async request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
    const s = await this.ensureSession();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${s.accessToken}`);
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const r = await this.fetch(`${this.base}${path}`, { ...init, headers });
    if (r.status === 401 && retry) {
      const body = await readJson(r.clone());
      if (SESSION_LOST.has(detailOf(body) ?? '')) {
        this.session = null;
        return this.request(path, init, false);
      }
    }
    return r;
  }

  private async json<T>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await this.request(path, init);
    const body = await readJson(r);
    if (!r.ok) throw toError(r.status, body);
    return body as T;
  }

  async setLocale(locale: VitaLocale): Promise<void> {
    this.locale = locale;
    if (this.session) {
      await this.json('/v1/sessions/current', { method: 'PATCH', body: JSON.stringify({ locale }) }).catch(() => {});
    }
  }

  async end(): Promise<void> {
    if (!this.session) return;
    await this.request('/v1/sessions/current', { method: 'DELETE' }, false).catch(() => {});
    this.session = null;
  }

  // ------------------------------------------------------------------ chat

  ask(
    message: string,
    opts: { conversationId?: string | null; screen?: VitaScreenContext | null; mode?: VitaMode } = {},
  ): Promise<{ turnId: string; conversationId: string; streamUrl: string; removed?: string[] }> {
    return this.json('/v1/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversationId: opts.conversationId ?? undefined,
        screen: opts.screen ?? undefined,
        mode: opts.mode ?? undefined,
      }),
    });
  }

  cancel(turnId: string): Promise<unknown> {
    return this.json(`/v1/turns/${turnId}/cancel`, { method: 'POST' }).catch(() => undefined);
  }

  /**
   * Yields reply events until the turn ends. If the connection drops, reconnects (up to
   * `maxReconnects`) from the last event received; Vita replays only what was missed.
   */
  async *stream(turnId: string, signal?: AbortSignal, maxReconnects = 3): AsyncGenerator<VitaStreamEvent> {
    let lastId: string | null = null;
    let attempts = 0;
    for (;;) {
      let ended = false;
      try {
        const headers: Record<string, string> = { Accept: 'text/event-stream' };
        if (lastId) headers['Last-Event-ID'] = lastId;
        const r = await this.request(`/v1/turns/${turnId}/events`, { headers, signal });
        if (!r.ok || !r.body) throw toError(r.status, await readJson(r));
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        const parser = new SseParser();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const ev of parser.push(decoder.decode(value, { stream: true }))) {
            if (ev.id) lastId = ev.id;
            attempts = 0;
            const mapped = mapEvent(ev.event, safeParse(ev.data));
            if (mapped) yield mapped;
            if (TERMINAL.has(ev.event)) {
              ended = true;
              await reader.cancel().catch(() => {});
              return;
            }
          }
        }
      } catch (e) {
        if (signal?.aborted) return;
        if (e instanceof VitaError && e.status !== 0 && e.status < 500) throw e;
      }
      if (ended) return;
      if (++attempts > maxReconnects) {
        yield { type: 'error', code: 'connection_lost', message: 'Connection to Vita was lost. Please ask again.' };
        return;
      }
      await sleep(500 * attempts, signal);
      if (signal?.aborted) return;
    }
  }

  // ------------------------------------------------------------------ feedback and history

  feedback(
    messageId: string,
    rating: 'up' | 'down',
    reason?: 'wrong' | 'incomplete' | 'not_relevant' | 'too_long' | 'other',
    comment?: string,
  ): Promise<unknown> {
    return this.json(`/v1/messages/${messageId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, reason, comment: comment || undefined }),
    });
  }

  conversations(limit = 20): Promise<VitaConversation[]> {
    return this.json(`/v1/conversations?limit=${limit}`);
  }

  messages(conversationId: string): Promise<VitaHistoryMessage[]> {
    return this.json(`/v1/conversations/${conversationId}/messages?limit=100`);
  }

  deleteConversation(conversationId: string): Promise<unknown> {
    return this.request(`/v1/conversations/${conversationId}`, { method: 'DELETE' });
  }

  // ------------------------------------------------------------------ guide mode

  /** A guide in the user's language, with a new runId ("Show me on screen"). */
  guide(guideId: string, lang?: 'en' | 'hi' | 'hinglish'): Promise<GuidePayload> {
    const q = lang ? `?lang=${lang}` : '';
    return this.json(`/v1/guides/${encodeURIComponent(guideId)}${q}`);
  }

  /** Progress of a guide run: step ids and timings only, never what the user typed or saw. */
  guideEvents(runId: string, events: GuideRunEvent[]): Promise<unknown> {
    return this.json(`/v1/guide-runs/${encodeURIComponent(runId)}/events`, {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }
}

// ------------------------------------------------------------------ helpers

type Obj = Record<string, unknown>;

interface SessionJson {
  sessionId: string;
  accessToken: string;
  expiresIn?: number;
  user?: { hospitalId?: string; permissions?: string[] };
  features?: Record<string, boolean>;
}

const str = (v: unknown, fallback = ''): string => (v === undefined || v === null ? fallback : String(v));

function detailOf(body: unknown): string | null {
  const d = (body as Obj | null)?.detail;
  return typeof d === 'string' ? d : null;
}

function mapEvent(event: string, d: Obj): VitaStreamEvent | null {
  switch (event) {
    case 'turn.started':
      return { type: 'started' };
    case 'status':
      return { type: 'status', stage: str(d.stage) };
    case 'token':
      return { type: 'token', text: str(d.text) };
    case 'citation':
      return d.docId ? { type: 'citation', citation: d as unknown as VitaCitation } : null;
    case 'suggest_screen':
      return d.route ? { type: 'suggest_screen', screen: d as unknown as VitaScreenLink } : null;
    case 'ui_action':
      return d.type === 'navigate' && d.route ? { type: 'navigate', screen: d as unknown as VitaScreenLink } : null;
    case 'guide':
      return Array.isArray(d.steps) && d.id ? { type: 'guide', guide: d as unknown as GuidePayload } : null;
    case 'guide_offer':
      return d.guideId ? { type: 'guide_offer', offer: d as unknown as GuideOffer } : null;
    case 'done':
      return {
        type: 'done',
        messageId: typeof d.messageId === 'string' ? d.messageId : null,
        text: str(d.text),
        route: typeof d.route === 'string' ? d.route : undefined,
      };
    case 'error':
      return { type: 'error', code: str(d.code, 'error'), message: str(d.message, 'Vita had a problem. Please try again.') };
    case 'cancelled':
      return { type: 'cancelled' };
    default:
      return null;
  }
}

function safeParse(s: string): Obj {
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' ? (v as Obj) : {};
  } catch {
    return {};
  }
}

async function readJson(r: Response): Promise<unknown> {
  try {
    return await r.json();
  } catch {
    return null;
  }
}

function toError(status: number, body: unknown): VitaError {
  const code = detailOf(body) ?? (status === 422 ? 'invalid_request' : `http_${status}`);
  return new VitaError(status, code, MESSAGES[code] ?? MESSAGES[`http_${status}`] ?? 'Vita is not available right now.');
}

const MESSAGES: Record<string, string> = {
  hms_token_rejected: 'Your 1HMS login has expired. Please log in again.',
  hms_unavailable: '1HMS is not reachable right now. Please try again in a minute.',
  hospital_not_allowed: "Vita can't confirm you work at the hospital selected in 1HMS. Switch hospital or log in again.",
  rate_limited: 'Too many questions in a minute. Please wait a moment.',
  conversation_busy: 'Vita is still answering. Please wait.',
  hospital_rate_limited: 'Vita is getting a lot of questions from your hospital. Please try again in a minute.',
  vita_busy: 'Vita is busy right now. Please try again in a minute.',
  guide_mode_off: 'Guide mode is switched off right now. Ask in words instead.',
  guide_not_found: 'That guide is not available for your account.',
  http_429: 'Too many questions in a minute. Please wait a moment.',
  http_503: 'Vita is busy right now. Please try again in a minute.',
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });
}
