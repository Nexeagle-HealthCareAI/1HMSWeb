import { ipdApiClient } from '@/services/ipdApiClient';
import { IPD_API_ENDPOINTS } from '@/app/api';
import { useAuthStore } from '@/store/authStore';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'DISMISSED' | 'SNOOZED' | 'EXPIRED';

export interface AlertItem {
    alertId: string;
    alertCode: string;
    severity: AlertSeverity | string;
    title: string;
    body?: string;
    patientId?: string;
    admissionId?: string;
    encounterId?: string;
    audienceRoles?: string;
    audienceUserId?: string;
    audienceWardCode?: string;
    status: AlertStatus | string;
    raisedAt: string;
    raisedBy?: string;
    sourceModule?: string;
    dispatchSms: boolean;
    dispatchWhatsApp: boolean;
    dispatchedAt?: string;
    dispatchError?: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    acknowledgeNote?: string;
    dismissedAt?: string;
    dismissedBy?: string;
    dismissReason?: string;
    snoozedUntil?: string;
    payloadJson?: string;
}

export interface GetAlertsResponse {
    success: boolean;
    message?: string;
    items: AlertItem[];
}

export interface GetAlertCountsResponse {
    success: boolean;
    message?: string;
    activeTotal: number;
    activeInfo: number;
    activeWarning: number;
    activeCritical: number;
}

export interface RaiseAlertRequest {
    hospitalId?: string;
    alertCode: string;
    severity?: AlertSeverity | string;
    title: string;
    body?: string;
    patientId?: string;
    admissionId?: string;
    encounterId?: string;
    audienceRoles?: string[];
    audienceUserId?: string;
    audienceWardCode?: string;
    sourceModule?: string;
    sourceRefId?: string;
    dispatchSms?: boolean;
    dispatchWhatsApp?: boolean;
    dispatchInApp?: boolean;
    dispatchToPhone?: string;
    payloadJson?: string;
}

export interface RaiseAlertResponse {
    success: boolean;
    message?: string;
    alertId?: string;
    smsSent?: boolean;
    whatsAppSent?: boolean;
}

export interface AlertActionResponse {
    success: boolean;
    message?: string;
    status?: string;
}

const hospitalIdOrThrow = (override?: string) => {
    const id = override ?? useAuthStore.getState().getHospitalId();
    if (!id) throw new Error('Hospital ID is not available on the current user session.');
    return id;
};

export const alertService = {
    list: (opts?: { status?: string; severity?: string; alertCode?: string; admissionId?: string; audienceUserId?: string; role?: string; fromUtc?: string; toUtc?: string; take?: number; hospitalId?: string }): Promise<GetAlertsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ALERTS.LIST(hospitalIdOrThrow(opts?.hospitalId), opts)),

    counts: (opts?: { audienceUserId?: string; role?: string; hospitalId?: string }): Promise<GetAlertCountsResponse> =>
        ipdApiClient.get(IPD_API_ENDPOINTS.ALERTS.COUNTS(hospitalIdOrThrow(opts?.hospitalId), opts)),

    raise: (req: RaiseAlertRequest): Promise<RaiseAlertResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ALERTS.RAISE, {
            ...req,
            hospitalId: hospitalIdOrThrow(req.hospitalId),
        }),

    acknowledge: (alertId: string, note?: string, hospitalId?: string): Promise<AlertActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ALERTS.ACKNOWLEDGE, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            alertId,
            acknowledgeNote: note,
        }),

    dismiss: (alertId: string, reason?: string, hospitalId?: string): Promise<AlertActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ALERTS.DISMISS, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            alertId,
            dismissReason: reason,
        }),

    snooze: (alertId: string, snoozeUntilUtc: string, hospitalId?: string): Promise<AlertActionResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ALERTS.SNOOZE, {
            hospitalId: hospitalIdOrThrow(hospitalId),
            alertId,
            snoozeUntilUtc,
        }),

    evaluate: (opts?: { depositLowThresholdAmount?: number; consentPendingGraceHours?: number; hospitalId?: string }): Promise<EvaluateResponse> =>
        ipdApiClient.post(IPD_API_ENDPOINTS.ALERTS.EVALUATE, {
            hospitalId: hospitalIdOrThrow(opts?.hospitalId),
            depositLowThresholdAmount: opts?.depositLowThresholdAmount,
            consentPendingGraceHours: opts?.consentPendingGraceHours,
        }),
};

export interface EvaluateResponse {
    success: boolean;
    message?: string;
    admissionsScanned: number;
    alertsRaised: number;
    alertsSkippedDuplicate: number;
    eddBreachRaised: number;
    depositLowRaised: number;
    consentPendingRaised: number;
}
