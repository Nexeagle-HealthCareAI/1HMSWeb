#!/usr/bin/env node
// One-shot i18n parity fix. See conversation for context.
const fs = require('fs');
const path = require('path');

const EN_PATH = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en.json');
const HI_PATH = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'hi.json');

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const hi = JSON.parse(fs.readFileSync(HI_PATH, 'utf8'));

function setNested(obj, dotted, value) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object' || Array.isArray(cur[parts[i]])) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}
function deleteNested(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return;
    cur = cur[parts[i]];
  }
  if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
}

// ─── 1. EN additions: 110 code-referenced keys that exist only in HI ────────
const EN_ADDITIONS = {
  // hospitalBranding modal
  'hospitalBranding.modal.headerTitle':       'Complete Hospital Information',
  'hospitalBranding.modal.headerSubtitle':    'Set up your hospital profile to get started',
  'hospitalBranding.modal.steps.basicInfo':   'Basic Information',
  'hospitalBranding.modal.steps.location':    'Location',
  'hospitalBranding.modal.steps.registration':'Registration',
  'hospitalBranding.modal.nextStep':          'Next Step',
  'hospitalBranding.modal.saveAndComplete':   'Save and Complete',
  'hospitalBranding.timeZones.asiaSingapore': 'Asia/Singapore (SGT)',
  'hospitalBranding.toast.successTitle':      'Success!',
  'hospitalBranding.toast.successDescription':'Hospital information saved successfully.',
  'hospitalBranding.toast.errorDescription':  'Failed to save hospital information. Please try again.',

  // errors
  'errors.fileTooLarge':       'File is too large',
  'errors.doctorProfileError': 'Error loading doctor profile',

  // doctorCalendar
  'doctorCalendar.userIdRequired':         'User ID Required',
  'doctorCalendar.userIdRequiredMessage':  'Cannot get user ID. Please log in again.',
  'doctorCalendar.initializingCalendar':   'Initializing calendar...',
  'doctorCalendar.loadingDoctorProfile':   'Loading doctor profile...',
  'doctorCalendar.loadingCalendarConfig':  'Loading calendar configuration...',
  'doctorCalendar.doctorProfileRequired':  'Doctor Profile Required',
  'doctorCalendar.initializingMessage':    'Please wait while we prepare your calendar',
  'doctorCalendar.loadingProfileMessage':  'Please wait while we load your doctor profile',
  'doctorCalendar.loadingConfigMessage':   'Please wait while we load your work schedule configuration',
  'doctorCalendar.profileLoadError':       'Cannot load doctor profile. Please try refreshing the page.',
  'doctorCalendar.retry':                  'Retry',
  'doctorCalendar.preparingCalendar':      'Preparing your calendar...',
  'doctorCalendar.loadingProfile':         'Loading your profile...',
  'doctorCalendar.loadingScheduleConfig':  'Loading your schedule settings...',
  'doctorCalendar.loading':                'Loading...',
  'doctorCalendar.shiftOverrideCanceled':  'Shift override canceled successfully',
  'doctorCalendar.timeOffDeleted':         'Time off deleted successfully',
  'doctorCalendar.error':                  'Error',
  'doctorCalendar.success':                'Success',
  'doctorCalendar.failedToCancelOverride': 'Failed to cancel shift override. Please try again.',
  'doctorCalendar.failedToDeleteTimeOff':  'Failed to delete time off',
  'doctorCalendar.noOverrideData':         'No data found for override',
  'doctorCalendar.noAppointmentData':      'No appointment data found for cancellation',
  'doctorCalendar.invalidEventDate':       'Invalid event date',
  'doctorCalendar.eventMoved':             'Event moved',
  'doctorCalendar.eventResized':           'Event resized',
  'doctorCalendar.clickToManage':          'Click to manage',
  'doctorCalendar.personalized':           'Personalized',

  // appointmentBooking
  'appointmentBooking.noSlotsAvailable': 'No slots available',
  'appointmentBooking.booked':           'Booked',

  // templates
  'templates.standardOPD':                  'Standard OPD',
  'templates.emergencySchedule':            'Emergency Schedule',
  'templates.partTimeSchedule':             'Part-Time Schedule',
  'templates.standardOPDDescription':       'Standard outpatient department schedule',
  'templates.emergencyScheduleDescription': '24/7 emergency department schedule',
  'templates.partTimeScheduleDescription':  'Part-time morning schedule',

  // weeklyTemplates
  'weeklyTemplates.title':                              'Weekly Templates',
  'weeklyTemplates.description':                        'Configure recurring weekly shifts. Only active templates will be applied.',
  'weeklyTemplates.labels.start':                       'Start',
  'weeklyTemplates.labels.end':                         'End',
  'weeklyTemplates.labels.slotMinutes':                 'Slot (minutes)',
  'weeklyTemplates.labels.maxPatients':                 'Max Patients',
  'weeklyTemplates.placeholders.maxPatients':           '∞',
  'weeklyTemplates.actions.reset':                      'Reset',
  'weeklyTemplates.actions.save':                       'Save',
  'weeklyTemplates.actions.saving':                     'Saving...',
  'weeklyTemplates.errors.endAfterStart':               'End time must be after start',
  'weeklyTemplates.errors.slotDurationPositive':        'Slot duration must be greater than 0',
  'weeklyTemplates.errors.maxPatientsPositive':         'Max patient count must be greater than 0',
  'weeklyTemplates.toast.presetAppliedTitle':           'Preset Applied',
  'weeklyTemplates.toast.presetAppliedDescription':     '"{{preset}}" schedule has been applied. Review and save.',
  'weeklyTemplates.toast.dayCopiedTitle':               'Day Copied',
  'weeklyTemplates.toast.dayCopiedDescription':         '{{day}} schedule copied to all other days.',
  'weeklyTemplates.toast.validationTitle':              'Validation Errors',
  'weeklyTemplates.toast.validationDescription':        'Please fix errors before saving.',
  'weeklyTemplates.toast.saveSuccessTitle':             'Templates Saved',
  'weeklyTemplates.toast.saveSuccessDescription':       'Weekly templates updated successfully.',
  'weeklyTemplates.toast.saveFailedTitle':              'Save Failed',
  'weeklyTemplates.toast.saveFailedDescription':        'Failed to save templates. Please try again.',

  // shiftDetails
  'shiftDetails.timeOff':              'Time Off',
  'shiftDetails.timeOffUnknown':       'Date not set',
  'shiftDetails.timeOffSummary':       'Upcoming Time Off',
  'shiftDetails.entries':              'Entries',
  'shiftDetails.timeOffConflictLabel': '(Time Off)',
  'shiftDetails.untitledShift':        'Shift',
  'shiftDetails.customTiming':         'Custom Timing',
  'shiftDetails.shiftOverview':        'Shift Overview',
  'shiftDetails.timeRanges':           'Slots',
  'shiftDetails.slots':                'Slots',
  'shiftDetails.patients':             'Patients',
  'shiftDetails.noTimeRanges':         'No time ranges configured',
  'shiftDetails.defaultShiftNotice':   'This is part of your default schedule and cannot be deleted',
  'shiftDetails.loadingShifts':        'Loading shifts...',
  'shiftDetails.noShiftsScheduled':    'No shifts scheduled',

  // appointmentCancelDialog
  'appointmentCancelDialog.title':                  'Cancel Appointment',
  'appointmentCancelDialog.warningLabel':           'Warning:',
  'appointmentCancelDialog.warningDescription':     'This action cannot be undone. The appointment will be permanently cancelled.',
  'appointmentCancelDialog.patientAgeGender':       '{{age}} years, {{gender}}',
  'appointmentCancelDialog.tokenLabel':             'Token: {{token}}',
  'appointmentCancelDialog.confirmTitle':           'Are you sure you want to cancel this appointment?',
  'appointmentCancelDialog.confirmSubtitle':        'The patient should be notified about the cancellation.',
  'appointmentCancelDialog.actions.keep':           'Keep Appointment',
  'appointmentCancelDialog.actions.confirm':        'Yes, Cancel Appointment',
  'appointmentCancelDialog.actions.pending':        'Cancelling...',
  'appointmentCancelDialog.time.am':                'AM',
  'appointmentCancelDialog.time.pm':                'PM',

  // blockModal
  'blockModal.title':                       'Create Block',
  'blockModal.fields.titleLabel':           'Title',
  'blockModal.fields.titlePlaceholder':     'e.g., Annual leave, Surgery, Meeting',
  'blockModal.fields.blockTypeLabel':       'Block Type',
  'blockModal.fields.blockType.personal':   'Personal',
  'blockModal.fields.startLabel':           'Start Date and Time',
  'blockModal.fields.endLabel':             'End Date and Time',
  'blockModal.fields.durationLabel':        'Block Duration:',
  'blockModal.actions.cancel':              'Cancel',
  'blockModal.actions.create':              'Create Block',
  'blockModal.actions.pending':             'Creating...',
};

