import React, { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Sparkles, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { voiceRxApi, type VoiceRxFields, type ParseVoiceRxResponse } from '../services/voiceRxApi';

interface Props {
  hospitalId: string;
  doctorId: string;
  patientId?: string;
  onApply: (fields: VoiceRxFields) => void;
}

type Phase = 'idle' | 'recording' | 'paused' | 'parsing' | 'review';

/** Voice Rx — record a dictation, transcribe + structure it, review, and apply to the prescription. */
export const VoiceRxSheet: React.FC<Props> = ({ hospitalId, doctorId, patientId, onApply }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<ParseVoiceRxResponse | null>(null);
  const [language, setLanguage] = useState<string>(''); // '' = auto
  const [mode, setMode] = useState<'dictation' | 'ambient'>('dictation');
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const reset = () => {
    setPhase('idle'); setSeconds(0); setResult(null); setError(''); setConsented(false);
    chunksRef.current = [];
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startRecording = async () => {
    setError('');
    try {
      // Capture-time noise handling: lean on the browser's built-in DSP so room hum, fans,
      // chatter and keyboard noise are filtered before we ever upload. Mono keeps the file small
      // and is plenty for speech + diarization. Unsupported constraints are ignored gracefully.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stopTracks();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        void parseBlob(blob);
      };
      recorder.start();
      setSeconds(0);
      setPhase('recording');
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      setError('Microphone access was blocked. Please allow microphone permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPhase('parsing');
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setPhase('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      setPhase('recording');
    }
  };

  const parseBlob = async (blob: Blob) => {
    try {
      const ext = (blob.type.includes('ogg') ? 'ogg' : 'webm');
      const res = await voiceRxApi.parse({
        audio: blob, fileName: `voice-rx.${ext}`, hospitalId, doctorId, patientId, language: language || undefined, mode,
      });
      if (res.success) {
        setResult(res);
        setPhase('review');
      } else {
        setError(res.message || 'Could not process the dictation.');
        setPhase('idle');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not process the dictation.');
      setPhase('idle');
    }
  };

  const apply = () => {
    if (!result) return;
    onApply(result.fields);
    toast({ title: 'Applied to prescription', description: 'Review and edit the fields in the pad before submitting.' });
    setOpen(false);
    reset();
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const f = result?.fields;
  const hasMeds = !!f?.medications?.length;
  const Row = ({ label, value }: { label: string; value?: string }) =>
    value && value.trim() ? (
      <div className="flex gap-2 text-sm">
        <span className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 pt-0.5">{label}</span>
        <span className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{value}</span>
      </div>
    ) : null;
  const ListRow = ({ label, items }: { label: string; items?: string[] }) =>
    items && items.length ? (
      <div className="flex gap-2 text-sm">
        <span className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 pt-0.5">{label}</span>
        <span className="text-slate-800 dark:text-slate-100">{items.join(', ')}</span>
      </div>
    ) : null;

  // Renders a transcript, styling "Speaker 0:" / "Speaker 1:" labels (from consult-mode diarization) as chips.
  const renderTranscript = (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    const speakerColors = ['bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700'];
    const hasSpeakers = lines.some(l => /^Speaker \d+:/i.test(l));
    if (!hasSpeakers) return <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{text || '—'}</p>;
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const m = line.match(/^Speaker (\d+):\s*(.*)$/i);
          if (!m) return <p key={i} className="text-sm text-slate-700 dark:text-slate-200">{line}</p>;
          const n = parseInt(m[1], 10);
          return (
            <p key={i} className="text-sm text-slate-700 dark:text-slate-200 flex gap-2">
              <span className={`shrink-0 h-fit rounded px-1.5 py-0.5 text-[10px] font-semibold ${speakerColors[n % speakerColors.length]}`}>
                {n === 0 ? 'Speaker 1' : `Speaker ${n + 1}`}
              </span>
              <span>{m[2]}</span>
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) { stopTracks(); reset(); } }}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-gray-900 border-violet-200 dark:border-violet-800 shadow-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300">
          <Mic className="w-4 h-4" />
          Voice Rx
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90vw] sm:w-[560px] md:w-[640px] sm:max-w-none p-0 flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-gray-200 dark:border-gray-800 [&>button]:right-6 [&>button]:top-4">
        <SheetHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800/60 bg-white dark:bg-slate-900">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-violet-700 dark:text-violet-300">
            <Mic className="h-5 w-5" /> Voice Rx
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!online && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              Voice Rx needs an internet connection. It's unavailable offline.
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Recorder */}
          {(phase === 'idle' || phase === 'recording' || phase === 'paused') && (
            <div className="flex flex-col items-center gap-4 py-6">
              {/* Mode toggle — pick what you're recording (idle only) */}
              {phase === 'idle' && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-white dark:bg-slate-900 p-0.5 text-sm">
                  {([
                    { key: 'dictation', label: 'Dictate Rx' },
                    { key: 'ambient', label: 'Record consult' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setMode(opt.key); setConsented(false); }}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                        mode === opt.key ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-violet-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                disabled={!online || (phase === 'idle' && mode === 'ambient' && !consented)}
                onClick={phase === 'recording' || phase === 'paused' ? stopRecording : startRecording}
                className={`h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-40 ${
                  phase === 'recording' ? 'bg-red-500 text-white animate-pulse'
                    : phase === 'paused' ? 'bg-amber-500 text-white'
                    : 'bg-violet-600 text-white hover:bg-violet-700'
                }`}
              >
                {phase === 'recording' || phase === 'paused' ? <Square className="h-8 w-8" /> : <Mic className="h-9 w-9" />}
              </button>
              <div className="text-center">
                <div className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100">{fmt(seconds)}</div>
                <p className="text-sm text-slate-500 mt-1">
                  {phase === 'recording' ? 'Listening… tap to finish'
                    : phase === 'paused' ? 'Paused — resume or finish'
                    : mode === 'ambient' ? 'Tap to record the consultation' : 'Tap to dictate the prescription'}
                </p>
              </div>

              {/* Pause / resume while recording */}
              {(phase === 'recording' || phase === 'paused') && (
                <Button variant="outline" size="sm" onClick={phase === 'recording' ? pauseRecording : resumeRecording} className="gap-1.5">
                  {phase === 'recording' ? 'Pause' : 'Resume'}
                </Button>
              )}

              {/* Consent gate for ambient (recorded consultation) */}
              {phase === 'idle' && mode === 'ambient' && (
                <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 max-w-xs cursor-pointer">
                  <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} className="mt-0.5 accent-violet-600" />
                  <span>The patient has agreed to this consultation being recorded for the medical record.</span>
                </label>
              )}

              {phase === 'idle' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Language</span>
                  <select value={language} onChange={e => setLanguage(e.target.value)} className="h-8 rounded-md border border-slate-200 px-2 text-sm bg-white">
                    <option value="">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {phase === 'parsing' && (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
              <p className="text-sm">Transcribing &amp; understanding…</p>
            </div>
          )}

          {/* Review */}
          {phase === 'review' && f && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white dark:bg-slate-900 p-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Transcript</p>
                {renderTranscript(result?.transcript || '')}
              </div>

              <div className="rounded-lg border border-violet-200 bg-violet-50/40 dark:bg-violet-950/20 p-3 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Understood</p>
                <Row label="Chief complaint" value={f.chiefComplaint} />
                <Row label="History" value={f.history} />
                <Row label="Gen. examination" value={f.examination} />
                <Row label="Systemic exam" value={f.systemicExamination} />
                <Row label="Diagnosis" value={f.diagnosis} />
                <ListRow label="Investigations" items={f.investigations} />
                <ListRow label="Procedures" items={f.procedures} />
                {hasMeds && (
                  <div className="flex gap-2 text-sm">
                    <span className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500 pt-0.5">Medications</span>
                    <div className="space-y-1">
                      {f.medications!.map((m, i) => (
                        <div key={i} className="text-slate-800 dark:text-slate-100">
                          <span className="font-medium">{m.name}</span>
                          {[m.dose, m.frequency, m.duration].filter(Boolean).length > 0 && (
                            <span className="text-slate-500"> — {[m.dose, m.frequency, m.duration].filter(Boolean).join(', ')}</span>
                          )}
                          {m.instructions ? <span className="text-slate-400"> ({m.instructions})</span> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {f.advice?.length ? <ListRow label="Advice" items={f.advice.map(a => [a.advice, a.notes].filter(Boolean).join(' — '))} /> : null}
                {(f.followUp?.followUpOn || f.followUp?.reason) ? <Row label="Follow-up" value={[f.followUp?.followUpOn, f.followUp?.reason].filter(Boolean).join(' — ')} /> : null}
              </div>

              <p className="text-[11px] text-slate-400">Applying adds these to the prescription — review and edit each field in the pad before submitting.</p>
            </div>
          )}
        </div>

        {phase === 'review' && (
          <div className="px-6 py-3 border-t border-slate-200 bg-white dark:bg-slate-900 flex justify-between gap-2">
            <Button variant="outline" onClick={reset} className="gap-1.5"><RotateCcw className="h-4 w-4" /> Re-record</Button>
            <Button onClick={apply} className="gap-1.5 bg-violet-600 hover:bg-violet-700"><Check className="h-4 w-4" /> Apply to prescription</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default VoiceRxSheet;
