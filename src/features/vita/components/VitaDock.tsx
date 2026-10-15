import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  BookOpen,
  ExternalLink,
  History,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { VitaClient, type VitaLocale, type VitaScreenLink } from '../api/vitaClient';
import { useVitaChat, type VitaChatMessage } from '../hooks/useVitaChat';
import { canOpen, screenContext } from '../screens';
import { VitaMarkdown } from './VitaMarkdown';
import { VITA_API_URL } from '../config';


const LS_LOCALE = 'vita.locale';
const LS_OPEN = 'vita.open';

const T = {
  en: {
    title: 'Vita',
    subtitle: 'Your 1HMS guide',
    placeholder: 'Ask how to do something in 1HMS…',
    hello: 'Hi! I can explain how any 1HMS screen works and take you there.',
    try: 'Try asking',
    sources: 'From the guide',
    open: 'Open',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    why: 'What was wrong?',
    thanks: 'Thanks for the feedback.',
    commentPh: 'Tell us more (optional)',
    send: 'Send',
    stop: 'Stop',
    newChat: 'New chat',
    history: 'Your chats',
    noHistory: 'No earlier chats.',
    back: 'Back',
    stopped: 'Stopped.',
    disclaimer: 'Vita explains how to use 1HMS. It never gives medical advice.',
    searching: 'Looking in the 1HMS guide…',
    thinking: 'Thinking…',
    reasons: { wrong: 'Wrong', incomplete: 'Incomplete', not_relevant: 'Not what I asked', too_long: 'Too long', other: 'Other' },
    fab: 'Ask Vita',
  },
  hi: {
    title: 'Vita',
    subtitle: 'आपका 1HMS गाइड',
    placeholder: '1HMS में कुछ भी कैसे करें, पूछें…',
    hello: 'नमस्ते! मैं 1HMS की किसी भी स्क्रीन का तरीका बता सकती हूँ और वहाँ ले जा सकती हूँ।',
    try: 'ऐसे पूछें',
    sources: 'गाइड से',
    open: 'खोलें',
    helpful: 'मददगार',
    notHelpful: 'मददगार नहीं',
    why: 'क्या गलत था?',
    thanks: 'धन्यवाद!',
    commentPh: 'और बताएँ (वैकल्पिक)',
    send: 'भेजें',
    stop: 'रोकें',
    newChat: 'नई चैट',
    history: 'आपकी चैट',
    noHistory: 'कोई पुरानी चैट नहीं।',
    back: 'वापस',
    stopped: 'रोक दिया।',
    disclaimer: 'Vita 1HMS चलाना सिखाती है। यह कोई डॉक्टरी सलाह नहीं देती।',
    searching: '1HMS गाइड में देख रही हूँ…',
    thinking: 'सोच रही हूँ…',
    reasons: { wrong: 'गलत', incomplete: 'अधूरा', not_relevant: 'सवाल से अलग', too_long: 'बहुत लंबा', other: 'अन्य' },
    fab: 'Vita से पूछें',
  },
} as const;

type Strings = (typeof T)['en'] | (typeof T)['hi'];

/** Starter questions per board (screen id from boardAccess.ts). */
const SUGGESTIONS: Record<string, { en: string[]; hi: string[] }> = {
  'appointment-dashboard': {
    en: ['How do I reschedule an appointment?', 'What does the Vitals status mean?', 'How do I cancel an appointment?'],
    hi: ['Appointment reschedule kaise kare?', 'Vitals status ka matlab kya hai?', 'Appointment cancel kaise kare?'],
  },
  'appointment-booking': {
    en: ['How do I book an appointment for a patient?', 'How are token numbers given?', 'Can I book for a future date?'],
    hi: ['Patient ka appointment kaise book kare?', 'Token number kaise milta hai?', 'Aage ki date ka booking ho sakta hai?'],
  },
  billing: {
    en: ['How do I collect a payment?', 'How do I give a refund?', 'Where do I see today’s collection?'],
    hi: ['Payment kaise collect kare?', 'Refund kaise de?', 'Aaj ka collection kaha dekhe?'],
  },
  'ipd-workspace': {
    en: ['How do I admit a patient?', 'How do I transfer a bed?', 'How do I discharge a patient?'],
    hi: ['Patient admit kaise kare?', 'Bed transfer kaise kare?', 'Discharge kaise kare?'],
  },
  pharmacy: {
    en: ['How do I sell medicines to a walk-in patient?', 'How do I check stock?', 'How do returns work?'],
    hi: ['Walk-in patient ko dawai kaise bechein?', 'Stock kaise check kare?', 'Return kaise hota hai?'],
  },
};
const DEFAULT_SUGGESTIONS = {
  en: ['How do I book an appointment?', 'How do I register a new patient?', 'Open billing'],
  hi: ['Appointment kaise book kare?', 'Naya patient kaise register kare?', 'Billing kholo'],
};

const readLS = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const writeLS = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: ignore */
  }
};