// ─── 2. Both-side additions: 5 hospitalTypes called from code, missing in both
const BOTH_ADDITIONS = {
  'hospitalBranding.hospitalTypes.hospital':         { en: 'Hospital',          hi: 'अस्पताल' },
  'hospitalBranding.hospitalTypes.medicalCenter':    { en: 'Medical Center',    hi: 'मेडिकल सेंटर' },
  'hospitalBranding.hospitalTypes.diagnosticCenter': { en: 'Diagnostic Center', hi: 'डायग्नोस्टिक सेंटर' },
  'hospitalBranding.hospitalTypes.dentalClinic':     { en: 'Dental Clinic',     hi: 'डेंटल क्लिनिक' },
  'hospitalBranding.hospitalTypes.eyeClinic':        { en: 'Eye Clinic',        hi: 'आई क्लिनिक' },

  // header.* nav keys — called via t('header.X') from MainLayout, missing in both
  'header.dashboard':              { en: 'Dashboard',           hi: 'डैशबोर्ड' },
  'header.appointments':           { en: 'Appointments',        hi: 'अपॉइंटमेंट' },
  'header.patients':               { en: 'Patients',            hi: 'मरीज़' },
  'header.ipd':                    { en: 'IPD',                 hi: 'आईपीडी' },
  'header.pcpndt':                 { en: 'PCPNDT',              hi: 'पीसीपीएनडीटी' },
  'header.inventory':              { en: 'Inventory',           hi: 'इन्वेंट्री' },
  'header.dayClose':               { en: 'Day Close',           hi: 'दिन समाप्ति' },
  'header.revenue':                { en: 'Revenue',             hi: 'राजस्व' },
  'header.bloodBank':              { en: 'Blood Bank',          hi: 'ब्लड बैंक' },
  'header.mrd':                    { en: 'MRD',                 hi: 'एमआरडी' },
  'header.ipdAnalytics':           { en: 'IPD Ops',             hi: 'आईपीडी ऑप्स' },
  'header.mlc':                    { en: 'MLC',                 hi: 'एमएलसी' },
  'header.equipment':              { en: 'Equipment',           hi: 'उपकरण' },
  'header.triage':                 { en: 'Triage',              hi: 'ट्रायाज' },
  'header.visitors':               { en: 'Visitors',            hi: 'विज़िटर' },
  'header.personalProfile':        { en: 'Personal Profile',    hi: 'व्यक्तिगत प्रोफ़ाइल' },
};

