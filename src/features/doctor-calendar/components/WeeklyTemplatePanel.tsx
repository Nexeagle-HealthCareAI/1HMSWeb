import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Users, 
  Calendar, 
  Copy, 
  RotateCcw, 
  Save, 
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap
} from 'lucide-react';
import { ShiftTemplate, ShiftName } from '../api/types';
import { useTemplates, useSaveTemplates } from '../hooks/useCalendar';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface WeeklyTemplatePanelProps {
  doctorId: string;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shiftNames: ShiftName[] = ['Morning', 'Afternoon', 'Evening', 'Night'];

// Preset templates for common schedules
const presetTemplates = {
  'Standard OPD': {
    description: 'Standard outpatient department schedule',
    templates: [
      { dayOfWeek: 1, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '12:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 1, shiftName: 'Afternoon' as ShiftName, startTime: '14:00', endTime: '17:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 2, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '12:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 2, shiftName: 'Afternoon' as ShiftName, startTime: '14:00', endTime: '17:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 3, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '12:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 3, shiftName: 'Afternoon' as ShiftName, startTime: '14:00', endTime: '17:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 4, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '12:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 4, shiftName: 'Afternoon' as ShiftName, startTime: '14:00', endTime: '17:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 5, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '12:00', slotMinutes: 15, maxPatients: 20, isActive: true },
      { dayOfWeek: 5, shiftName: 'Afternoon' as ShiftName, startTime: '14:00', endTime: '17:00', slotMinutes: 15, maxPatients: 20, isActive: true },
    ]
  },
  'Emergency Schedule': {
    description: '24/7 emergency department schedule',
    templates: [
      { dayOfWeek: 0, shiftName: 'Night' as ShiftName, startTime: '20:00', endTime: '08:00', slotMinutes: 30, maxPatients: null, isActive: true },
      { dayOfWeek: 1, shiftName: 'Morning' as ShiftName, startTime: '08:00', endTime: '16:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 1, shiftName: 'Evening' as ShiftName, startTime: '16:00', endTime: '00:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 2, shiftName: 'Morning' as ShiftName, startTime: '08:00', endTime: '16:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 2, shiftName: 'Evening' as ShiftName, startTime: '16:00', endTime: '00:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 3, shiftName: 'Morning' as ShiftName, startTime: '08:00', endTime: '16:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 3, shiftName: 'Evening' as ShiftName, startTime: '16:00', endTime: '00:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 4, shiftName: 'Morning' as ShiftName, startTime: '08:00', endTime: '16:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 4, shiftName: 'Evening' as ShiftName, startTime: '16:00', endTime: '00:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 5, shiftName: 'Morning' as ShiftName, startTime: '08:00', endTime: '16:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 5, shiftName: 'Evening' as ShiftName, startTime: '16:00', endTime: '00:00', slotMinutes: 20, maxPatients: null, isActive: true },
      { dayOfWeek: 6, shiftName: 'Night' as ShiftName, startTime: '20:00', endTime: '08:00', slotMinutes: 30, maxPatients: null, isActive: true },
    ]
  },
  'Part-time Schedule': {
    description: 'Part-time morning schedule',
    templates: [
      { dayOfWeek: 1, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '13:00', slotMinutes: 20, maxPatients: 15, isActive: true },
      { dayOfWeek: 3, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '13:00', slotMinutes: 20, maxPatients: 15, isActive: true },
      { dayOfWeek: 5, shiftName: 'Morning' as ShiftName, startTime: '09:00', endTime: '13:00', slotMinutes: 20, maxPatients: 15, isActive: true },
    ]
  }
};

export const WeeklyTemplatePanel: React.FC<WeeklyTemplatePanelProps> = ({
  doctorId
}) => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('custom');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  
  // Queries
  const { data: existingTemplates = [], isLoading } = useTemplates(doctorId);
  const saveTemplatesMutation = useSaveTemplates();
  
  // Initialize templates when data loads
  useEffect(() => {
    if (existingTemplates.length > 0) {
      setTemplates(existingTemplates);
    } else {
      // Create default templates
      const defaultTemplates: ShiftTemplate[] = [];
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        for (const shiftName of shiftNames) {
          defaultTemplates.push({
            templateId: `default-${dayOfWeek}-${shiftName}`,
            doctorId,
            dayOfWeek: dayOfWeek as 0|1|2|3|4|5|6,
            shiftName,
            startTime: '09:00',
            endTime: '12:00',
            slotMinutes: 15,
            maxPatients: null,
            isActive: false
          });
        }
      }
      
      setTemplates(defaultTemplates);
    }
  }, [existingTemplates, doctorId]);
  
  const updateTemplate = (templateId: string, updates: Partial<ShiftTemplate>) => {
    setTemplates(prev => 
      prev.map(template => 
        template.templateId === templateId 
          ? { ...template, ...updates }
          : template
      )
    );
    setIsDirty(true);
    validateTemplate(templateId, updates);
  };
  
  const getTemplate = (dayOfWeek: number, shiftName: ShiftName) => {
    return templates.find(t => t.dayOfWeek === dayOfWeek && t.shiftName === shiftName);
  };
  
  const validateTemplate = (templateId: string, updates: Partial<ShiftTemplate>) => {
    const template = templates.find(t => t.templateId === templateId);
    if (!template) return;
    
    const updatedTemplate = { ...template, ...updates };
    const errors: Record<string, string> = {};
    
    if (updatedTemplate.isActive) {
      const startTime = new Date(`2000-01-01T${updatedTemplate.startTime}`);
      const endTime = new Date(`2000-01-01T${updatedTemplate.endTime}`);
      
      if (startTime >= endTime) {
        errors[templateId] = 'End time must be after start time';
      }
      
      if (updatedTemplate.slotMinutes <= 0) {
        errors[templateId] = 'Slot duration must be greater than 0';
      }
      
      if (updatedTemplate.maxPatients !== null && updatedTemplate.maxPatients <= 0) {
        errors[templateId] = 'Max patients must be greater than 0';
      }
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [templateId]: errors[templateId] || ''
    }));
  };
  
  const applyPreset = (presetName: string) => {
    const preset = presetTemplates[presetName as keyof typeof presetTemplates];
    if (!preset) return;
    
    const newTemplates: ShiftTemplate[] = [];
    
    // First, create all possible templates (inactive)
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (const shiftName of shiftNames) {
        newTemplates.push({
          templateId: `template-${dayOfWeek}-${shiftName}`,
          doctorId,
          dayOfWeek: dayOfWeek as 0|1|2|3|4|5|6,
          shiftName,
          startTime: '09:00',
          endTime: '12:00',
          slotMinutes: 15,
          maxPatients: null,
          isActive: false
        });
      }
    }
    
    // Apply preset values
    preset.templates.forEach(presetTemplate => {
      const templateIndex = newTemplates.findIndex(t => 
        t.dayOfWeek === presetTemplate.dayOfWeek && t.shiftName === presetTemplate.shiftName
      );
      
      if (templateIndex !== -1) {
        newTemplates[templateIndex] = {
          ...newTemplates[templateIndex],
          ...presetTemplate
        };
      }
    });
    
    setTemplates(newTemplates);
    setIsDirty(true);
    setValidationErrors({});
    
    toast({
      title: "Preset Applied",
      description: `${presetName} schedule has been applied. Review and save to confirm.`,
    });
  };
  
  const copyDayToOthers = (sourceDayIndex: number) => {
    const sourceTemplates = templates.filter(t => t.dayOfWeek === sourceDayIndex);
    
    setTemplates(prev => 
      prev.map(template => {
        if (template.dayOfWeek !== sourceDayIndex) {
          const sourceTemplate = sourceTemplates.find(s => s.shiftName === template.shiftName);
          if (sourceTemplate) {
            return {
              ...template,
              startTime: sourceTemplate.startTime,
              endTime: sourceTemplate.endTime,
              slotMinutes: sourceTemplate.slotMinutes,
              maxPatients: sourceTemplate.maxPatients,
              isActive: sourceTemplate.isActive
            };
          }
        }
        return template;
      })
    );
    
    setIsDirty(true);
    setValidationErrors({});
    
    toast({
      title: "Day Copied",
      description: `${dayNames[sourceDayIndex]} schedule copied to all other days.`,
    });
  };
  
  const getActiveShiftsCount = (dayIndex: number) => {
    return templates.filter(t => t.dayOfWeek === dayIndex && t.isActive).length;
  };
  
  const getShiftColor = (shiftName: ShiftName) => {
    switch (shiftName) {
      case 'Morning': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'Afternoon': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Evening': return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'Night': return 'bg-slate-100 text-slate-800 border-slate-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const handleSave = async () => {
    // Validate all active templates
    const errors: Record<string, string> = {};
    templates.forEach(template => {
      if (template.isActive) {
        validateTemplate(template.templateId, {});
        const error = validationErrors[template.templateId];
        if (error) {
          errors[template.templateId] = error;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Errors",
        description: "Please fix the errors before saving.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await saveTemplatesMutation.mutateAsync({
        doctorId,
        templates: templates.filter(t => t.isActive)
      });
      
      setIsDirty(false);
      setValidationErrors({});
      toast({
        title: "Templates Saved",
        description: "Weekly templates have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save templates. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReset = () => {
    setTemplates(existingTemplates);
    setIsDirty(false);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Weekly Templates</span>
          <div className="flex gap-2">
            {isDirty && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={saveTemplatesMutation.isPending}
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saveTemplatesMutation.isPending}
            >
              {saveTemplatesMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Configure recurring weekly shifts. Only active templates will be applied.
        </div>
        
        <div className="space-y-4">
          {dayNames.map((dayName, dayIndex) => (
            <div key={dayIndex} className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-3">{dayName}</h3>
              
              <div className="space-y-3">
                {shiftNames.map((shiftName) => {
                  const template = getTemplate(dayIndex, shiftName);
                  if (!template) return null;
                  
                  return (
                    <div key={shiftName} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={(checked) => 
                            updateTemplate(template.templateId, { isActive: checked })
                          }
                        />
                        <Label className="font-medium capitalize">{shiftName}</Label>
                      </div>
                      
                      {template.isActive && (
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">Start</Label>
                            <Input
                              type="time"
                              value={template.startTime}
                              onChange={(e) => 
                                updateTemplate(template.templateId, { startTime: e.target.value })
                              }
                              className="h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">End</Label>
                            <Input
                              type="time"
                              value={template.endTime}
                              onChange={(e) => 
                                updateTemplate(template.templateId, { endTime: e.target.value })
                              }
                              className="h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Slot (min)</Label>
                            <Select
                              value={template.slotMinutes.toString()}
                              onValueChange={(value) => 
                                updateTemplate(template.templateId, { slotMinutes: parseInt(value) })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="45">45</SelectItem>
                                <SelectItem value="60">60</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Max Patients</Label>
                            <Input
                              type="number"
                              min="1"
                              value={template.maxPatients || ''}
                              onChange={(e) => 
                                updateTemplate(template.templateId, { 
                                  maxPatients: e.target.value ? parseInt(e.target.value) : null 
                                })
                              }
                              placeholder="∞"
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
