import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowLeft, Eraser, Highlighter, Loader2, Pencil, Plus,
    RotateCcw, RotateCw, Save, Square, Trash2, Type, X, FileImage, Settings
} from 'lucide-react';
import { dataUrlToFile, DrawTool, TOOL_DEFAULTS } from '@/features/patient/components/DrawingBoard/types';
import { drawingApi } from '@/features/patient/services/drawingApi';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import './InkDischargePad.css';

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
    templateUrl?: string | null;  // The doctor's uploaded letterhead (from PrescriptionSetting.URI)
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

    const [tool, setTool] = useState<DrawTool>('pen');
    const [color, setColor] = useState('#0f172a');
    const [strokeWidth, setStrokeWidth] = useState(TOOL_DEFAULTS['pen'].width);
    const [fabOpen, setFabOpen] = useState(false);
    const [templateLoading, setTemplateLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [textEditor, setTextEditor] = useState<PendingText | null>(null);
    const [label] = useState('InkDischarge Handwritten Note');

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const emitHistory = useCallback(() => {
        setCanUndo(itemsRef.current.length > 0);
        setCanRedo(redoRef.current.length > 0);
    }, []);

    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        // Clear to white
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw letterhead background if available
        if (bgImageRef.current) {
            ctx.drawImage(bgImageRef.current, 0, 0, CANVAS_W, CANVAS_H);
        }

        // Redraw all items
        itemsRef.current.forEach(item => {
            if (item.kind === 'stroke') drawSmoothStroke(ctx, item.stroke);
            else drawTextItem(ctx, item.item);
        });
    }, []);

    // Load template image when pad opens
    useEffect(() => {
        if (!open) return;
        if (!templateUrl) return;

        setTemplateLoading(true);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            bgImageRef.current = img;
            setTemplateLoading(false);
            redrawAll();
        };
        img.onerror = () => {
            bgImageRef.current = null;
            setTemplateLoading(false);
            toast({ title: 'Could not load letterhead', description: 'Drawing on blank canvas instead.', variant: 'destructive' });
            redrawAll();
        };
        img.src = templateUrl;
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

    // Keyboard shortcuts
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault(); undo();
            } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault(); redo();
            } else if (e.key === 'Escape' && !fabOpen) {
                onClose();
            } else if (e.key === 'Escape' && fabOpen) {
                setFabOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, fabOpen]);

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
                value: '', color, fontSize: 18,
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
        if (isSubscriptionReadOnly) { blockAction('InkRx save'); return; }
        const canvas = canvasRef.current;
        if (!canvas || itemsRef.current.length === 0) {
            toast({ title: 'Nothing to save', description: 'Write something on the prescription first.', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const file = dataUrlToFile(dataUrl, `inkrx-${Date.now()}.png`);
            const response = await drawingApi.uploadDrawing({
                fileName: file.name,
                label: label.trim() || undefined,
                hospitalId, doctorId, patientId, appointmentId: admissionId, // Map admissionId to appointmentId for API compatibility
            }, file);
            if (!response?.success) throw new Error(response?.message || 'Could not save.');
            toast({ title: 'InkDischarge saved', description: 'The handwritten note has been appended.' });
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

    const cursorStyle = tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair';

    if (!open) return null;

    const TOOLS: { key: DrawTool; icon: React.ReactNode; label: string }[] = [
        { key: 'pen',         icon: <Pencil size={16} />,      label: 'Pen' },
        { key: 'marker',      icon: <Square size={16} />,      label: 'Marker' },
        { key: 'highlighter', icon: <Highlighter size={16} />, label: 'Hi-lite' },
        { key: 'eraser',      icon: <Eraser size={16} />,      label: 'Eraser' },
        { key: 'text',        icon: <Type size={16} />,        label: 'Text' },
    ];

    const dotSize = Math.min(Math.max(strokeWidth * 1.6, 6), 28);
    const toolbarColor = tool === 'eraser' ? '#64748b' : color;

    return (
        <div className="inkrx-shell">
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
                                {patientAge ? `Age ${patientAge}` : 'Patient'} &middot; InkDischarge
                            </div>
                        </div>
                    </div>
                )}

                <div className="inkrx-date-badge">{today}</div>

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

            {/* Canvas scroll area */}
            <div className="inkrx-canvas-area">
                {!templateUrl ? (
                    /* No template uploaded */
                    <div className="inkrx-no-template" style={{ maxWidth: 480 }}>
                        <div className="inkrx-no-template-icon">
                            <FileImage size={28} />
                        </div>
                        <h3>No Letterhead Configured</h3>
                        <p>
                            Upload your discharge letterhead in IPD Settings to use InkDischarge. 
                            The letterhead will appear as the background when you write.
                        </p>
                        {onGoToSettings && (
                            <button className="inkrx-no-template-btn" onClick={onGoToSettings} type="button">
                                <Settings size={16} /> Go to Discharge Settings
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="inkrx-paper-wrap" ref={paperWrapRef}>
                        <div className="inkrx-paper-shadow" />

                        {/* Letterhead image (rendered via CSS — actual drawing uses canvas) */}
                        <img
                            className="inkrx-letterhead-bg"
                            src={templateUrl}
                            alt="Prescription Letterhead"
                            draggable={false}
                        />

                        {/* Drawing canvas absolutely overlaid */}
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            className="inkrx-draw-canvas"
                            style={{
                                cursor: cursorStyle,
                                touchAction: 'none',
                                opacity: 0.99, /* isolate stacking context */
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
                )}
            </div>

            {/* Floating Action Button */}
            <div className="inkrx-fab-wrap">
                {/* Expanded toolbar */}
                {fabOpen && (
                    <div className="inkrx-fab-toolbar">
                        {/* Tools */}
                        {TOOLS.map(t => (
                            <button
                                key={t.key}
                                className={`inkrx-fab-tool ${tool === t.key ? 'active' : ''}`}
                                onClick={() => selectTool(t.key)}
                                title={t.label}
                                type="button"
                            >
                                {t.icon}
                                <span>{t.label}</span>
                            </button>
                        ))}

                        <div className="inkrx-fab-divider" />

                        {/* Size slider */}
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

                        <div className="inkrx-fab-divider" />

                        {/* Colors */}
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

                        <div className="inkrx-fab-divider" />

                        {/* History + Clear */}
                        <button className="inkrx-fab-tool" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" type="button">
                            <RotateCcw size={16} />
                            <span>Undo</span>
                        </button>
                        <button className="inkrx-fab-tool" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" type="button">
                            <RotateCw size={16} />
                            <span>Redo</span>
                        </button>
                        <button
                            className="inkrx-fab-tool"
                            onClick={clear}
                            disabled={!canUndo}
                            title="Clear all strokes"
                            type="button"
                            style={{ color: canUndo ? '#f87171' : undefined }}
                        >
                            <Trash2 size={16} />
                            <span>Clear</span>
                        </button>
                    </div>
                )}

                {/* FAB toggle button */}
                <button
                    className={`inkrx-fab-toggle ${fabOpen ? 'open' : ''}`}
                    onClick={() => setFabOpen(v => !v)}
                    title={fabOpen ? 'Close tools' : 'Open tools'}
                    type="button"
                >
                    {fabOpen ? <X size={22} /> : <Plus size={22} />}
                </button>
            </div>
        </div>
    );
};
