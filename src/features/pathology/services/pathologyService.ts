import { axiosInstance as api } from '@/services/axiosClient';

export interface LabConfiguration {
  configId?: string;
  hospitalId?: string;
  autoBillOnOrder: boolean;
  defaultReportHeaderBlob?: string;
  defaultReportFooterText?: string;
}

export interface CreatePathologyOrderRequest {
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  orderedByDoctorId?: string;
  notes?: string;
  testIds: string[];
}

export interface CreatePathologyOrderResponse {
  success: boolean;
  message?: string;
  orderId?: string;
  orderNo?: string;
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
  result?: PathologyResultDto;
}

export interface PathologyOrderDto {
  orderId: string;
  orderNo: string;
  orderDate: string;
  status: string;
  patientId: string;
  patientName: string;
  patientAgeYears?: number;
  patientGender?: string;
  lines: PathologyOrderLineDto[];
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
  sampleType?: string;
  containerType?: string;
  parameterSchemaJson?: string;
  defaultTemplateId?: string;
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
  isActive: boolean;
  sortOrder: number;
}

export interface UpdatePathologyTestRequest extends CreatePathologyTestRequest {
  testId: string;
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

  getOrderById: async (hospitalId: string, orderId: string): Promise<PathologyOrderDto> => {
    const response = await api.get<PathologyOrderDto>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}`);
    return response.data;
  },

  enterResult: async (hospitalId: string, orderId: string, orderLineId: string, request: EnterPathologyResultRequest): Promise<boolean> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/lines/${orderLineId}/result`, request);
    return response.data.success;
  },

  generateReport: async (hospitalId: string, orderId: string, request: GeneratePathologyReportRequest): Promise<GeneratePathologyReportResponse> => {
    const response = await api.post<GeneratePathologyReportResponse>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/report`, request);
    return response.data;
  },

  approveReport: async (hospitalId: string, orderId: string, reportId: string): Promise<boolean> => {
    const response = await api.post<{ success: boolean }>(`/api/v1/PathologyOrder/${hospitalId}/${orderId}/report/${reportId}/approve`, {});
    return response.data.success;
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
  }
};
