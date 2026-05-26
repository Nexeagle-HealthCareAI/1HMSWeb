import React, { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SignatureCanvasHandle {
    getDataUrl: () => string | null;   // returns null when canvas is empty
    clear: () => void;
    isEmpty: () => boolean;
}

interface SignatureCanvasProps {
    width?: number;
    height?: number;
    className?: string;
    onChange?: (hasInk: boolean) => void;
}

// A pointer-event-based signature pad: supports mouse, touch, and stylus
// without pulling in another dependency. Outputs a base64-encoded PNG via the ref.
export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
    function SignatureCanvas({ width = 560, height = 180, className, onChange }, ref) {
        const canvasRef = useRef<HTMLCanvasElement | null>(null);
        const drawingRef = useRef(false);
        const lastPointRef = useRef<{ x: number; y: number } | null>(null);
        const inkRef = useRef(false);
        const [, force] = useState(0); // used to re-render after clear/redraw
        const [hasInk, setHasInk] = useState(false);

        const getCtx = useCallback(() => canvasRef.current?.getContext('2d') ?? null, []);

        // Resize the canvas with proper device pixel ratio so strokes are crisp on hi-DPI screens.
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            const ctx = getCtx();
            if (ctx) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.strokeStyle = '#0f172a';
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
            }
        }, [width, height, getCtx]);

        const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
            const canvas = canvasRef.current!;
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
            e.preventDefault();
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            drawingRef.current = true;
            lastPointRef.current = getPointerPos(e);
        };

        const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (!drawingRef.current) return;
            const ctx = getCtx();
            const pos = getPointerPos(e);
            const last = lastPointRef.current;
            if (!ctx || !last) return;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            lastPointRef.current = pos;
            if (!inkRef.current) {
                inkRef.current = true;
                setHasInk(true);
                onChange?.(true);
            }
        };

        const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
            if (drawingRef.current) {
                drawingRef.current = false;
                lastPointRef.current = null;
                try {
                    (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
                } catch { /* pointer may already be released */ }
            }
        };

        const clear = useCallback(() => {
            const canvas = canvasRef.current;
            const ctx = getCtx();
            if (!canvas || !ctx) return;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
            inkRef.current = false;
            setHasInk(false);
            onChange?.(false);
            force(n => n + 1);
        }, [getCtx, onChange]);

        useImperativeHandle(ref, () => ({
            isEmpty: () => !inkRef.current,
            clear,
            getDataUrl: () => {
                const canvas = canvasRef.current;
                if (!canvas || !inkRef.current) return null;
                // PNG keeps the white background; for ink-on-paper print this is what we want.
                return canvas.toDataURL('image/png');
            },
        }), [clear]);

        return (
            <div className={cn('space-y-2', className)}>
                <div className="rounded-lg border border-slate-300 bg-white inline-block touch-none select-none">
                    <canvas
                        ref={canvasRef}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                        onPointerCancel={onPointerUp}
                        className="cursor-crosshair touch-none block"
                        aria-label="Signature pad"
                    />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{hasInk ? 'Signed' : 'Sign with mouse, stylus, or finger above'}</span>
                    <Button size="sm" variant="ghost" onClick={clear} className="h-7 text-xs gap-1 text-slate-600 hover:text-rose-600">
                        <Eraser className="h-3 w-3" /> Clear
                    </Button>
                </div>
            </div>
        );
    },
);
