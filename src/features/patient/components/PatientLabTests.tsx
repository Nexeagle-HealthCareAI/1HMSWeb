import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { labApi, AttachmentItem } from "../services/labApi";
import { useAuthStore } from "@/store/authStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileImage, Plus, Eye, Upload, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Trash, XCircle, CheckCircle } from "lucide-react";
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

const PAGE_SIZE = 3;

// Minimal shapes to satisfy upstream callers; UI here only uses attachments.
type LabTestResult = {
  id: string;
  appointmentId: string;
  testName: string;
  testDate: Date;
  orderedBy: string;
  status: "ordered" | "collected" | "completed" | "cancelled";
  results: Array<{
    parameter: string;
    value: string;
    unit: string;
    normalRange: string;
    status: "normal" | "high" | "low" | "critical";
    notes?: string;
  }>;
  notes?: string;
  attachments?: string[];
};

type Appointment = {
  id: string;
  date: Date;
  time: string;
  doctor: string;
  type: string;
};

interface PatientLabTestsProps {
  labTests?: LabTestResult[];
  appointments?: Appointment[];
  attachments?: string[];
  // Report attachments from the patient's past visits (sourced from the timeline) so the tab
  // shows the full report history, not just the current appointment.
  historyAttachments?: AttachmentItem[];
  onChange?: (next: string[]) => void;
  patientId?: string;
  patientName?: string;
  appointmentId?: string;
}

type AttachmentFile = {
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  reportType?: string;
};

const reportTypes = [
  "X-ray report",
  "Lab test report",
  "MRI / CT report",
  "Ultrasound report",
  "ECG report",
  "Discharge summary",
  "Other"
];

