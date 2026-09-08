// The hospital's pathology report field layout -- two arrangeable lists, mirroring
// prescriptionFieldLayoutApi.ts's / dischargeFieldLayoutApi.ts's shape exactly:
// reportFields fill in once per report (Clinical History, Comments...), lineFields repeat on
// every test line alongside the built-in Interpretation / Notes field. Persisted as one JSON blob
// on LabConfiguration.ReportFieldLayoutJson (hospital-wide, not per-doctor -- a pathology report
// is issued by the lab, not any one doctor).
export type PathologyFieldType = 'builtin' | 'text' | 'paragraph' | 'number' | 'date' | 'boolean' | 'select';

export interface PathologyFieldConfigItem {
  key: string;                    // built-in key (e.g. "interpretation") or "cf_*" for custom
  label: string;                  // display label (overrides the default for built-ins)
  type: PathologyFieldType;
  builtIn: boolean;
  showInPad: boolean;             // shown/editable during result entry
  showInPrint: boolean;           // appears on the generated report
  order: number;
  options?: string[];             // for type = select
}

export interface PathologyReportFieldLayout {
  reportFields: PathologyFieldConfigItem[];
  lineFields: PathologyFieldConfigItem[];
}

// The only built-in -- Interpretation / Notes already existed as its own dedicated
// PathologyResult.Interpretation column/UI; it's represented here so its position, label, and
// print visibility are governed by the same layout as any custom line field, without changing how
// its value is actually saved (OrderResultEntry.tsx still routes it to the dedicated param).
export const DEFAULT_PATHOLOGY_LINE_FIELDS: PathologyFieldConfigItem[] = [
  { key: 'interpretation', label: 'Interpretation / Notes', type: 'builtin', builtIn: true, showInPad: true, showInPrint: true, order: 0 },
];

// Report-level fields are entirely hospital-defined -- there's no pre-existing report-level field
// to preserve, so the default list starts empty.
export const DEFAULT_PATHOLOGY_REPORT_FIELDS: PathologyFieldConfigItem[] = [];

/**
 * Merge a hospital's saved fields over a set of built-in defaults. Built-ins always appear (so a
 * newly added built-in shows up even for a hospital with an older saved layout); saved overrides
 * win; custom ("cf_*") fields are appended. Result is sorted by order. Shared by both the
 * reportFields and lineFields lists.
 */
export function mergeFieldsWithDefaults(
  saved: PathologyFieldConfigItem[] | undefined | null,
  defaults: PathologyFieldConfigItem[],
): PathologyFieldConfigItem[] {
  const savedList = saved ?? [];
  const savedByKey = new Map(savedList.map(f => [f.key, f]));

  const merged: PathologyFieldConfigItem[] = defaults.map(def => {
    const s = savedByKey.get(def.key);
    return s ? { ...def, ...s, key: def.key, builtIn: true, type: 'builtin' as const } : { ...def };
  });

  const knownKeys = new Set(defaults.map(d => d.key));
  savedList.filter(f => !knownKeys.has(f.key) && f.key.startsWith('cf_')).forEach(f => merged.push({ ...f, builtIn: false }));

  return merged.sort((a, b) => a.order - b.order);
}

export function parseReportFieldLayout(reportFieldLayoutJson: string | undefined | null): PathologyReportFieldLayout {
  let saved: { reportFields?: PathologyFieldConfigItem[]; lineFields?: PathologyFieldConfigItem[] } = {};
  try {
    if (reportFieldLayoutJson) saved = JSON.parse(reportFieldLayoutJson) ?? {};
  } catch {
    saved = {};
  }
  return {
    reportFields: mergeFieldsWithDefaults(saved.reportFields, DEFAULT_PATHOLOGY_REPORT_FIELDS),
    lineFields: mergeFieldsWithDefaults(saved.lineFields, DEFAULT_PATHOLOGY_LINE_FIELDS),
  };
}