const VitaDock: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const permissions = useAuthStore((s) => s.permissions);

  const [open, setOpen] = useState(() => readLS(LS_OPEN) === '1');
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [locale, setLocaleState] = useState<VitaLocale>(() => (readLS(LS_LOCALE) === 'hi' ? 'hi' : 'en'));
  const [input, setInput] = useState('');
  const t: Strings = T[locale];

  // One client per page load; it reads the 1HMS token on every call (tokens rotate).
  const client = useMemo(
    () =>
      VITA_API_URL
        ? new VitaClient({ baseUrl: VITA_API_URL, getHmsToken: () => useAuthStore.getState().getToken(), locale })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onNavigate = useCallback(
    (s: VitaScreenLink) => {
      if (canOpen(s, useAuthStore.getState().permissions ?? [])) navigate(s.route);
    },
    [navigate],
  );
  const chat = useVitaChat(client, { onNavigate });

  // Ending the 1HMS login ends the Vita session too.
  useEffect(() => {
    if (!token && client) void client.end();
  }, [token, client]);

  useEffect(() => writeLS(LS_OPEN, open ? '1' : '0'), [open]);

  // Ctrl+K / Cmd+K toggles the dock from anywhere; Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open && view === 'chat') setTimeout(() => inputRef.current?.focus(), 50);
  }, [open, view]);

  const listRef = useRef<HTMLDivElement>(null);
  const last = chat.messages[chat.messages.length - 1];
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, last?.text, last?.status]);

  if (!client || !token) return null;

  const screen = screenContext(location.pathname);
  const suggestions = (screen && SUGGESTIONS[screen.screenId ?? '']) || DEFAULT_SUGGESTIONS;

  const submit = (text = input) => {
    if (!text.trim() || chat.busy) return;
    setInput('');
    void chat.send(text, screen);
  };

  const switchLocale = () => {
    const l: VitaLocale = locale === 'en' ? 'hi' : 'en';
    setLocaleState(l);
    writeLS(LS_LOCALE, l);
    void chat.setLocale(l);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed z-[70] right-4 bottom-[84px] lg:bottom-6 lg:right-6 flex items-center gap-2 rounded-full bg-brand-600 pl-3 pr-4 py-3 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 active:scale-95 transition"
          aria-label={t.fab}
          title={`${t.fab} (Ctrl+K)`}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-semibold hidden sm:inline">{t.fab}</span>
          <kbd className="hidden lg:inline rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Vita assistant"
          className={cn(
            'fixed z-[80] flex flex-col bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800',
            'inset-0 lg:inset-auto lg:right-6 lg:bottom-6 lg:w-[420px] lg:h-[min(680px,calc(100vh-48px))] lg:rounded-2xl overflow-hidden',
          )}
        >
          {/* header */}
          <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold leading-tight">{t.title}</div>
              <div className="text-[11px] text-white/80 truncate">{t.subtitle}</div>
            </div>
            <HeaderBtn
              label={t.history}
              onClick={() => {
                setView(view === 'history' ? 'chat' : 'history');
                if (view !== 'history') void chat.loadHistory();
              }}
              active={view === 'history'}
            >
              <History className="h-4 w-4" />
            </HeaderBtn>
            <HeaderBtn
              label={t.newChat}
              onClick={() => {
                chat.newChat();
                setView('chat');
              }}
              disabled={chat.busy}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </HeaderBtn>
            <button
              type="button"
              onClick={switchLocale}
              className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/15"
              title={locale === 'en' ? 'हिंदी में' : 'In English'}
            >
              {locale === 'en' ? 'हिं' : 'EN'}
            </button>
            <HeaderBtn label="Close (Esc)" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </HeaderBtn>
          </header>

          {chat.notice && (
            <div className="flex items-center justify-between gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <span>{chat.notice}</span>
              <button type="button" onClick={chat.dismissNotice} aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {view === 'history' ? (
            <HistoryView
              t={t}
              items={chat.history}
              onOpen={(id) => {
                void chat.openConversation(id);
                setView('chat');
              }}
              onDelete={(id) => void chat.deleteConversation(id)}
              onBack={() => setView('chat')}
            />
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
                {chat.messages.length === 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-brand-50 dark:bg-brand-900/20 p-4 text-sm text-gray-800 dark:text-gray-100">{t.hello}</div>
                    <div>
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t.try}</div>
                      <div className="flex flex-col gap-2">
                        {suggestions[locale].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => submit(s)}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-gray-800"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  chat.messages.map((m) =>
                    m.role === 'user' ? (
                      <div key={m.key} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white whitespace-pre-wrap break-words">
                          {m.text}
                        </div>
                      </div>
                    ) : (
                      <AssistantMessage
                        key={m.key}
                        m={m}
                        t={t}
                        permissions={permissions ?? []}
                        onOpen={(s) => navigate(s.route)}
                        onRate={chat.rate}
                      />
                    ),
                  )
                )}
              </div>

              <footer className="border-t border-gray-100 dark:border-gray-800 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                <div className="flex items-end gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 focus-within:border-brand-400">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    maxLength={2000}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        submit();
                      }
                    }}
                    placeholder={t.placeholder}
                    className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none"
                  />
                  {chat.busy ? (
                    <button
                      type="button"
                      onClick={chat.stop}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900"
                      aria-label={t.stop}
                      title={t.stop}
                    >
                      <Square className="h-3.5 w-3.5" fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => submit()}
                      disabled={!input.trim()}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
                      aria-label={t.send}
                      title={t.send}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-center text-[10.5px] text-gray-400">{t.disclaimer}</p>
              </footer>
            </>
          )}
        </section>
      )}
    </>
  );
};

