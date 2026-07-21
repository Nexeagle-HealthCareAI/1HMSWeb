import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CANVAS_BACKGROUND, CANVAS_HEIGHT, CANVAS_WIDTH, DrawItem, DrawTool, Point, StrokeItem, TextItem, strokeWidthToFontSize, TOOL_DEFAULTS } from './types';

export interface DrawingCanvasRef {
    undo: () => void;
    redo: () => void;
    clear: () => void;
    isEmpty: () => boolean;
    exportPng: () => string;
    setBackground: (bg: 'white' | 'grid' | 'lined') => void;
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

type CanvasBackground = 'white' | 'grid' | 'lined';

// Eraser strokes are drawn in the background color rather than using destination-out compositing.
const strokeColor = (stroke: StrokeItem) => (stroke.tool === 'eraser' ? CANVAS_BACKGROUND : stroke.color);

const fillBackground = (ctx: CanvasRenderingContext2D, bg: CanvasBackground) => {
    ctx.save();
    ctx.fillStyle = CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (bg === 'grid') {
        ctx.strokeStyle = 'rgba(186, 212, 255, 0.55)';
        ctx.lineWidth = 1;
        const spacing = 28;
        for (let x = 0; x <= CANVAS_WIDTH; x += spacing) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += spacing) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }
    } else if (bg === 'lined') {
        ctx.strokeStyle = 'rgba(180, 200, 240, 0.6)';
        ctx.lineWidth = 1;
        const lineSpacing = 40;
        for (let y = lineSpacing; y <= CANVAS_HEIGHT; y += lineSpacing) {
            ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(CANVAS_WIDTH - 20, y); ctx.stroke();
        }
        // Red margin line
        ctx.strokeStyle = 'rgba(220, 100, 100, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, CANVAS_HEIGHT); ctx.stroke();
    }
    ctx.restore();
};

// Catmull-Rom → Bézier conversion for smooth natural ink feel
const catmullRomToBezier = (points: Point[]): void => { /* used inline below */ };

const drawSmoothStroke = (ctx: CanvasRenderingContext2D, stroke: StrokeItem) => {
    const { points } = stroke;
    if (points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = strokeColor(stroke);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'highlighter') {
        // Flat squared-off highlighter strokes
        ctx.lineCap = 'square';
    }

    if (points.length < 3) {
        const p0 = points[0];
        const p1 = points[points.length - 1];
        const w = stroke.tool === 'eraser' ? stroke.width : (stroke.width * (1 + ((p0.pressure ?? 0.5) - 0.5) * 0.6));
        ctx.lineWidth = Math.max(1, w);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        ctx.restore();
        return;
    }

    // Catmull-Rom spline with pressure-based width variation
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];

        const pressure = p1.pressure ?? 0.5;
        let w = stroke.width;
        if (stroke.tool !== 'eraser' && stroke.tool !== 'highlighter') {
            // Pressure variation: light touch = thinner stroke, heavy = thicker
            w = stroke.width * (0.5 + pressure * 1.0);
        }
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
        const bgRef = useRef<CanvasBackground>('white');
        const [textEditor, setTextEditor] = useState<PendingText | null>(null);

        const emitHistoryChange = () => {
            onHistoryChange?.({
                canUndo: itemsRef.current.length > 0,
                canRedo: redoRef.current.length > 0,
                isEmpty: itemsRef.current.length === 0,
            });
        };

        const redrawAll = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (!ctx) return;
            fillBackground(ctx, bgRef.current);
            itemsRef.current.forEach(item => drawItem(ctx, item));
        };

        useEffect(() => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) fillBackground(ctx, bgRef.current);
            emitHistoryChange();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        const getPos = (e: React.PointerEvent): Point => {
            const canvas = canvasRef.current!;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
                // PointerEvent.pressure: 0.5 for mouse, actual value for Apple Pencil/stylus
                pressure: e.pressure > 0 ? e.pressure : 0.5,
            };
        };

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

        const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
            e.preventDefault();
            // Only accept primary pointer (finger, pen, left mouse)
            if (e.button > 0 && e.pointerType === 'mouse') return;

            // Capture pointer for smooth tracking even outside element bounds
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);

            if (tool === 'text') {
                commitPendingText();
                const canvas = canvasRef.current!;
                const rect = canvas.getBoundingClientRect();
                const canvasPos = getPos(e);
                setTextEditor({
                    canvasX: canvasPos.x,
                    canvasY: canvasPos.y,
                    screenLeft: e.clientX - rect.left,
                    screenTop: e.clientY - rect.top,
                    displayScale: rect.width / CANVAS_WIDTH,
                    value: '',
                    color,
                    fontSize: strokeWidthToFontSize(strokeWidth),
                });
                return;
            }

            isDrawingRef.current = true;
            const defaults = TOOL_DEFAULTS[tool];
            currentStrokeRef.current = {
                kind: 'stroke',
                tool,
                color,
                width: strokeWidth,
                opacity: defaults.opacity,
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

            // Incremental draw for live feedback (will be redrawn cleanly on stroke end)
            if (ctx) {
                const pressure = pos.pressure ?? 0.5;
                let w = currentStrokeRef.current.width;
                if (currentStrokeRef.current.tool !== 'eraser' && currentStrokeRef.current.tool !== 'highlighter') {
                    w = w * (0.5 + pressure * 1.0);
                }
                ctx.save();
                ctx.globalAlpha = currentStrokeRef.current.opacity;
                ctx.strokeStyle = strokeColor(currentStrokeRef.current);
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
            itemsRef.current.push(currentStrokeRef.current);
            currentStrokeRef.current = null;
            // Redraw cleanly with smooth splines
            redrawAll();
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
            setBackground: (bg: CanvasBackground) => {
                bgRef.current = bg;
                redrawAll();
            },
        }), []);

        const cursorStyle = tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair';

        return (
            <div className="rxpad-canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="rxpad-canvas"
                    style={{ cursor: cursorStyle, touchAction: 'none' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
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
                        placeholder="Type here…"
                        style={{
                            left: textEditor.screenLeft,
                            top: textEditor.screenTop,
                            fontSize: Math.max(11, textEditor.fontSize * textEditor.displayScale),
                            color: textEditor.color,
                            fontFamily: 'Georgia, serif',
                        }}
                        className="rxpad-text-editor"
                    />
                )}
            </div>
        );
    }
);

DrawingCanvas.displayName = 'DrawingCanvas';

