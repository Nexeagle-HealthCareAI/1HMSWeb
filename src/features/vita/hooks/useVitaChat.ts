import { useCallback, useEffect, useRef, useState } from 'react';
import {
  VitaClient,
  VitaError,
  type VitaChoiceRef,
  type VitaChoices,
  type VitaCitation,
  type VitaConversation,
  type VitaLocale,
  type VitaMode,
  type VitaScreenContext,
  type VitaScreenLink,
} from '../api/vitaClient';
import type { GuideOffer, GuidePayload } from '../guide/types';

export type VitaRating = 'up' | 'down';

export interface VitaChatMessage {
  key: string;
  role: 'user' | 'assistant';
  text: string;
  status: 'pending' | 'streaming' | 'done' | 'error' | 'cancelled';
  stage?: string;
  citations: VitaCitation[];
  screen?: VitaScreenLink;
  messageId?: string | null;
  turnId?: string;
  rating?: VitaRating;
  errorCode?: string;
  /** Guide Mode: the guide Vita sent for this answer (the dock runs it on the screen). */
  guide?: GuidePayload;
  /** Ask mode: this how-to has an on-screen guide ("Show me on screen"). */
  offer?: GuideOffer;
  /** Tasks Vita offers as buttons: its question's choices, or "Something else?" / "Next". */
  choices?: VitaChoices;
  /** The answer card Vita showed (sent back with "Not this"). */
  card?: string;
  /** A guide Vita picked itself waits for Start (guide.preview); false once started. */
  awaitingStart?: boolean;
}

let seq = 0;
const key = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Chat state for the Vita dock. `onNavigate` is called when the user asked Vita to open a
 * screen ("go to billing") and the screen is allowed; the dock decides how to navigate.
 */