const HeaderBtn: React.FC<{
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}> = ({ label, onClick, children, active, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={cn('rounded-lg p-1.5 hover:bg-white/15 disabled:opacity-40', active && 'bg-white/20')}
  >
    {children}
  </button>
);

type Reason = 'wrong' | 'incomplete' | 'not_relevant' | 'too_long' | 'other';

const AssistantMessage: React.FC<{
  m: VitaChatMessage;
  t: Strings;
  permissions: readonly string[];
  onOpen: (s: VitaScreenLink) => void;
  onRate: (key: string, r: 'up' | 'down', reason?: Reason, comment?: string) => void;
}> = ({ m, t, permissions, onOpen, onRate }) => {
  const [askWhy, setAskWhy] = useState(false);
  const [comment, setComment] = useState('');
  const [thanked, setThanked] = useState(false);
  const waiting = m.status === 'pending' || (m.status === 'streaming' && !m.text);

  return (
    <div className="flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {waiting ? (
          <div className="flex items-center gap-2 py-1 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {m.stage === 'searching' ? t.searching : t.thinking}
          </div>
        ) : (
          <div className={cn('text-gray-800 dark:text-gray-100', m.status === 'error' && 'text-red-600 dark:text-red-400')}>
            <VitaMarkdown text={m.text} />
            {m.status === 'streaming' && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-brand-500 align-middle" />}
            {m.status === 'cancelled' && <p className="mt-1 text-xs text-gray-400">{t.stopped}</p>}
          </div>
        )}

        {m.citations.length > 0 && m.status !== 'error' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-medium text-gray-400">
              <BookOpen className="h-3 w-3" /> {t.sources}
            </span>
            {m.citations.map((c) => (
              <span
                key={`${c.docId}-${c.section}`}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                title={c.title ? `${c.docId} §${c.section} — ${c.title}` : `${c.docId} §${c.section}`}
              >
                {c.title || `${c.docId} §${c.section}`}
              </span>
            ))}
          </div>
        )}

        {m.screen && canOpen(m.screen, permissions) && m.status !== 'error' && (
          <button
            type="button"
            onClick={() => onOpen(m.screen!)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"
          >
            <ExternalLink className="h-3.5 w-3.5" /> {t.open} {m.screen.label}
          </button>
        )}

        {m.status === 'done' && m.messageId && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <RateBtn
                active={m.rating === 'up'}
                label={t.helpful}
                onClick={() => {
                  onRate(m.key, 'up');
                  setAskWhy(false);
                  setThanked(true);
                }}
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </RateBtn>
              <RateBtn
                active={m.rating === 'down'}
                label={t.notHelpful}
                onClick={() => {
                  onRate(m.key, 'down');
                  setAskWhy(true);
                  setThanked(false);
                }}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </RateBtn>
              {thanked && <span className="ml-1 text-[11px] text-gray-400">{t.thanks}</span>}
            </div>
            {askWhy && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-2.5 space-y-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.why}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(t.reasons) as Reason[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        onRate(m.key, 'down', r, comment);
                        setAskWhy(false);
                        setThanked(true);
                      }}
                      className="rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-200 hover:border-brand-400"
                    >
                      {t.reasons[r]}
                    </button>
                  ))}
                </div>
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder={t.commentPh}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs focus:outline-none focus:border-brand-400"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RateBtn: React.FC<{ active?: boolean; label: string; onClick: () => void; children: React.ReactNode }> = ({
  active,
  label,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={!!active}
    title={label}
    className={cn(
      'rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800',
      active && 'text-brand-600 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-300',
    )}
  >
    {children}
  </button>
);

const HistoryView: React.FC<{
  t: Strings;
  items: { id: string; title: string; lastTurnAt: string }[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}> = ({ t, items, onOpen, onDelete, onBack }) => (
  <div className="flex-1 overflow-y-auto px-2 py-2">
    <button type="button" onClick={onBack} className="mb-1 px-2 py-1 text-xs font-semibold text-brand-600">
      ← {t.back}
    </button>
    {items.length === 0 ? (
      <p className="px-3 py-6 text-center text-sm text-gray-400">{t.noHistory}</p>
    ) : (
      <ul>
        {items.map((c) => (
          <li key={c.id} className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
            <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 flex-1 text-left">
              <div className="truncate text-sm text-gray-800 dark:text-gray-100">{c.title}</div>
              <div className="text-[11px] text-gray-400">
                {new Date(c.lastTurnAt).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDelete(c.id)}
              className="rounded p-1 text-gray-300 opacity-0 hover:text-red-500 group-hover:opacity-100"
              aria-label="Delete chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default VitaDock;
