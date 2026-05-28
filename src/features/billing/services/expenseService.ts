import { apiClient } from '@/services/axiosClient';
import { useAuthStore } from '@/store/authStore';

export type ExpenseStatus = 'PAID' | 'PENDING';
export type ExpensePaymentMode = 'CASH' | 'UPI' | 'BANK' | 'CARD';

export interface ExpenseItem {
    expenseId: string;
    expenseDate: string;
    categoryCode: string;
    vendor?: string | null;
    description?: string | null;
    amount: number;
    paymentMode?: string | null;
    statusCode: string;
    referenceNo?: string | null;
    notes?: string | null;
    updatedAt: string;
    updatedBy?: string | null;
}

export interface GetExpensesResponse {
    items: ExpenseItem[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalAmount: number;
    pendingAmount: number;
    categoryCount: number;
}

export interface UpsertExpenseRequest {
    expenseId?: string;
    expenseDate?: string;       // ISO date
    categoryCode: string;
    vendor?: string;
    description?: string;
    amount: number;
    paymentMode?: string;
    statusCode?: string;
    referenceNo?: string;
    notes?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const expenseService = {
    list: (opts: { fromDate?: string; toDate?: string; category?: string; search?: string; page?: number; pageSize?: number; hospitalId?: string } = {}): Promise<GetExpensesResponse> => {
        const params = new URLSearchParams({ hospitalId: hospitalIdOrThrow(opts.hospitalId) });
        if (opts.fromDate) params.set('fromDate', opts.fromDate);
        if (opts.toDate) params.set('toDate', opts.toDate);
        if (opts.category) params.set('category', opts.category);
        if (opts.search) params.set('search', opts.search);
        params.set('page', String(opts.page ?? 1));
        params.set('pageSize', String(opts.pageSize ?? 100));
        return apiClient.get(`/expenses?${params.toString()}`);
    },

    upsert: (req: UpsertExpenseRequest, hospitalId?: string): Promise<{ expenseId: string; message?: string }> =>
        apiClient.put(`/expenses?hospitalId=${encodeURIComponent(hospitalIdOrThrow(hospitalId))}`, req),

    remove: (expenseId: string, hospitalId?: string): Promise<{ isSuccess: boolean; message?: string }> =>
        apiClient.delete(`/expenses?hospitalId=${encodeURIComponent(hospitalIdOrThrow(hospitalId))}&expenseId=${encodeURIComponent(expenseId)}`),
};
