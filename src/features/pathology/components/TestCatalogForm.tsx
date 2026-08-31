import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyTestMaster } from '../services/pathologyService';
import { ipdBillingService, ChargeMaster } from '@/features/billing/services/ipdBillingService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Mirrors PathologyResultFlagCalculator.PathologyParameterRange on the backend -- those field
// names are what EnterPathologyResultHandler will eventually deserialize ParameterSchemaJson
// into, so this form has to read/write the same shape rather than the old flat {min, max}.
interface ParameterDef {
  id: string;
  name: string;
  unit: string;
  defaultValue: string;
  maleMin: string;
  maleMax: string;
  femaleMin: string;
  femaleMax: string;
  childMin: string;
  childMax: string;
  criticalLow: string;
  criticalHigh: string;
}

const EMPTY_PARAMETER: Omit<ParameterDef, 'id'> = {
  name: '', unit: '', defaultValue: '',
  maleMin: '', maleMax: '', femaleMin: '', femaleMax: '',
  childMin: '', childMax: '', criticalLow: '', criticalHigh: ''
};

interface TestCatalogFormProps {
  test: PathologyTestMaster | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TestCatalogForm: React.FC<TestCatalogFormProps> = ({ test, isOpen, onClose, onSuccess }) => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [loading, setLoading] = useState(false);
  const [parameters, setParameters] = useState<ParameterDef[]>([]);
  const [chargeMasters, setChargeMasters] = useState<ChargeMaster[]>([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      testCode: '',
      testName: '',
      category: '',
      sampleType: '',
      containerType: '',
      chargeId: '',
      rate: '',
      isActive: true,
      sortOrder: 0
    }
  });

  // Chargeable items an admin can link this test to for auto-billing (CreatePathologyOrderHandler
  // and the IPD ClinicalOrder dual-write both match on PathologyTestMaster.ChargeId).
  useEffect(() => {
    if (!isOpen || !hospitalId) return;
    let cancelled = false;
    (async () => {
      setLoadingCharges(true);
      try {
        const res = await ipdBillingService.listChargeMasters({ hospitalId, pageSize: 500 });
        // Scoped to LAB/ANY items -- same inclusion rule AddChargesModal uses -- so linking a test
        // isn't a scroll through the entire OPD/IPD/PHARMACY charge catalog.
        const list = (res?.items ?? []).filter(m => m.isActive && (m.appliesTo === 'LAB' || m.appliesTo === 'ANY'));
        if (cancelled) return;
        setChargeMasters(list);
        // Prefill the rate field from the currently-linked charge, once the catalog (and its
        // rates) has actually loaded -- reset() below may already have run with the list empty.
        if (test?.chargeId) {
          const linked = list.find(c => c.chargeId === test.chargeId);
          if (linked) setValue('rate', String(linked.defaultRate));
        }
      } catch (e: any) {
        if (!cancelled) toast.error("Could not load charge catalog for billing linkage");
      } finally {
        if (!cancelled) setLoadingCharges(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, hospitalId, test?.chargeId, setValue]);

  useEffect(() => {
    if (test) {
      reset({
        testCode: test.testCode,
        testName: test.testName,
        category: test.category || '',
        sampleType: test.sampleType || '',
        containerType: test.containerType || '',
        chargeId: test.chargeId || '',
        rate: '',
        isActive: test.isActive,
        sortOrder: test.sortOrder
      });

      if (test.parameterSchemaJson) {
        try {
          const parsed = JSON.parse(test.parameterSchemaJson);
          if (parsed && Array.isArray(parsed.params)) {
            // Legacy rows may only have the old flat {min, max} shape -- fold those into the
            // male band, matching PathologyResultFlagCalculator's own fallback order (it prefers
            // male, then female, then child, when no demographic split is set).
            const numOrBlank = (v: unknown) => (v === undefined || v === null ? '' : String(v));
            const paramsWithIds: ParameterDef[] = parsed.params.map((p: any) => ({
              id: p.id || uuidv4(),
              name: p.name ?? '',
              unit: p.unit ?? '',
              defaultValue: numOrBlank(p.defaultValue),
              maleMin: numOrBlank(p.maleMin ?? p.min),
              maleMax: numOrBlank(p.maleMax ?? p.max),
              femaleMin: numOrBlank(p.femaleMin),
              femaleMax: numOrBlank(p.femaleMax),
              childMin: numOrBlank(p.childMin),
              childMax: numOrBlank(p.childMax),
              criticalLow: numOrBlank(p.criticalLow),
              criticalHigh: numOrBlank(p.criticalHigh),
            }));
            setParameters(paramsWithIds);
          }
        } catch (e) {
          console.error("Failed to parse schema json", e);
        }
      } else {
        setParameters([]);
      }
    } else {
      reset();
      setParameters([]);
    }
  }, [test, reset]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(parameters);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setParameters(items);
  };

  const handleAddParameter = () => {
    setParameters([
      ...parameters,
      { id: uuidv4(), ...EMPTY_PARAMETER }
    ]);
  };

  const handleRemoveParameter = (id: string) => {
    setParameters(parameters.filter(p => p.id !== id));
  };

  const updateParameter = (id: string, field: keyof ParameterDef, value: string) => {
    setParameters(parameters.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const onSubmit = async (data: any) => {
    if (!hospitalId) return;
    try {
      setLoading(true);

      // Resolve the charge link before saving the test -- editing the rate here updates the
      // already-linked charge in place; typing a rate with nothing linked yet creates a new
      // charge named after this test, so an admin never has to pre-create one on a separate
      // screen just to link it back here.
      let resolvedChargeId: string | undefined = data.chargeId || undefined;
      const rateNum = data.rate === '' || data.rate === undefined ? undefined : Number(data.rate);
      if (resolvedChargeId) {
        const existing = chargeMasters.find(c => c.chargeId === resolvedChargeId);
        if (existing && rateNum !== undefined && rateNum !== existing.defaultRate) {
          await ipdBillingService.upsertChargeMaster({
            chargeId: existing.chargeId,
            hospitalId,
            chargeCode: existing.chargeCode,
            displayName: existing.displayName || data.testName,
            categoryCode: existing.categoryCode || 'LAB_PATH',
            appliesTo: existing.appliesTo || 'LAB',
            defaultRate: rateNum,
            defaultQty: existing.defaultQty ?? 1,
            isActive: existing.isActive ?? true,
          });
        }
      } else if (rateNum !== undefined && rateNum >= 0) {
        const created = await ipdBillingService.upsertChargeMaster({
          hospitalId,
          chargeCode: data.testCode,
          displayName: data.testName,
          categoryCode: 'LAB_PATH',
          appliesTo: 'LAB',
          defaultRate: rateNum,
          defaultQty: 1,
          isActive: true,
        });
        resolvedChargeId = created.chargeId;
      }

      const toNum = (v: string) => (v === '' || v === undefined ? undefined : Number(v));
      const payload = {
        ...data,
        chargeId: resolvedChargeId,
        rate: undefined,
        parameterSchemaJson: JSON.stringify({
          params: parameters.map((p, index) => ({
            name: p.name,
            unit: p.unit || undefined,
            defaultValue: p.defaultValue || undefined,
            maleMin: toNum(p.maleMin),
            maleMax: toNum(p.maleMax),
            femaleMin: toNum(p.femaleMin),
            femaleMax: toNum(p.femaleMax),
            childMin: toNum(p.childMin),
            childMax: toNum(p.childMax),
            criticalLow: toNum(p.criticalLow),
            criticalHigh: toNum(p.criticalHigh),
            sortOrder: index + 1,
          }))
        }),
      };

      if (test) {
        await pathologyService.updateTest(hospitalId, test.testId, { testId: test.testId, ...payload });
        toast.success("Test updated successfully");
      } else {
        await pathologyService.createTest(hospitalId, payload);
        toast.success("Test created successfully");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{test ? 'Edit Test' : 'New Test'}</SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Test Code *</Label>
              <Input {...register('testCode', { required: true })} placeholder="e.g. CBC" />
              {errors.testCode && <span className="text-xs text-red-500">Required</span>}
            </div>
            <div className="space-y-2">
              <Label>Test Name *</Label>
              <Input {...register('testName', { required: true })} placeholder="Complete Blood Count" />
              {errors.testName && <span className="text-xs text-red-500">Required</span>}
            </div>
            
            <div className="space-y-2">
              <Label>Category</Label>
              <Input {...register('category')} placeholder="Hematology" />
            </div>
            <div className="space-y-2">
              <Label>Sort Order</Label>
              <Input type="number" {...register('sortOrder')} />
            </div>

            <div className="space-y-2">
              <Label>Sample Type</Label>
              <Input {...register('sampleType')} placeholder="Whole Blood" />
            </div>
            <div className="space-y-2">
              <Label>Container Type</Label>
              <Input {...register('containerType')} placeholder="EDTA Tube" />
            </div>

            <div className="space-y-2">
              <Label>Linked Charge (for auto-billing)</Label>
              <Controller
                name="chargeId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(v) => {
                      field.onChange(v === 'none' ? '' : v);
                      // Picking an existing charge loads its current rate here too, so this
                      // field is always "what will be saved", not just "what's picked."
                      const picked = v !== 'none' ? chargeMasters.find(c => c.chargeId === v) : undefined;
                      setValue('rate', picked ? String(picked.defaultRate) : '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCharges ? 'Loading charges...' : 'Not linked — no auto-billing'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked — no auto-billing</SelectItem>
                      {chargeMasters.map(c => (
                        <SelectItem key={c.chargeId} value={c.chargeId}>
                          {c.displayName} · ₹{c.defaultRate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Rate (₹)</Label>
              <Input type="number" step="0.01" min="0" {...register('rate')} placeholder="0.00" />
            </div>
            <div className="col-span-2 -mt-2">
              <p className="text-xs text-gray-500">
                Required for this test to auto-bill on order placement, sample collection, or report approval.
                Picking a charge above loads its current rate — edit it here and Save updates that charge
                directly. Leaving "Not linked" but entering a rate creates a new charge for this test, named
                after it, so you don't need to set one up separately first.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Active</Label>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Test Parameters</h3>
                <p className="text-sm text-gray-500">Define the structure and normal ranges for the test result.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddParameter}>
                <Plus className="h-4 w-4 mr-2" /> Add Parameter
              </Button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="parametersList">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {parameters.map((param, index) => (
                      <Draggable key={param.id} draggableId={param.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-slate-800 border rounded-md"
                          >
                            <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 pt-2">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  placeholder="Name (e.g. Hemoglobin)"
                                  value={param.name}
                                  onChange={(e) => updateParameter(param.id, 'name', e.target.value)}
                                />
                                <Input
                                  placeholder="Unit (e.g. g/dL)"
                                  value={param.unit}
                                  onChange={(e) => updateParameter(param.id, 'unit', e.target.value)}
                                />
                                <Input
                                  placeholder="Default value"
                                  value={param.defaultValue}
                                  onChange={(e) => updateParameter(param.id, 'defaultValue', e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                <Input
                                  placeholder="Male Min"
                                  value={param.maleMin}
                                  onChange={(e) => updateParameter(param.id, 'maleMin', e.target.value)}
                                />
                                <Input
                                  placeholder="Male Max"
                                  value={param.maleMax}
                                  onChange={(e) => updateParameter(param.id, 'maleMax', e.target.value)}
                                />
                                <Input
                                  placeholder="Female Min"
                                  value={param.femaleMin}
                                  onChange={(e) => updateParameter(param.id, 'femaleMin', e.target.value)}
                                />
                                <Input
                                  placeholder="Female Max"
                                  value={param.femaleMax}
                                  onChange={(e) => updateParameter(param.id, 'femaleMax', e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                <Input
                                  placeholder="Child Min"
                                  value={param.childMin}
                                  onChange={(e) => updateParameter(param.id, 'childMin', e.target.value)}
                                />
                                <Input
                                  placeholder="Child Max"
                                  value={param.childMax}
                                  onChange={(e) => updateParameter(param.id, 'childMax', e.target.value)}
                                />
                                <Input
                                  placeholder="Critical Low"
                                  value={param.criticalLow}
                                  onChange={(e) => updateParameter(param.id, 'criticalLow', e.target.value)}
                                />
                                <Input
                                  placeholder="Critical High"
                                  value={param.criticalHigh}
                                  onChange={(e) => updateParameter(param.id, 'criticalHigh', e.target.value)}
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveParameter(param.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {parameters.length === 0 && (
              <div className="text-center p-8 border-2 border-dashed rounded-lg text-gray-500">
                No parameters defined. Add parameters to build the result schema.
              </div>
            )}
          </div>

          <SheetFooter className="mt-8">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Test'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
