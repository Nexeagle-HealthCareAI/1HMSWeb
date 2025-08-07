import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';

// Types
export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    tokens_used?: number;
    processing_time?: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  user_id: string;
  model: string;
  created_at: string;
  updated_at: string;
  last_message?: ChatMessage;
  message_count: number;
}

export interface CreateConversationRequest {
  title?: string;
  model?: string;
  initial_message?: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  message: string;
  model?: string;
  context?: {
    patient_id?: string;
    appointment_id?: string;
    medical_context?: string;
  };
}

export interface AIResponse {
  message: string;
  conversation_id: string;
  message_id: string;
  metadata: {
    model: string;
    tokens_used: number;
    processing_time: number;
    confidence_score?: number;
  };
}

export interface DocumentAnalysis {
  id: string;
  document_id: string;
  analysis_type: 'medical_report' | 'prescription' | 'lab_results' | 'general';
  content: string;
  extracted_data: {
    patient_name?: string;
    diagnosis?: string;
    medications?: string[];
    test_results?: Record<string, any>;
    recommendations?: string[];
  };
  confidence_score: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentAnalysisRequest {
  document_id: string;
  analysis_type: 'medical_report' | 'prescription' | 'lab_results' | 'general';
  context?: string;
}

export interface MedicalInsight {
  id: string;
  patient_id?: string;
  insight_type: 'diagnosis_suggestion' | 'treatment_recommendation' | 'risk_assessment' | 'medication_interaction';
  title: string;
  description: string;
  confidence_score: number;
  source_data: string[];
  recommendations: string[];
  created_at: string;
  updated_at: string;
}

export interface GenerateInsightRequest {
  patient_id?: string;
  medical_data: string;
  insight_type: 'diagnosis_suggestion' | 'treatment_recommendation' | 'risk_assessment' | 'medication_interaction';
  context?: string;
}

export interface AIAssistant {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  model: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAssistantRequest {
  name: string;
  description: string;
  capabilities: string[];
  model: string;
}

export interface UpdateAssistantRequest {
  name?: string;
  description?: string;
  capabilities?: string[];
  model?: string;
  is_active?: boolean;
}

export interface AIUsageStats {
  total_conversations: number;
  total_messages: number;
  total_tokens_used: number;
  average_response_time: number;
  by_model: Record<string, {
    conversations: number;
    messages: number;
    tokens_used: number;
  }>;
  daily_usage: {
    date: string;
    conversations: number;
    messages: number;
    tokens_used: number;
  }[];
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  version: string;
  capabilities: string[];
  max_tokens: number;
  cost_per_token: number;
  is_active: boolean;
}

// AI API service
export const aiApi = {
  // Conversations
  // Get all conversations
  getConversations: (filters?: any): Promise<PaginatedResponse<Conversation>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/ai/conversations?${params.toString()}`);
  },

  // Get conversation by ID
  getConversation: (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.get(`/ai/conversations/${id}`);
  },

  // Create new conversation
  createConversation: (data: CreateConversationRequest): Promise<ApiResponse<Conversation>> => {
    return apiClient.post('/ai/conversations', data);
  },

  // Delete conversation
  deleteConversation: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/ai/conversations/${id}`);
  },

  // Get conversation messages
  getConversationMessages: (conversationId: string): Promise<ApiResponse<ChatMessage[]>> => {
    return apiClient.get(`/ai/conversations/${conversationId}/messages`);
  },

  // Send message
  sendMessage: (data: SendMessageRequest): Promise<ApiResponse<AIResponse>> => {
    return apiClient.post('/ai/conversations/send-message', data);
  },

