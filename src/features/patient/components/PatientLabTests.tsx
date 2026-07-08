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
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm h-full flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileImage className="h-4 w-4 text-brand-500" />
              Uploaded Documents
            </h3>
            <p className="text-xs text-slate-500 mt-1">Manage all lab reports and attachments</p>
          </div>
          <div className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {displayAttachments.length} items total
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/30">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 sticky top-0 backdrop-blur-sm">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider">File Details</th>
                <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider hidden sm:table-cell">Uploaded At</th>
                <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wider">Action</th>
              </tr >
            </thead >
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pagedAttachments.length === 0 && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-500" colSpan={3}>
                    <div className="flex flex-col items-center justify-center">
                      <FileImage className="h-10 w-10 text-slate-300 mb-2" />
                      <p>No documents uploaded yet</p>
                    </div>
                  </td>
                </tr>
              )}
              {pagedAttachments.map((att, idx) => {
                let attName = '';
                let href = '';
                let type = '';
                let uploadedAt = '';
                let uploadedBy = '';
                let id: string | undefined = undefined;

                if ('attachmentId' in att || 'storageUrl' in att) {
                  const item = att as AttachmentItem;
                  attName = item.fileName;
                  href = item.storageUrl;
                  type = item.reportType;
                  uploadedAt = item.uploadedAt;
                  uploadedBy = item.uploadedBy;
                  id = item.attachmentId;
                } else {
                  const file = att as AttachmentFile;
                  attName = file.name;
                  href = file.url;
                  type = file.type;
                  uploadedAt = file.uploadedAt;
                  uploadedBy = file.uploadedBy;
                }

                return (
                  <tr key={`${attName}-${start + idx}`} className="group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
                          <FileImage className="h-4 w-4" />
                        </div>
                        <div>
                          {href ? (
                            <div
                              onClick={() => handleView(href)}
                              className="font-medium text-sm text-slate-900 dark:text-slate-100 hover:text-brand-600 cursor-pointer line-clamp-1 transition-colors"
                              title={attName}
                            >
                              {attName}
                            </div>
                          ) : (
                            <div className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-1" title={attName}>{attName}</div>
                          )}
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{type || "Document"}</span>
                            <span className="sm:hidden text-slate-400">• {uploadedAt ? new Date(uploadedAt).toLocaleDateString() : ""}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {uploadedAt ? new Date(uploadedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : "—"}
                      </div>
                      <div className="text-xs text-slate-400">{uploadedBy || "Unknown"}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-slate-700 rounded-lg"
                          onClick={() => handleView(href)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg"
                          onClick={() => handleDeleteClick(start + idx, attName, id)}
                          title="Delete"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table >
        </div >
        {
          displayAttachments.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-2 pt-2 pb-1 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
              <button
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNumber = idx + 1;
                  const isActive = pageNumber === page;
                  return (
                    <button
                      key={pageNumber}
                      className={`min-w-[32px] h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isActive ? "bg-brand-500 text-white shadow-sm scale-110" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      onClick={() => setPage(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              <button
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
      <CardContent className="pt-6 space-y-6">
        <Tabs defaultValue="upload" className="w-full">
          <div className="flex flex-col gap-6">
            <div className="flex justify-center w-full">
              <TabsList className="grid grid-cols-2 w-full max-w-md bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-xl shadow-inner border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-md">
                <TabsTrigger
                  value="upload"
                  className="text-sm gap-2 px-6 py-2.5 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-brand-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-brand-400"
                >
                  <Upload className="h-4 w-4" /> Upload Report
                </TabsTrigger>
                <TabsTrigger
                  value="view"
                  className="text-sm gap-2 px-6 py-2.5 rounded-lg font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-brand-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-brand-400"
                >
                  <Eye className="h-4 w-4" /> View Documents
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="upload" className="animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6 shadow-sm lg:col-span-1 min-h-[440px] flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Document Type</Label>
                      <div className="relative">
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="w-full h-11 appearance-none border border-slate-200 dark:border-slate-700 rounded-xl px-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm"
                        >
                          {reportTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                          <ChevronRight className="h-4 w-4 rotate-90" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Upload File</Label>
                      <label className="relative flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 cursor-pointer bg-slate-50/50 dark:bg-slate-900/50 hover:bg-brand-50/50 dark:hover:bg-brand-900/10 hover:border-brand-400 transition-all group overflow-hidden">
                        <input
                          id="file-upload-input"
                          type="file"
                          accept="application/pdf,image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                          <Upload className="h-6 w-6" />
                        </div>
                        <div className="text-center">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 block">
                            Click to browse or drag file here
                          </span>
                          <span className="text-xs text-slate-500 mt-1 block">
                            Supports PDF, JPG, PNG
                          </span>
                        </div>
                        {fileName && (
                          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 border border-brand-200 dark:border-brand-800 rounded-xl animate-in fade-in duration-200">
                            <FileImage className="h-8 w-8 text-brand-500 mb-2" />
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 text-center line-clamp-2">{fileName}</span>
                            <span className="text-xs text-brand-600 dark:text-brand-400 mt-2 font-medium cursor-pointer hover:underline">Change File</span>
                          </div>
                        )}
                      </label>
                      {error && <div className="text-xs text-red-500 font-medium flex items-center gap-1 mt-2"><XCircle className="h-3 w-3" /> {error}</div>}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                    <Button 
                      onClick={handleAddAttachment} 
                      className="w-full h-11 rounded-xl shadow-md hover:shadow-lg transition-all"
                      disabled={!fileUrl}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Save Document
                    </Button>
                  </div>
                </div>
                <div className="lg:col-span-2">{renderUploadTable()}</div>
              </div>
            </TabsContent>

            <TabsContent value="view" className="animate-in fade-in zoom-in-95 duration-200">
              {displayAttachments.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 min-h-[400px]">
                  <FileImage className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">No Documents Found</h3>
                  <p className="text-sm text-slate-500 max-w-sm mt-2">Upload a report or attachment in the upload tab to view it here.</p>
                </div>
              )}
              {displayAttachments.length > 0 && (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-900 shadow-xl flex flex-col relative group h-[600px]">
                    
                    {/* Top Floating Header */}
                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/60 to-transparent p-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between text-white">
                      <div className="flex items-center gap-3 drop-shadow-md">
                        <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <FileImage className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-base font-semibold line-clamp-1 leading-tight">{currentAttachmentName}</div>
                          <div className="text-xs text-white/80">{currentAttachmentType}</div>
                        </div>
                      </div>
                      {previewUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border-none"
                          onClick={() => window.open(previewUrl, "_blank")}
                        >
                          Open in New Tab
                        </Button>
                      )}
                    </div>

                    {/* Viewer Area */}
                    <div className="flex-1 w-full h-full flex items-center justify-center relative bg-slate-100 dark:bg-slate-900">
                      {previewLoading && (
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="h-8 w-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
                          <span className="text-sm font-medium text-slate-500">Loading document...</span>
                        </div>
                      )}

                      {!previewLoading && previewUrl && (
                        <div className="w-full h-full flex items-center justify-center">
                          {currentAttachmentType.toLowerCase().includes('image') || previewUrl.startsWith('blob:') ? (
                            <img
                              src={previewUrl}
                              alt={currentAttachmentName}
                              className="max-w-full max-h-full object-contain p-2 drop-shadow-lg"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <iframe
                              title={`Preview ${currentAttachmentName}`}
                              src={previewUrl}
                              className="w-full h-full bg-white"
                            />
                          )}
                        </div>
                      )}
                      {!previewLoading && !previewUrl && (
                        <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                          <XCircle className="h-12 w-12 opacity-50" />
                          <span>Preview not available</span>
                          {previewError && <span className="text-red-400 text-sm">{previewError}</span>}
                        </div>
                      )}
                    </div>

                    {/* Left/Right Floating Navigation */}
                    {displayAttachments.length > 1 && (
                      <>
                        <button
                          onClick={() => setViewIndex((idx) => Math.max(0, idx - 1))}
                          disabled={viewIndex === 0}
                          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all disabled:opacity-0 opacity-0 group-hover:opacity-100 disabled:pointer-events-none hover:scale-110 active:scale-95"
                        >
                          <ChevronLeft className="h-6 w-6" />
                        </button>
                        <button
                          onClick={() => setViewIndex((idx) => Math.min(displayAttachments.length - 1, idx + 1))}
                          disabled={viewIndex >= displayAttachments.length - 1}
                          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white flex items-center justify-center transition-all disabled:opacity-0 opacity-0 group-hover:opacity-100 disabled:pointer-events-none hover:scale-110 active:scale-95"
                        >
                          <ChevronRight className="h-6 w-6" />
                        </button>
                      </>
                    )}

                    {/* Bottom Indicator */}
                    <div className="absolute bottom-4 inset-x-0 flex justify-center z-10 pointer-events-none">
                      <div className="bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium text-white shadow-sm">
                        {viewIndex + 1} / {displayAttachments.length}
                      </div>
                    </div>
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
