import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { FileImage, Plus, Eye, Upload, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Trash, XCircle, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
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
  'X-ray report',
  'Lab test report',
  'MRI / CT report',
  'Ultrasound report',
  'ECG report',
  'Discharge summary',
  'Other'
];

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
  const [page, setPage] = useState(1);
  const pageSize = 3;
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
  const hospitalId = storedHospitalId || ""; // Fallback handled by store usually
  // Prefer the appointment's own doctor (passed in by the caller) over the logged-in user's
  // doctor profile — the uploader (front desk/admin) often isn't the treating doctor themselves.
  const doctorId = propDoctorId || storedDoctorId || "";

  // Delete modal state
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ index: number; name: string; id?: string } | null>(null);

  const fetchAttachments = async () => {
    if (!effectiveAppointmentId || !effectivePatientId) return;
    try {
      const response = await labApi.getAttachments({
        appointmentId: effectiveAppointmentId,
        hospitalId,
        doctorId,
        patientId: effectivePatientId,
      });
      if (response && response.attachments) {
        setApiAttachments(response.attachments);
      }
    } catch (err) {
      console.error("Failed to fetch attachments", err);
    }
  };

  const isControlled = controlledOpen !== undefined;
  const dialogOpen = isControlled ? controlledOpen : internalOpen;
  const setDialogOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
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
      return;
    }
    setViewIndex(prev => Math.min(prev, displayList.length - 1));
  }, [displayList.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(displayList.length / pageSize));
    setPage(prev => Math.min(prev, totalPages));
  }, [displayList.length, pageSize]);

  const renderUploadTable = () => {
    const totalPages = Math.max(1, Math.ceil(displayList.length / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedAttachments = displayList.slice(start, end);

    return (
      <div className="rounded-lg border border-brand-100 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Uploaded files</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">Page {page} of {totalPages} • Total: {displayList.length}</div>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {pagedAttachments.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-3">No files yet</div>
          )}
          {pagedAttachments.map((att, idx) => {
            let attName = '';
            let href = '';
            let type = '';
            let uploadedAt = '';
            let uploadedBy = '';
            let id: string | undefined = undefined;

            if ('attachmentId' in att) {
              // AttachmentItem
              attName = att.fileName;
              href = att.storageUrl;
              type = att.reportType;
              uploadedAt = att.uploadedAt;
              uploadedBy = att.uploadedBy;
              id = att.attachmentId;
            } else {
              // AttachmentFile
              attName = att.name;
              href = att.url;
              type = att.type;
              uploadedAt = att.uploadedAt;
              uploadedBy = att.uploadedBy;
            }

            return (
              <div
                key={`${attName}-${start + idx}`}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-850 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-800 dark:text-gray-100">#{start + idx + 1}</span>
                      <span>{type || '—'}</span>
                    </div>
                    {href ? (
                      <div
                        onClick={() => handleView(href)}
                        className="block font-semibold text-[13px] text-brand-700 dark:text-brand-400 hover:underline cursor-pointer"
                        title={attName}
                      >
                        {attName}
                      </div>
                    ) : (
                      <div className="font-semibold text-[13px] text-gray-900 dark:text-gray-100" title={attName}>{attName}</div>
                    )}
                    <div className="text-[11px] text-gray-600 dark:text-gray-300">
                      {uploadedAt ? new Date(uploadedAt).toLocaleString() : '—'}
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-300">{uploadedBy || '—'}</div>
                  </div>
                  {href && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                      onClick={() => handleView(href)}
                      aria-label="View attachment"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    onClick={() => handleDeleteClick(start + idx, attName, id)}
                    aria-label="Delete attachment"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-auto max-h-[360px] border border-gray-100 dark:border-gray-700 rounded-md">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">S.No</th>
                <th className="px-3 py-2 text-left font-semibold">File name</th>
                <th className="px-3 py-2 text-left font-semibold">Uploaded at</th>
                <th className="px-3 py-2 text-left font-semibold">Uploaded by</th>
                <th className="px-3 py-2 text-left font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {pagedAttachments.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500 dark:text-gray-400" colSpan={5}>No files yet</td>
                </tr>
              )}
              {pagedAttachments.map((att, idx) => {
                let attName = '';
                let href = '';
                let type = '';
                let uploadedAt = '';
                let uploadedBy = '';
                let id: string | undefined = undefined;

                if ('attachmentId' in att) {
                  // AttachmentItem
                  attName = att.fileName;
                  href = att.storageUrl;
                  type = att.reportType;
                  uploadedAt = att.uploadedAt;
                  uploadedBy = att.uploadedBy;
                  id = att.attachmentId;
                } else {
                  // AttachmentFile
                  attName = att.name;
                  href = att.url;
                  type = att.type;
                  uploadedAt = att.uploadedAt;
                  uploadedBy = att.uploadedBy;
                }

                return (
                  <tr key={`${attName}-${start + idx}`} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-850 text-gray-800 dark:text-gray-100">
                    <td className="px-3 py-2 align-top">{start + idx + 1}</td>
                    <td className="px-3 py-2 align-top">
                      {href ? (
                        <div
                          onClick={() => handleView(href)}
                          className="font-semibold text-[12px] text-brand-700 dark:text-brand-400 hover:underline cursor-pointer"
                          title={attName}
                        >
                          {attName}
                        </div>
                      ) : (
                        <div className="font-semibold text-[12px]" title={attName}>{attName}</div>
                      )}
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">{type || '—'}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-gray-700 dark:text-gray-300">
                      {uploadedAt ? new Date(uploadedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-gray-700 dark:text-gray-300">{uploadedBy || '—'}</td>
                    <td className="px-3 py-2 align-top text-right">

                      {href && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
                          onClick={() => handleView(href)}
                          aria-label="View attachment"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        onClick={() => handleDeleteClick(start + idx, attName, id)}
                        aria-label="Delete attachment"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {displayList.length > pageSize && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 text-sm text-gray-600 dark:text-gray-300">
            <button
              className="flex items-center justify-center gap-1 rounded border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-600"
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <div className="flex flex-wrap items-center gap-1 justify-center">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                const isActive = pageNumber === page;
                return (
                  <button
                    key={pageNumber}
                    className={`min-w-[32px] rounded px-2 py-1 text-xs font-medium ${isActive
                      ? 'bg-primary text-white'
                      : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            <button
              className="flex items-center justify-center gap-1 rounded border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-400 dark:disabled:text-gray-600"
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError('Please select a file.');
      return;
    }

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

  const handleAddAttachment = async () => {
    if (!fileName || !fileUrl) {
      setError('Please select a file to upload.');
      return;
    }

    // Identify file object - complicated since we only stored URL. 
    // Ideally we should keep the File object. For now, let's grab it from input again 
    // or we need to refactor handleFileChange to store the File.
    // Let's rely on re-selecting or assume we can't upload without the File object.

    // Quick fix: Refactor handleFileChange to store File in state.
    // Since I can't see handleFileChange fully in this chunk, I will assume I need to store it.
    // Checking previous code... handleFileChange creates objectURL but doesn't store File in state explicitly other than closure?
    // Wait, I need to add `selectedFile` state.

    if (!selectedFile) {
      setError('File reference lost. Please select again.');
      return;
    }

    if (!effectiveAppointmentId || !effectivePatientId) {
      setError("Missing appointment or patient context.");
      return;
    }

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
          title: "Attachment saved",
          description: "File uploaded successfully.",
        });
        await fetchAttachments();

        // Clear form
        setFileName('');
        setFileType('');
        setFileUrl('');
        setSelectedFile(null); // Need to add this state
        setSelectedType(reportTypes[0]);
        setError('');
      } else {
        setError("Upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Upload error", err);
      setError("An error occurred while uploading.");
    }
  };

  const handleDeleteClick = (globalIndex: number, attName: string, attachmentId?: string) => {
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

      const totalPages = Math.max(1, Math.ceil(next.length / pageSize));
      setPage(prev => Math.min(prev, totalPages));
      if (viewIndex >= next.length) {
        setViewIndex(Math.max(0, next.length - 1));
      }
      setDeleteConfirmationOpen(false);
      setDeleteSuccessOpen(true);
    }
  };

  const currentAttachmentData = displayList[viewIndex];

  // Helper to get safe name and type regardless of source
  const getAttachmentDetails = (item: any) => {
    if (!item) return { name: '', url: '', type: '' };
    if ('attachmentId' in item) {
      return { name: item.fileName, url: item.storageUrl, type: item.reportType };
    }
    return { name: item.name, url: item.url, type: item.type };
  }

  const { name: currentName, url: currentUrl, type: currentType } = getAttachmentDetails(currentAttachmentData);

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
            // Check if we need to secure fetch it? 
            // If it's internal API base URL, labApi.viewAttachment handles it.
            // If it's strictly local blob, it's fine.
            url = await labApi.viewAttachment(currentUrl);
          }
        }

        if (active) {
          setPreviewUrl(url);
        }
      } catch (err: any) {
        console.error("Failed to load preview", err);
        if (active) {
          // If secure fetch fails, fallback to original url if it's external, or show error
          // setPreviewUrl(currentUrl); 
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


  const handleView = async (url: string) => {
    try {
      const blobUrl = await labApi.viewAttachment(url);
      window.open(blobUrl, '_blank');
      // Revoke handled by caller or timeout, but window.open might need time.
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

      <DialogContent className="w-[95vw] sm:w-[1100px] max-w-[98vw] sm:max-w-6xl h-[85vh] sm:h-[80vh] max-h-[90vh] overflow-hidden">
        <Tabs defaultValue="upload" className="w-full">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <DialogHeader className="p-0 space-y-1">
                <DialogTitle className="text-gray-900 dark:text-gray-100">Manage attachments</DialogTitle>
                <DialogDescription className="text-gray-600 dark:text-gray-400">Upload reports and review existing ones.</DialogDescription>
                <div className="text-xs text-gray-600 dark:text-gray-400">Patient: <span className="font-semibold text-gray-800 dark:text-gray-100">{displayPatientName}</span> • ID: <span className="font-mono">{displayPatientId}</span></div>
              </DialogHeader>
              <TabsList className="grid grid-cols-2 w-full md:w-auto bg-gray-50 dark:bg-gray-800 p-1 rounded-md self-start md:self-end">
                <TabsTrigger value="upload" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm">Upload report</TabsTrigger>
                <TabsTrigger value="view" className="text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm">View uploaded</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upload" className="pt-1 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900 p-4 space-y-3 shadow-sm lg:col-span-1 min-h-[440px]">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600 dark:text-gray-300">Report type</Label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="h-10 text-sm border border-gray-300 dark:border-gray-700 rounded-md px-3 bg-white dark:bg-gray-950 focus:border-brand-400 focus:ring-1 focus:ring-brand-100 dark:focus:ring-brand-900 dark:text-gray-100"
                    >
                      {reportTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600 dark:text-gray-300">Upload file</Label>
                    <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-500 rounded-md p-4 flex flex-col items-center gap-2 text-sm text-gray-600 dark:text-gray-200 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800">
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Upload className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                      <span>Drop a file here or click to browse</span>
                      {fileName && <span className="text-[11px] text-gray-700 dark:text-gray-200">Selected: {fileName}</span>}
                    </label>
                    {error && <div className="text-[11px] text-red-600 dark:text-red-400">{error}</div>}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleAddAttachment} className="h-9 text-sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Save attachment
                    </Button>
                  </div>
                </div>
                <div className="lg:col-span-2 overflow-hidden">{renderUploadTable()}</div>
              </div>
            </TabsContent>

            <TabsContent value="view" className="pt-1 space-y-3">
              {displayList.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">No attachments yet. Upload a report to view it here.</div>
              )}
              {displayList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700 dark:text-gray-300">Attachment {viewIndex + 1} of {displayList.length}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewIndex((idx) => Math.max(0, idx - 1))}
                        disabled={viewIndex === 0}
                        className="h-8 text-xs"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewIndex((idx) => Math.min(displayList.length - 1, idx + 1))}
                        disabled={viewIndex >= displayList.length - 1}
                        className="h-8 text-xs"
                      >
                        Next <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 shadow-sm flex items-start gap-3">
                    <Eye className="h-5 w-5 text-gray-500 dark:text-gray-300 mt-0.5" />
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{currentName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{currentType}</div>
                        </div>
                        {previewUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => window.open(previewUrl, '_blank')}
                          >
                            Full screen
                          </Button>
                        )}
                      </div>

                      {previewLoading && (
                        <div className="h-[50vh] w-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-md">
                          <span className="text-sm text-gray-500">Loading preview...</span>
                        </div>
                      )}

                      {!previewLoading && previewUrl && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800">
                          {/* Auto-detect type based on extension or mime if possible, or just try img and iframe */}
                          {currentType.toLowerCase().includes('image') || previewUrl.startsWith('blob:') ? (
                            <img
                              src={previewUrl}
                              alt={currentName}
                              className="w-full max-h-[50vh] object-contain bg-white"
                              onError={(e) => {
                                // Fallback
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <iframe
                              title={`Preview ${currentName}`}
                              src={previewUrl}
                              className="w-full h-[50vh] bg-white"
                            />
                          )}
                        </div>
                      )}

                      {!previewLoading && !previewUrl && (
                        <div className="h-[100px] flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 border border-dashed rounded-md flex-col gap-1">
                          <span>Preview not available</span>
                          {previewError && <span className="text-red-500">{previewError}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewIndex((idx) => Math.max(0, idx - 1))}
                      disabled={viewIndex === 0}
                      className="h-8 text-xs"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewIndex((idx) => Math.min(displayList.length - 1, idx + 1))}
                      disabled={viewIndex >= displayList.length - 1}
                      className="h-8 text-xs"
                    >
                      Next <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
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
