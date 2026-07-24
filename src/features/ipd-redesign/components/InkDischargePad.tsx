import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowLeft, Eraser, GripHorizontal, Highlighter, Loader2, Maximize2, Minimize2, Pencil,
    RotateCcw, RotateCw, Save, Square, Trash2, Type, FileImage, Settings
} from 'lucide-react';
import { dataUrlToFile, DrawTool, TOOL_DEFAULTS, strokeWidthToFontSize } from '@/features/patient/components/DrawingBoard/types';
import { admissionDocumentApi } from '@/features/ipd-redesign/services/admissionDocumentApi';
import { rasterizePdfFirstPage } from '@/features/patient/components/DrawingBoard/rasterizePdfFirstPage';
import { useFullscreen } from '@/features/patient/components/DrawingBoard/useFullscreen';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import '@/features/patient/components/DrawingBoard/InkRxPad.css';

// A4 canvas dimensions at 96dpi
const CANVAS_W = 794;
const CANVAS_H = 1123;

// Curated ink colors for medical writing
const INK_COLORS = [
    { label: 'Ink Black', value: '#0f172a' },
    { label: 'Blue Pen', value: '#1d4ed8' },
    { label: 'Medical Red', value: '#dc2626' },
    { label: 'Green', value: '#16a34a' },
    { label: 'Highlight Yellow', value: '#fbbf24' },
    { label: 'Purple', value: '#7c3aed' },
];

interface Point { x: number; y: number; pressure: number; }
interface StrokeItem { tool: DrawTool; color: string; width: number; opacity: number; points: Point[]; }
interface TextItem { text: string; x: number; y: number; color: string; fontSize: number; }
type DrawItem = { kind: 'stroke'; stroke: StrokeItem } | { kind: 'text'; item: TextItem };

interface PendingText {
    canvasX: number; canvasY: number;
    screenLeft: number; screenTop: number;
    displayScale: number;
    value: string; color: string; fontSize: number;
}

interface InkDischargePadProps {
    open: boolean;
    onClose: () => void;
    // The doctor's uploaded discharge letterhead (DischargeSettings.uri) — a PDF, rasterized to an
    // image for the writing background. May also be a plain image; both are handled.
    templateUrl?: string | null;
    admissionId: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
    patientName?: string;
    patientAge?: string;
    onSaved?: () => void;
    onGoToSettings?: () => void;
}

const strokeColor = (tool: DrawTool, color: string) => tool === 'eraser' ? '#FFFFFF' : color;

const drawSmoothStroke = (ctx: CanvasRenderingContext2D, stroke: StrokeItem) => {
    const { points } = stroke;
    if (points.length === 0) return;
    ctx.save();
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = strokeColor(stroke.tool, stroke.color);
    ctx.lineCap = stroke.tool === 'highlighter' ? 'square' : 'round';
    ctx.lineJoin = 'round';

    if (points.length < 3) {
        const w = stroke.tool === 'eraser' || stroke.tool === 'highlighter'
            ? stroke.width
            : stroke.width * (0.5 + (points[0].pressure) * 1.0);
        ctx.lineWidth = Math.max(0.5, w);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();
        ctx.restore();
        return;
    }

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];
        const pressure = p1.pressure;
        let w = stroke.tool === 'eraser' || stroke.tool === 'highlighter'
            ? stroke.width
            : stroke.width * (0.5 + pressure * 1.0);
        ctx.lineWidth = Math.max(0.5, w);
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        ctx.stroke();
    }
    ctx.restore();
};

