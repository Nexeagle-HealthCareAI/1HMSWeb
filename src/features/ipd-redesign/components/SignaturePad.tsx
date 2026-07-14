import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eraser } from 'lucide-react';

interface Props {
    onChange: (dataUrl: string | null) => void;
}

// Minimal canvas-based signature capture, shared by ConsentPanel and the LAMA (Leave Against
// Medical Advice) dialog -- any flow that needs to capture a patient/attendant signature image.
export const SignaturePad: React.FC<Props> = ({ onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);

    // Canvas has a fixed internal drawing resolution (400x140) but renders at CSS `w-full` — on a
    // narrow mobile dialog the rendered width is well under 400px, so raw clientX/clientY offsets
    // would drift from the actual pen position. Scale into canvas coordinate space explicitly.
    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const point = 'touches' in e ? e.touches[0] : e;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
    };

    const start = (e: React.MouseEvent | React.TouchEvent) => {
        drawing.current = true;
        const ctx = canvasRef.current!.getContext('2d')!;
        const { x, y } = getPos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };
    const move = (e: React.MouseEvent | React.TouchEvent) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current!.getContext('2d')!;
        const { x, y } = getPos(e);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();
    };
    const end = () => {
        if (!drawing.current) return;
        drawing.current = false;
        onChange(canvasRef.current!.toDataURL('image/png'));
    };
    const clear = () => {
        const canvas = canvasRef.current!;
        canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
        onChange(null);
    };

    return (
        <div>
            <Label className="text-[11px] font-semibold text-slate-600">Signature</Label>
            <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden bg-white">
                <canvas
                    ref={canvasRef} width={400} height={140} className="w-full touch-none cursor-crosshair"
                    onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
                    onTouchStart={start} onTouchMove={move} onTouchEnd={end}
                />
            </div>
            <Button type="button" variant="ghost" size="sm" className="h-8 sm:h-7 text-xs text-slate-400 mt-1" onClick={clear}>
                <Eraser className="h-3 w-3 mr-1" /> Clear
            </Button>
        </div>
    );
};

export default SignaturePad;
