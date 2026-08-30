import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PathologyOrderLineDto, pathologyService } from '../services/pathologyService';
import { calculateResultFlag, resolveRange, PathologyResultFlag } from '../utils/resultFlagCalculator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Zap, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderResultEntryProps {
  hospitalId: string;
  orderId: string;
  orderLine: PathologyOrderLineDto;
  patientAgeYears?: number | null;
  patientGender?: string | null;
  onSuccess: () => void;
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

export const OrderResultEntry: React.FC<OrderResultEntryProps> = ({
  hospitalId, orderId, orderLine, patientAgeYears, patientGender, onSuccess
}) => {
  const [params, setParams] = useState<TestParam[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [interpretation, setInterpretation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previouslyCriticalRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      if (orderLine.parameterSchemaJson) {
        const schema = JSON.parse(orderLine.parameterSchemaJson);
        if (schema && Array.isArray(schema.params)) {
          setParams(schema.params);
        }
      } else {
        setParams([]);
      }

      if (orderLine.result?.resultValuesJson) {
        const saved = JSON.parse(orderLine.result.resultValuesJson);
        // Handles both the enriched {value, flag} shape and older raw-string saves.
        const rawValues: Record<string, string> = {};
        for (const [key, entry] of Object.entries(saved || {})) {
          rawValues[key] = typeof entry === 'string' ? entry : (entry as { value?: string })?.value ?? '';
        }
        setValues(rawValues);
      } else {
        setValues({});
      }

      setInterpretation(orderLine.result?.interpretation || '');
    } catch (e) {
      console.error("Failed to parse schema or values", e);
    }
    previouslyCriticalRef.current = new Set();
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
  };

  const handleAutofillNormals = () => {
    const filled: Record<string, string> = { ...values };
    for (const param of params) {
      if (param.defaultValue) {
        filled[param.name] = param.defaultValue;
      }
    }
    setValues(filled);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await pathologyService.enterResult(hospitalId, orderId, orderLine.orderLineId, {
        resultValuesJson: JSON.stringify(values),
        interpretation
      });
      toast.success("Success", {
        description: "Results saved successfully.",
      });
      onSuccess();
    } catch (error) {
      toast.error("Error", {
        description: "Failed to save results.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCompleted = orderLine.status === 'REPORT_APPROVED';
  const hasAutofillableParams = params.some(p => !!p.defaultValue);

  return (
    <Card className="mt-4">
      <CardHeader className="bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{orderLine.testName} ({orderLine.testCode})</CardTitle>
            <CardDescription>Status: {orderLine.status.replace('_', ' ')}</CardDescription>
          </div>
          {!isCompleted && hasAutofillableParams && (
            <Button type="button" variant="outline" size="sm" onClick={handleAutofillNormals}>
              <Zap className="h-4 w-4 mr-2" /> 1-Click Autofill Normals
            </Button>
          )}
        </div>
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
                    disabled={isCompleted}
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

        <div className="pt-4 space-y-2">
          <Label>Interpretation / Notes</Label>
          <Textarea
            value={interpretation}
            onChange={(e) => setInterpretation(e.target.value)}
            placeholder="Add any specific observations..."
            disabled={isCompleted}
          />
        </div>

        {!isCompleted && (
          <div className="flex justify-end pt-4">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Result'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