const drawTextItem = (ctx: CanvasRenderingContext2D, item: TextItem) => {
    ctx.fillStyle = item.color;
    ctx.font = `${item.fontSize}px 'Georgia', serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(item.text, item.x, item.y);
};

export const InkDischargePad: React.FC<InkDischargePadProps> = ({
    open, onClose, templateUrl, admissionId, patientId, hospitalId, doctorId,
    patientName, patientAge, onSaved, onGoToSettings,
}) => {
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgImageRef = useRef<HTMLImageElement | null>(null);
    const itemsRef = useRef<DrawItem[]>([]);
    const redoRef = useRef<DrawItem[]>([]);
    const currentStrokeRef = useRef<StrokeItem | null>(null);
    const isDrawingRef = useRef(false);
    const paperWrapRef = useRef<HTMLDivElement>(null);
    const shellRef = useRef<HTMLDivElement>(null);

    const [tool, setTool] = useState<DrawTool>('pen');
    const [color, setColor] = useState('#0f172a');
    const [strokeWidth, setStrokeWidth] = useState(TOOL_DEFAULTS['pen'].width);
    // Which of the 3 floating buttons currently has its flyout open — null = all closed.
    const [activeFlyout, setActiveFlyout] = useState<'pen' | 'text' | 'tools' | null>(null);
    const [templateLoading, setTemplateLoading] = useState(false);
    // Set once the letterhead PDF has been rasterized (or an image template loaded). Drives the
    // blank-A4 fallback: no letterhead ⇒ never blocks, just plain white A4.
    const [bgReady, setBgReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [textEditor, setTextEditor] = useState<PendingText | null>(null);

    // ── Floating draggable toolbar — 3 buttons (Pen, Text, Eraser+history), each with its own
    // flyout, dragged as one group via the grip handle (mirrors InkRxPad). ───────────────────────
    const FAB_POS_KEY = 'inkdischarge.fabPos.v2';
    const fabWrapRef = useRef<HTMLDivElement>(null);
    const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(() => {
        try {
            const raw = localStorage.getItem(FAB_POS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') return parsed;
        } catch { /* ignore */ }
        return null;
    });
    const fabPosRef = useRef(fabPos);
    const fabDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; w: number; h: number; moved: boolean } | null>(null);

    const clampFabPos = (x: number, y: number, w: number, h: number) => ({
        x: Math.min(Math.max(x, 4), Math.max(4, window.innerWidth - w - 4)),
        y: Math.min(Math.max(y, 4), Math.max(4, window.innerHeight - h - 4)),
    });
    const applyFabPos = (pos: { x: number; y: number } | null) => { fabPosRef.current = pos; setFabPos(pos); };

    // The grip's only job is dragging — no tap/click behavior to disambiguate.
    const beginFabDrag = (e: React.PointerEvent) => {
        const wrap = fabWrapRef.current;
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        fabDragRef.current = { startX: e.clientX, startY: e.clientY, originX: rect.left, originY: rect.top, w: rect.width, h: rect.height, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };
    const moveFabDrag = (e: React.PointerEvent) => {
        const d = fabDragRef.current;
        if (!d) return;
        const dx = e.clientX - d.startX;
        const dy = e.clientY - d.startY;
        if (!d.moved && Math.hypot(dx, dy) < 6) return;
        d.moved = true;
        applyFabPos(clampFabPos(d.originX + dx, d.originY + dy, d.w, d.h));
    };
    const endFabDrag = () => {
        const d = fabDragRef.current;
        fabDragRef.current = null;
        if (!d || !d.moved) return;
        try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(fabPosRef.current)); } catch { /* ignore */ }
    };

    // True OS fullscreen — hides the browser's own chrome (address/search bar) so the letterhead
    // fills the physical screen, not just the page viewport.
    const { isFullscreen, isSupported: fullscreenSupported, toggle: toggleFullscreen, exit: exitFullscreen } = useFullscreen(shellRef);

    useEffect(() => {
        if (!open) void exitFullscreen();
    }, [open, exitFullscreen]);

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const emitHistory = useCallback(() => {
        setCanUndo(itemsRef.current.length > 0);
        setCanRedo(redoRef.current.length > 0);
    }, []);

    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        if (bgImageRef.current) {
            ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_W, CANVAS_H);
        }

        itemsRef.current.forEach(item => {
            if (item.kind === 'stroke') drawSmoothStroke(ctx, item.stroke);
            else drawTextItem(ctx, item.item);
        });
    }, []);

    // Load + rasterize the letterhead when the pad opens.
    useEffect(() => {
        if (!open) return;
        let cancelled = false;

        if (!templateUrl) {
            bgImageRef.current = null;
            setBgReady(false);
            return;
        }

        setTemplateLoading(true);

        const useImage = (src: string) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                if (cancelled) return;
                bgImageRef.current = img;
                setBgReady(true);
                setTemplateLoading(false);
                redrawAll();
            };
            img.onerror = () => {
                if (cancelled) return;
                bgImageRef.current = null;
                setBgReady(false);
                setTemplateLoading(false);
                toast({ title: 'Could not load letterhead', description: 'Writing on a blank sheet instead.', variant: 'destructive' });
                redrawAll();
            };
            img.src = src;
        };

        // The discharge letterhead is a PDF — rasterize page 1. Fall back to treating the URL as a
        // plain image if it isn't a PDF (defensive; some hospitals may have image templates).
        const isPdf = /\.pdf(\?|$)/i.test(templateUrl);
        if (isPdf) {
            rasterizePdfFirstPage(templateUrl)
                .then(({ dataUrl }) => { if (!cancelled) useImage(dataUrl); })
                .catch(() => { if (!cancelled) useImage(templateUrl); });
        } else {
            useImage(templateUrl);
        }

        return () => { cancelled = true; };
    }, [open, templateUrl]);

    // Initialize blank canvas on open
    useEffect(() => {
        if (!open) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        itemsRef.current = [];
        redoRef.current = [];
        emitHistory();
    }, [open]);

    // Keyboard shortcuts — also suppresses the browser's own Find (Ctrl/Cmd+F) while the pad is
    // open, on the platforms that let page JS pre-empt it; true fullscreen (below) is what
    // actually removes the browser's own search/address bar.
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault(); e.stopPropagation();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault(); undo();
            } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault(); redo();
            } else if (e.key === 'Escape' && activeFlyout) {
                setActiveFlyout(null);
            } else if (e.key === 'Escape' && !activeFlyout) {
                onClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, activeFlyout]);

    // Keep the palette on-screen through rotation/resize/expand.
    useEffect(() => {
        if (!open) return;
        const reclamp = () => {
            const pos = fabPosRef.current;
            const wrap = fabWrapRef.current;
            if (!pos || !wrap) return;
            const rect = wrap.getBoundingClientRect();
            applyFabPos(clampFabPos(pos.x, pos.y, rect.width, rect.height));
        };
        const t = setTimeout(reclamp, 60);
        window.addEventListener('resize', reclamp);
        return () => { clearTimeout(t); window.removeEventListener('resize', reclamp); };
    }, [open, activeFlyout]);

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
            pressure: e.pressure > 0 ? e.pressure : 0.5,
        };
    };

    const commitPendingText = () => {
        setTextEditor(prev => {
            if (!prev) return null;
            const trimmed = prev.value.trim();
            if (trimmed) {
                const item: TextItem = { text: trimmed, x: prev.canvasX, y: prev.canvasY, color: prev.color, fontSize: prev.fontSize };
                itemsRef.current.push({ kind: 'text', item });
                redoRef.current = [];
                redrawAll();
                emitHistory();
            }
            return null;
        });
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        if (e.button > 0 && e.pointerType === 'mouse') return;
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

        if (tool === 'text') {
            commitPendingText();
            const canvas = canvasRef.current!;
            const rect = canvas.getBoundingClientRect();
            const pos = getPos(e);
            setTextEditor({
                canvasX: pos.x, canvasY: pos.y,
                screenLeft: e.clientX - rect.left,
                screenTop: e.clientY - rect.top,
                displayScale: rect.width / CANVAS_W,
                value: '', color, fontSize: strokeWidthToFontSize(strokeWidth),
            });
            return;
        }

        isDrawingRef.current = true;
        const defaults = TOOL_DEFAULTS[tool];
        currentStrokeRef.current = {
            tool, color, width: strokeWidth, opacity: defaults.opacity,
            points: [getPos(e)],
        };
        redoRef.current = [];
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        e.preventDefault();
        const ctx = canvasRef.current?.getContext('2d');
        const pos = getPos(e);
        const points = currentStrokeRef.current.points;
        const prev = points[points.length - 1];
        points.push(pos);

        if (ctx) {
            const pressure = pos.pressure;
            let w = currentStrokeRef.current.width;
            if (currentStrokeRef.current.tool !== 'eraser' && currentStrokeRef.current.tool !== 'highlighter') {
                w = w * (0.5 + pressure * 1.0);
            }
            ctx.save();
            ctx.globalAlpha = currentStrokeRef.current.opacity;
            ctx.strokeStyle = strokeColor(currentStrokeRef.current.tool, currentStrokeRef.current.color);
            ctx.lineWidth = Math.max(0.5, w);
            ctx.lineCap = currentStrokeRef.current.tool === 'highlighter' ? 'square' : 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.restore();
        }
    };

    const onPointerUp = () => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        isDrawingRef.current = false;
        itemsRef.current.push({ kind: 'stroke', stroke: currentStrokeRef.current });
        currentStrokeRef.current = null;
        redrawAll();
        emitHistory();
    };

    const undo = useCallback(() => {
        const last = itemsRef.current.pop();
        if (!last) return;
        redoRef.current.push(last);
        redrawAll();
        emitHistory();
    }, [redrawAll, emitHistory]);

    const redo = useCallback(() => {
        const next = redoRef.current.pop();
        if (!next) return;
        itemsRef.current.push(next);
        redrawAll();
        emitHistory();
    }, [redrawAll, emitHistory]);

    const clear = useCallback(() => {
        itemsRef.current = [];
        redoRef.current = [];
        setTextEditor(null);
        redrawAll();
        emitHistory();
    }, [redrawAll, emitHistory]);

    const handleSave = async () => {
        if (isSubscriptionReadOnly) { blockAction('InkDischarge save'); return; }
        const canvas = canvasRef.current;
        if (!canvas || itemsRef.current.length === 0) {
            toast({ title: 'Nothing to save', description: 'Write something on the discharge letter first.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            // Canvas holds letterhead + ink composed (redrawAll paints the letterhead into the
            // bitmap). Compose an A4 PDF (jspdf, dynamically imported) and file it into the
            // admission's Documents, where it's retrievable/printable per-admission.
            redrawAll();
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 595.28, 841.89);
            const dateStr = new Date().toISOString().slice(0, 10);
            const safeName = (patientName || patientId || 'patient').replace(/[^\w-]+/g, '_');
            const pdfFile = new File([pdf.output('blob')], `Discharge-Note-${safeName}-${dateStr}.pdf`, { type: 'application/pdf' });

            const res = await admissionDocumentApi.upload(admissionId, pdfFile, hospitalId);
            if (!res?.success) throw new Error(res?.message || 'Could not save.');
            toast({ title: 'Discharge note saved', description: 'Saved as a PDF in the admission documents.' });
            onSaved?.();
            onClose();
        } catch (e) {
            toast({ title: 'Save failed', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const selectTool = (t: DrawTool) => {
        setTool(t);
        setStrokeWidth(TOOL_DEFAULTS[t].width);
    };

    const PEN_VARIANTS: { key: 'pen' | 'marker' | 'highlighter'; icon: React.ReactNode; label: string }[] = [
        { key: 'pen', icon: <Pencil size={15} />, label: 'Pen' },
        { key: 'marker', icon: <Square size={15} />, label: 'Marker' },
        { key: 'highlighter', icon: <Highlighter size={15} />, label: 'Highlighter' },
    ];

    // Each floating button both selects its tool AND toggles its own flyout — tapping it again
    // (or a different button) closes/switches the flyout; the tool selection itself always sticks.
    const handlePenButtonClick = () => {
        if (!['pen', 'marker', 'highlighter'].includes(tool)) selectTool('pen');
        setActiveFlyout(prev => prev === 'pen' ? null : 'pen');
    };
    const handleTextButtonClick = () => {
        selectTool('text');
        setActiveFlyout(prev => prev === 'text' ? null : 'text');
    };
    const handleToolsButtonClick = () => {
        if (tool !== 'eraser') selectTool('eraser');
        setActiveFlyout(prev => prev === 'tools' ? null : 'tools');
    };

    const cursorStyle = tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair';

    if (!open) return null;

    const dotSize = Math.min(Math.max(strokeWidth * 1.6, 6), 28);
    const toolbarColor = tool === 'eraser' ? '#64748b' : color;

    return (
        <div className="inkrx-shell" ref={shellRef}>
            {/* Thin status bar */}
            <div className="inkrx-statusbar">
                <button className="inkrx-statusbar-back" onClick={onClose} type="button">
                    <ArrowLeft size={14} /> Back
                </button>

                {patientName && (
                    <div className="inkrx-patient-badge">
                        <div className="inkrx-patient-avatar">
                            {patientName[0]?.toUpperCase() ?? 'P'}
                        </div>
                        <div className="inkrx-patient-info">
                            <div className="inkrx-patient-name">{patientName}</div>
                            <div className="inkrx-patient-sub">
                                {patientAge ? `Age ${patientAge}` : 'Patient'} &middot; Discharge
                            </div>
                        </div>
                    </div>
                )}

                <div className="inkrx-date-badge">{today}</div>

                {fullscreenSupported && (
                    <button
                        className="inkrx-statusbar-fullscreen"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Exit full screen' : 'Full screen — hide browser chrome'}
                        type="button"
                    >
                        {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                )}

                <button
                    className="inkrx-statusbar-save"
                    onClick={handleSave}
                    disabled={saving || !canUndo || isSubscriptionReadOnly}
                    type="button"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving…' : 'Save Discharge Note'}
                </button>
            </div>

            {/* No-letterhead hint — writing still works on a blank A4 sheet. */}
            {!templateUrl && (
                <div className="inkrx-blank-hint">
                    <FileImage size={13} />
                    <span>No discharge letterhead set — writing on a blank A4 sheet.</span>
                    {onGoToSettings && (
                        <button onClick={onGoToSettings} type="button">
                            <Settings size={12} /> Set letterhead
                        </button>
                    )}
                </div>
            )}

            {/* Canvas scroll area */}
            <div className="inkrx-canvas-area">
                <div className="inkrx-paper-wrap" ref={paperWrapRef}>
                    <div className="inkrx-paper-shadow" />

                    {/* Base layer drives the wrapper's height: the rasterized letterhead when set,
                        otherwise a blank white A4 block (the canvas is absolutely overlaid). */}
                    {templateUrl && bgReady && bgImageRef.current ? (
                        <img
                            className="inkrx-letterhead-bg"
                            src={bgImageRef.current.src}
                            alt="Discharge Letterhead"
                            draggable={false}
                        />
                    ) : (
                        <div className="inkrx-letterhead-blank" />
                    )}

                    {/* Drawing canvas absolutely overlaid */}
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_W}
                        height={CANVAS_H}
                        className="inkrx-draw-canvas"
                        style={{
                            cursor: cursorStyle,
                            touchAction: 'none',
                            opacity: 0.99,
                            mixBlendMode: tool === 'highlighter' ? 'multiply' : 'normal',
                        }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={onPointerUp}
                    />

                    {/* Text editor overlay */}
                    {textEditor && (
                        <input
                            autoFocus
                            value={textEditor.value}
                            onChange={e => setTextEditor(prev => prev ? { ...prev, value: e.target.value } : prev)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); (e.currentTarget as HTMLInputElement).blur(); }
                                if (e.key === 'Escape') { e.preventDefault(); setTextEditor(null); }
                            }}
                            onBlur={commitPendingText}
                            placeholder="Type here…"
                            className="inkrx-text-editor"
                            style={{
                                left: textEditor.screenLeft,
                                top: textEditor.screenTop,
                                fontSize: Math.max(12, textEditor.fontSize * textEditor.displayScale),
                                color: textEditor.color,
                                fontFamily: 'Georgia, serif',
                            }}
                        />
                    )}

                    {/* Loading overlay */}
                    {templateLoading && (
                        <div className="inkrx-loading">
                            <div className="inkrx-spinner" />
                            <p>Loading letterhead…</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating toolbar — 3 separate buttons (Pen, Text, Eraser+history), each opening its
                own compact flyout; dragged as one group via the grip handle. */}
            <div
                className="inkrx-fab-wrap"
                ref={fabWrapRef}
                style={fabPos ? { left: fabPos.x, top: fabPos.y, right: 'auto', bottom: 'auto' } : undefined}
            >
                <div
                    className="inkrx-fab-grip"
                    title="Drag to move"
                    onPointerDown={beginFabDrag}
                    onPointerMove={moveFabDrag}
                    onPointerUp={endFabDrag}
                    onPointerCancel={endFabDrag}
                >
                    <GripHorizontal size={14} />
                </div>

                {/* 1 — Pen (+ marker/highlighter variants, color, size) */}
                <div className="inkrx-fab-btn-group">
                    {activeFlyout === 'pen' && (
                        <div className="inkrx-fab-flyout">
                            <div className="inkrx-fab-flyout-row">
                                {PEN_VARIANTS.map(v => (
                                    <button
                                        key={v.key}
                                        className={`inkrx-fab-variant ${tool === v.key ? 'active' : ''}`}
                                        onClick={() => selectTool(v.key)}
                                        title={v.label}
                                        type="button"
                                    >
                                        {v.icon}
                                    </button>
                                ))}
                            </div>
                            <div className="inkrx-fab-size-wrap" style={{ color: toolbarColor }}>
                                <div className="inkrx-fab-size-dot-wrap">
                                    <div className="inkrx-fab-size-dot" style={{ width: dotSize, height: dotSize, background: toolbarColor }} />
                                </div>
                                <input
                                    type="range" min={1} max={40} step={1}
                                    value={strokeWidth}
                                    onChange={e => setStrokeWidth(Number(e.target.value))}
                                    className="inkrx-fab-size-slider"
                                    title={`${strokeWidth}px`}
                                />
                            </div>
                            <div className="inkrx-fab-colors">
                                {INK_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        className={`inkrx-fab-swatch ${color === c.value && tool !== 'eraser' ? 'active' : ''}`}
                                        style={{ backgroundColor: c.value }}
                                        onClick={() => { setColor(c.value); if (tool === 'eraser') selectTool('pen'); }}
                                        title={c.label}
                                        type="button"
                                    />
                                ))}
                                <input
                                    type="color"
                                    className="inkrx-fab-custom-color"
                                    value={color}
                                    onChange={e => { setColor(e.target.value); if (tool === 'eraser') selectTool('pen'); }}
                                    title="Custom color"
                                />
                            </div>
                        </div>
                    )}
                    <button
                        className={`inkrx-fab-btn ${['pen', 'marker', 'highlighter'].includes(tool) ? 'active' : ''}`}
                        onClick={handlePenButtonClick}
                        title="Pen — color & size"
                        type="button"
                    >
                        <Pencil size={20} />
                    </button>
                </div>

                {/* 2 — Text */}
                <div className="inkrx-fab-btn-group">
                    {activeFlyout === 'text' && (
                        <div className="inkrx-fab-flyout">
                            <div className="inkrx-fab-size-wrap" style={{ color: toolbarColor }}>
                                <div className="inkrx-fab-size-dot-wrap">
                                    <div className="inkrx-fab-size-dot" style={{ width: dotSize, height: dotSize, background: toolbarColor }} />
                                </div>
                                <input
                                    type="range" min={1} max={40} step={1}
                                    value={strokeWidth}
                                    onChange={e => setStrokeWidth(Number(e.target.value))}
                                    className="inkrx-fab-size-slider"
                                    title={`${strokeWidth}px`}
                                />
                            </div>
                            <div className="inkrx-fab-colors">
                                {INK_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        className={`inkrx-fab-swatch ${color === c.value ? 'active' : ''}`}
                                        style={{ backgroundColor: c.value }}
                                        onClick={() => setColor(c.value)}
                                        title={c.label}
                                        type="button"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    <button
                        className={`inkrx-fab-btn ${tool === 'text' ? 'active' : ''}`}
                        onClick={handleTextButtonClick}
                        title="Text"
                        type="button"
                    >
                        <Type size={20} />
                    </button>
                </div>

                {/* 3 — Eraser + Undo/Redo/Clear */}
                <div className="inkrx-fab-btn-group">
                    {activeFlyout === 'tools' && (
                        <div className="inkrx-fab-flyout">
                            <div className="inkrx-fab-size-wrap" style={{ color: '#64748b' }}>
                                <div className="inkrx-fab-size-dot-wrap">
                                    <div className="inkrx-fab-size-dot" style={{ width: dotSize, height: dotSize, background: '#64748b' }} />
                                </div>
                                <input
                                    type="range" min={1} max={40} step={1}
                                    value={strokeWidth}
                                    onChange={e => setStrokeWidth(Number(e.target.value))}
                                    className="inkrx-fab-size-slider"
                                    title={`${strokeWidth}px`}
                                />
                            </div>
                            <div className="inkrx-fab-flyout-row">
                                <button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" type="button" className="inkrx-fab-variant">
                                    <RotateCcw size={16} />
                                </button>
                                <button onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" type="button" className="inkrx-fab-variant">
                                    <RotateCw size={16} />
                                </button>
                                <button
                                    onClick={clear}
                                    disabled={!canUndo}
                                    title="Clear all strokes"
                                    type="button"
                                    className="inkrx-fab-variant"
                                    style={{ color: canUndo ? '#f87171' : undefined }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                    <button
                        className={`inkrx-fab-btn ${tool === 'eraser' ? 'active' : ''}`}
                        onClick={handleToolsButtonClick}
                        title="Eraser · Undo · Redo · Clear"
                        type="button"
                    >
                        <Eraser size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};