// ─── 3. Deletions: dead nested keys ─────────────────────────────────────────
const EN_DELETIONS = [
  // doctorCalendar.loading.* — code calls these as flat keys (doctorCalendar.loadingX)
  // The nested form is orphaned and causes t('doctorCalendar.loading') to return [object Object]
  'doctorCalendar.loading.initializingCalendar',
  'doctorCalendar.loading.loadingDoctorProfile',
  'doctorCalendar.loading.loadingCalendarConfig',
  'doctorCalendar.loading.preparingCalendar',
  'doctorCalendar.loading.loadingProfile',
  'doctorCalendar.loading.loadingScheduleConfig',
  'doctorCalendar.loading.pleaseWait',
  'doctorCalendar.loading.preparingMessage',
  'doctorCalendar.loading.fetchingProfileMessage',
  'doctorCalendar.loading.loadingScheduleMessage',
];

const HI_DELETIONS = [
  // appointments.status.* sub-keys — not called from anywhere
  'appointments.status.scheduled',
  'appointments.status.confirmed',
  'appointments.status.completed',
  'appointments.status.cancelled',
  'appointments.status.noShow',

  // hospitalBranding.hospitalTypes.*_en / *_hi mess — 4-way naming junk
  'hospitalBranding.hospitalTypes.clinic_en',
  'hospitalBranding.hospitalTypes.polyclinic_en',
  'hospitalBranding.hospitalTypes.nursingHome_en',
  'hospitalBranding.hospitalTypes.generalHospital_en',
  'hospitalBranding.hospitalTypes.multispecialityHospital_en',
  'hospitalBranding.hospitalTypes.superSpecialityHospital_en',
  'hospitalBranding.hospitalTypes.other_en',
  'hospitalBranding.hospitalTypes.Clinic_hi',
  'hospitalBranding.hospitalTypes.Polyclinic_hi',
  'hospitalBranding.hospitalTypes.Nursing Home_hi',
  'hospitalBranding.hospitalTypes.General Hospital_hi',
  'hospitalBranding.hospitalTypes.Multispeciality Hospital_hi',
  'hospitalBranding.hospitalTypes.Super Speciality Hospital_hi',
  'hospitalBranding.hospitalTypes.Other_hi',
];

// ─── Apply ─────────────────────────────────────────────────────────────────
let added = 0, deleted = 0;

for (const [k, v] of Object.entries(EN_ADDITIONS)) {
  setNested(en, k, v);
  added++;
}
for (const [k, both] of Object.entries(BOTH_ADDITIONS)) {
  setNested(en, k, both.en);
  setNested(hi, k, both.hi);
  added += 2;
}
for (const k of EN_DELETIONS) { deleteNested(en, k); deleted++; }
for (const k of HI_DELETIONS) { deleteNested(hi, k); deleted++; }

// Clean up empty parent objects created by deletions
function pruneEmpty(obj) {
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
      pruneEmpty(obj[k]);
      if (Object.keys(obj[k]).length === 0) delete obj[k];
    }
  }
}
pruneEmpty(en);
pruneEmpty(hi);

fs.writeFileSync(EN_PATH, JSON.stringify(en, null, 2) + '\n', 'utf8');
fs.writeFileSync(HI_PATH, JSON.stringify(hi, null, 2) + '\n', 'utf8');

console.log(`Added ${added} keys, deleted ${deleted} keys.`);
