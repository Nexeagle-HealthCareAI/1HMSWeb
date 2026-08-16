import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyTestMaster } from '../services/pathologyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface ParameterDef {
  id: string;
  name: string;
  unit: string;
  min: string;
  max: string;
}

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

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: {
      testCode: '',
      testName: '',
      category: '',
      sampleType: '',
      containerType: '',
      isActive: true,
      sortOrder: 0
    }
  });

  useEffect(() => {
    if (test) {
      reset({
        testCode: test.testCode,
        testName: test.testName,
        category: test.category || '',
        sampleType: test.sampleType || '',
        containerType: test.containerType || '',
        isActive: test.isActive,
        sortOrder: test.sortOrder
      });

      if (test.parameterSchemaJson) {
        try {
          const parsed = JSON.parse(test.parameterSchemaJson);
          if (parsed && Array.isArray(parsed.params)) {
            // Ensure each parameter has a unique id for dnd
            const paramsWithIds = parsed.params.map((p: any) => ({
              ...p,
              id: p.id || uuidv4()
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
      { id: uuidv4(), name: '', unit: '', min: '', max: '' }
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
      
      const payload = {
        ...data,
        parameterSchemaJson: JSON.stringify({ params: parameters }),
        // ChargeId can be hooked up to ChargeMaster later
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
            
            <div className="flex items-center space-x-2 pt-8">
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
                            className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 border rounded-md"
                          >
                            <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="grid grid-cols-4 gap-2 flex-1">
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
                                placeholder="Min Ref" 
                                value={param.min} 
                                onChange={(e) => updateParameter(param.id, 'min', e.target.value)}
                              />
                              <Input 
                                placeholder="Max Ref" 
                                value={param.max} 
                                onChange={(e) => updateParameter(param.id, 'max', e.target.value)}
                              />
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
