import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { FileImage, FileText, Plus, Upload, ArrowLeft, Trash, CheckCircle, Camera, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useSubscriptionReadOnly } from '@/features/subscription/hooks/useSubscriptionReadOnly';
import { useToast } from "@/hooks/use-toast";
import { labApi, AttachmentItem } from '../services/labApi';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AttachmentsSectionProps {
  attachments: string[];
  onChange: (next: string[]) => void;
  patientId?: string;
  patientName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode | null;
  appointmentId?: string;
  doctorId?: string;
}

type AttachmentFile = {
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
};

const reportTypes = [
  'Prescription',
  'X-ray report',
  'Lab test report',
  'MRI / CT report',
  'Ultrasound report',
  'ECG report',
  'Discharge summary',
  'Other'
];

// One shape for both data sources (API rows vs. legacy local entries) so the list/preview render
// from a single unpacked view instead of re-checking 'attachmentId' in att at every call site.
const unpackAttachment = (att: AttachmentItem | AttachmentFile | undefined) => {
  if (!att) return { name: '', url: '', type: '', uploadedAt: '', uploadedBy: '', id: undefined as string | undefined };
  if ('attachmentId' in att) {
    return { name: att.fileName, url: att.storageUrl, type: att.reportType, uploadedAt: att.uploadedAt, uploadedBy: att.uploadedBy, id: att.attachmentId };
  }
  return { name: att.name, url: att.url, type: att.type, uploadedAt: att.uploadedAt, uploadedBy: att.uploadedBy, id: undefined };
};

