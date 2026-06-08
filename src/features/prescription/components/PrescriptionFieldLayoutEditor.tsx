import React, { useEffect, useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GripVertical, Save, Printer, Eye, EyeOff, Loader2, Stethoscope, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { usePrescriptionFieldLayout } from '../hooks/usePrescriptionFieldLayout';
import {
  DEFAULT_PRESCRIPTION_FIELDS,
  type PrescriptionFieldConfigItem,
  type PrescriptionFieldType,
} from '../services/prescriptionFieldLayoutApi';

interface Props {
  overrideDoctorId?: string;
}

// Field types a doctor can create (built-ins use 'builtin').
const CUSTOM_FIELD_TYPES: { value: PrescriptionFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'Dropdown' },
];
const typeLabel = (t?: PrescriptionFieldType) => CUSTOM_FIELD_TYPES.find(x => x.value === t)?.label ?? 'Field';

interface RowProps {
  field: PrescriptionFieldConfigItem;
  update: (key: string, patch: Partial<PrescriptionFieldConfigItem>) => void;
  onRemove?: (key: string) => void;
}

/** A single draggable field row (drag is initiated only from the grip handle, so the inputs stay usable). */
const FieldRow: React.FC<RowProps> = ({ field, update, onRemove }) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={field}
      as="div"
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-2 sm:gap-3 p-2.5 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Drag handle */}
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-600 shrink-0"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Label (rename) */}
      <div className="min-w-0 flex-1">
        <Input
          value={field.label}
          onChange={e => update(field.key, { label: e.target.value })}
          className="h-9 rounded-md"
        />
        {!field.builtIn && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">Custom · {typeLabel(field.type)}</span>
        )}
      </div>

      {/* Delete (custom fields only) */}
      {!field.builtIn && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(field.key)}
          className="shrink-0 text-slate-400 hover:text-red-600"
          title="Delete this custom field"
          aria-label="Delete custom field"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {/* Show in pad */}
      <button
        type="button"
        onClick={() => update(field.key, { showInPad: !field.showInPad, showInPrint: !field.showInPad ? field.showInPrint : false })}
        className={`w-20 sm:w-24 shrink-0 flex items-center justify-center gap-1 h-9 rounded-md text-xs font-semibold border transition-colors ${
          field.showInPad ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}
        title="Show this field in the consultation pad"
      >
        {field.showInPad ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {field.showInPad ? 'In pad' : 'Hidden'}
      </button>

      {/* Show on print */}
      <button
        type="button"
        onClick={() => field.showInPad && update(field.key, { showInPrint: !field.showInPrint })}
        disabled={!field.showInPad}
        className={`w-20 sm:w-24 shrink-0 flex items-center justify-center gap-1 h-9 rounded-md text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          field.showInPrint && field.showInPad ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}
        title={field.showInPad ? 'Include this field on the printed prescription' : 'Enable “In pad” first'}
      >
        <Printer className="h-3.5 w-3.5" />
        {field.showInPrint && field.showInPad ? 'Print' : 'No print'}
      </button>
    </Reorder.Item>
  );
};

/**
 * Editor for a doctor's personalized prescription field layout: rename fields, choose whether each
 * shows in the consult pad and/or on the printed prescription, and drag to reorder. Global per doctor.
 */
