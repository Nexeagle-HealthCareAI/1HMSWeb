import { useCallback, useEffect, useRef, useState } from 'react';

/** Longest single dictation. Groq accepts up to 25 MB; at 32 kbps ten minutes is ~2.4 MB. */
export const MAX_DICTATION_SECONDS = 10 * 60;

export type RecorderState = 'idle' | 'recording' | 'paused' | 'stopped' | 'denied' | 'unsupported';

const pickMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
        if (MediaRecorder.isTypeSupported?.(t)) return t;
    }
    return '';
};

/** Microphone recording for discharge dictation: start / pause / resume / stop, with a timer and a
 * live level for the waveform. The recording never leaves the browser until the caller uploads it. */
export const useDictationRecorder = () => {
    const [state, setState] = useState<RecorderState>(
        typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined' ? 'idle' : 'unsupported',
    );
    const [seconds, setSeconds] = useState(0);
    const [level, setLevel] = useState(0);
    const [blob, setBlob] = useState<Blob | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) window.clearInterval(timerRef.current);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        timerRef.current = null;
        rafRef.current = null;
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        setLevel(0);
    }, []);

    useEffect(() => cleanup, [cleanup]);

    const stop = useCallback(() => {
        const r = recorderRef.current;
        if (r && r.state !== 'inactive') r.stop();
    }, []);

    const startTimer = useCallback(() => {
        timerRef.current = window.setInterval(() => {
            setSeconds(s => {
                if (s + 1 >= MAX_DICTATION_SECONDS) stop();
                return s + 1;
            });
        }, 1000);
    }, [stop]);

    const start = useCallback(async () => {
        setBlob(null);
        setSeconds(0);
        chunksRef.current = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
            streamRef.current = stream;
            const mimeType = pickMimeType();
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32000 }) : new MediaRecorder(stream);
            recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => {
                setBlob(new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' }));
                setState('stopped');
                cleanup();
            };
            recorderRef.current = recorder;
            recorder.start(1000);
            setState('recording');
            startTimer();

            try {
                const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                const ctx = new Ctx();
                audioCtxRef.current = ctx;
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                ctx.createMediaStreamSource(stream).connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);
                const tick = () => {
                    analyser.getByteTimeDomainData(data);
                    let peak = 0;
                    for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
                    setLevel(Math.min(1, peak / 64));
                    rafRef.current = requestAnimationFrame(tick);
                };
                tick();
            } catch { /* level meter is decoration only */ }
        } catch {
            cleanup();
            setState('denied');
        }
    }, [cleanup, startTimer]);

    const pause = useCallback(() => {
        const r = recorderRef.current;
        if (r?.state === 'recording') {
            r.pause();
            if (timerRef.current) window.clearInterval(timerRef.current);
            setState('paused');
        }
    }, []);

    const resume = useCallback(() => {
        const r = recorderRef.current;
        if (r?.state === 'paused') {
            r.resume();
            startTimer();
            setState('recording');
        }
    }, [startTimer]);

    const reset = useCallback(() => {
        const r = recorderRef.current;
        if (r && r.state !== 'inactive') { r.onstop = null; r.stop(); }
        cleanup();
        recorderRef.current = null;
        chunksRef.current = [];
        setBlob(null);
        setSeconds(0);
        setState(s => (s === 'unsupported' ? s : 'idle'));
    }, [cleanup]);

    return { state, seconds, level, blob, start, pause, resume, stop, reset };
};

export const formatClock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