const formatUploadedAt = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const AttachmentsSection: React.FC<AttachmentsSectionProps> = ({ attachments, onChange, patientId, patientName, open: controlledOpen, onOpenChange, trigger, appointmentId, doctorId: propDoctorId }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(reportTypes[0]);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [error, setError] = useState('');
  const [viewIndex, setViewIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Mobile-only: tapping a list row slides a full-area preview over the dialog (the split
  // master-detail panes only exist from md: up).
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);

  // API State
  const [apiAttachments, setApiAttachments] = useState<AttachmentItem[]>([]);
  const { toast } = useToast();

  // Context
  const [searchParams] = useSearchParams();
  const rawPatientId = patientId || searchParams.get('patientId');
  const rawAppointmentId = appointmentId || searchParams.get('appointmentId');

  const effectivePatientId = rawPatientId ? decodeURIComponent(rawPatientId) : '';
  const effectiveAppointmentId = rawAppointmentId ? decodeURIComponent(rawAppointmentId) : '';

  const { hospitalId: storedHospitalId, doctorId: storedDoctorId } = useAuthStore();
  const { isReadOnly: isSubscriptionReadOnly, blockAction } = useSubscriptionReadOnly();
  const hospitalId = storedHospitalId || ""; // Fallback handled by store usually
  // Prefer the appointment's own doctor (passed in by the caller) over the logged-in user's
  // doctor profile — the uploader (front desk/admin) often isn't the treating doctor themselves.
  const doctorId = propDoctorId || storedDoctorId || "";

  // Delete modal state
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ index: number; name: string; id?: string } | null>(null);

  // Returns the fresh list so callers (e.g. the post-upload auto-select) can act on it without
  // waiting a render for the state update to land.
  const fetchAttachments = async (): Promise<AttachmentItem[] | null> => {
    if (!effectiveAppointmentId || !effectivePatientId) return null;
    try {
      const response = await labApi.getAttachments({
        appointmentId: effectiveAppointmentId,
        hospitalId,
        doctorId,
        patientId: effectivePatientId,
      });
      if (response && response.attachments) {
        setApiAttachments(response.attachments);
        return response.attachments;
      }
    } catch (err) {
      console.error("Failed to fetch attachments", err);
    }
    return null;
  };

  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen : internalOpen;
  const setDialogOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
    if (!next) setMobilePreviewOpen(false);
  };

  useEffect(() => {
    fetchAttachments();
  }, [effectiveAppointmentId, effectivePatientId, dialogOpen]); // Refresh when dialog opens

  const hasAttachments = attachments.length > 0;
  const displayPatientName = patientName || 'Unknown patient';
  const displayPatientId = patientId || 'N/A';

  // Derived state for display - prioritize API data
  const displayList: (AttachmentItem | AttachmentFile)[] = apiAttachments.length > 0 ? apiAttachments : []; // If API data exists, use it.

  useEffect(() => {
    if (displayList.length === 0) {
      setViewIndex(0);
      setMobilePreviewOpen(false);
      return;
    }
    setViewIndex(prev => Math.min(prev, displayList.length - 1));
  }, [displayList.length]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const applyPickedFile = (file: File) => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    const newUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(newUrl);
    setFileName(file.name);
    setFileType(file.type);
    setFileUrl(newUrl);
    setSelectedFile(file);
    setError('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError('Please select a file.');
      return;
    }
    applyPickedFile(file);
    // Same file picked twice in a row should still re-trigger onChange next time.
    event.target.value = '';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) applyPickedFile(file);
  };

  const handleAddAttachment = async () => {
    if (!fileName || !fileUrl || !selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    if (!effectiveAppointmentId || !effectivePatientId) {
      setError("Missing appointment or patient context.");
      return;
    }

    if (isSubscriptionReadOnly) { blockAction('Uploading documents'); return; }

    setIsUploading(true);
    try {
      const response = await labApi.uploadAttachment({
        fileName,
        reportType: selectedType,
        hospitalId,
        doctorId,
        patientId: effectivePatientId,
        appointmentId: effectiveAppointmentId,
        notes: "NA",
      }, selectedFile);

      if (response && (response.success || response.message === "Success")) {
        toast({
          title: "Document saved",
          description: "File uploaded successfully.",
        });
        // Auto-select the newest upload so it lands in the preview pane immediately — the user
        // sees exactly what they just saved without hunting for it in the list.
        const fresh = await fetchAttachments();
        if (fresh && fresh.length > 0) setViewIndex(fresh.length - 1);

        // Clear form
        setFileName('');
        setFileType('');
        setFileUrl('');
        setSelectedFile(null);
        setSelectedType(reportTypes[0]);
        setError('');
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Upload error", err);
      setError("An error occurred while uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (globalIndex: number, attName: string, attachmentId?: string) => {
    if (isSubscriptionReadOnly) { blockAction('Deleting documents'); return; }
    setItemToDelete({ index: globalIndex, name: attName, id: attachmentId });
    setDeleteConfirmationOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { index, name, id } = itemToDelete;

    if (id) {
      try {
        const response = await labApi.deleteAttachment(id);
        if (response.success || response.message === "Success") {
          setDeleteConfirmationOpen(false);
          setDeleteSuccessOpen(true);
          setMobilePreviewOpen(false);
          await fetchAttachments();
        } else {
          setDeleteConfirmationOpen(false);
          toast({
            variant: "destructive",
            title: "Delete failed",
            description: response.message || "Could not delete attachment.",
          });
        }
      } catch (err) {
        console.error("Delete error", err);
        setDeleteConfirmationOpen(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "An error occurred while deleting.",
        });
      }
    } else {
      // Local delete
      const next = attachments.filter((_, idx) => idx !== index);
      onChange(next);
      setUploadedFiles(prev => prev.filter(f => f.name !== name));

      if (viewIndex >= next.length) {
        setViewIndex(Math.max(0, next.length - 1));
      }
      setDeleteConfirmationOpen(false);
      setDeleteSuccessOpen(true);
      setMobilePreviewOpen(false);
    }
  };

  const currentAttachmentData = displayList[viewIndex];
  const { name: currentName, url: currentUrl, type: currentType } = unpackAttachment(currentAttachmentData);

  // We need to fetch secure blob for preview call if it's an API url
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadPreview = async () => {
      setPreviewError(null);
      if (!currentUrl) {
        setPreviewUrl(null);
        return;
      }

      setPreviewLoading(true);
      try {
        let url = '';
        if (currentAttachmentData && 'storageUrl' in currentAttachmentData) {
          // API item
          url = await labApi.viewAttachment(currentAttachmentData.storageUrl);
        } else {
          // Local item or already a blob/direct url
          url = currentUrl;
          if (currentUrl && currentUrl.startsWith('http') && !currentUrl.includes('blob')) {
            url = await labApi.viewAttachment(currentUrl);
          }
        }

        if (active) {
          setPreviewUrl(url);
        }
      } catch (err: any) {
        console.error("Failed to load preview", err);
        if (active) {
          setPreviewError(err?.message || "Failed to load preview");
          setPreviewUrl(null);
        }
      } finally {
        if (active) setPreviewLoading(false);
      }
    };
    loadPreview();
    return () => { active = false; };
  }, [currentUrl, currentAttachmentData]);

  const isImagePreview = currentType?.toLowerCase().includes('image')
    || Boolean(previewUrl?.startsWith('blob:'))
    || /\.(png|jpe?g|gif|webp|heic)(\?|$)/i.test(currentName || '');

  const handleView = async (url: string) => {
    try {
      const blobUrl = await labApi.viewAttachment(url);
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('View failed:', error);
      toast({
        variant: "destructive",
        title: "View failed",
        description: "Could not view the file. Opening directly...",
      });
      window.open(url, '_blank');
    }
  };

  // Shared by the desktop right pane and the mobile overlay — the two are never visible at the
  // same time (breakpoint-gated), so one previewUrl/viewIndex state serves both.
  const renderPreviewBody = () => (
    <div className="flex-1 min-h-0 flex items-stretch justify-center overflow-hidden">
      {previewLoading ? (
        <div className="w-full flex items-center justify-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading preview…</span>
        </div>
      ) : previewUrl ? (
        isImagePreview ? (
          <div className="w-full h-full flex items-center justify-center p-3 overflow-auto">
            <img
              src={previewUrl}
              alt={currentName}
              className="max-w-full max-h-full object-contain rounded-md bg-white shadow-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        ) : (
          <iframe
            title={`Preview ${currentName}`}
            src={previewUrl}
            className="w-full h-full bg-white"
          />
        )
      ) : (
        <div className="w-full flex flex-col items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <FileText className="h-6 w-6 opacity-50" />
          <span>Preview not available</span>
          {previewError && <span className="text-red-500">{previewError}</span>}
          {currentUrl && (
            <Button variant="outline" size="sm" className="h-8 mt-2 text-xs" onClick={() => handleView(currentUrl)}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open file
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderPreviewActions = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      {previewUrl && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => window.open(previewUrl, '_blank')}
          title="Open in a new tab"
        >
          <ExternalLink className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Open</span>
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/50"
        onClick={() => handleDeleteClick(viewIndex, currentName, unpackAttachment(currentAttachmentData).id)}
        disabled={isSubscriptionReadOnly}
        title="Delete document"
      >
        <Trash className="h-3.5 w-3.5 sm:mr-1.5" />
        <span className="hidden sm:inline">Delete</span>
      </Button>
    </div>
  );

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger === null ? null : trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              <FileImage className="h-4 w-4 text-gray-500 dark:text-gray-300" />
              <span>Attachments ({displayList.length})</span>
            </div>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add attachment
              </Button>
            </DialogTrigger>
          </div>
          {!hasAttachments && displayList.length === 0 && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">No attachments yet. Click "Add attachment" to upload a report.</div>
          )}
        </div>
      )}

      {/* Master-detail, no tabs: left rail = upload + document list, right pane = always-on live
          preview of the selected document. Fixed dialog height so the panes scroll internally
          rather than the dialog growing/shrinking with content. */}
      <DialogContent className="w-[95vw] sm:w-[960px] max-w-[98vw] h-[88dvh] sm:h-[82vh] max-h-[92dvh] p-0 flex flex-col overflow-hidden gap-0">
        {/* Header — pr-12 clears the dialog's built-in close button. */}
        <div className="shrink-0 px-4 py-3 sm:px-5 pr-12 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <DialogHeader className="p-0 space-y-0.5 text-left">
            <DialogTitle className="text-base text-gray-900 dark:text-gray-100">Documents</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-700 dark:text-gray-200">{displayPatientName}</span>
              <span className="mx-1.5">•</span>
              <span className="font-mono">{displayPatientId}</span>
              <span className="mx-1.5 hidden sm:inline">•</span>
              <span className="hidden sm:inline">{displayList.length} file{displayList.length === 1 ? '' : 's'}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left rail: upload card (fixed) + document list (scrolls). On mobile this rail IS the
              whole body — the preview opens as an overlay instead of a side pane. */}
          <div className="w-full md:w-[320px] lg:w-[340px] shrink-0 md:border-r border-gray-100 dark:border-gray-800 flex flex-col min-h-0">
            <div className="shrink-0 p-3 sm:p-4 space-y-2.5 border-b border-gray-100 dark:border-gray-800">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Document type</Label>
                {/* text-base (16px) on mobile — anything smaller triggers iOS Safari's auto-zoom on focus. */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="h-11 sm:h-10 w-full text-base sm:text-sm border border-gray-300 dark:border-gray-700 rounded-md px-3 bg-white dark:bg-gray-950 focus:border-brand-400 focus:ring-1 focus:ring-brand-100 dark:focus:ring-brand-900 dark:text-gray-100"
                >
                  {reportTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Desktop/iPad: one real drag-and-drop zone (the label itself is the drop target,
                  so every pixel of it is also clickable). Mobile: two explicit buttons — "Take
                  Photo" uses capture="environment" so the camera opens directly in one tap. */}
              <label
                className={`hidden md:flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg py-5 px-3 text-xs font-medium cursor-pointer transition-colors text-center ${isDragging
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                  : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200 hover:border-brand-300 dark:hover:border-brand-500'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Upload className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                <span>{isDragging ? 'Drop to attach' : 'Drag & drop, or click to browse'}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">PDF or image</span>
              </label>

              <div className="flex md:hidden flex-col gap-2">
                <label className="flex flex-row items-center justify-center gap-2 rounded-md py-3.5 px-3 text-sm font-semibold cursor-pointer transition-colors text-center bg-brand-600 text-white hover:bg-brand-700 min-h-[44px]">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Camera className="h-5 w-5 shrink-0" />
                  <span>Take Photo</span>
                </label>
                <label className="flex flex-row items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-md py-3 px-3 text-sm font-medium text-gray-600 dark:text-gray-200 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800 text-center min-h-[44px]">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Upload className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-300" />
                  <span>Choose File</span>
                </label>
              </div>

              {fileName && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-gray-200 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/40 rounded-md px-2 py-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}
              {error && <div className="text-[11px] text-red-600 dark:text-red-400">{error}</div>}

              <Button
                onClick={handleAddAttachment}
                disabled={isSubscriptionReadOnly || isUploading || !selectedFile}
                className="h-11 sm:h-10 text-sm w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Saving…' : 'Save document'}
              </Button>
            </div>

            {/* Document list */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1">
              {displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 text-center py-8 px-4 text-xs text-gray-500 dark:text-gray-400">
                  <FileText className="h-6 w-6 opacity-40" />
                  <span>No documents yet — your first upload will appear here.</span>
                </div>
              ) : (
                displayList.map((att, idx) => {
                  const { name, type, uploadedAt } = unpackAttachment(att);
                  const isSelected = idx === viewIndex;
                  return (
                    <button
                      key={`${name}-${idx}`}
                      type="button"
                      onClick={() => { setViewIndex(idx); setMobilePreviewOpen(true); }}
                      className={`w-full text-left rounded-lg p-2.5 flex items-center gap-2.5 transition-colors min-h-[44px] ${isSelected
                        ? 'bg-brand-50 dark:bg-brand-900/25 border border-brand-200 dark:border-brand-800/60'
                        : 'border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}
                    >
                      <div className={`h-9 w-9 shrink-0 rounded-md flex items-center justify-center ${isSelected ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate" title={name}>{name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {type || '—'} • {formatUploadedAt(uploadedAt)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right pane (md+): always-visible preview of the selected document. */}
          <div className="hidden md:flex flex-1 min-w-0 flex-col bg-gray-50/70 dark:bg-zinc-950/40">
            {displayList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <FileImage className="h-8 w-8 opacity-40" />
                <span>Upload a document to preview it here</span>
              </div>
            ) : (
              <>
                <div className="shrink-0 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={currentName}>{currentName}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{currentType || '—'}</div>
                  </div>
                  {renderPreviewActions()}
                </div>
                {renderPreviewBody()}
              </>
            )}
          </div>
        </div>

        {/* Mobile preview overlay — slides over the whole dialog; back button returns to the list. */}
        {mobilePreviewOpen && currentAttachmentData && (
          <div className="absolute inset-0 z-20 bg-white dark:bg-gray-900 flex flex-col md:hidden">
            <div className="shrink-0 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMobilePreviewOpen(false)}
                aria-label="Back to documents"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={currentName}>{currentName}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">{currentType || '—'}</div>
              </div>
              {renderPreviewActions()}
            </div>
            {renderPreviewBody()}
          </div>
        )}
      </DialogContent>

      <AlertDialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the attachment
              {itemToDelete?.name ? <span className="font-semibold text-gray-900 dark:text-gray-100"> "{itemToDelete.name}"</span> : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteSuccessOpen} onOpenChange={setDeleteSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDialogTitle>Deleted Successfully</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              The attachment has been successfully removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDeleteSuccessOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default AttachmentsSection;