export const PrescriptionFieldLayoutEditor: React.FC<Props> = ({ overrideDoctorId }) => {
  const { fields, isLoading, saveLayout, isSaving } = usePrescriptionFieldLayout(overrideDoctorId);
  const [items, setItems] = useState<PrescriptionFieldConfigItem[]>([]);

  // "Add custom field" form state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PrescriptionFieldType>('text');
  const [newOptions, setNewOptions] = useState('');

  useEffect(() => {
    if (fields.length) setItems(fields.map(f => ({ ...f })));
  }, [fields]);

  const dirty = useMemo(() => JSON.stringify(items) !== JSON.stringify(fields), [items, fields]);

  const update = (key: string, patch: Partial<PrescriptionFieldConfigItem>) =>
    setItems(prev => prev.map(f => (f.key === key ? { ...f, ...patch } : f)));

  const remove = (key: string) => setItems(prev => prev.filter(f => f.key !== key));

  const addCustomField = () => {
    const label = newName.trim();
    if (!label) return;
    const options = newType === 'select'
      ? newOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;
    const item: PrescriptionFieldConfigItem = {
      key: `cf_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      label,
      type: newType,
      builtIn: false,
      showInPad: true,
      showInPrint: true,
      order: items.length,
      ...(options && options.length ? { options } : {}),
    };
    setItems(prev => [...prev, item]);
    setNewName('');
    setNewType('text');
    setNewOptions('');
    setShowAdd(false);
  };

  const resetDefaults = () => setItems(DEFAULT_PRESCRIPTION_FIELDS.map(f => ({ ...f })));

  const save = async () => {
    // Re-number order to match the current visual (dragged) order before persisting.
    const ordered = items.map((f, i) => ({ ...f, order: i }));
    await saveLayout(ordered);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 sm:p-4 bg-gradient-to-r from-brand-50 to-brand-50 dark:from-brand-900/20 dark:to-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-brand-600" />
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-brand-900 dark:text-brand-200">Prescription Fields</h3>
              <p className="text-xs sm:text-sm text-brand-700 dark:text-brand-300 hidden sm:block">
                Drag to reorder, rename, and choose where each field shows. Saved for you across all your hospitals.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <Button variant="outline" onClick={resetDefaults} className="text-xs sm:text-sm gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button
              onClick={save}
              disabled={isSaving || !dirty}
              className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm gap-1.5 disabled:opacity-50 flex-1 sm:flex-none"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
            </Button>
          </div>
        </div>
      </div>

      {/* Column legend */}
      <div className="hidden sm:flex items-center gap-3 px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="w-5" />
        <span className="flex-1">Field name</span>
        <span className="w-24 text-center">In pad</span>
        <span className="w-24 text-center">On print</span>
      </div>

      {/* Field list (drag-and-drop) */}
      <div className="flex-1 p-2 sm:p-3 overflow-y-auto">
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading your fields…
          </div>
        ) : (
          <>
            <Reorder.Group axis="y" values={items} onReorder={setItems} as="div" className="space-y-2">
              {items.map(field => (
                <FieldRow key={field.key} field={field} update={update} onRemove={remove} />
              ))}
            </Reorder.Group>

            {/* Add custom field */}
            <div className="mt-3">
              {!showAdd ? (
                <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-1.5 border-dashed">
                  <Plus className="h-4 w-4" /> Add custom field
                </Button>
              ) : (
                <div className="rounded-lg border border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20 p-3 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600">New custom field</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Field name *</Label>
                      <Input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 h-9 rounded-md" placeholder="e.g. Pain score (0–10)" />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Field type</Label>
                      <select
                        value={newType}
                        onChange={e => setNewType(e.target.value as PrescriptionFieldType)}
                        className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-500/25"
                      >
                        {CUSTOM_FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {newType === 'select' && (
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">Dropdown options (comma separated)</Label>
                      <Input value={newOptions} onChange={e => setNewOptions(e.target.value)} className="mt-1 h-9 rounded-md" placeholder="e.g. Mild, Moderate, Severe" />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => { setShowAdd(false); setNewName(''); setNewType('text'); setNewOptions(''); }} className="text-xs">Cancel</Button>
                    <Button onClick={addCustomField} disabled={!newName.trim()} className="text-xs bg-violet-600 hover:bg-violet-700 gap-1.5">
                      <Plus className="h-3.5 w-3.5" /> Add field
                    </Button>
                  </div>
                </div>
              )}
              <p className="mt-2 text-[11px] text-slate-400">Custom fields appear in the consult pad. (They’ll appear on the printed prescription in a later update.)</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PrescriptionFieldLayoutEditor;
