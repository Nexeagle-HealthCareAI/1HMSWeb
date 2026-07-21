import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileImage, Loader2, PencilRuler, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { drawingApi, DrawingItem } from '@/features/patient/services/drawingApi';
import { useToast } from '@/hooks/use-toast';
import { DrawingCanvasModal } from './DrawingCanvasModal';
import { InkRxPad } from './InkRxPad';

interface DrawingGallerySectionProps {
    open: boolean;
    appointmentId: string;
    patientId: string;
    hospitalId: string;
    doctorId: string;
    // Optional: passed from parent if available
    templateUrl?: string | null;
    patientName?: string;
    patientAge?: string;
    onGoToSettings?: () => void;
}

const extractErrorMessage = (e: unknown, fallback: string) => (e instanceof Error && e.message) || fallback;

export const DrawingGallerySection: React.FC<DrawingGallerySectionProps> = ({
    open, appointmentId, patientId, hospitalId, doctorId,
    templateUrl, patientName, patientAge, onGoToSettings,
}) => {
    const { toast } = useToast();
    const [drawings, setDrawings] = useState<DrawingItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [canvasOpen, setCanvasOpen] = useState(false);
    const [inkRxOpen, setInkRxOpen] = useState(false);
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
        <div className="p-4 md:p-6 space-y-5">

            {/* ── InkRx Hero Card ─────────────────────────── */}
            <div
                style={{
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    border: '1px solid rgba(96, 165, 250, 0.2)',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                {/* Background glow */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse at 80% 50%, rgba(37,99,235,0.18) 0%, transparent 65%)',
                }} />

                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                    {/* Icon */}
                    <div style={{
                        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                        background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 20px rgba(37,99,235,0.4)',
                    }}>
                        <Pencil size={22} color="white" />
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                                InkRx
                            </span>
                            <span style={{
                                fontSize: 10, fontWeight: 700, color: '#2563eb',
                                background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(96,165,250,0.3)',
                                borderRadius: 6, padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                                NEW
                            </span>
                            <Sparkles size={12} color="#60a5fa" />
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.4 }}>
                            Write directly on your prescription letterhead with Apple Pencil or any stylus.
                            {!templateUrl && (
                                <span style={{ color: '#f59e0b', fontWeight: 600 }}> No letterhead found — set it up in Settings first.</span>
                            )}
                        </p>
                    </div>

                    {/* CTA */}
                    <button
                        onClick={() => setInkRxOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 10, border: 'none',
                            background: templateUrl
                                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                : 'rgba(255,255,255,0.06)',
                            color: templateUrl ? 'white' : '#64748b',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            boxShadow: templateUrl ? '0 4px 14px rgba(37,99,235,0.4)' : 'none',
                            transition: 'all 0.2s', flexShrink: 0,
                            border: templateUrl ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        }}
                        type="button"
                    >
                        {templateUrl ? (
                            <><Pencil size={14} /> Open InkRx</>
                        ) : (
                            <><FileImage size={14} /> No Letterhead</>
                        )}
                    </button>
                </div>

                {/* Preview strip — shows letterhead thumbnail if available */}
                {templateUrl && (
                    <div style={{
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        padding: '12px 24px',
                        display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <img
                            src={templateUrl}
                            alt="Letterhead preview"
                            style={{
                                width: 36, height: 51, objectFit: 'cover', borderRadius: 4,
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                            }}
                        />
                        <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
                            Prescription letterhead ready &middot; Tap "Open InkRx" to start writing
                        </span>
                    </div>
                )}
            </div>

            {/* ── Standard Drawing Board ───────────────────── */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Freehand sketches — appended as separate pages to the printed prescription.
                </p>
                <Button type="button" size="sm" className="gap-1.5 shrink-0" onClick={() => setCanvasOpen(true)}>
                    <Plus className="h-4 w-4" /> New Sketch
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                </div>
            ) : drawings.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
                    <PencilRuler className="h-8 w-8" />
                    <p className="text-sm">No freehand sketches yet.</p>
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

            {/* Modals */}
            <DrawingCanvasModal
                open={canvasOpen}
                onOpenChange={setCanvasOpen}
                appointmentId={appointmentId}
                patientId={patientId}
                hospitalId={hospitalId}
                doctorId={doctorId}
                onSaved={fetchDrawings}
                patientName={patientName}
            />

            <InkRxPad
                open={inkRxOpen}
                onClose={() => setInkRxOpen(false)}
                templateUrl={templateUrl}
                appointmentId={appointmentId}
                patientId={patientId}
                hospitalId={hospitalId}
                doctorId={doctorId}
                patientName={patientName}
                patientAge={patientAge}
                onSaved={fetchDrawings}
                onGoToSettings={onGoToSettings}
            />
        </div>
    );
};

