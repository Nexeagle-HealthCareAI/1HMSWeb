import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Image as ImageIcon, FileType2, File as FileIcon, Eye, Trash2, X, Check, Files } from 'lucide-react';
import { admissionDocumentApi, validateDocumentFile, ALLOWED_DOCUMENT_EXTENSIONS, type AdmissionDocumentItem } from '../services/admissionDocumentApi';
import { formatIstDateTime } from '../utils/istDate';

interface Props {
    admissionId: string;
}

const iconFor = (contentType?: string | null, documentName?: string): React.ElementType => {
    const name = (documentName ?? '').toLowerCase();
    const type = (contentType ?? '').toLowerCase();
    if (type.includes('pdf') || name.endsWith('.pdf')) return FileText;
    if (type.includes('image') || /\.(jpe?g|png)$/.test(name)) return ImageIcon;
    if (type.includes('word') || /\.docx?$/.test(name)) return FileType2;
    return FileIcon;
};

const formatFileSize = (bytes?: number | null): string => {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AdmissionDocumentsPanel: React.FC<Props> = ({ admissionId }) => {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [documents, setDocuments] = useState<AdmissionDocumentItem[]>([]);
    const [uploadQueue, setUploadQueue] = useState<{ name: string; done: boolean; error?: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const loadDocuments = () => {
        setLoading(true);
        admissionDocumentApi.list(admissionId)
            .then(res => setDocuments(res.documents))
            .catch(() => setDocuments([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadDocuments(); }, [admissionId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFilesPicked = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const list = Array.from(files);

        const invalid = list.map(f => ({ file: f, error: validateDocumentFile(f) })).find(x => x.error);
        if (invalid?.error) {
            toast({ title: `Could not upload ${invalid.file.name}`, description: invalid.error, variant: 'destructive' });
            return;
        }

        setUploading(true);
        setUploadQueue(list.map(f => ({ name: f.name, done: false })));

        for (let i = 0; i < list.length; i++) {
            try {
                await admissionDocumentApi.upload(admissionId, list[i]);
                setUploadQueue(q => q.map((item, idx) => idx === i ? { ...item, done: true } : item));
            } catch (err) {
                setUploadQueue(q => q.map((item, idx) => idx === i ? { ...item, done: true, error: err instanceof Error ? err.message : 'Upload failed' } : item));
            }
        }

        setUploading(false);
        setUploadQueue([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadDocuments();
    };

    const confirmDelete = async (documentId: string) => {
        setDeleteBusy(true);
        try {
            await admissionDocumentApi.delete(documentId, admissionId);
            toast({ title: 'Document deleted.' });
            setPendingDeleteId(null);
            loadDocuments();
        } catch (err) {
            toast({ title: 'Could not delete document', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0"><Files className="h-4.5 w-4.5" /></span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Documents</h2>
                        <p className="text-[11px] text-slate-400">{loading ? 'Loading…' : `${documents.length} document${documents.length === 1 ? '' : 's'}`}</p>
                    </div>
                </div>
                <label className="h-11 sm:h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white cursor-pointer transition-colors self-start sm:self-auto">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    Upload
                    <input
                        ref={fileInputRef} type="file" multiple className="hidden"
                        accept={ALLOWED_DOCUMENT_EXTENSIONS.join(',')}
                        disabled={uploading}
                        onChange={e => handleFilesPicked(e.target.files)}
                    />
                </label>
            </div>

            {uploadQueue.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                    {uploadQueue.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                            {!item.done ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" /> : item.error ? <X className="h-3.5 w-3.5 text-rose-500 shrink-0" /> : <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                            <span className="truncate text-slate-600">{item.name}</span>
                            {item.error && <span className="text-rose-500 shrink-0">— {item.error}</span>}
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : documents.length === 0 ? (
                <div className="py-10 text-center">
                    <p className="text-sm text-slate-400">No documents uploaded yet.</p>
                </div>
            ) : (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    {documents.map(doc => {
                        const Icon = iconFor(doc.contentType, doc.documentName);
                        const isPendingDelete = pendingDeleteId === doc.documentId;
                        return (
                            <div key={doc.documentId} className={cn('rounded-xl border p-3 transition-colors', isPendingDelete ? 'border-rose-200 bg-rose-50' : 'border-slate-100 hover:bg-slate-50')}>
                                <div className="flex items-start gap-3">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 shrink-0"><Icon className="h-4 w-4" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate" title={doc.documentName}>{doc.documentName}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            {formatIstDateTime(doc.uploadedAt)}
                                            {doc.uploadedBy && <> · {doc.uploadedBy}</>}
                                            {doc.fileSizeBytes != null && <> · {formatFileSize(doc.fileSizeBytes)}</>}
                                        </p>
                                    </div>
                                </div>

                                {isPendingDelete ? (
                                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-rose-200">
                                        <span className="text-[11px] font-semibold text-rose-700">Delete this document?</span>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="ghost" className="h-9 sm:h-8 text-xs" onClick={() => setPendingDeleteId(null)}>Cancel</Button>
                                            <Button size="sm" className="h-9 sm:h-8 text-xs bg-rose-600 hover:bg-rose-700" disabled={deleteBusy} onClick={() => confirmDelete(doc.documentId)}>
                                                {deleteBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null} Delete
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 mt-2.5">
                                        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs flex-1 sm:flex-none" onClick={() => window.open(doc.storageUrl, '_blank', 'noopener,noreferrer')}>
                                            <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                                        </Button>
                                        <Button size="sm" variant="outline" className="h-9 sm:h-8 text-xs text-rose-600 hover:bg-rose-50 flex-1 sm:flex-none" onClick={() => setPendingDeleteId(doc.documentId)}>
                                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