  // Document Analysis
  // Get document analyses
  getDocumentAnalyses: (filters?: any): Promise<PaginatedResponse<DocumentAnalysis>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/ai/document-analyses?${params.toString()}`);
  },

  // Get document analysis by ID
  getDocumentAnalysis: (id: string): Promise<ApiResponse<DocumentAnalysis>> => {
    return apiClient.get(`/ai/document-analyses/${id}`);
  },

  // Create document analysis
  createDocumentAnalysis: (data: CreateDocumentAnalysisRequest): Promise<ApiResponse<DocumentAnalysis>> => {
    return apiClient.post('/ai/document-analyses', data);
  },

  // Delete document analysis
  deleteDocumentAnalysis: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/ai/document-analyses/${id}`);
  },

  // Medical Insights
  // Get medical insights
  getMedicalInsights: (filters?: any): Promise<PaginatedResponse<MedicalInsight>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/ai/medical-insights?${params.toString()}`);
  },

  // Get medical insight by ID
  getMedicalInsight: (id: string): Promise<ApiResponse<MedicalInsight>> => {
    return apiClient.get(`/ai/medical-insights/${id}`);
  },

  // Generate medical insight
  generateInsight: (data: GenerateInsightRequest): Promise<ApiResponse<MedicalInsight>> => {
    return apiClient.post('/ai/medical-insights/generate', data);
  },

  // Delete medical insight
  deleteMedicalInsight: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/ai/medical-insights/${id}`);
  },

  // AI Assistants
  // Get AI assistants
  getAssistants: (): Promise<ApiResponse<AIAssistant[]>> => {
    return apiClient.get('/ai/assistants');
  },

  // Get AI assistant by ID
  getAssistant: (id: string): Promise<ApiResponse<AIAssistant>> => {
    return apiClient.get(`/ai/assistants/${id}`);
  },

  // Create AI assistant
  createAssistant: (data: CreateAssistantRequest): Promise<ApiResponse<AIAssistant>> => {
    return apiClient.post('/ai/assistants', data);
  },

  // Update AI assistant
  updateAssistant: (id: string, data: UpdateAssistantRequest): Promise<ApiResponse<AIAssistant>> => {
    return apiClient.put(`/ai/assistants/${id}`, data);
  },

  // Delete AI assistant
  deleteAssistant: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/ai/assistants/${id}`);
  },

  // AI Models
  // Get available AI models
  getModels: (): Promise<ApiResponse<AIModel[]>> => {
    return apiClient.get('/ai/models');
  },

  // Get AI model by ID
  getModel: (id: string): Promise<ApiResponse<AIModel>> => {
    return apiClient.get(`/ai/models/${id}`);
  },

  // Statistics and Usage
  // Get AI usage statistics
  getUsageStats: (dateFrom?: string, dateTo?: string): Promise<ApiResponse<AIUsageStats>> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    return apiClient.get(`/ai/stats?${params.toString()}`);
  },

  // Search conversations
  searchConversations: (query: string): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.get(`/ai/conversations/search?q=${encodeURIComponent(query)}`);
  },

  // Export conversations
  exportConversations: (filters?: any): Promise<void> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.download(`/ai/conversations/export?${params.toString()}`, 'ai-conversations.csv');
  },

  // Clear conversation history
  clearConversationHistory: (conversationId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.delete(`/ai/conversations/${conversationId}/messages`);
  },

  // Get conversation summary
  getConversationSummary: (conversationId: string): Promise<ApiResponse<{ summary: string }>> => {
    return apiClient.get(`/ai/conversations/${conversationId}/summary`);
  },

  // Generate conversation title
  generateConversationTitle: (conversationId: string): Promise<ApiResponse<{ title: string }>> => {
    return apiClient.post(`/ai/conversations/${conversationId}/generate-title`);
  },

  // Analyze medical text
  analyzeMedicalText: (text: string, analysisType: string): Promise<ApiResponse<{ analysis: string; confidence: number }>> => {
    return apiClient.post('/ai/analyze-medical-text', { text, analysis_type: analysisType });
  },

  // Get AI suggestions for patient
  getPatientSuggestions: (patientId: string): Promise<ApiResponse<MedicalInsight[]>> => {
    return apiClient.get(`/ai/patients/${patientId}/suggestions`);
  },

  // Get AI-powered diagnosis suggestions
  getDiagnosisSuggestions: (symptoms: string[], patientData?: any): Promise<ApiResponse<{ diagnoses: Array<{ condition: string; probability: number; confidence: number }> }>> => {
    return apiClient.post('/ai/diagnosis-suggestions', { symptoms, patient_data: patientData });
  },

  // Get medication interactions
  checkMedicationInteractions: (medications: string[]): Promise<ApiResponse<{ interactions: Array<{ severity: string; description: string; medications: string[] }> }>> => {
    return apiClient.post('/ai/medication-interactions', { medications });
  },
};