const PatientLabTests: React.FC<PatientLabTestsProps> = ({
  attachments = [],
  historyAttachments = [],
  onChange = () => { },
  patientId,
  patientName,
  appointmentId,
}) => {
  const { toast } = useToast();
  // We'll use local state for the full attachment objects from API
  const [apiAttachments, setApiAttachments] = useState<AttachmentItem[]>([]);
  const [selectedType, setSelectedType] = useState(reportTypes[0]);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState("");
  const [viewIndex, setViewIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentFile[]>([]);
  const [page, setPage] = useState(1);

  const objectUrlsRef = useRef<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Delete modal state
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [deleteSuccessOpen, setDeleteSuccessOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ index: number; name: string; id?: string } | null>(null);

  // derived state for carousel and list — merge the patient's past-visit reports (from the timeline)
  // with the current appointment's freshly-fetched attachments (deduped by id; current wins).
  const mergedAttachments = React.useMemo(() => {
    const byId = new Map<string, AttachmentItem>();
    for (const a of historyAttachments) if (a?.attachmentId) byId.set(a.attachmentId, a);
    for (const a of apiAttachments) if (a?.attachmentId) byId.set(a.attachmentId, a);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [historyAttachments, apiAttachments]);

  const displayAttachments = mergedAttachments.length > 0 ? mergedAttachments : uploadedFiles;

  const [searchParams] = useSearchParams();
  const rawPatientId = patientId || searchParams.get('patientId');
  const rawAppointmentId = appointmentId || searchParams.get('appointmentId');

  const effectivePatientId = rawPatientId ? decodeURIComponent(rawPatientId) : undefined;
  const effectiveAppointmentId = rawAppointmentId ? decodeURIComponent(rawAppointmentId) : undefined;

  const hasAttachments = attachments.length > 0;
  const displayPatientName = patientName || "Unknown patient";
  const displayPatientId = effectivePatientId || "N/A";

  useEffect(() => {
    if (displayAttachments.length === 0) {
      setViewIndex(0);
      return;
    }
    setViewIndex(prev => Math.min(prev, displayAttachments.length - 1));
  }, [displayAttachments.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(displayAttachments.length / PAGE_SIZE));
    setPage(prev => Math.min(prev, totalPages));
  }, [displayAttachments.length]);

  const { hospitalId: storedHospitalId, doctorId: storedDoctorId } = useAuthStore();
  const hospitalId = storedHospitalId; // Fallback for dev
  const doctorId = storedDoctorId; // Fallback for dev

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

  useEffect(() => {
    fetchAttachments();
  }, [effectiveAppointmentId, effectivePatientId]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setError("Please select a file.");
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
    setError("");
  };

  const handleAddAttachment = async () => {
    if (!fileName || !fileUrl) {
      setError("Please select a file to upload.");
      return;
    }

    const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("File reference lost. Please select again.");
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
      }, file);

      if (response && (response.success || response.message === "Success")) { // Adjust based on actual API success contract
        toast({
          title: "Attachment saved",
          description: "File uploaded successfully.",
        });
        await fetchAttachments();

        // Clear form
        setFileName("");
        setFileType("");
        setFileUrl("");
        setSelectedType(reportTypes[0]);
        setError("");
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
      // Local delete fallback
      const next = attachments.filter((_, idx) => idx !== index);
      onChange(next);
      setUploadedFiles(prev => prev.filter(f => f.name !== name));

      const totalPages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage(prev => Math.min(prev, totalPages));
      if (viewIndex >= next.length) {
        setViewIndex(Math.max(0, next.length - 1));
      }
      setDeleteConfirmationOpen(false);
      setDeleteSuccessOpen(true);
    }
  };




  const currentAttachmentData = displayAttachments[viewIndex];

  // Fetch secure blob when viewIndex changes
  useEffect(() => {
    let active = true;
    const loadPreview = async () => {
      setPreviewError(null);
      if (!currentAttachmentData) {
        setPreviewUrl(null);
        return;
      }

      setPreviewLoading(true);
      try {
        let url = '';
        if ('storageUrl' in currentAttachmentData) {
          // API item
          console.log('Loading API preview for:', currentAttachmentData.storageUrl);
          url = await labApi.viewAttachment(currentAttachmentData.storageUrl);
        } else {
          // Local item
          url = currentAttachmentData.url;
        }

        if (active) {
          console.log('Preview loaded:', url);
          setPreviewUrl(url);
        }
      } catch (err: any) {
        console.error("Failed to load preview", err);
        if (active) {
          setPreviewUrl(null);
          setPreviewError(err?.message || "Failed to load preview");
        }
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    loadPreview();

    return () => {
      active = false;
      // cleanup if it was a blob created by viewAttachment? 
      // labApi.viewAttachment returns a blob url that we should theoretically revoke, 
      // but since we might be switching fast, we can rely on general cleanup or ref logic.
      // For simplicity we won't revoke immediately here to avoid flickering if re-render happens,
      // but we should ideally track these blobs.
    };
  }, [currentAttachmentData]);

  const currentAttachmentName = currentAttachmentData
    ? ('fileName' in currentAttachmentData ? currentAttachmentData.fileName : currentAttachmentData.name)
    : '';

  const currentAttachmentType = currentAttachmentData
    ? ('reportType' in currentAttachmentData ? currentAttachmentData.reportType : currentAttachmentData.type)
    : '';



  const handleView = async (url: string) => {
    try {
      const blobUrl = await labApi.viewAttachment(url);
      window.open(blobUrl, '_blank');
      // Clean up the blob URL after a delay to ensure the new tab has loaded it
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
    } catch (error) {
      console.error('View failed:', error);
      toast({
        variant: "destructive",
        title: "View failed",
        description: "Could not view the file. Please try again.",
      });
      // Fallback
      window.open(url, '_blank');
    }
  };

  const renderUploadTable = () => {
    const totalPages = Math.max(1, Math.ceil(displayAttachments.length / PAGE_SIZE));
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pagedAttachments = displayAttachments.slice(start, end);

    return (
      <div className="rounded-lg border border-brand-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Uploaded files</div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400">Page {page} of {totalPages} • Total: {displayAttachments.length}</div>
        </div>
        <div className="overflow-auto max-h-[360px] border border-gray-100 dark:border-slate-800 rounded-md">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">S.No</th>
                <th className="px-3 py-2 text-left font-semibold">File name</th>
                <th className="px-3 py-2 text-left font-semibold">Report type</th>
                <th className="px-3 py-2 text-left font-semibold">Uploaded at</th>
                <th className="px-3 py-2 text-left font-semibold">Uploaded by</th>
                <th className="px-3 py-2 text-left font-semibold text-right">Action</th>
              </tr >
            </thead >
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {pagedAttachments.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500 dark:text-slate-400" colSpan={5}>No files yet</td>
                </tr>
              )}
              {pagedAttachments.map((att, idx) => {
                let attName = '';
                let href = '';
                let type = '';
                let uploadedAt = '';
                let uploadedBy = '';
                let id: string | undefined = undefined;

                // Check if it's an API AttachmentItem
                if ('attachmentId' in att || 'storageUrl' in att) {
                  const item = att as AttachmentItem;
                  attName = item.fileName;
                  href = item.storageUrl;
                  type = item.reportType;
                  uploadedAt = item.uploadedAt;
                  uploadedBy = item.uploadedBy;
                  id = item.attachmentId;
                } else {
                  // Assume it's a local AttachmentFile
                  const file = att as AttachmentFile;
                  attName = file.name;
                  href = file.url;
                  type = file.type;
                  uploadedAt = file.uploadedAt;
                  uploadedBy = file.uploadedBy;
                }

                return (
                  <tr key={`${attName}-${start + idx}`} className="odd:bg-white even:bg-gray-50 dark:odd:bg-slate-900 dark:even:bg-slate-800 text-gray-800 dark:text-slate-100">
                    <td className="px-3 py-2 align-top">{start + idx + 1}</td>
                    <td className="px-3 py-2 align-top">
                      {href ? (
                        <div
                          onClick={() => handleView(href)}
                          className="font-semibold text-[12px] text-brand-700 dark:text-brand-300 hover:underline cursor-pointer"
                          title={attName}
                        >
                          {attName}
                        </div>
                      ) : (
                        <div className="font-semibold text-[12px]" title={attName}>{attName}</div>
                      )}
                      <div className="text-[11px] text-gray-500 dark:text-slate-400">{type || "—"}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-gray-700 dark:text-slate-300">
                      {type || "•"}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-gray-700 dark:text-slate-300">
                      {uploadedAt ? new Date(uploadedAt).toLocaleString() : "•"}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-gray-700 dark:text-slate-300">{uploadedBy || "•"}</td>
                    <td className="px-3 py-2 align-top text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 dark:text-slate-300 hover:text-brand-600"
                        onClick={() => handleView(href)}
                        aria-label="View attachment"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 dark:text-slate-300 hover:text-red-600"
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
          </table >
        </div >
        {
          displayAttachments.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-1 text-sm text-gray-600">
              <button
                className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNumber = idx + 1;
                  const isActive = pageNumber === page;
                  return (
                    <button
                      key={pageNumber}
                      className={`min-w-[32px] rounded px-2 py-1 text-xs font-medium ${isActive ? "bg-primary text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              <button
                className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )
        }
      </div >
    );
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <Tabs defaultValue="upload" className="w-full">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <TabsList className="grid grid-cols-2 w-full md:w-auto bg-gray-50 dark:bg-slate-800 p-1 rounded-md self-start md:self-end gap-1">
                <TabsTrigger
                  value="upload"
                  className="text-sm gap-2 px-4 py-2 font-semibold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Upload className="h-4 w-4" /> Upload report
                </TabsTrigger>
                <TabsTrigger
                  value="view"
                  className="text-sm gap-2 px-4 py-2 font-semibold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <Eye className="h-4 w-4" /> View uploaded
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upload" className="pt-1 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 p-4 space-y-3 shadow-sm lg:col-span-1 min-h-[440px]">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600 dark:text-slate-300">Report type</Label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="h-10 text-sm border border-gray-300 dark:border-slate-600 rounded-md px-3 bg-white dark:bg-slate-900 dark:text-slate-100 focus:border-brand-400 focus:ring-1 focus:ring-brand-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/50"
                    >
                      {reportTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600 dark:text-slate-300">Upload file</Label>
                    <label className="border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-brand-300 dark:hover:border-brand-400 rounded-md p-4 flex flex-col items-center gap-2 text-sm text-gray-600 dark:text-slate-200 cursor-pointer transition-colors bg-gray-50 dark:bg-slate-900">
                      <input
                        id="file-upload-input"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Upload className="h-5 w-5 text-gray-500" />
                      <span>Drop a file here or click to browse</span>
                      {fileName && <span className="text-[11px] text-gray-700 dark:text-slate-200">Selected: {fileName}</span>}
                    </label>
                    {error && <div className="text-[11px] text-red-400">{error}</div>}
                  </div>

                  <div className="flex justify-center">
                    <Button onClick={handleAddAttachment} className="h-9 text-sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Save attachment
                    </Button>
                  </div>
                </div>
                <div className="lg:col-span-2">{renderUploadTable()}</div>
              </div>
            </TabsContent>

            <TabsContent value="view" className="pt-1 space-y-3">
              {displayAttachments.length === 0 && (
                <div className="text-sm text-gray-600 dark:text-slate-300">No attachments yet. Upload a report to view it here.</div>
              )}
              {displayAttachments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700 dark:text-slate-200">Attachment {viewIndex + 1} of {displayAttachments.length}</div>
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
                        onClick={() => setViewIndex((idx) => Math.min(displayAttachments.length - 1, idx + 1))}
                        disabled={viewIndex >= displayAttachments.length - 1}
                        className="h-8 text-xs"
                      >
                        Next <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm flex items-start gap-3">
                    <Eye className="h-5 w-5 text-gray-500 dark:text-slate-300 mt-0.5" />
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">{currentAttachmentName}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">{currentAttachmentType}</div>
                        </div>
                        {previewUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => window.open(previewUrl, "_blank")}
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
                        <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50 dark:bg-slate-800">
                          {/* Auto-detect type based on extension or mime if possible, or just try img and iframe */}
                          {/* Auto-detect type based on extension or mime if possible, or just try img and iframe */}
                          {/* For simplicity, we can try to infer from type or just render iframe which handles most */}
                          {currentAttachmentType.toLowerCase().includes('image') || previewUrl.startsWith('blob:') ? (
                            <img
                              src={previewUrl}
                              alt={currentAttachmentName}
                              className="w-full max-h-[50vh] object-contain bg-white"
                              onError={(e) => {
                                // Fallback or hide
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <iframe
                              title={`Preview ${currentAttachmentName}`}
                              src={previewUrl}
                              className="w-full h-[50vh] bg-white"
                            />
                          )}
                        </div>
                      )}
                      {!previewLoading && !previewUrl && (
                        <div className="h-[100px] flex items-center justify-center text-xs text-gray-500 dark:text-slate-300 border border-dashed rounded-md flex-col gap-1">
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
                      onClick={() => setViewIndex((idx) => Math.min(displayAttachments.length - 1, idx + 1))}
                      disabled={viewIndex >= displayAttachments.length - 1}
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
      </CardContent>

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
    </Card>
  );
};

export default PatientLabTests;
export { PatientLabTests };
