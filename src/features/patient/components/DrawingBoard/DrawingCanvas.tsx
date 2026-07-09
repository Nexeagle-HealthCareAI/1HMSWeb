import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CANVAS_BACKGROUND, CANVAS_HEIGHT, CANVAS_WIDTH, DrawItem, DrawTool, Point, StrokeItem, TextItem, strokeWidthToFontSize } from './types';

export interface DrawingCanvasRef {
    undo: () => void;
    redo: () => void;
    clear: () => void;
    isEmpty: () => boolean;
    exportPng: () => string;
}

interface DrawingCanvasProps {
    tool: DrawTool;
    color: string;
    strokeWidth: number;
    onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean; isEmpty: boolean }) => void;
}

interface PendingText {
    canvasX: number;
    canvasY: number;
    screenLeft: number;
    screenTop: number;
    displayScale: number;
    value: string;
    color: string;
    fontSize: number;
}

// Eraser strokes are just drawn in the canvas background color rather than using
// destination-out compositing — the canvas is always a flat white sheet (mirrors a printed
// page), so there's no transparency to reveal, and this keeps exported PNGs fully opaque.
const strokeColor = (stroke: StrokeItem) => (stroke.tool === 'eraser' ? CANVAS_BACKGROUND : stroke.color);

const drawSmoothStroke = (ctx: CanvasRenderingContext2D, stroke: StrokeItem) => {
    const { points } = stroke;
    if (points.length === 0) return;
    ctx.strokeStyle = strokeColor(stroke);
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (points.length < 3) {
        const p0 = points[0];
        const p1 = points[points.length - 1];
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        return;
    }
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
};

const drawTextItem = (ctx: CanvasRenderingContext2D, item: TextItem) => {
    ctx.fillStyle = item.color;
    ctx.font = `${item.fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(item.text, item.x, item.y);
};

const drawItem = (ctx: CanvasRenderingContext2D, item: DrawItem) => {
    if (item.kind === 'stroke') drawSmoothStroke(ctx, item);
    else drawTextItem(ctx, item);
};

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
    ({ tool, color, strokeWidth, onHistoryChange }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const itemsRef = useRef<DrawItem[]>([]);
        const redoRef = useRef<DrawItem[]>([]);
        const currentStrokeRef = useRef<StrokeItem | null>(null);
        const isDrawingRef = useRef(false);
        const [textEditor, setTextEditor] = useState<PendingText | null>(null);

        const emitHistoryChange = () => {
            onHistoryChange?.({
                canUndo: itemsRef.current.length > 0,
                canRedo: redoRef.current.length > 0,
                isEmpty: itemsRef.current.length === 0,
            });
        };

        const fillBackground = (ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = CANVAS_BACKGROUND;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        };

        const redrawAll = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            fillBackground(ctx);
            itemsRef.current.forEach(item => drawItem(ctx, item));
        };

        useEffect(() => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) fillBackground(ctx);
            emitHistoryChange();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
            const canvas = canvasRef.current!;
            const rect = canvas.getBoundingClientRect();
            const point = 'touches' in e ? e.touches[0] : e;
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
        };

        // Bakes the pending text label into the canvas (as one more history item, undoable like
        // any stroke) and closes the editor. Safe to call more than once in a row — a second call
        // after the editor already closed is a no-op, since the functional updater below always
        // reads the latest state rather than a possibly-stale closure.
        const commitPendingText = () => {
            let pushed = false;
            setTextEditor(prev => {
                if (!prev) return null;
                const trimmed = prev.value.trim();
                if (trimmed) {
                    itemsRef.current.push({ kind: 'text', text: trimmed, x: prev.canvasX, y: prev.canvasY, color: prev.color, fontSize: prev.fontSize });
                    redoRef.current = [];
                    pushed = true;
                }
                return null;
            });
            if (pushed) {
                redrawAll();
                emitHistoryChange();
            }
        };

        const start = (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();

            if (tool === 'text') {
                commitPendingText(); // finalize any label already being typed before starting a new one
                const canvas = canvasRef.current!;
                const rect = canvas.getBoundingClientRect();
                const point = 'touches' in e ? e.touches[0] : e;
                const canvasPos = getPos(e);
                setTextEditor({
                    canvasX: canvasPos.x,
                    canvasY: canvasPos.y,
                    screenLeft: point.clientX - rect.left,
                    screenTop: point.clientY - rect.top,
                    displayScale: rect.width / CANVAS_WIDTH,
                    value: '',
                    color,
                    fontSize: strokeWidthToFontSize(strokeWidth),
                });
                return;
            }

            isDrawingRef.current = true;
            currentStrokeRef.current = { kind: 'stroke', tool, color, width: strokeWidth, points: [getPos(e)] };
            redoRef.current = [];
        };

        const move = (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawingRef.current || !currentStrokeRef.current) return;
            e.preventDefault();
            const ctx = canvasRef.current?.getContext('2d');
            const pos = getPos(e);
            const points = currentStrokeRef.current.points;
            const prev = points[points.length - 1];
            points.push(pos);
            if (ctx) {
                ctx.strokeStyle = strokeColor(currentStrokeRef.current);
                ctx.lineWidth = currentStrokeRef.current.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            }
        };

        const end = () => {
            if (!isDrawingRef.current || !currentStrokeRef.current) return;
            isDrawingRef.current = false;
            itemsRef.current.push(currentStrokeRef.current);
            currentStrokeRef.current = null;
            emitHistoryChange();
        };

        useImperativeHandle(ref, () => ({
            undo: () => {
                const last = itemsRef.current.pop();
                if (!last) return;
                redoRef.current.push(last);
                redrawAll();
                emitHistoryChange();
            },
            redo: () => {
                const next = redoRef.current.pop();
                if (!next) return;
                itemsRef.current.push(next);
                redrawAll();
                emitHistoryChange();
            },
            clear: () => {
                itemsRef.current = [];
                redoRef.current = [];
                setTextEditor(null);
                redrawAll();
                emitHistoryChange();
            },
            isEmpty: () => itemsRef.current.length === 0,
            exportPng: () => canvasRef.current?.toDataURL('image/png') ?? '',
        }), []);

        return (
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className={`w-full h-auto touch-none bg-white rounded-lg border border-gray-200 shadow-sm ${tool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
                    onMouseDown={start}
                    onMouseMove={move}
                    onMouseUp={end}
                    onMouseLeave={end}
                    onTouchStart={start}
                    onTouchMove={move}
                    onTouchEnd={end}
                />
                {textEditor && (
                    <input
                        autoFocus
                        value={textEditor.value}
                        onChange={e => setTextEditor(prev => (prev ? { ...prev, value: e.target.value } : prev))}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setTextEditor(null);
                            }
                        }}
                        onBlur={commitPendingText}
                        placeholder="Type a label…"
                        style={{
                            left: textEditor.screenLeft,
                            top: textEditor.screenTop,
                            fontSize: Math.max(11, textEditor.fontSize * textEditor.displayScale),
                            color: textEditor.color,
                        }}
                        className="absolute z-10 min-w-[100px] px-1.5 py-0.5 border border-brand-400 rounded bg-white/95 shadow-md outline-none ring-2 ring-brand-200"
                    />
                )}
            </div>
        );
    }
);

DrawingCanvas.displayName = 'DrawingCanvas';
