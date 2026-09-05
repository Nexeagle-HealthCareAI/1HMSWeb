import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { PathologyOrderLineDto, pathologyService } from '../services/pathologyService';
import { calculateResultFlag, resolveRange, PathologyResultFlag } from '../utils/resultFlagCalculator';
import type { PathologyFieldConfigItem } from '../services/pathologyFieldLayoutApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichTextField } from './RichTextField';
import { blocksToHtml, parseKeywordContent, type StyledBlock } from '../utils/richText';
import {
  AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

// Reported to the parent (PathologyOrderDetailPage.tsx) via onSaveStateChange so a single
// page-level status readout/Save button can reflect whichever test-line tab is active, without
// lifting this component's own state up.
export type OrderResultEntrySaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface OrderResultEntryHandle {
  // Saves immediately, bypassing the debounce. Defaults to a user-visible save (toast + parent
  // refresh) -- pass { silent: true } for a background flush (e.g. before switching tabs) that
  // shouldn't announce itself.
  saveNow: (opts?: { silent?: boolean }) => Promise<void>;
}

interface OrderResultEntryProps {
  hospitalId: string;
  orderId: string;
  orderLine: PathologyOrderLineDto;
  patientAgeYears?: number | null;
  patientGender?: string | null;
  // The hospital's configured per-test field layout (Interpretation / Notes + any custom fields
  // it added), in display order -- see PathologyReportFieldLayoutEditor.tsx. Field *definitions*
  // come from here; this component only fills in *values*.
  lineFields: PathologyFieldConfigItem[];
  onSuccess: () => void;
  onSaveStateChange?: (state: OrderResultEntrySaveState) => void;
}

interface TestParam {
  name: string;
  unit?: string;
  defaultValue?: string;
  maleMin?: number;
  maleMax?: number;
  femaleMin?: number;
  femaleMax?: number;
  childMin?: number;
  childMax?: number;
  criticalLow?: number;
  criticalHigh?: number;
  // Legacy pre-Phase-1 shape -- some rows may still only have these.
  min?: number;
  max?: number;
}

// Beeps play through the Web Audio API rather than an audio asset -- no file to manage, and it
// only ever fires for a genuine new critical value (see the ref-tracked edge-trigger below).
function playCriticalBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Best-effort only -- a blocked/unsupported AudioContext should never break result entry.
  }
}

function normalRangeLabel(param: TestParam, patientAgeYears?: number, patientGender?: string): string | null {
  const { min, max } = resolveRange(param, patientAgeYears, patientGender);
  const fallbackMin = min ?? param.min;
  const fallbackMax = max ?? param.max;
  if (fallbackMin === undefined && fallbackMax === undefined) return null;
  return `Normal: ${fallbackMin ?? '–'} – ${fallbackMax ?? '–'}`;
}

const FLAG_STYLES: Record<PathologyResultFlag, string> = {
  NORMAL: '',
  HIGH: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  LOW: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  CRITICAL_HIGH: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
  CRITICAL_LOW: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
};

const FLAG_LABELS: Record<PathologyResultFlag, string> = {
  NORMAL: '',
  HIGH: '▲ HIGH',
  LOW: '▼ LOW',
  CRITICAL_HIGH: '▲ CRITICAL',
  CRITICAL_LOW: '▼ CRITICAL',
};

// How long to wait after the last keystroke before autosaving -- long enough not to spam the
// server while someone is actively typing a single value, short enough that a pause between
// fields (or leaving the tab open) still lands within a couple of seconds.
const AUTOSAVE_DEBOUNCE_MS = 1500;

