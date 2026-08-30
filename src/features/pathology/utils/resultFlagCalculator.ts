// Client-side port of PathologyResultFlagCalculator.cs -- used only for the technician's live
// preview while entering a result (instant color-coded badge, critical banner/beep). The
// persisted flag always comes from the backend's own recomputation in EnterPathologyResultHandler;
// this copy is never trusted for what gets saved.

export type PathologyResultFlag = 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW';

export interface PathologyParameterRange {
  name: string;
  maleMin?: number;
  maleMax?: number;
  femaleMin?: number;
  femaleMax?: number;
  childMin?: number;
  childMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
}

// Matches PathologyResultFlagCalculator's ChildAgeCutoffYears -- 12 is the common Indian
// clinical-lab convention for where the single child band ends.
const CHILD_AGE_CUTOFF_YEARS = 12;

function resolveRange(range: PathologyParameterRange, age?: number, gender?: string): { min?: number; max?: number } {
  const isChild = age !== undefined && age < CHILD_AGE_CUTOFF_YEARS;
  if (isChild && (range.childMin !== undefined || range.childMax !== undefined)) {
    return { min: range.childMin, max: range.childMax };
  }

  const g = gender?.trim().toUpperCase();
  if ((g === 'F' || g === 'FEMALE') && (range.femaleMin !== undefined || range.femaleMax !== undefined)) {
    return { min: range.femaleMin, max: range.femaleMax };
  }
  if ((g === 'M' || g === 'MALE') && (range.maleMin !== undefined || range.maleMax !== undefined)) {
    return { min: range.maleMin, max: range.maleMax };
  }

  if (range.maleMin !== undefined || range.maleMax !== undefined) return { min: range.maleMin, max: range.maleMax };
  if (range.femaleMin !== undefined || range.femaleMax !== undefined) return { min: range.femaleMin, max: range.femaleMax };
  return { min: range.childMin, max: range.childMax };
}

export function calculateResultFlag(
  range: PathologyParameterRange,
  enteredValue: string,
  patientAgeYears?: number,
  patientGender?: string
): PathologyResultFlag {
  const value = Number(enteredValue);
  if (enteredValue.trim() === '' || Number.isNaN(value)) return 'NORMAL';

  if (range.criticalLow !== undefined && value < range.criticalLow) return 'CRITICAL_LOW';
  if (range.criticalHigh !== undefined && value > range.criticalHigh) return 'CRITICAL_HIGH';

  const { min, max } = resolveRange(range, patientAgeYears, patientGender);
  if (min !== undefined && value < min) return 'LOW';
  if (max !== undefined && value > max) return 'HIGH';

  return 'NORMAL';
}
