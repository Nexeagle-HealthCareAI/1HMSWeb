import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { DrawingCanvas, DrawingCanvasRef } from './DrawingCanvas';
import { DrawingToolbar } from './DrawingToolbar';
import { DrawTool, dataUrlToFile, TOOL_DEFAULTS } from './types';
import { drawingApi } from '@/features/patient/services/drawingApi';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import './DrawingToolbar.css';

interface DrawingCanvasModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
    onSaved: () => void;
    patientName?: string;
    doctorName?: string;
}

export const DrawingCanvasModal: React.FC<DrawingCanvasModalProps> = ({
    open, onOpenChange, appointmentId, patientId, hospitalId, doctorId, onSaved,
    patientName, doctorName,
}) => {
    const canvasRef = useRef<DrawingCanvasRef>(null);
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();

    const [tool, setTool] = useState<DrawTool>('pen');
    const [color, setColor] = useState('#0f172a');
    const [strokeWidth, setStrokeWidth] = useState(TOOL_DEFAULTS['pen'].width);
    const [background, setBackground] = useState<'white' | 'grid' | 'lined'>('white');
    const [label, setLabel] = useState('');
    const [history, setHistory] = useState({ canUndo: false, canRedo: false, isEmpty: true });
    const [saving, setSaving] = useState(false);

    // Keyboard shortcuts: Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z = redo
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault(); canvasRef.current?.undo();
            } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault(); canvasRef.current?.redo();
            } else if (e.key === 'Escape') {
                handleClose(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const handleBackgroundChange = (bg: 'white' | 'grid' | 'lined') => {
        setBackground(bg);
        canvasRef.current?.setBackground(bg);
    };

    const handleExport = useCallback(() => {
        const dataUrl = canvasRef.current?.exportPng();
        if (!dataUrl) return;
        const link = document.createElement('a');
        link.download = `rx-drawing-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    }, []);

    const resetState = () => {
        setTool('pen');
        setColor('#0f172a');
        setStrokeWidth(TOOL_DEFAULTS['pen'].width);
        setBackground('white');
        setLabel('');
        setHistory({ canUndo: false, canRedo: false, isEmpty: true });
    };

    const handleClose = (next: boolean) => {
        if (!next) resetState();
        onOpenChange(next);
    };

    const handleSave = async () => {
        if (!canvasRef.current || canvasRef.current.isEmpty()) {
            toast({ title: 'Nothing to save', description: 'Draw something before inserting it into the prescription.', variant: 'destructive' });
            return;
        }
        if (isSubscriptionReadOnly) { blockAction('Saving drawings'); return; }
        setSaving(true);
        try {
            const dataUrl = canvasRef.current.exportPng();
            const file = dataUrlToFile(dataUrl, `drawing-${Date.now()}.png`);
            const response = await drawingApi.uploadDrawing({
                fileName: file.name,
                label: label.trim() || undefined,
                hospitalId,
                doctorId,
                patientId,
                appointmentId,
            }, file);

            if (!response?.success) throw new Error(response?.message || 'Could not save the drawing.');
            toast({ title: 'Drawing added', description: 'It will be appended to the printed prescription.' });
            onSaved();
            handleClose(false);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Please try again.';
            toast({ title: 'Could not save drawing', description: message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (!open) return null;

    return (
        <div className="rxpad-shell">
            {/* Header */}
            <div className="rxpad-header">
                <div className="rxpad-header-title">
                    <h2>Prescription Drawing Board</h2>
                    <p>
                        {patientName ? `Patient: ${patientName}` : 'Freehand sketch for prescription'}
                        {doctorName ? ` · Dr. ${doctorName}` : ''}
                    </p>
                </div>

                <input
                    className="rxpad-label-input"
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="Label (e.g. Wound diagram)â€¦"
                />

                <div className="rxpad-header-actions">
                    <button
                        type="button"
                        className="rxpad-btn rxpad-btn-ghost"
                        onClick={() => handleClose(false)}
                        disabled={saving}
                    >
                        <X size={16} /> Discard
                    </button>
                    <button
                        type="button"
                        className="rxpad-btn rxpad-btn-primary"
                        onClick={handleSave}
                        disabled={saving || history.isEmpty || isSubscriptionReadOnly}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                        {saving ? 'Savingâ€¦' : 'Insert into Prescription'}
                    </button>
                </div>
            </div>

            {/* Body: sidebar + canvas */}
            <div className="rxpad-body">
                <DrawingToolbar
                    tool={tool}
                    onToolChange={setTool}
                    color={color}
                    onColorChange={setColor}
                    strokeWidth={strokeWidth}
                    onStrokeWidthChange={setStrokeWidth}
                    canUndo={history.canUndo}
                    canRedo={history.canRedo}
                    onUndo={() => canvasRef.current?.undo()}
                    onRedo={() => canvasRef.current?.redo()}
                    onClear={() => canvasRef.current?.clear()}
                    onExport={handleExport}
                    background={background}
                    onBackgroundChange={handleBackgroundChange}
                />

                <div className="rxpad-canvas-area">
                    <DrawingCanvas
                        ref={canvasRef}
                        tool={tool}
                        color={color}
                        strokeWidth={strokeWidth}
                        onHistoryChange={setHistory}
                    />
                </div>
            </div>
        </div>
    );
};
