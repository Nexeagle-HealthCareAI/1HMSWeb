import { useCallback, useEffect, useMemo, useState } from 'react';
import { vitalsApi, type VitalReadingItem } from '../services/vitalsApi';
import { marApi, type MarLineItem } from '../services/marApi';
import { clinicalOrderApi, type ClinicalOrderItem } from '../services/clinicalOrderApi';
import { roundNoteApi, type RoundNoteItem } from '../services/roundNoteApi';
import { fluidEntryApi, type FluidDayTotal } from '../services/fluidEntryApi';
import { glucoseReadingApi, type GlucoseReadingItem } from '../services/glucoseReadingApi';
import { dischargeSummaryApi, type DischargeSummaryDraft } from '../services/dischargeSummaryApi';
import { patientProfileApi } from '@/features/patient/services/patientProfileApi';
import { istDateKey, istDayStartUtc, toIstDate } from '../utils/istDate';
import {
    countDue, countPendingInvestigations, dueNow, fluidForDay, investigationRows, latestReading,
    type DueItem, type InvestigationRow,
} from '../utils/workspaceOverview';

export interface WorkspaceOverviewData {
    loading: boolean;
    latestVitals: VitalReadingItem | null;
    due: DueItem[];
    dueCount: number;
    investigations: InvestigationRow[];
    pendingInvestigations: number;
    latestNote: RoundNoteItem | null;
    fluidToday: FluidDayTotal | null;
    latestGlucose: GlucoseReadingItem | null;
    dischargeDraft: DischargeSummaryDraft | null;
    allergies: string | null;
    reload: () => void;
}

const settled = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === 'fulfilled' ? r.value : fallback);

/**
 * Everything the patient workspace Overview (and the menu's counts) shows, loaded together from
 * the same endpoints the individual panels use. Each part fails on its own: one missing answer
 * leaves that card empty instead of breaking the page.
 */
export const useWorkspaceOverview = (admissionId: string, patientId: string | null | undefined, hospitalId: string): WorkspaceOverviewData => {
    const [loading, setLoading] = useState(true);
    const [vitals, setVitals] = useState<VitalReadingItem[]>([]);
    const [mar, setMar] = useState<MarLineItem[]>([]);
    const [lab, setLab] = useState<ClinicalOrderItem[]>([]);
    const [radiology, setRadiology] = useState<ClinicalOrderItem[]>([]);
    const [notes, setNotes] = useState<RoundNoteItem[]>([]);
    const [fluid, setFluid] = useState<FluidDayTotal[]>([]);
    const [glucose, setGlucose] = useState<GlucoseReadingItem[]>([]);
    const [draft, setDraft] = useState<DischargeSummaryDraft | null>(null);
    const [allergies, setAllergies] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    const reload = useCallback(() => setTick(t => t + 1), []);

    useEffect(() => {
        if (!admissionId || !hospitalId) return;
        let cancelled = false;
        setLoading(true);
        const dayStart = istDayStartUtc(istDateKey(new Date())).toISOString();
        Promise.allSettled([
            vitalsApi.getReadings(admissionId),
            marApi.getGrid(admissionId, dayStart),
            clinicalOrderApi.getOrders(admissionId, 'LAB'),
            clinicalOrderApi.getOrders(admissionId, 'RADIOLOGY'),
            roundNoteApi.getNotes(admissionId),
            fluidEntryApi.getBalance(admissionId),
            glucoseReadingApi.getReadings(admissionId),
            dischargeSummaryApi.getDraft(admissionId),
        ]).then(([v, m, l, r, n, f, g, d]) => {
            if (cancelled) return;
            setVitals(settled(v, []) ?? []);
            setMar(settled(m, []) ?? []);
            setLab(settled(l, []) ?? []);
            setRadiology(settled(r, []) ?? []);
            setNotes(settled(n, []) ?? []);
            setFluid(settled(f, { entries: [], dailyTotals: [] })?.dailyTotals ?? []);
            setGlucose(settled(g, []) ?? []);
            setDraft(settled(d, undefined) ?? null);
        }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [admissionId, hospitalId, tick]);

    // Allergies belong to the patient, not the admission — fetched once.
    useEffect(() => {
        if (!patientId || !hospitalId) return;
        let cancelled = false;
        patientProfileApi.getPatientProfile(hospitalId, patientId)
            .then(p => { if (!cancelled) setAllergies(p?.allergies?.trim() || null); })
            .catch(() => { if (!cancelled) setAllergies(null); });
        return () => { cancelled = true; };
    }, [patientId, hospitalId]);

    return useMemo(() => {
        const due = dueNow(mar);
        const investigations = investigationRows(lab, radiology);
        const byNewest = <T,>(items: T[], at: (x: T) => string) => [...items].sort((a, b) => toIstDate(at(b)).getTime() - toIstDate(at(a)).getTime())[0] ?? null;
        return {
            loading,
            latestVitals: latestReading(vitals),
            due,
            dueCount: countDue(due),
            investigations,
            pendingInvestigations: countPendingInvestigations(investigations),
            latestNote: byNewest(notes.filter(n => !n.isAddendum).length ? notes.filter(n => !n.isAddendum) : notes, n => n.notedAt),
            fluidToday: fluidForDay(fluid, istDateKey(new Date())),
            latestGlucose: byNewest(glucose, g => g.recordedAt),
            dischargeDraft: draft,
            allergies,
            reload,
        };
    }, [loading, vitals, mar, lab, radiology, notes, fluid, glucose, draft, allergies, reload]);
};
