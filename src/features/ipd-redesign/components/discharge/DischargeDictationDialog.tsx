import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Pause, Play, Square, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dischargeSummaryApi, type AiDictationResult } from '../../services/dischargeSummaryApi';
import { describeSuggestion, sectionLabel } from '../../utils/dischargeSections';
import { formatClock, MAX_DICTATION_SECONDS, useDictationRecorder } from './useDictationRecorder';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    admissionId: string;
    /** Called with the sorted result; the caller turns it into proposals to accept per section. */
    onResult: (result: AiDictationResult) => void;
}

/**
 * Dictate the discharge in English, Hindi or a mix. The recording is sent to the server
 * (Whisper on Groq), sorted into sections by AI, and shown here before anything goes into the
 * summary — and even then only as suggestions the doctor accepts section by section.
 */
export const DischargeDictationDialog: React.FC<Props> = ({ open, onOpenChange, admissionId, onResult }) => {
    const rec = useDictationRecorder();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AiDictationResult | null>(null);

    useEffect(() => {
        if (!open) { rec.reset(); setResult(null); setError(null); setBusy(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Send as soon as recording stops.
    useEffect(() => {
        if (rec.state !== 'stopped' || !rec.blob || result || busy) return;
        if (rec.blob.size < 1000) { setError('The recording was too short. Please try again.'); return; }
        setBusy(true);
        setError(null);
        dischargeSummaryApi.aiDictate(admissionId, rec.blob)
            .then(setResult)
            .catch(e => setError(e instanceof Error ? e.message : 'Could not process the dictation.'))
            .finally(() => setBusy(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rec.state, rec.blob]);

    const sections = result ? Object.entries(result.sections).filter(([, v]) => v?.trim()) : [];
    const nothing = result && sections.length === 0 && result.medicationChanges.length === 0 && !result.followUpAfterDays;

    const use = () => {
        if (result) onResult(result);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Dictate the discharge</DialogTitle>
                    <DialogDescription>
                        Speak in English, Hindi or both — for example the course, results, medicine changes and advice. AI sorts it into sections for you to check.
                    </DialogDescription>
                </DialogHeader>

                {rec.state === 'unsupported' && (
                    <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">This browser can't record audio. Try Chrome or Edge, or the phone app.</p>
                )}
                {rec.state === 'denied' && (
                    <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">Microphone access was blocked. Allow the microphone for this site in the browser, then try again.</p>
                )}

                {!result && !busy && rec.state !== 'unsupported' && (
                    <div className="flex flex-col items-center gap-4 py-4">
                        <div className="flex items-end gap-1 h-12" aria-hidden="true">
                            {Array.from({ length: 24 }).map((_, i) => {
                                const active = rec.state === 'recording';
                                const h = active ? 8 + Math.round(36 * rec.level * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7 + rec.seconds)))) : 6;
                                return <span key={i} className={cn('w-1.5 rounded-full transition-all', active ? 'bg-brand-500' : 'bg-slate-200')} style={{ height: h }} />;
                            })}
                        </div>
                        <div className="text-3xl font-extrabold tabular-nums text-slate-900">{formatClock(rec.seconds)}</div>
                        <p className="text-xs text-slate-500">
                            {rec.state === 'recording' ? 'Listening…' : rec.state === 'paused' ? 'Paused' : `Up to ${MAX_DICTATION_SECONDS / 60} minutes at a time.`}
                        </p>
                        <div className="flex items-center gap-2">
                            {(rec.state === 'idle' || rec.state === 'denied') && (
                                <Button className="h-12 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold" onClick={rec.start}>
                                    <Mic className="h-4 w-4 mr-2" /> Start recording
                                </Button>
                            )}
                            {rec.state === 'recording' && (
                                <Button variant="outline" className="h-12 px-5 rounded-full" onClick={rec.pause}><Pause className="h-4 w-4 mr-2" /> Pause</Button>
                            )}
                            {rec.state === 'paused' && (
                                <Button variant="outline" className="h-12 px-5 rounded-full" onClick={rec.resume}><Play className="h-4 w-4 mr-2" /> Resume</Button>
                            )}
                            {(rec.state === 'recording' || rec.state === 'paused') && (
                                <Button className="h-12 px-6 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold" onClick={rec.stop}>
                                    <Square className="h-4 w-4 mr-2 fill-white" /> Stop and sort
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {busy && (
                    <div className="py-10 flex flex-col items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-600" /> Writing it down and sorting it into sections…
                    </div>
                )}

                {error && !busy && (
                    <div className="space-y-3">
                        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</p>
                        <Button variant="outline" onClick={() => { rec.reset(); setError(null); }}><RotateCcw className="h-4 w-4 mr-2" /> Record again</Button>
                    </div>
                )}

                {result && !busy && (
                    <div className="space-y-4">
                        {result.transcript && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">What was heard</p>
                                <p className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">{result.transcript}</p>
                            </div>
                        )}
                        {nothing ? (
                            <p className="text-sm text-slate-600">Nothing in the dictation matched a discharge section. Try again, mentioning the course, results or advice.</p>
                        ) : (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Will be suggested for</p>
                                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                    {sections.map(([k, v]) => (
                                        <li key={k} className="p-3">
                                            <p className="text-sm font-semibold text-slate-800">{sectionLabel(k)}</p>
                                            <p className="text-xs text-slate-500 line-clamp-2">{v}</p>
                                        </li>
                                    ))}
                                    {result.medicationChanges.map((m, i) => (
                                        <li key={`m${i}`} className="p-3">
                                            <p className="text-sm font-semibold text-slate-800">Discharge medicines</p>
                                            <p className="text-xs text-slate-500">{describeSuggestion(m)} — you'll confirm it on the medicine list</p>
                                        </li>
                                    ))}
                                    {result.followUpAfterDays ? (
                                        <li className="p-3">
                                            <p className="text-sm font-semibold text-slate-800">Follow-up date</p>
                                            <p className="text-xs text-slate-500">In {result.followUpAfterDays} day(s)</p>
                                        </li>
                                    ) : null}
                                </ul>
                            </div>
                        )}
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button variant="ghost" onClick={() => { rec.reset(); setResult(null); }}><RotateCcw className="h-4 w-4 mr-2" /> Record again</Button>
                            <Button disabled={!!nothing} className="bg-brand-600 hover:bg-brand-700 text-white" onClick={use}><Check className="h-4 w-4 mr-2" /> Show suggestions</Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
