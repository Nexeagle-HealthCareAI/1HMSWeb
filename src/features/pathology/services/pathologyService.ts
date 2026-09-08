import { axiosInstance as api } from '@/services/axiosClient';

export type PathologyLetterheadMode = 'CUSTOM_TEMPLATE' | 'BLANK_PREPRINTED' | 'SYSTEM_DEFAULT';

// GET /public/whatsapp-qr-code's content never varies (see PublicController.cs) -- cached
// module-wide after the first successful fetch so generating several reports in one batch
// (buildAllReportsPdf.ts) doesn't refetch the same bytes per report.
let cachedWhatsAppQrCode: ArrayBuffer | null = null;

export interface LabConfiguration {
  configId?: string;
  hospitalId?: string;
  autoBillOnOrder: boolean;
  defaultReportHeaderBlob?: string;
  defaultReportFooterText?: string;
  letterheadMode: PathologyLetterheadMode;
  // { reportFields: PathologyFieldConfigItem[]; lineFields: PathologyFieldConfigItem[] } --
  // see pathologyFieldLayoutApi.ts for the parsed shape.
  reportFieldLayoutJson?: string;
  // The lab's own identity for its report letterhead -- overrides the hospital's generic
  // name/address/registration number when set; falls back to the Hospital record when blank (see
  // resolvePathologyBranding.ts). TechnicianName has no such fallback anywhere in the system, so
  // it's what PathologyDashboard.tsx gates new-order creation on.
  labName?: string;
  labAddress?: string;
  labRegistrationNumber?: string;
  technicianName?: string;
  pathologistName?: string;
  // Doctor Dekho public listing -- an INDEPENDENT opt-in (doesn't require the hospital itself to be
  // publicly listed for doctor consultations). See GetPublicLabsHandler.cs.
  isPubliclyListed?: boolean;
  publicDescription?: string;
  publicContactPhone?: string;
  publicContactEmail?: string;
  labCity?: string;
  labState?: string;
  labPincode?: string;
  latitude?: number;
  longitude?: number;
  // JSON array of free-text category strings, e.g. ["Hematology","Biochemistry"].
  testCategoriesJson?: string;
}

export interface CreatePathologyOrderRequest {
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  orderedByDoctorId?: string;
  notes?: string;
  testIds: string[];
  sourceType?: 'OPD' | 'IPD' | 'EMERGENCY' | 'WALK_IN';
  isStat?: boolean;
}

export interface CreatePathologyOrderResponse {
  success: boolean;
  message?: string;
  orderId?: string;
  orderNo?: string;
  // Set only when auto-billing was enabled but the charge post failed/was skipped -- the order
  // itself still succeeded, so this is a warning to surface alongside the success toast.
  billingWarning?: string;
}

export interface UpdatePathologyOrderRequest {
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  sourceType?: 'OPD' | 'IPD' | 'EMERGENCY' | 'WALK_IN';
  testIds: string[];
  notes?: string;
  isStat?: boolean;
}

export interface PathologyResultDto {
  resultId: string;
  resultValuesJson: string;
  interpretation?: string;
}

export interface PathologyOrderLineDto {
  orderLineId: string;
  testId: string;
  testName: string;
  testCode: string;
  status: string;
  parameterSchemaJson?: string;
  sampleBarcode?: string | null;
  sampleCollectedAt?: string | null;
  // Outsourcing -- isOutsourced/defaultExternalLabId come from this line's test master; the rest is
  // this line's own send/receive tracking. See ExternalLabActions.tsx.
  isOutsourced: boolean;
  defaultExternalLabId?: string | null;
  externalLabId?: string | null;
  externalLabName?: string | null;
  sentToExternalLabAt?: string | null;
  externalLabRefNo?: string | null;
  externalLabReceivedAt?: string | null;
  externalLabCost?: number | null;
  result?: PathologyResultDto;
  // This line's own report -- each test line gets its own independent report rather than sharing
  // one report for the whole order. Null until a report has been generated for this test.
  report?: PathologyReportDto | null;
}

