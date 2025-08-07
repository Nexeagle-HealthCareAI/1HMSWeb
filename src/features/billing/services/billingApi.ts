import { apiClient, ApiResponse, PaginatedResponse } from '@/services/axiosClient';

// Types
export interface Bill {
  id: string;
  patient_id: string;
  appointment_id?: string;
  bill_number: string;
  amount: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  payment_method?: 'cash' | 'card' | 'insurance' | 'online';
  due_date: string;
  paid_date?: string;
  items: BillItem[];
  notes?: string;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface BillItem {
  id: string;
  bill_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  service_type: 'consultation' | 'procedure' | 'medication' | 'test' | 'other';
}

export interface CreateBillRequest {
  patient_id: string;
  appointment_id?: string;
  due_date: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    service_type: 'consultation' | 'procedure' | 'medication' | 'test' | 'other';
  }[];
  notes?: string;
}

export interface UpdateBillRequest {
  due_date?: string;
  items?: {
    description: string;
    quantity: number;
    unit_price: number;
    service_type: 'consultation' | 'procedure' | 'medication' | 'test' | 'other';
  }[];
  notes?: string;
}

export interface BillFilters {
  patient_id?: string;
  status?: string;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
  page?: number;
  limit?: number;
  search?: string;
}

export interface Payment {
  id: string;
  bill_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'insurance' | 'online';
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentRequest {
  bill_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'insurance' | 'online';
  transaction_id?: string;
  notes?: string;
}

export interface InsuranceClaim {
  id: string;
  bill_id: string;
  patient_id: string;
  insurance_provider: string;
  policy_number: string;
  claim_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  submitted_date: string;
  processed_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInsuranceClaimRequest {
  bill_id: string;
  insurance_provider: string;
  policy_number: string;
  claim_amount: number;
  notes?: string;
}

export interface BillingStats {
  total_bills: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  by_status: Record<string, number>;
  by_payment_method: Record<string, number>;
  monthly_revenue: {
    month: string;
    amount: number;
  }[];
}

export interface BillingConfiguration {
  id: string;
  tax_rate: number;
  currency: string;
  payment_terms: number; // days
  late_fee_rate: number;
  discount_policies: {
    type: 'percentage' | 'fixed';
    value: number;
    conditions: string;
  }[];
  service_rates: {
    consultation: number;
    procedure: number;
    medication: number;
    test: number;
  };
}

// Billing API service
export const billingApi = {
  // Get all bills with pagination and filters
  getAll: (filters?: BillFilters): Promise<PaginatedResponse<Bill>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/bills?${params.toString()}`);
  },

  // Get bill by ID
  getById: (id: string): Promise<ApiResponse<Bill>> => {
    return apiClient.get(`/bills/${id}`);
  },

  // Create new bill
  create: (data: CreateBillRequest): Promise<ApiResponse<Bill>> => {
    return apiClient.post('/bills', data);
  },

  // Update bill
  update: (id: string, data: UpdateBillRequest): Promise<ApiResponse<Bill>> => {
    return apiClient.put(`/bills/${id}`, data);
  },

  // Delete bill
  delete: (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/bills/${id}`);
  },

  // Get bills for a specific patient
  getByPatient: (patientId: string): Promise<ApiResponse<Bill[]>> => {
    return apiClient.get(`/bills/patient/${patientId}`);
  },

  // Get bills for a specific appointment
  getByAppointment: (appointmentId: string): Promise<ApiResponse<Bill[]>> => {
    return apiClient.get(`/bills/appointment/${appointmentId}`);
  },

  // Update bill status
  updateStatus: (id: string, status: Bill['status']): Promise<ApiResponse<Bill>> => {
    return apiClient.patch(`/bills/${id}/status`, { status });
  },

  // Record payment
  recordPayment: (data: CreatePaymentRequest): Promise<ApiResponse<Payment>> => {
    return apiClient.post('/bills/payments', data);
  },

  // Get payments for a bill
  getPayments: (billId: string): Promise<ApiResponse<Payment[]>> => {
    return apiClient.get(`/bills/${billId}/payments`);
  },

  // Create insurance claim
  createInsuranceClaim: (data: CreateInsuranceClaimRequest): Promise<ApiResponse<InsuranceClaim>> => {
    return apiClient.post('/bills/insurance-claims', data);
  },

  // Get insurance claims
  getInsuranceClaims: (filters?: any): Promise<PaginatedResponse<InsuranceClaim>> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.get(`/bills/insurance-claims?${params.toString()}`);
  },

  // Update insurance claim status
  updateInsuranceClaimStatus: (id: string, status: InsuranceClaim['status']): Promise<ApiResponse<InsuranceClaim>> => {
    return apiClient.patch(`/bills/insurance-claims/${id}/status`, { status });
  },

  // Get billing statistics
  getStats: (dateFrom?: string, dateTo?: string): Promise<ApiResponse<BillingStats>> => {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    return apiClient.get(`/bills/stats?${params.toString()}`);
  },

  // Get billing configuration
  getConfiguration: (): Promise<ApiResponse<BillingConfiguration>> => {
    return apiClient.get('/bills/configuration');
  },

  // Update billing configuration
  updateConfiguration: (data: Partial<BillingConfiguration>): Promise<ApiResponse<BillingConfiguration>> => {
    return apiClient.put('/bills/configuration', data);
  },

  // Generate bill PDF
  generatePDF: (id: string): Promise<void> => {
    return apiClient.download(`/bills/${id}/pdf`, `bill-${id}.pdf`);
  },

  // Send bill to patient
  sendBill: (id: string, email?: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post(`/bills/${id}/send`, { email });
  },

  // Send payment reminder
  sendPaymentReminder: (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post(`/bills/${id}/send-reminder`);
  },

  // Bulk send payment reminders
  sendBulkReminders: (billIds: string[]): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/bills/bulk-reminders', { bill_ids: billIds });
  },

  // Export bills
  exportBills: (filters?: BillFilters): Promise<void> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    return apiClient.download(`/bills/export?${params.toString()}`, 'bills.csv');
  },

  // Get overdue bills
  getOverdueBills: (): Promise<ApiResponse<Bill[]>> => {
    return apiClient.get('/bills/overdue');
  },

  // Apply discount
  applyDiscount: (id: string, discountAmount: number, reason?: string): Promise<ApiResponse<Bill>> => {
    return apiClient.patch(`/bills/${id}/discount`, { discount_amount: discountAmount, reason });
  },

  // Process refund
  processRefund: (id: string, refundAmount: number, reason: string): Promise<ApiResponse<Payment>> => {
    return apiClient.post(`/bills/${id}/refund`, { refund_amount: refundAmount, reason });
  },

  // Get financial reports
  getFinancialReports: (reportType: 'revenue' | 'outstanding' | 'collections', dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();
    params.append('type', reportType);
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    return apiClient.get(`/bills/reports?${params.toString()}`);
  },
};
