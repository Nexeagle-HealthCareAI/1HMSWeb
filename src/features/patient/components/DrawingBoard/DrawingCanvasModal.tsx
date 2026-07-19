import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { DrawingCanvas, DrawingCanvasRef } from './DrawingCanvas';
import { DrawingToolbar } from './DrawingToolbar';
import { DrawTool, dataUrlToFile } from './types';
import { drawingApi } from '@/features/patient/services/drawingApi';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';

interface DrawingCanvasModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    appointmentId: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
    onSaved: () => void;
}

export const DrawingCanvasModal: React.FC<DrawingCanvasModalProps> = ({
    open, onOpenChange, appointmentId, patientId, hospitalId, doctorId, onSaved,
}) => {
    const canvasRef = useRef<DrawingCanvasRef>(null);
    const { toast } = useToast();
    const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();

    const [tool, setTool] = useState<DrawTool>('pen');
    const [color, setColor] = useState('#1e293b');
    const [strokeWidth, setStrokeWidth] = useState(5);
    const [label, setLabel] = useState('');
    const [history, setHistory] = useState({ canUndo: false, canRedo: false, isEmpty: true });
    const [saving, setSaving] = useState(false);

    const resetState = () => {
        setTool('pen');
        setColor('#1e293b');
        setStrokeWidth(5);
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

            if (!response?.success) {
                throw new Error(response?.message || 'Could not save the drawing.');
            }

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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-[95vw] xl:max-w-[1200px] 2xl:max-w-[1400px] w-full h-[95vh] p-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>Drawing Board</DialogTitle>
                    <DialogDescription>Draw freehand or use the Text tool to label any part of it — it will be appended as a new page at the end of the printed prescription.</DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-3">
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
                    />
                </div>

                <div className="flex-1 overflow-auto px-6 flex justify-center bg-gray-50">
                    <div className="w-full max-w-[600px] py-2">
                        <DrawingCanvas
                            ref={canvasRef}
                            tool={tool}
                            color={color}
                            strokeWidth={strokeWidth}
                            onHistoryChange={setHistory}
                        />
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-gray-200 flex-row items-center gap-3 sm:justify-between">
                    <div className="flex-1 min-w-0">
                        <Label htmlFor="drawing-label" className="text-xs text-gray-500">Label (optional)</Label>
                        <Input
                            id="drawing-label"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="e.g. Wound diagram"
                            className="h-9 mt-1"
                        />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button type="button" variant="ghost" onClick={() => handleClose(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={handleSave} disabled={saving || history.isEmpty || isSubscriptionReadOnly}>
                            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                            Insert into Prescription
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