export interface PathologyOrderDto {
  orderId: string;
  orderNo: string;
  orderDate: string;
  status: string;
  patientId: string;
  patientName: string;
  patientMobile?: string | null;
  patientAgeYears?: number | null;
  patientGender?: string | null;
  // Composed "AddressLine, City, State - Pincode" from the patient's registration -- null when
  // they have no address on file.
  patientAddress?: string | null;
  // Resolved doctor name when this order originated from an OPD prescription or IPD clinical
  // order -- null for walk-in/self orders, which have no referring doctor.
  orderedByDoctorName?: string | null;
  hospitalName?: string | null;
  sourceType?: string | null;
  isStat: boolean;
  // Daily, per-hospital token (resets every day) for the thermal-printed receipt -- separate from
  // orderNo. Null for orders created before this feature shipped.
  tokenNumber?: number | null;
  notes?: string | null;
  // Set when this order was attached to the patient's OPD/IPD billing visit at order time --
  // lets the order-detail view show which invoice this order's charges landed on.
  encounterId?: string | null;
  // Set for an IPD order instead of encounterId -- lets the order-edit flow re-select the same
  // admission by default.
  admissionId?: string | null;
  // Values for the hospital's configured report-level fields -- {key: value}, see
  // pathologyFieldLayoutApi.ts.
  reportFieldValuesJson?: string | null;
  // Dashboard-list-only fields (from getOrders' list query) -- 0/empty on getOrderById's response,
  // which exposes the same information per-line via lines[].report instead.
  testCount: number;
  reportsReadyCount: number;
  testNames: string[];
  lines: PathologyOrderLineDto[];
}

export interface PathologyReportDto {
  reportId: string;
  reportNo: string;
  status: string;
  generatedAt?: string;
  pdfBlobPath?: string;
  pdfSha256?: string;
}

export interface EnterPathologyResultRequest {
  resultValuesJson: string;
  interpretation?: string;
}

export interface PathologyTestMaster {
  testId: string;
  hospitalId: string;
  testCode: string;
  testName: string;
  category?: string;
  chargeId?: string;
  // The linked ChargeMaster's DefaultRate, resolved server-side -- undefined/null when the test has
  // no linked charge (see TestCatalogForm's "Linked Charge" picker).
  price?: number | null;
  sampleType?: string;
  containerType?: string;
  parameterSchemaJson?: string;
  defaultTemplateId?: string;
  isOutsourced: boolean;
  defaultExternalLabId?: string | null;
  costPrice?: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CreatePathologyTestRequest {
  testCode: string;
  testName: string;
  category?: string;
  chargeId?: string;
  sampleType?: string;
  containerType?: string;
  parameterSchemaJson?: string;
  defaultTemplateId?: string;
  isOutsourced?: boolean;
  defaultExternalLabId?: string | null;
  costPrice?: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface UpdatePathologyTestRequest extends CreatePathologyTestRequest {
  testId: string;
}

export interface PathologyReportKeyword {
  keywordId: string;
  testId?: string | null;
  testName?: string | null;
  keyword: string;
  contentJson: string;
  isActive: boolean;
}

export interface UpsertPathologyReportKeywordRequest {
  keywordId?: string;
  testId?: string | null;
  keyword: string;
  contentJson: string;
  isActive: boolean;
}

export interface PathologyExternalLab {
  externalLabId: string;
  labName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  accreditationNo?: string | null;
  isActive: boolean;
}

export interface UpsertPathologyExternalLabRequest {
  externalLabId?: string;
  labName: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  accreditationNo?: string;
  isActive: boolean;
}

export interface PathologyReportTemplate {
  templateId: string;
  hospitalId: string;
  templateCode: string;
  templateName: string;
  headerBlobPath?: string;
  layoutJson: string;
  footerText?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface CreatePathologyReportTemplateRequest {
  templateCode: string;
  templateName: string;
  headerBlobPath?: string;
  layoutJson: string;
  footerText?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface UpdatePathologyReportTemplateRequest extends CreatePathologyReportTemplateRequest {
  templateId: string;
}

export interface UploadPathologyReportTemplateRequest {
  file: File;
  templateId: string;
  hospitalId?: string;
  loggedInUserId: string;
}

export interface UploadPathologyReportTemplateResponse {
  success: boolean;
  message: string;
  url?: string;
}

export interface GeneratePathologyReportRequest {
  templateId?: string;
}

export interface GeneratePathologyReportResponse {
  success: boolean;
  message?: string;
  reportId?: string;
  reportNo?: string;
}

export interface UpdateLabConfigRequest {
  autoBillOnOrder: boolean;
  defaultReportHeaderBlob?: string;
  defaultReportFooterText?: string;
  letterheadMode: PathologyLetterheadMode;
  reportFieldLayoutJson?: string;
  labName?: string;
  labAddress?: string;
  labRegistrationNumber?: string;
  technicianName?: string;
  pathologistName?: string;
  isPubliclyListed?: boolean;
  publicDescription?: string;
  publicContactPhone?: string;
  publicContactEmail?: string;
  labCity?: string;
  labState?: string;
  labPincode?: string;
  latitude?: number;
  longitude?: number;
  testCategoriesJson?: string;
}

export interface PathologyReportReadyDto {
  patientId: string;
  reportId: string;
  reportNo: string;
  orderNo: string;
  generatedAt?: string;
  pdfBlobPath?: string;
  // Which test this report covers -- a patient can have more than one ready report per order now
  // (one per test line), so callers need a way to tell them apart.
  testName?: string | null;
}

export const pathologyService = {
  createOrder: async (hospitalId: string, request: CreatePathologyOrderRequest): Promise<CreatePathologyOrderResponse> => {
    const response = await api.post<CreatePathologyOrderResponse>(`/api/v1/PathologyOrder/${hospitalId}`, request);
    return response.data;
  },

  getOrders: async (hospitalId: string, status?: string): Promise<PathologyOrderDto[]> => {
    const url = status ? `/api/v1/PathologyOrder/${hospitalId}?status=${status}` : `/api/v1/PathologyOrder/${hospitalId}`;
    const response = await api.get<PathologyOrderDto[]>(url);
    return response.data;
  },

  getRecentlyApprovedReports: async (hospitalId: string): Promise<PathologyReportReadyDto[]> => {
    const response = await api.get<PathologyReportReadyDto[]>(`/api/v1/PathologyOrder/${hospitalId}/reports/ready`);
    return response.data;
  },

  getOrderById: async (hospitalId: string, orderId: string): Promise<PathologyOrderDto> => {
    const response = await api.get<PathologyOrderDto>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}`);
    return response.data;
  },

  enterResult: async (hospitalId: string, orderId: string, orderLineId: string, request: EnterPathologyResultRequest): Promise<boolean> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/lines/${orderLineId}/result`, request);
    return response.data.success;
  },

  collectSample: async (hospitalId: string, orderId: string, orderLineId: string, sampleBarcode?: string): Promise<boolean> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/lines/${orderLineId}/collect-sample`, { sampleBarcode });
    return response.data.success;
  },

  sendToExternalLab: async (hospitalId: string, orderId: string, orderLineId: string, externalLabId?: string, externalLabRefNo?: string): Promise<boolean> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/lines/${orderLineId}/send-to-external-lab`, { externalLabId, externalLabRefNo });
    return response.data.success;
  },

