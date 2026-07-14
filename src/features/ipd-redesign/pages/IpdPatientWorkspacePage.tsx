import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PatientWorkspace, type Section } from '../screens/PatientWorkspace';
import { admissionApi, type ActiveAdmissionItem } from '../services/admissionApi';

const VALID_SECTIONS: Section[] = [
    'overview', 'admissionDetails', 'cpoe', 'mar', 'nursing', 'roundNotes',
    'sbarHandover', 'consent', 'bloodBank', 'surgery', 'criticalCare', 'discharge',
];

/**
 * Standalone deep-link entry point into the Patient Workspace, reached from screens that are
 * mounted as their own top-level routes rather than living inside IpdWorkflowApp's local view
 * state (e.g. the OT/ICU boards, which navigate here as `/ipd-workspace/patient/:id?tab=surgery`
 * on card click). IpdWorkflowApp itself never reads the URL -- PatientWorkspace there is opened
 * by passing a full ActiveAdmissionItem via local state -- so this page's only job is resolving
 * the :id (an admissionId OR encounterId, matching whichever the calling board passed) into that
 * same object before rendering the real workspace.
 */
const IpdPatientWorkspacePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [admission, setAdmission] = useState<ActiveAdmissionItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) { setError('No patient specified.'); setLoading(false); return; }
        setLoading(true);
        setError(null);
        admissionApi.getActiveAdmissions('ALL')
            .then(list => {
                const found = list.find(a => a.admissionId === id || a.encounterId === id);
                if (!found) { setError('Could not find this admission.'); return; }
                setAdmission(found);
            })
            .catch((e: any) => setError(e?.message ?? 'Could not load this admission.'))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading patient workspace…
            </div>
        );
    }

    if (error || !admission) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3 text-center px-4">
                <AlertCircle className="h-8 w-8 text-rose-500" />
                <p className="text-slate-700 font-semibold">{error ?? 'Admission not found.'}</p>
                <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
            </div>
        );
    }

    const tabParam = searchParams.get('tab');
    const initialSection = (tabParam && (VALID_SECTIONS as string[]).includes(tabParam)) ? (tabParam as Section) : undefined;

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
            <PatientWorkspace
                admission={admission}
                initialSection={initialSection}
                onBack={() => navigate(-1)}
                onChanged={() => {}}
            />
        </div>
    );
};

export default IpdPatientWorkspacePage;
