import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLogItem {
    auditLogId: string;
    action: AuditAction | string;
    entityName: string;
    entityId: string;
    admissionId?: string;
    patientId?: string;
    changes?: string;
    userId?: string;
    userName?: string;
    clientIp?: string;
    createdAt: string;
}

export interface GetAuditLogResponse {
    success: boolean;
    message?: string;
    items: AuditLogItem[];
}

export interface AuditLogQuery {
    admissionId?: string;
    patientId?: string;
    entityName?: string;
    entityId?: string;
    userId?: string;
    action?: AuditAction | string;
    fromUtc?: string;
    toUtc?: string;
    take?: number;
}

const hospitalIdOrThrow = () => {
    const id = useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const auditService = {
    logs: (query: AuditLogQuery): Promise<GetAuditLogResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.AUDIT.LOGS({
            hospitalId: hospitalIdOrThrow(),
            ...query,
        })),
};
