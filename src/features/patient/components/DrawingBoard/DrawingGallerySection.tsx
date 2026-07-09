import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, PencilRuler, Plus, Trash2 } from 'lucide-react';
import { drawingApi, DrawingItem } from '@/features/patient/services/drawingApi';
import { useToast } from '@/hooks/use-toast';
import { DrawingCanvasModal } from './DrawingCanvasModal';

interface DrawingGallerySectionProps {
    open: boolean;
    appointmentId: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
}

const extractErrorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

export const DrawingGallerySection: React.FC<DrawingGallerySectionProps> = ({
    open, appointmentId, patientId, hospitalId, doctorId,
}) => {
    const { toast } = useToast();
    const [drawings, setDrawings] = useState<DrawingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [canvasOpen, setCanvasOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchDrawings = async () => {
        if (!appointmentId || !patientId || !hospitalId || !doctorId) return;
        setLoading(true);
        try {
            const response = await drawingApi.getDrawings({ appointmentId, patientId, hospitalId, doctorId });
            setDrawings(response?.drawings ?? []);
        } catch (e) {
            console.error('Failed to fetch drawings', e);
            toast({ title: 'Could not load drawings', description: extractErrorMessage(e, 'Please try again.'), variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) fetchDrawings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleDelete = async (drawing: DrawingItem) => {
        if (!window.confirm('Delete this drawing? It will no longer be included in the printed prescription.')) return;
        setDeletingId(drawing.drawingId);
        try {
            const response = await drawingApi.deleteDrawing(drawing.drawingId);
            if (!response?.success) throw new Error(response?.message || 'Could not delete the drawing.');
            setDrawings(prev => prev.filter(d => d.drawingId !== drawing.drawingId));
            toast({ title: 'Drawing deleted' });
        } catch (e) {
            toast({ title: 'Could not delete drawing', description: extractErrorMessage(e, 'Please try again.'), variant: 'destructive' });
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Each drawing is appended as its own page at the end of the printed prescription.
                </p>
                <Button type="button" size="sm" className="gap-1.5 shrink-0" onClick={() => setCanvasOpen(true)}>
                    <Plus className="h-4 w-4" /> New Drawing
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
            ) : drawings.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-gray-400">
                    <PencilRuler className="h-8 w-8" />
                    <p className="text-sm">No drawings yet for this prescription.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {drawings.map(drawing => (
                        <div key={drawing.drawingId} className="group relative rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
                            <img src={drawing.storageUrl} alt={drawing.label || 'Drawing'} className="w-full aspect-[3/4] object-contain bg-gray-50" />
                            <div className="p-2 text-xs text-gray-500 truncate">{drawing.label || `Drawing ${drawing.sequenceNo}`}</div>
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDelete(drawing)}
                                disabled={deletingId === drawing.drawingId}
                            >
                                {deletingId === drawing.drawingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <DrawingCanvasModal
                open={canvasOpen}
                onOpenChange={setCanvasOpen}
                appointmentId={appointmentId}
                patientId={patientId}
                hospitalId={hospitalId}
                doctorId={doctorId}
                onSaved={fetchDrawings}
            />
        </div>
    );
};