  receiveExternalLabResult: async (hospitalId: string, orderId: string, orderLineId: string): Promise<boolean> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/lines/${orderLineId}/receive-external-result`, {});
    return response.data.success;
  },

  saveOrderReportFields: async (hospitalId: string, orderId: string, reportFieldValuesJson: string): Promise<boolean> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/report-fields`, { reportFieldValuesJson });
    return response.data.success;
  },

  updateOrder: async (hospitalId: string, orderId: string, request: UpdatePathologyOrderRequest): Promise<{ success: boolean; message?: string; billingWarning?: string }> => {
    const response = await api.put<{ success: boolean; message?: string; billingWarning?: string }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}`, request);
    return response.data;
  },

  cancelOrder: async (hospitalId: string, orderId: string): Promise<{ success: boolean; message?: string }> => {
    const response = await api.post<{ success: boolean; message?: string }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/cancel`, {});
    return response.data;
  },

  generateReport: async (hospitalId: string, orderId: string, orderLineId: string, request: GeneratePathologyReportRequest): Promise<GeneratePathologyReportResponse> => {
    const response = await api.post<GeneratePathologyReportResponse>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/lines/${orderLineId}/report`, request);
    return response.data;
  },

  uploadReportPdf: async (hospitalId: string, orderId: string, reportId: string, file: Blob): Promise<{ success: boolean; message?: string; url?: string; sha256?: string }> => {
    const formData = new FormData();
    formData.append('File', file, `${reportId}.pdf`);
    const response = await api.post(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/report/${reportId}/pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getTests: async (hospitalId: string, searchTerm?: string, category?: string): Promise<PathologyTestMaster[]> => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('searchTerm', searchTerm);
    if (category) params.append('category', category);

    const response = await api.get<PathologyTestMaster[]>(`/api/v1/PathologyCatalog/${hospitalId}?${params.toString()}`);
    return response.data;
  },

  createTest: async (hospitalId: string, request: CreatePathologyTestRequest): Promise<string> => {
    const response = await api.post<string>(`/api/v1/PathologyCatalog/${hospitalId}`, request);
    return response.data;
  },

  updateTest: async (hospitalId: string, testId: string, request: UpdatePathologyTestRequest): Promise<boolean> => {
    const response = await api.put<boolean>(`/api/v1/PathologyCatalog/${hospitalId}/${testId}`, request);
    return response.data;
  },

  // External Labs
  getExternalLabs: async (hospitalId: string, includeInactive = false): Promise<PathologyExternalLab[]> => {
    const response = await api.get<{ labs: PathologyExternalLab[] }>(`/api/v1/PathologyCatalog/${hospitalId}/external-labs?includeInactive=${includeInactive}`);
    return response.data.labs;
  },

  upsertExternalLab: async (hospitalId: string, request: UpsertPathologyExternalLabRequest): Promise<{ success: boolean; message?: string; externalLabId?: string }> => {
    const response = await api.post<{ success: boolean; message?: string; externalLabId?: string }>(`/api/v1/PathologyCatalog/${hospitalId}/external-labs`, request);
    return response.data;
  },

  // Report Keywords -- omit testId for the management "list everything" view; pass a real testId
  // to get that test's own keywords plus every global one, as OrderResultEntry.tsx needs.
  getReportKeywords: async (hospitalId: string, testId?: string, includeInactive = false): Promise<PathologyReportKeyword[]> => {
    const params = new URLSearchParams();
    if (testId) params.append('testId', testId);
    params.append('includeInactive', String(includeInactive));
    const response = await api.get<{ keywords: PathologyReportKeyword[] }>(`/api/v1/PathologyCatalog/${hospitalId}/report-keywords?${params.toString()}`);
    return response.data.keywords;
  },

  upsertReportKeyword: async (hospitalId: string, request: UpsertPathologyReportKeywordRequest): Promise<{ success: boolean; message?: string; keywordId?: string }> => {
    const response = await api.post<{ success: boolean; message?: string; keywordId?: string }>(`/api/v1/PathologyCatalog/${hospitalId}/report-keywords`, request);
    return response.data;
  },

  // Templates
  getTemplates: async (hospitalId: string): Promise<PathologyReportTemplate[]> => {
    const response = await api.get<PathologyReportTemplate[]>(`/api/v1/PathologyCatalog/${hospitalId}/templates`);
    return response.data;
  },

  createTemplate: async (hospitalId: string, request: CreatePathologyReportTemplateRequest): Promise<string> => {
    const response = await api.post<string>(`/api/v1/PathologyCatalog/${hospitalId}/templates`, request);
    return response.data;
  },

  updateTemplate: async (hospitalId: string, templateId: string, request: UpdatePathologyReportTemplateRequest): Promise<boolean> => {
    const response = await api.put<boolean>(`/api/v1/PathologyCatalog/${hospitalId}/templates/${templateId}`, request);
    return response.data;
  },

  uploadTemplate: async (hospitalId: string, payload: UploadPathologyReportTemplateRequest): Promise<UploadPathologyReportTemplateResponse> => {
    const formData = new FormData();
    formData.append('File', payload.file);
    formData.append('TemplateId', payload.templateId);
    if (payload.hospitalId) {
      formData.append('HospitalId', payload.hospitalId);
    }
    formData.append('LoggedInUserId', payload.loggedInUserId);

    const response = await api.post<UploadPathologyReportTemplateResponse>(`/api/v1/PathologyCatalog/${hospitalId}/templates/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Configuration
  getLabConfig: async (hospitalId: string): Promise<LabConfiguration> => {
    const response = await api.get<LabConfiguration>(`/api/v1/PathologyConfig/${hospitalId}`);
    return response.data;
  },

  updateLabConfig: async (hospitalId: string, request: UpdateLabConfigRequest): Promise<boolean> => {
    const response = await api.put<boolean>(`/api/v1/PathologyConfig/${hospitalId}`, request);
    return response.data;
  },

  // WhatsApp QR (NexEagle logo centered) for the pathology report footer -- routes to the shared,
  // platform-wide WhatsApp bot entry point (same one used elsewhere on NexEagle), not a
  // per-hospital number. See the module-level cache comment above.
  getWhatsAppQrCode: async (): Promise<ArrayBuffer> => {
    if (cachedWhatsAppQrCode) return cachedWhatsAppQrCode;
    const response = await api.get<ArrayBuffer>('/public/whatsapp-qr-code', { responseType: 'arraybuffer' });
    cachedWhatsAppQrCode = response.data;
    return response.data;
  },
};
