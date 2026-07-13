export type ChecklistPhaseKey = 'signIn' | 'timeOut' | 'signOut';

// Single source of truth for the WHO Surgical Safety Checklist item text, shared by the
// on-screen step panels (SurgeryCasePanel) and the printable OT record (PrintSurgeryCaseButton)
// so the two never drift out of sync.
export const WHO_CHECKLIST_PHASES: { key: ChecklistPhaseKey; label: string; items: { key: string; label: string }[] }[] = [
    {
        key: 'signIn',
        label: 'Sign-In (before anaesthesia)',
        items: [
            { key: 'identity_site_procedure_consent', label: 'Patient has confirmed identity, site, procedure, and consent' },
            { key: 'site_marked', label: 'Site marked / not applicable' },
            { key: 'anaesthesia_safety_check', label: 'Anaesthesia safety check completed' },
            { key: 'pulse_oximeter', label: 'Pulse oximeter on patient and functioning' },
            { key: 'known_allergy', label: 'Known allergy?' },
            { key: 'difficult_airway_risk', label: 'Difficult airway/aspiration risk? If yes, equipment/assistance available' },
            { key: 'blood_loss_risk', label: 'Risk of >500ml blood loss (7ml/kg in children)? If yes, adequate IV access/fluids planned' },
        ],
    },
    {
        key: 'timeOut',
        label: 'Time-Out (before incision)',
        items: [
            { key: 'team_introduced', label: 'All team members introduced by name and role' },
            { key: 'verbal_confirmation', label: 'Surgeon/anaesthetist/nurse verbally confirm patient, site, procedure' },
            { key: 'critical_events_surgeon', label: 'Anticipated critical events reviewed — surgeon' },
            { key: 'critical_events_anaesthetist', label: 'Anticipated critical events reviewed — anaesthetist' },
            { key: 'critical_events_nursing', label: 'Anticipated critical events reviewed — nursing team' },
            { key: 'antibiotic_prophylaxis', label: 'Antibiotic prophylaxis given within last 60 minutes? / not applicable' },
            { key: 'imaging_displayed', label: 'Essential imaging displayed? / not applicable' },
        ],
    },
    {
        key: 'signOut',
        label: 'Sign-Out (before leaving theatre)',
        items: [
            { key: 'procedure_name_recorded', label: 'Nurse verbally confirms: name of procedure recorded' },
            { key: 'counts_correct', label: 'Instrument, sponge, and needle counts correct / not applicable' },
            { key: 'specimen_labeled', label: 'Specimen labeled correctly, including patient name' },
            { key: 'equipment_problems', label: 'Equipment problems to be addressed identified' },
            { key: 'recovery_concerns_reviewed', label: 'Surgeon/anaesthetist/nurse review key concerns for recovery and management' },
        ],
    },
];
