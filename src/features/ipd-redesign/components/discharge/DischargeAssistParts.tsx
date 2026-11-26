import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Loader2, Mic, PenTool, Plus, Sparkles, Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MedicationSuggestion, RewriteStyle } from '../../services/dischargeSummaryApi';
import { describeSuggestion, type SectionStatus } from '../../utils/dischargeSections';

// Small pieces of the discharge screen. Kept presentational: all state lives in DischargeSummaryPanel.

const STATUS: Record<SectionStatus, { label: string; cls: string }> = {
    records: { label: 'From records', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    ai: { label: 'Written by AI — check it', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
    doctor: { label: 'Written by doctor', cls: 'bg-brand-50 text-brand-700 border-brand-200' },
    empty: { label: 'Empty', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const SectionStatusChip: React.FC<{ status: SectionStatus }> = ({ status }) => (
    <span className={cn('inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full border', STATUS[status].cls)}>{STATUS[status].label}</span>
);

/** The row under an AI-capable section: where its text came from, and the rewrite tools. */
export const SectionMeta: React.FC<{
    status: SectionStatus;
    canRewrite: boolean;
    busy: boolean;
    onRewrite: (style: RewriteStyle) => void;
    extra?: React.ReactNode;
}> = ({ status, canRewrite, busy, onRewrite, extra }) => (
    <div className="mt-2 flex flex-wrap items-center gap-2">
        <SectionStatusChip status={status} />
        {extra}
        {canRewrite && status !== 'empty' && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8 rounded-full text-xs border-brand-200 text-brand-700 hover:bg-brand-50" disabled={busy}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                        Improve with AI <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => onRewrite('SHORTER')}>Make it shorter</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRewrite('DETAIL')}>Make it clearer and complete</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onRewrite('PATIENT')}>Plain words for the patient</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )}
    </div>
);

/** An AI suggestion for one section, waiting for the doctor: replace, add below, or discard. */
export const AiProposalBlock: React.FC<{
    text: string;
    origin: string;
    hasCurrent: boolean;
    onReplace: () => void;
    onAppend: () => void;
    onDiscard: () => void;
}> = ({ text, origin, hasCurrent, onReplace, onAppend, onDiscard }) => (
    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> AI suggestion · {origin} — not in the summary yet
        </p>
        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{text}</p>
        <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" className="h-9 text-xs" onClick={onDiscard}><X className="h-3.5 w-3.5 mr-1" /> Discard</Button>
            {hasCurrent && (
                <Button type="button" size="sm" variant="outline" className="h-9 text-xs" onClick={onAppend}><Plus className="h-3.5 w-3.5 mr-1" /> Add below current text</Button>
            )}
            <Button type="button" size="sm" className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={onReplace}>
                <Check className="h-3.5 w-3.5 mr-1" /> {hasCurrent ? 'Use instead' : 'Accept'}
            </Button>
        </div>
    </div>
);

/** The three ways to write the summary. AI buttons are hidden when the server has no AI or the
 * hospital switched it off; handwriting always works. */
export const DischargeWriteBar: React.FC<{
    aiReady: boolean;
    aiNote?: string | null;
    drafting: boolean;
    emptyCount: number;
    sourceSummary?: string | null;
    disabled: boolean;
    onDraft: () => void;
    onDictate: () => void;
    onHandwrite: () => void;
}> = ({ aiReady, aiNote, drafting, emptyCount, sourceSummary, disabled, onDraft, onDictate, onHandwrite }) => (
    <section aria-label="Write the summary" className="rounded-2xl border border-brand-200 bg-white p-4 flex flex-col 2xl:flex-row 2xl:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5 text-brand-600" /></span>
            <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                    {aiReady ? (emptyCount > 0 ? `Draft the ${emptyCount} empty section${emptyCount === 1 ? '' : 's'} from this stay's records` : 'All sections have text — use "Improve with AI" on any of them') : 'Write the summary'}
                </p>
                <p className="text-xs text-slate-500">
                    {aiReady
                        ? `${sourceSummary ? `Uses ${sourceSummary}. ` : ''}Nothing goes into the summary until you accept it, section by section.`
                        : aiNote || 'Type, or handwrite with a pen.'}
                </p>
            </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
            {aiReady && (
                <>
                    <Button type="button" className="h-11 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold" disabled={disabled || drafting || emptyCount === 0} onClick={onDraft}>
                        {drafting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Draft with AI
                    </Button>
                    <Button type="button" variant="outline" className="h-11 px-4 rounded-xl border-brand-200 text-brand-700 hover:bg-brand-50 font-bold" disabled={disabled} onClick={onDictate}>
                        <Mic className="h-4 w-4 mr-2" /> Dictate
                    </Button>
                </>
            )}
            <Button type="button" variant="outline" className="h-11 px-4 rounded-xl" onClick={onHandwrite}>
                <PenTool className="h-4 w-4 mr-2" /> Handwrite
            </Button>
        </div>
    </section>
);

/** Medicine changes heard in a dictation, applied only when the doctor taps. */
export const MedicationSuggestionList: React.FC<{
    items: MedicationSuggestion[];
    onApply: (index: number) => void;
    onDismiss: (index: number) => void;
}> = ({ items, onApply, onDismiss }) => {
    if (items.length === 0) return null;
    return (
        <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800 flex items-center gap-1.5"><Mic className="h-3 w-3" /> Heard in your dictation</p>
            {items.map((m, i) => (
                <div key={`${m.medicineName}-${i}`} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="flex-1 min-w-[12rem] text-slate-800">{describeSuggestion(m)}{m.note ? <span className="text-slate-500"> — {m.note}</span> : null}
                        {m.action === 'ADD' && m.nameCheck === 'CORRECTED' && <span className="block text-[11px] font-semibold text-amber-700">Heard "{m.heardAs}" — corrected. Check it is the medicine you meant.</span>}
                        {m.action === 'ADD' && m.nameCheck === 'UNVERIFIED' && <span className="block text-[11px] font-semibold text-rose-700">Not on this patient's record — check the spelling before applying.</span>}
                    </span>
                    <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onDismiss(i)}>Ignore</Button>
                    <Button type="button" size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => onApply(i)}>Apply</Button>
                </div>
            ))}
        </div>
    );
};

/** Quick follow-up buttons beside the date. */
export const FollowUpQuickPicks: React.FC<{ options: { label: string; days: number }[]; disabled: boolean; onPick: (days: number) => void }> = ({ options, disabled, onPick }) => (
    <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map(o => (
            <button key={o.days} type="button" disabled={disabled} onClick={() => onPick(o.days)}
                className="h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-brand-300 hover:text-brand-700 disabled:opacity-50">
                In {o.label}
            </button>
        ))}
    </div>
);

/** Status of the three discharge stages. */
export const DischargeStageBar: React.FC<{ stages: { title: string; sub: string; state: 'done' | 'now' | 'later'; chip: string }[] }> = ({ stages }) => (
    <ol aria-label="Discharge stages" className="grid grid-cols-3 gap-2">
        {stages.map((s, i) => (
            <li key={s.title} aria-current={s.state === 'now' ? 'step' : undefined}
                className={cn('rounded-2xl border bg-white p-2 sm:p-3 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3 text-center sm:text-left', s.state === 'now' ? 'border-brand-300' : 'border-slate-200')}>
                <span className={cn('h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0',
                    s.state === 'done' ? 'bg-emerald-600 text-white' : s.state === 'now' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
                    {s.state === 'done' ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block text-xs sm:text-sm font-bold text-slate-900">{s.title}</span>
                    <span className="hidden sm:block text-[11px] text-slate-500 truncate">{s.sub}</span>
                </span>
                <span className={cn('text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap',
                    s.state === 'done' ? 'bg-emerald-50 text-emerald-700' : s.state === 'now' ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>{s.chip}</span>
            </li>
        ))}
    </ol>
);

export const SignChecklist: React.FC<{ checks: { level: 'warn' | 'ok'; text: string }[] }> = ({ checks }) => {
    const [showAll, setShowAll] = useState(false);
    const warn = checks.filter(c => c.level === 'warn').length;
    const shown = showAll ? checks : checks.slice(0, 6);
    return (
        <div>
            <div className="flex items-center mb-1">
                <h3 className="flex-1 text-sm font-bold text-slate-900">Before you sign</h3>
                <span className={cn('text-xs font-bold', warn ? 'text-amber-700' : 'text-emerald-700')}>{warn ? `${warn} to check` : 'Ready'}</span>
            </div>
            <ul className="divide-y divide-slate-100">
                {shown.map((c, i) => (
                    <li key={i} className="flex gap-2 py-2 text-xs leading-relaxed">
                        <span className={cn('mt-1 h-2.5 w-2.5 rounded-full shrink-0', c.level === 'warn' ? 'bg-amber-500' : 'bg-emerald-600')} />
                        <span className="text-slate-700">{c.text}</span>
                    </li>
                ))}
            </ul>
            {checks.length > 6 && (
                <button type="button" className="text-xs font-semibold text-brand-700 mt-1" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show fewer' : `Show all ${checks.length}`}</button>
            )}
            <p className="text-[11px] text-slate-500 mt-2">These are reminders only — you can still sign.</p>
        </div>
    );
};
