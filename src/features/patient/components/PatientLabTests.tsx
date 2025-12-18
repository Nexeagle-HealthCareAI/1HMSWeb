import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileImage, Plus, Eye, Upload, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Trash } from "lucide-react";

interface PatientLabTestsProps {
  attachments?: string[];
  onChange?: (next: string[]) => void;
  patientId?: string;
  patientName?: string;
}

type AttachmentFile = {
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
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

const PatientLabTests: React.FC<PatientLabTestsProps> = ({ attachments = [], onChange = () => {}, patientId, patientName }) => {
  const [selectedType, setSelectedType] = useState(reportTypes[0]);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [error, setError] = useState("");
  const [viewIndex, setViewIndex] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<AttachmentFile[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const objectUrlsRef = useRef<string[]>([]);

  const hasAttachments = attachments.length > 0;
  const displayPatientName = patientName || "Unknown patient";
  const displayPatientId = patientId || "N/A";

  useEffect(() => {
    if (attachments.length === 0) {
      setViewIndex(0);
      return;
    }
    setViewIndex(prev => Math.min(prev, attachments.length - 1));
  }, [attachments.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(attachments.length / pageSize));
    setPage(prev => Math.min(prev, totalPages));
  }, [attachments.length, pageSize]);

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

  const handleAddAttachment = () => {
    if (!fileName || !fileUrl) {
      setError("Please select a file to upload.");
      return;
    }

    const displayName = `${selectedType}: ${fileName}`;
    onChange([...attachments, displayName]);
    setUploadedFiles(prev => [
      ...prev,
      {
        name: fileName,
        type: fileType || "Unknown",
        url: fileUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "You"
      }
    ]);

    setFileName("");
    setFileType("");
    setFileUrl("");
    setSelectedType(reportTypes[0]);
    setError("");
  };

  const handleDeleteAttachment = (globalIndex: number, attName: string) => {
    const next = attachments.filter((_, idx) => idx !== globalIndex);
    onChange(next);
    setUploadedFiles(prev => prev.filter(f => f.name !== attName));
    const totalPages = Math.max(1, Math.ceil(next.length / pageSize));
    setPage(prev => Math.min(prev, totalPages));
    if (viewIndex >= next.length) {
      setViewIndex(Math.max(0, next.length - 1));
    }
  };

  const currentAttachment = attachments[viewIndex];
  const currentAttachmentName = currentAttachment?.includes(":") ? currentAttachment.split(":").slice(1).join(":").trim() : currentAttachment;
  const currentPreview = uploadedFiles.find(f => f.name === currentAttachmentName);

  const renderUploadTable = () => {
    const totalPages = Math.max(1, Math.ceil(attachments.length / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedAttachments = attachments.slice(start, end);

    return (
      <div className="rounded-lg border border-blue-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Uploaded files</div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400">Page {page} of {totalPages} • Total: {attachments.length}</div>
        </div>
        <div className="overflow-auto max-h-[360px] border border-gray-100 dark:border-slate-800 rounded-md">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">S.No</th>
                <th className="px-3 py-2 text-left font-semibold">File name</th>
                <th className="px-3 py-2 text-left font-semibold">Uploaded at</th>
                <th className="px-3 py-2 text-left font-semibold">Uploaded by</th>
                <th className="px-3 py-2 text-left font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {pagedAttachments.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500 dark:text-slate-400" colSpan={5}>No files yet</td>
                </tr>
              )}
              {pagedAttachments.map((att, idx) => {
                const attName = att.includes(":") ? att.split(":").slice(1).join(":").trim() : att;
                const meta = uploadedFiles.find(f => f.name === attName);
                const href = meta?.url;
                return (
                  <tr key={`${att}-${start + idx}`} className="odd:bg-white even:bg-gray-50 dark:odd:bg-slate-900 dark:even:bg-slate-800 text-gray-800 dark:text-slate-100">
                    <td className="px-3 py-2 align-top">{start + idx + 1}</td>
                    <td className="px-3 py-2 align-top">
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-[12px] text-blue-700 dark:text-blue-300 hover:underline" title={att}>
                          {att}
                        </a>
                      ) : (
                        <div className="font-semibold text-[12px]" title={att}>{att}</div>
                      )}
                      <div className="text-[11px] text-gray-500 dark:text-slate-400">{meta?.type || "•"}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-gray-700 dark:text-slate-300">
                      {meta?.uploadedAt ? new Date(meta.uploadedAt).toLocaleString() : "•"}
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-gray-700 dark:text-slate-300">{meta?.uploadedBy || "•"}</td>
                    <td className="px-3 py-2 align-top text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-gray-500 dark:text-slate-300 hover:text-red-600"
                        onClick={() => handleDeleteAttachment(start + idx, attName)}
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
        {attachments.length > pageSize && (
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
                    className={`min-w-[32px] rounded px-2 py-1 text-xs font-medium ${
                      isActive ? "bg-primary text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-50"
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
        )}
      </div>
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
                      className="h-10 text-sm border border-gray-300 dark:border-slate-600 rounded-md px-3 bg-white dark:bg-slate-900 dark:text-slate-100 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 dark:focus:border-blue-500 dark:focus:ring-blue-900/50"
                  >
                    {reportTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs text-gray-600 dark:text-slate-300">Upload file</Label>
                    <label className="border-2 border-dashed border-gray-300 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-400 rounded-md p-4 flex flex-col items-center gap-2 text-sm text-gray-600 dark:text-slate-200 cursor-pointer transition-colors bg-gray-50 dark:bg-slate-900">
                    <input
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
            {!hasAttachments && (
              <div className="text-sm text-gray-600 dark:text-slate-300">No attachments yet. Upload a report to view it here.</div>
            )}
            {hasAttachments && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-700 dark:text-slate-200">Attachment {viewIndex + 1} of {attachments.length}</div>
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
                      onClick={() => setViewIndex((idx) => Math.min(attachments.length - 1, idx + 1))}
                      disabled={viewIndex >= attachments.length - 1}
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
                      <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">{currentAttachment}</div>
                      {currentPreview?.url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => window.open(currentPreview.url, "_blank")}
                        >
                          Full screen
                        </Button>
                      )}
                    </div>
                    {currentPreview && currentPreview.type.startsWith("image/") && (
                      <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                        <img
                          src={currentPreview.url}
                          alt={currentAttachmentName}
                          className="w-full max-h-[360px] object-contain bg-white"
                        />
                      </div>
                    )}
                    {currentPreview && currentPreview.type === "application/pdf" && (
                      <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-50">
                        <iframe
                          title={`Preview ${currentAttachmentName}`}
                          src={currentPreview.url}
                          className="w-full h-[420px] bg-white"
                        />
                      </div>
                    )}
                    {!currentPreview && (
                      <div className="text-xs text-gray-500 dark:text-slate-300">Preview not available in this demo. Download/view will be wired to backend.</div>
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
                    onClick={() => setViewIndex((idx) => Math.min(attachments.length - 1, idx + 1))}
                    disabled={viewIndex >= attachments.length - 1}
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
  </Card>
  );
};

export default PatientLabTests;
export { PatientLabTests };
