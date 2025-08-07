import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';

// Types
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  content: string;
  message_type: 'internal' | 'sms' | 'email' | 'notification';
  status: 'draft' | 'sent' | 'delivered' | 'read' | 'failed';
  priority: 'low' | 'medium' | 'high';
  scheduled_at?: string;
  sent_at?: string;
  read_at?: string;
  attachments?: MessageAttachment[];
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  recipient?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface CreateMessageRequest {
  recipient_id: string;
  subject: string;
  content: string;
  message_type: 'internal' | 'sms' | 'email' | 'notification';
  priority?: 'low' | 'medium' | 'high';
  scheduled_at?: string;
  attachments?: File[];
}

export interface UpdateMessageRequest {
  subject?: string;
  content?: string;
  priority?: 'low' | 'medium' | 'high';
  scheduled_at?: string;
}

export interface MessageFilters {
  message_type?: string;
  status?: string;
  priority?: string;
  sender_id?: string;
  recipient_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BulkMessageRequest {
  recipient_ids: string[];
  subject: string;
  content: string;
  message_type: 'internal' | 'sms' | 'email' | 'notification';
  priority?: 'low' | 'medium' | 'high';
  scheduled_at?: string;
  template_id?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  message_type: 'internal' | 'sms' | 'email' | 'notification';
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateRequest {
  name: string;
  subject: string;
  content: string;
  message_type: 'internal' | 'sms' | 'email' | 'notification';
  variables: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  subject?: string;
  content?: string;
  message_type?: 'internal' | 'sms' | 'email' | 'notification';
  variables?: string[];
  is_active?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface MessageStats {
  total_messages: number;
  sent_messages: number;
  delivered_messages: number;
  failed_messages: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
}

// Messaging API service
export const messagingApi = {
  // Get all messages with pagination and filters
  getAll: (filters?: MessageFilters): Promise<PaginatedResponse<Message>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/messages?${params.toString()}`);
  },

  // Get message by ID
  getById: (id: string): Promise<ApiResponse<Message>> => {
    return apiClient.get(`/messages/${id}`);
  },

  // Create new message
  create: (data: CreateMessageRequest): Promise<ApiResponse<Message>> => {
    const formData = new FormData();
    formData.append('recipient_id', data.recipient_id);
    formData.append('subject', data.subject);
    formData.append('content', data.content);
    formData.append('message_type', data.message_type);
    if (data.priority) formData.append('priority', data.priority);
    if (data.scheduled_at) formData.append('scheduled_at', data.scheduled_at);
    if (data.attachments) {
      data.attachments.forEach(file => {
        formData.append('attachments[]', file);
      });
    }
    return apiClient.upload('/messages', formData);
  },

  // Update message
  update: (id: string, data: UpdateMessageRequest): Promise<ApiResponse<Message>> => {
    return apiClient.put(`/messages/${id}`, data);
  },

  // Delete message
  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/messages/${id}`);
  },

  // Send message immediately
  send: (id: string): Promise<ApiResponse<Message>> => {
    return apiClient.post(`/messages/${id}/send`);
  },

  // Mark message as read
  markAsRead: (id: string): Promise<ApiResponse<Message>> => {
    return apiClient.patch(`/messages/${id}/read`);
  },

  // Get inbox messages
  getInbox: (filters?: MessageFilters): Promise<PaginatedResponse<Message>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/messages/inbox?${params.toString()}`);
  },

  // Get sent messages
  getSent: (filters?: MessageFilters): Promise<PaginatedResponse<Message>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/messages/sent?${params.toString()}`);
  },

  // Get draft messages
  getDrafts: (filters?: MessageFilters): Promise<PaginatedResponse<Message>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/messages/drafts?${params.toString()}`);
  },

  // Get conversations
  getConversations: (): Promise<ApiResponse<Conversation[]>> => {
    return apiClient.get('/messages/conversations');
  },

  // Get conversation messages
  getConversationMessages: (conversationId: string): Promise<ApiResponse<Message[]>> => {
    return apiClient.get(`/messages/conversations/${conversationId}`);
  },

  // Send bulk messages
  sendBulk: (data: BulkMessageRequest): Promise<ApiResponse<{ message: string; sent_count: number; failed_count: number }>> => {
    return apiClient.post('/messages/bulk', data);
  },

  // Get message templates
  getTemplates: (): Promise<ApiResponse<MessageTemplate[]>> => {
    return apiClient.get('/messages/templates');
  },

  // Get template by ID
  getTemplateById: (id: string): Promise<ApiResponse<MessageTemplate>> => {
    return apiClient.get(`/messages/templates/${id}`);
  },

  // Create template
  createTemplate: (data: CreateTemplateRequest): Promise<ApiResponse<MessageTemplate>> => {
    return apiClient.post('/messages/templates', data);
  },

  // Update template
  updateTemplate: (id: string, data: UpdateTemplateRequest): Promise<ApiResponse<MessageTemplate>> => {
    return apiClient.put(`/messages/templates/${id}`, data);
  },

  // Delete template
  deleteTemplate: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/messages/templates/${id}`);
  },

  // Get message statistics
  getStats: (dateFrom?: string, dateTo?: string): Promise<ApiResponse<MessageStats>> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    return apiClient.get(`/messages/stats?${params.toString()}`);
  },

  // Search messages
  search: (query: string): Promise<ApiResponse<Message[]>> => {
    return apiClient.get(`/messages/search?q=${encodeURIComponent(query)}`);
  },

  // Export messages
  exportMessages: (filters?: MessageFilters): Promise<void> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.download(`/messages/export?${params.toString()}`, 'messages.csv');
  },

  // Resend failed message
  resend: (id: string): Promise<ApiResponse<Message>> => {
    return apiClient.post(`/messages/${id}/resend`);
  },

  // Cancel scheduled message
  cancelScheduled: (id: string): Promise<ApiResponse<Message>> => {
    return apiClient.patch(`/messages/${id}/cancel`);
  },

  // Get unread count
  getUnreadCount: (): Promise<ApiResponse<{ count: number }>> => {
    return apiClient.get('/messages/unread-count');
  },

  // Mark all as read
  markAllAsRead: (): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.patch('/messages/mark-all-read');
  },

  // Forward message
  forward: (id: string, recipientIds: string[]): Promise<ApiResponse<Message[]>> => {
    return apiClient.post(`/messages/${id}/forward`, { recipient_ids: recipientIds });
  },

  // Reply to message
  reply: (id: string, content: string): Promise<ApiResponse<Message>> => {
    return apiClient.post(`/messages/${id}/reply`, { content });
  },
};