export const OrderResultEntry = forwardRef<OrderResultEntryHandle, OrderResultEntryProps>(({
  hospitalId, orderId, orderLine, patientAgeYears, patientGender, lineFields, onSuccess, onSaveStateChange,
}, ref) => {
  const [params, setParams] = useState<TestParam[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  // Values for every configured line field except the built-in "interpretation" (which keeps its
  // own dedicated state/param below, matching EnterPathologyResultHandler's wire format), keyed by
  // field.key.
  const [lineFieldValues, setLineFieldValues] = useState<Record<string, string>>({});
  const [interpretation, setInterpretation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sampleBarcode, setSampleBarcode] = useState('');
  const [isCollectingSample, setIsCollectingSample] = useState(false);
  const [externalLabRefNo, setExternalLabRefNo] = useState('');
  const [isSendingToExternalLab, setIsSendingToExternalLab] = useState(false);
  const [isReceivingExternalResult, setIsReceivingExternalResult] = useState(false);
  const previouslyCriticalRef = useRef<Set<string>>(new Set());
  // Keyword -> formatted paragraph lookup for this test (its own keywords + every global one) --
  // see RichTextField's onEnterWord / ReportKeywordsManager.tsx for where these are authored.
  const [keywordMap, setKeywordMap] = useState<Map<string, StyledBlock[]>>(new Map());

  // --- Autosave -----------------------------------------------------------------------------
  // No field-level save button anymore -- every edit debounce-saves itself, and the page's top
  // banner (PathologyOrderDetailPage.tsx) shows one shared status readout + a manual Save button
  // wired to `saveNow` below. `isDirty` is the one thing every edit handler sets; the prop-resync
  // effect (loading a line, or a fresh save landing back from the server) clears it again.
  const [isDirty, setIsDirty] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Normally AUTOSAVE_DEBOUNCE_MS; Autofill Normals sets this to 0 so its own save fires on the
  // very next effect pass instead of waiting out the usual debounce window.
  const nextAutosaveDelayRef = useRef(AUTOSAVE_DEBOUNCE_MS);

  // --- Autofill Normals guard ----------------------------------------------------------------
  // autofillApplied just drives the button's "applied" (green) look. manuallyEditedSinceAutofill
  // disables the button entirely once a parameter value has been hand-typed, so a stray click
  // can't clobber a technician's correction -- only Reset (with a type-to-confirm dialog) clears
  // it. Neither persists across tabs/lines: both reset to false on mount, matching this
  // component's existing full-remount-per-tab model.
  const [autofillApplied, setAutofillApplied] = useState(false);
  const [manuallyEditedSinceAutofill, setManuallyEditedSinceAutofill] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  useEffect(() => {
    let cancelled = false;
    pathologyService.getReportKeywords(hospitalId, orderLine.testId)
      .then(list => {
        if (cancelled) return;
        const map = new Map<string, StyledBlock[]>();
        for (const k of list) {
          if (!k.isActive) continue;
          map.set(k.keyword.toLowerCase(), parseKeywordContent(k.contentJson));
        }
        setKeywordMap(map);
      })
      .catch(() => { /* keyword expansion is a convenience, not load-bearing for result entry */ });
    return () => { cancelled = true; };
  }, [hospitalId, orderLine.testId]);

  const handleEnterWord = (word: string, insertAtCaret: (html: string) => void): boolean => {
    const blocks = keywordMap.get(word.toLowerCase());
    if (!blocks) return false;
    insertAtCaret(blocksToHtml(blocks));
    return true;
  };

  useEffect(() => {
    try {
      let schemaParams: TestParam[] = [];
      if (orderLine.parameterSchemaJson) {
        const schema = JSON.parse(orderLine.parameterSchemaJson);
        if (schema && Array.isArray(schema.params)) {
          schemaParams = schema.params;
        }
      }
      setParams(schemaParams);
      const schemaNames = new Set(schemaParams.map(p => p.name));

      if (orderLine.result?.resultValuesJson) {
        const saved = JSON.parse(orderLine.result.resultValuesJson);
        // Handles both the enriched {value, flag} shape and older raw-string saves.
        const rawValues: Record<string, string> = {};
        const fieldValues: Record<string, string> = {};
        for (const [key, entry] of Object.entries(saved || {})) {
          const value = typeof entry === 'string' ? entry : (entry as { value?: string })?.value ?? '';
          if (schemaNames.has(key)) {
            rawValues[key] = value;
          } else {
            fieldValues[key] = value;
          }
        }
        setValues(rawValues);
        setLineFieldValues(fieldValues);
      } else {
        setValues({});
        setLineFieldValues({});
      }

      setInterpretation(orderLine.result?.interpretation || '');
    } catch (e) {
      console.error("Failed to parse schema or values", e);
    }
    previouslyCriticalRef.current = new Set();
    // A freshly loaded/re-synced line always starts clean -- this IS the saved state, not an edit.
    setIsDirty(false);
    onSaveStateChange?.('idle');
    setAutofillApplied(false);
    setManuallyEditedSinceAutofill(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderLine]);

  const flags = useMemo(() => {
    const result: Record<string, PathologyResultFlag> = {};
    for (const param of params) {
      const value = values[param.name];
      if (!value) continue;
      result[param.name] = calculateResultFlag(param, value, patientAgeYears, patientGender);
    }
    return result;
  }, [params, values, patientAgeYears, patientGender]);

  const criticalParams = useMemo(
    () => params.filter(p => flags[p.name] === 'CRITICAL_HIGH' || flags[p.name] === 'CRITICAL_LOW'),
    [params, flags]
  );

  useEffect(() => {
    const currentlyCritical = new Set(criticalParams.map(p => p.name));
    const isNewCritical = [...currentlyCritical].some(name => !previouslyCriticalRef.current.has(name));
    if (isNewCritical) {
      playCriticalBeep();
    }
    previouslyCriticalRef.current = currentlyCritical;
  }, [criticalParams]);

  const handleValueChange = (paramName: string, value: string) => {
    setValues(prev => ({ ...prev, [paramName]: value }));
    setIsDirty(true);
    setManuallyEditedSinceAutofill(true);
  };

  const handleLineFieldChange = (key: string, value: string) => {
    setLineFieldValues(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleInterpretationChange = (html: string) => {
    setInterpretation(html);
    setIsDirty(true);
  };

  const renderLineFieldInput = (field: PathologyFieldConfigItem) => {
    if (field.key === 'interpretation') {
      return (
        <RichTextField
          value={interpretation}
          onChange={handleInterpretationChange}
          onEnterWord={handleEnterWord}
          placeholder="Add any specific observations... (type a keyword and press Enter to expand it)"
        />
      );
    }
    const value = lineFieldValues[field.key] ?? '';
    const selectClass = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
    switch (field.type) {
      case 'paragraph':
        return (
          <RichTextField
            value={value}
            onChange={(html) => handleLineFieldChange(field.key, html)}
            onEnterWord={handleEnterWord}
            placeholder={field.label}
          />
        );
      case 'number':
        return <Input type="number" value={value} onChange={(e) => handleLineFieldChange(field.key, e.target.value)} placeholder={field.label} />;
      case 'date':
        return <Input type="date" value={value} onChange={(e) => handleLineFieldChange(field.key, e.target.value)} />;
      case 'boolean':
        return (
          <select value={value} onChange={(e) => handleLineFieldChange(field.key, e.target.value)} className={selectClass}>
            <option value="">—</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        );
      case 'select':
        return (
          <select value={value} onChange={(e) => handleLineFieldChange(field.key, e.target.value)} className={selectClass}>
            <option value="">Select...</option>
            {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      default:
        return <Input value={value} onChange={(e) => handleLineFieldChange(field.key, e.target.value)} placeholder={field.label} />;
    }
  };

  // Fills every schema param that has a configured default, then saves immediately (not waiting
  // for the usual debounce) -- an explicit click is exactly the moment a fresh, unambiguous save
  // is wanted. Uses setValues' OWN setter (not handleValueChange), so this never trips the
  // manual-edit guard below -- clicking Autofill is not "manually editing."
  const handleAutofillNormals = () => {
    const filled: Record<string, string> = { ...values };
    for (const param of params) {
      if (param.defaultValue) {
        filled[param.name] = param.defaultValue;
      }
    }
    setValues(filled);
    setAutofillApplied(true);
    setIsDirty(true);
    nextAutosaveDelayRef.current = 0;
  };

  const handleCollectSample = async () => {
    setIsCollectingSample(true);
    try {
      const success = await pathologyService.collectSample(hospitalId, orderId, orderLine.orderLineId, sampleBarcode.trim() || undefined);
      if (!success) {
        toast.error('Could not record sample collection');
        return;
      }
      toast.success('Sample marked as collected');
      onSuccess();
    } catch (error) {
      toast.error('Could not record sample collection');
    } finally {
      setIsCollectingSample(false);
    }
  };

  const handleSendToExternalLab = async () => {
    setIsSendingToExternalLab(true);
    try {
      const success = await pathologyService.sendToExternalLab(hospitalId, orderId, orderLine.orderLineId, undefined, externalLabRefNo.trim() || undefined);
      if (!success) {
        toast.error('Could not send to the external lab', { description: 'The sample may not be collected yet, or no default external lab is set for this test.' });
        return;
      }
      toast.success('Sent to external lab');
      onSuccess();
    } catch {
      toast.error('Could not send to the external lab');
    } finally {
      setIsSendingToExternalLab(false);
    }
  };

  const handleReceiveExternalResult = async () => {
    setIsReceivingExternalResult(true);
    try {
      const success = await pathologyService.receiveExternalLabResult(hospitalId, orderId, orderLine.orderLineId);
      if (!success) {
        toast.error('Could not mark the result received');
        return;
      }
      toast.success('Result marked received -- enter the values below');
      onSuccess();
    } catch {
      toast.error('Could not mark the result received');
    } finally {
      setIsReceivingExternalResult(false);
    }
  };

  // The one place results actually reach the server -- called by the debounced autosave effect,
  // by Autofill Normals, and (via saveNow/the imperative handle) by the page-level Save button and
  // the tab-switch flush. `silent` suppresses the toast (autosave/flush shouldn't announce
  // themselves); `refresh` calls onSuccess() to refetch the whole order -- deliberately left off
  // for plain autosave so a refetch landing mid-keystroke can't resync this component's local
  // state out from under whatever the technician is still typing.
  const save = async (opts?: { silent?: boolean; refresh?: boolean }) => {
    const silent = opts?.silent ?? true;
    const refresh = opts?.refresh ?? false;
    setIsSubmitting(true);
    onSaveStateChange?.('saving');
    try {
      // Schema-driven values plus every configured line field except "interpretation" (which has
      // its own dedicated param below) -- field definitions come from the hospital's saved layout,
      // not typed per-value, so this is a flat string map same as before.
      const payload: Record<string, string> = { ...values };
      for (const field of lineFields) {
        if (field.key === 'interpretation') continue;
        payload[field.key] = lineFieldValues[field.key] ?? '';
      }
      await pathologyService.enterResult(hospitalId, orderId, orderLine.orderLineId, {
        resultValuesJson: JSON.stringify(payload),
        interpretation
      });
      setIsDirty(false);
      onSaveStateChange?.('saved');
      if (!silent) {
        toast.success("Success", { description: "Results saved successfully." });
      }
      if (refresh) {
        onSuccess();
      }
    } catch (error) {
      onSaveStateChange?.('error');
      if (!silent) {
        toast.error("Error", { description: "Failed to save results." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    saveNow: (opts?: { silent?: boolean }) => save({ silent: opts?.silent ?? false, refresh: true }),
  }));

  // Debounced autosave -- reschedules on every edit, fires `save()` (silent, no parent refresh)
  // once things go quiet for AUTOSAVE_DEBOUNCE_MS. Autofill Normals collapses the wait to 0 via
  // nextAutosaveDelayRef so its own save fires on the very next pass instead.
  useEffect(() => {
    if (!isDirty) return;
    onSaveStateChange?.('dirty');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const delay = nextAutosaveDelayRef.current;
    nextAutosaveDelayRef.current = AUTOSAVE_DEBOUNCE_MS;
    debounceRef.current = setTimeout(() => { void save(); }, delay);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, lineFieldValues, interpretation, isDirty]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const handleResetConfirm = () => {
    setManuallyEditedSinceAutofill(false);
    setAutofillApplied(false);
    setResetConfirmOpen(false);
    setResetConfirmText('');
  };

  const isPending = orderLine.status === 'PENDING';
  const hasAutofillableParams = params.some(p => !!p.defaultValue);
  const autofillLookGreen = autofillApplied && !manuallyEditedSinceAutofill;

  return (
    <Card className="mt-4">
      <CardHeader className="bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{orderLine.testName} ({orderLine.testCode})</CardTitle>
            <CardDescription>
              Status: {orderLine.status.replace(/_/g, ' ')}
              {orderLine.sampleCollectedAt && (
                <span className="ml-1">
                  · Sample collected {new Date(orderLine.sampleCollectedAt).toLocaleString()}
                  {orderLine.sampleBarcode ? ` (${orderLine.sampleBarcode})` : ''}
                </span>
              )}
              {orderLine.isOutsourced && orderLine.sentToExternalLabAt && (
                <span className="ml-1">
                  · Sent to {orderLine.externalLabName ?? 'external lab'} {new Date(orderLine.sentToExternalLabAt).toLocaleString()}
                  {orderLine.externalLabRefNo ? ` (Ref ${orderLine.externalLabRefNo})` : ''}
                </span>
              )}
              {orderLine.isOutsourced && orderLine.externalLabCost != null && (
                <span className="ml-1 text-amber-700 dark:text-amber-400">· Cost ₹{orderLine.externalLabCost.toFixed(2)}</span>
              )}
            </CardDescription>
          </div>
          {hasAutofillableParams && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutofillNormals}
                disabled={manuallyEditedSinceAutofill || isSubmitting}
                title={manuallyEditedSinceAutofill ? "Disabled after a manual edit -- click Reset to re-enable." : undefined}
                className={cn(autofillLookGreen && 'border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400')}
              >
                {autofillLookGreen ? <Check className="h-4 w-4 mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                {autofillLookGreen ? 'Normals Applied' : '1-Click Autofill Normals'}
              </Button>
              {manuallyEditedSinceAutofill && (
                <Button type="button" variant="outline" size="sm" onClick={() => setResetConfirmOpen(true)}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              )}
            </div>
          )}
        </div>
        {isPending && (
          <div className="flex items-center gap-2 pt-3">
            <Input
              value={sampleBarcode}
              onChange={(e) => setSampleBarcode(e.target.value)}
              placeholder="Sample barcode (optional)"
              className="h-9 max-w-xs"
            />
            <Button type="button" size="sm" onClick={handleCollectSample} disabled={isCollectingSample}>
              {isCollectingSample ? 'Marking...' : 'Mark Sample Collected'}
            </Button>
          </div>
        )}
        {orderLine.isOutsourced && orderLine.status === 'SAMPLE_COLLECTED' && (
          <div className="flex items-center gap-2 pt-3">
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">Outsourced</span>
            <Input
              value={externalLabRefNo}
              onChange={(e) => setExternalLabRefNo(e.target.value)}
              placeholder="External lab ref. no. (optional)"
              className="h-9 max-w-xs"
            />
            <Button type="button" size="sm" onClick={handleSendToExternalLab} disabled={isSendingToExternalLab}>
              {isSendingToExternalLab ? 'Sending...' : 'Send to External Lab'}
            </Button>
          </div>
        )}
        {orderLine.isOutsourced && orderLine.status === 'SENT_TO_EXTERNAL_LAB' && (
          <div className="flex items-center gap-2 pt-3">
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium shrink-0">
              Awaiting {orderLine.externalLabName ?? 'external lab'}
            </span>
            <Button type="button" size="sm" onClick={handleReceiveExternalResult} disabled={isReceivingExternalResult}>
              {isReceivingExternalResult ? 'Marking...' : 'Mark Result Received'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {criticalParams.length > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 px-4 py-3 text-sm font-medium">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Critical value{criticalParams.length > 1 ? 's' : ''}: {criticalParams.map(p => p.name).join(', ')} — verify and notify the ordering physician immediately.
          </div>
        )}

        {params.length > 0 ? (
          params.map((param, index) => {
            const flag = flags[param.name] ?? 'NORMAL';
            return (
              <div key={index} className="grid grid-cols-4 items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                <Label className="col-span-1 font-medium">{param.name}</Label>
                <div className="col-span-2 flex items-center space-x-2">
                  <Input
                    value={values[param.name] || ''}
                    onChange={(e) => handleValueChange(param.name, e.target.value)}
                    placeholder="Enter value"
                    className={cn(flag !== 'NORMAL' && FLAG_STYLES[flag])}
                  />
                  <span className="text-sm text-muted-foreground w-16">{param.unit}</span>
                  {flag !== 'NORMAL' && (
                    <span className={cn('text-xs font-semibold whitespace-nowrap', flag === 'CRITICAL_HIGH' || flag === 'CRITICAL_LOW' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                      {FLAG_LABELS[flag]}
                    </span>
                  )}
                </div>
                <div className="col-span-1 text-xs text-muted-foreground">
                  {normalRangeLabel(param, patientAgeYears, patientGender)}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-muted-foreground italic">
            No parameter schema defined for this test.
          </div>
        )}

        {lineFields.filter(f => f.showInPad).map((field) => (
          <div key={field.key} className="pt-4 space-y-2">
            <Label>{field.label}</Label>
            {renderLineFieldInput(field)}
          </div>
        ))}
      </CardContent>

      <AlertDialog open={resetConfirmOpen} onOpenChange={(o) => { setResetConfirmOpen(o); if (!o) setResetConfirmText(''); }}>
        <AlertDialogContent className="p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-2xl max-w-md border-0 shadow-2xl">
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-brand-600 to-brand-700">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <RotateCcw className="h-5 w-5 text-white" />
            </div>
            <AlertDialogTitle className="text-white text-base font-bold">Re-enable Autofill Normals?</AlertDialogTitle>
          </div>
          <div className="px-5 py-4 space-y-3">
            <AlertDialogDescription className="text-sm text-slate-600">
              You've manually edited a result since last using Autofill, so it's been disabled to protect your entries. Resetting only re-enables the button — it won't change any value you've already typed.
            </AlertDialogDescription>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Type <span className="font-bold text-slate-900">reset</span> to confirm</label>
              <Input value={resetConfirmText} onChange={(e) => setResetConfirmText(e.target.value)} placeholder="reset" className="text-sm" />
            </div>
          </div>
          <AlertDialogFooter className="px-5 pb-5 pt-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleResetConfirm(); }}
              disabled={resetConfirmText.trim().toLowerCase() !== 'reset'}
              className="rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
});

OrderResultEntry.displayName = 'OrderResultEntry';