export function useVitaChat(
  client: VitaClient | null,
  opts: { onNavigate?: (s: VitaScreenLink) => void; onGuide?: (g: GuidePayload) => void } = {},
) {
  const [messages, setMessages] = useState<VitaChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<VitaConversation[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const turnRef = useRef<string | null>(null);
  const navRef = useRef(opts.onNavigate);
  navRef.current = opts.onNavigate;
  const guideRef = useRef(opts.onGuide);
  guideRef.current = opts.onGuide;

  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = useCallback((k: string, fn: (m: VitaChatMessage) => VitaChatMessage) => {
    setMessages((ms) => ms.map((m) => (m.key === k ? fn(m) : m)));
  }, []);

  const send = useCallback(
    async (text: string, screen: VitaScreenContext | null, mode?: VitaMode, choice?: VitaChoiceRef) => {
      const q = text.trim();
      if (!client || !q || busy) return;
      setNotice(null);
      const userKey = key();
      const botKey = key();
      setMessages((ms) => [
        ...ms,
        { key: userKey, role: 'user', text: q, status: 'done', citations: [] },
        { key: botKey, role: 'assistant', text: '', status: 'pending', citations: [] },
      ]);
      setBusy(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const acc = await client.ask(q, { conversationId, screen, mode, choice });
        setConversationId(acc.conversationId);
        if (acc.removed?.length) {
          // The server removed phone numbers, names, ids... before keeping or using the question.
          setNotice('Patient details were removed from your question. Vita never needs them to help.');
        }
        turnRef.current = acc.turnId;
        patch(botKey, (m) => ({ ...m, turnId: acc.turnId }));
        for await (const ev of client.stream(acc.turnId, ac.signal)) {
          switch (ev.type) {
            case 'status':
              patch(botKey, (m) => ({ ...m, stage: ev.stage }));
              break;
            case 'token':
              patch(botKey, (m) => ({ ...m, status: 'streaming', text: m.text + ev.text }));
              break;
            case 'citation':
              patch(botKey, (m) =>
                m.citations.some((c) => c.docId === ev.citation.docId && c.section === ev.citation.section)
                  ? m
                  : { ...m, citations: [...m.citations, ev.citation] },
              );
              break;
            case 'suggest_screen':
              patch(botKey, (m) => ({ ...m, screen: ev.screen }));
              break;
            case 'guide':
              // Picked by Vita: the user sees what it is and presses Start. Chosen by the user
              // (a tapped choice, "show me"): it starts at once.
              patch(botKey, (m) => ({ ...m, guide: ev.guide, awaitingStart: !!ev.guide.preview }));
              if (!ev.guide.preview) guideRef.current?.(ev.guide);
              break;
            case 'choices':
              patch(botKey, (m) => ({ ...m, choices: ev.choices }));
              break;
            case 'guide_offer':
              patch(botKey, (m) => ({ ...m, offer: ev.offer }));
              break;
            case 'navigate':
              patch(botKey, (m) => ({ ...m, screen: ev.screen }));
              navRef.current?.(ev.screen);
              break;
            case 'done':
              patch(botKey, (m) => ({
                ...m,
                status: 'done',
                text: ev.text || m.text,
                messageId: ev.messageId,
                card: ev.card ?? m.card,
              }));
              break;
            case 'error':
              patch(botKey, (m) => ({ ...m, status: 'error', text: m.text || ev.message, errorCode: ev.code }));
              break;
            case 'cancelled':
              patch(botKey, (m) => ({ ...m, status: 'cancelled' }));
              break;
          }
        }
        // Stream ended without a terminal event (aborted): mark stopped.
        patch(botKey, (m) => (m.status === 'pending' || m.status === 'streaming' ? { ...m, status: 'cancelled' } : m));
      } catch (e) {
        const msg = e instanceof VitaError ? e.message : 'Vita is not reachable right now.';
        patch(botKey, (m) => ({ ...m, status: 'error', text: msg, errorCode: e instanceof VitaError ? e.code : 'network' }));
      } finally {
        setBusy(false);
        abortRef.current = null;
        turnRef.current = null;
      }
    },
    [client, busy, conversationId, patch],
  );

  /** Start the guide a message is waiting with (its Start button). */
  const startGuide = useCallback(
    (k: string) => {
      const m = messages.find((x) => x.key === k);
      if (!m?.guide) return;
      patch(k, (x) => ({ ...x, awaitingStart: false }));
      guideRef.current?.(m.guide);
    },
    [messages, patch],
  );

  const stop = useCallback(() => {
    const t = turnRef.current;
    if (client && t) void client.cancel(t);
    abortRef.current?.abort();
  }, [client]);

  const rate = useCallback(
    async (k: string, rating: VitaRating, reason?: Parameters<VitaClient['feedback']>[2], comment?: string) => {
      const m = messages.find((x) => x.key === k);
      if (!client || !m?.messageId) return;
      const before = m.rating;
      patch(k, (x) => ({ ...x, rating }));
      try {
        const res = await client.feedback(m.messageId, rating, reason, comment);
        // Vita answers a thumbs-up, or a thumbs-down once the reason is picked ("Sorry, what were
        // you trying to do?"). One reply per answer: a new rating replaces it.
        const line = res?.followUp?.trim();
        // "Not what I asked" is answered by the dock offering the other tasks instead.
        if (line && (rating === 'up' || (reason && reason !== 'not_relevant'))) {
          const fk = `fu-${k}`;
          setMessages((ms) => {
            const rest = ms.filter((x) => x.key !== fk);
            const at = rest.findIndex((x) => x.key === k);
            const reply: VitaChatMessage = { key: fk, role: 'assistant', text: line, status: 'done', citations: [] };
            return at < 0 ? [...rest, reply] : [...rest.slice(0, at + 1), reply, ...rest.slice(at + 1)];
          });
        }
      } catch {
        patch(k, (x) => ({ ...x, rating: before }));
        setNotice('Could not save your feedback. Please try again.');
      }
    },
    [client, messages, patch],
  );

  const newChat = useCallback(() => {
    if (busy) return;
    setMessages([]);
    setConversationId(null);
    setNotice(null);
  }, [busy]);

  const loadHistory = useCallback(async () => {
    if (!client) return;
    try {
      setHistory(await client.conversations(20));
    } catch (e) {
      setNotice(e instanceof VitaError ? e.message : 'Could not load your chats.');
    }
  }, [client]);

  const openConversation = useCallback(
    async (id: string) => {
      if (!client || busy) return;
      try {
        const rows = await client.messages(id);
        setConversationId(id);
        setMessages(
          rows.map((r) => ({
            key: r.id,
            role: r.role,
            text: r.text,
            status: 'done',
            citations: r.citations ?? [],
            messageId: r.role === 'assistant' ? r.id : undefined,
          })),
        );
      } catch (e) {
        setNotice(e instanceof VitaError ? e.message : 'Could not open that chat.');
      }
    },
    [client, busy],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!client) return;
      await client.deleteConversation(id).catch(() => {});
      setHistory((h) => h.filter((c) => c.id !== id));
      if (id === conversationId) newChat();
    },
    [client, conversationId, newChat],
  );

  const setLocale = useCallback(
    async (l: VitaLocale) => {
      if (client) await client.setLocale(l);
    },
    [client],
  );

  return {
    messages,
    conversationId,
    busy,
    history,
    notice,
    send,
    startGuide,
    stop,
    rate,
    newChat,
    loadHistory,
    openConversation,
    deleteConversation,
    setLocale,
    dismissNotice: () => setNotice(null),
  };
}
