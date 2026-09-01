import React, { useEffect, useMemo, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GripVertical, Save, Printer, Eye, EyeOff, Loader2, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { usePathologyReportFieldLayout } from '../hooks/usePathologyReportFieldLayout';
import {
  DEFAULT_PATHOLOGY_LINE_FIELDS,
  DEFAULT_PATHOLOGY_REPORT_FIELDS,
  type PathologyFieldConfigItem,
  type PathologyFieldType,
} from '../services/pathologyFieldLayoutApi';

// Field types a hospital can create (built-ins use 'builtin').
const CUSTOM_FIELD_TYPES: { value: PathologyFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'Dropdown' },
];
const typeLabel = (t?: PathologyFieldType) => CUSTOM_FIELD_TYPES.find(x => x.value === t)?.label ?? 'Field';

interface RowProps {
  field: PathologyFieldConfigItem;
  padLabel: string;
  update: (key: string, patch: Partial<PathologyFieldConfigItem>) => void;
  onRemove?: (key: string) => void;
}

/** A single draggable field row (drag is initiated only from the grip handle, so the inputs stay usable). */
const FieldRow: React.FC<RowProps> = ({ field, padLabel, update, onRemove }) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={field}
      as="div"
      dragListener={false}
      dragControls={controls}
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl border border-white/60 bg-white/70 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:bg-white/90 transition-all duration-300"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-brand-500 shrink-0 p-1 bg-slate-50 hover:bg-brand-50 rounded-md transition-colors"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <Input
            value={field.label}
            onChange={e => update(field.key, { label: e.target.value })}
            className="h-10 rounded-lg bg-white/50 border-slate-200 focus:ring-brand-500/30 font-semibold text-slate-800"
          />
          {!field.builtIn && (
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-widest text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Custom · {typeLabel(field.type)}</span>
          )}
        </div>

        {!field.builtIn && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(field.key)}
            className="shrink-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete this field"
            aria-label="Delete field"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 pl-11 sm:pl-0">
        <button
          type="button"
          onClick={() => update(field.key, { showInPad: !field.showInPad, showInPrint: !field.showInPad ? field.showInPrint : false })}
          className={`flex-1 sm:flex-none sm:w-32 shrink-0 flex items-center justify-center gap-1.5 h-10 rounded-full text-xs font-bold border transition-all duration-300 ${
            field.showInPad ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title={padLabel}
        >
          {field.showInPad ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {field.showInPad ? padLabel : 'Hidden'}
        </button>

        <button
          type="button"
          onClick={() => field.showInPad && update(field.key, { showInPrint: !field.showInPrint })}
          disabled={!field.showInPad}
          className={`flex-1 sm:flex-none sm:w-28 shrink-0 flex items-center justify-center gap-1.5 h-10 rounded-full text-xs font-bold border transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
            field.showInPrint && field.showInPad ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-[0_0_10px_rgba(99,102,241,0.15)]' : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title={field.showInPad ? 'Include this field on the generated report' : `Enable "${padLabel}" first`}
        >
          <Printer className="h-4 w-4" />
          {field.showInPrint && field.showInPad ? 'On report' : 'No print'}
        </button>
      </div>
    </Reorder.Item>
  );
};

interface FieldListSectionProps {
  title: string;
  description: string;
  padLabel: string;
  items: PathologyFieldConfigItem[];
  onItemsChange: (items: PathologyFieldConfigItem[]) => void;
  defaultFields: PathologyFieldConfigItem[];
}

/** One arrangeable list (report-level or per-test) -- drag-reorder, rename, toggle visibility, add/remove custom fields. */
const FieldListSection: React.FC<FieldListSectionProps> = ({ title, description, padLabel, items, onItemsChange, defaultFields }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<PathologyFieldType>('text');
  const [newOptions, setNewOptions] = useState('');

  const update = (key: string, patch: Partial<PathologyFieldConfigItem>) =>
    onItemsChange(items.map(f => (f.key === key ? { ...f, ...patch } : f)));

  const remove = (key: string) => onItemsChange(items.filter(f => f.key !== key));

  const addCustomField = () => {
    const label = newName.trim();
    if (!label) return;
    const options = newType === 'select'
      ? newOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;
    const item: PathologyFieldConfigItem = {
      key: `cf_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      label,
      type: newType,
      builtIn: false,
      showInPad: true,
      showInPrint: true,
      order: items.length,
      ...(options && options.length ? { options } : {}),
    };
    onItemsChange([...items, item]);
    setNewName('');
    setNewType('text');
    setNewOptions('');
    setShowAdd(false);
  };

  return (
    <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-5 md:p-6 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h4>
          <p className="text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onItemsChange(defaultFields.map(f => ({ ...f })))} className="gap-2 text-xs font-semibold rounded-xl bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-slate-100 hover:text-slate-800 shadow-sm transition-all h-9 shrink-0 w-full sm:w-auto">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="hidden sm:flex items-center gap-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span className="w-9" />
        <span className="flex-1">Field Name</span>
        <span className="w-32 text-center">{padLabel}</span>
        <span className="w-28 text-center">On Report</span>
      </div>

      <Reorder.Group axis="y" values={items} onReorder={onItemsChange} as="div" className="space-y-3">
        {items.map(field => (
          <FieldRow key={field.key} field={field} padLabel={padLabel} update={update} onRemove={remove} />
        ))}
      </Reorder.Group>
      {items.length === 0 && (
        <div className="text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
           <p className="text-sm font-medium text-slate-400">No fields configured</p>
        </div>
      )}

      <div className="pt-2">
        {!showAdd ? (
          <Button variant="outline" onClick={() => setShowAdd(true)} className="w-full sm:w-auto gap-2 border-dashed border-slate-300 text-slate-500 hover:text-brand-600 hover:border-brand-300 hover:bg-brand-50/50 font-semibold rounded-xl h-11 transition-all">
            <Plus className="h-4 w-4" /> Add Custom Field
          </Button>
        ) : (
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/30 p-5 shadow-sm space-y-4 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-violet-700 mb-2">
               <div className="bg-violet-100 p-1.5 rounded-lg">
                 <Plus className="h-4 w-4" />
               </div>
               <p className="text-xs font-extrabold uppercase tracking-widest">New Field Setup</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-slate-700">Field Name <span className="text-red-500">*</span></Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1.5 h-11 rounded-xl bg-white/80 border-slate-200 focus:ring-violet-500/30 shadow-inner text-sm" placeholder="e.g. Clinical History" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700">Field Type</Label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as PathologyFieldType)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm bg-white/80 outline-none focus:ring-2 focus:ring-violet-500/30 shadow-inner"
                >
                  {CUSTOM_FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {newType === 'select' && (
              <div className="animate-in slide-in-from-top-1">
                <Label className="text-xs font-bold text-slate-700">Dropdown Options</Label>
                <Input value={newOptions} onChange={e => setNewOptions(e.target.value)} className="mt-1.5 h-11 rounded-xl bg-white/80 border-slate-200 focus:ring-violet-500/30 shadow-inner text-sm" placeholder="e.g. Normal, Abnormal, Hemolyzed (Comma separated)" />
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowAdd(false); setNewName(''); setNewType('text'); setNewOptions(''); }} className="h-10 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 border-slate-200 px-6">Cancel</Button>
              <Button onClick={addCustomField} disabled={!newName.trim()} className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 font-bold text-white shadow-md hover:shadow-lg transition-all gap-2 px-6">
                <Plus className="h-4 w-4" /> Add Field
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Editor for the hospital's pathology report field layout: two arrangeable lists -- report-level
 * fields (filled in once per report) and per-test fields (repeat on every test line, starting with
 * the built-in Interpretation / Notes). Drag to reorder, rename, toggle where each shows, add/remove
 * custom fields. Hospital-wide (not per-doctor) -- persisted via LabConfiguration.ReportFieldLayoutJson.
 */
export const PathologyReportFieldLayoutEditor: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const { reportFields, lineFields, isLoading, isSaving, saveLayout } = usePathologyReportFieldLayout(hospitalId || undefined);

  const [reportItems, setReportItems] = useState<PathologyFieldConfigItem[]>([]);
  const [lineItems, setLineItems] = useState<PathologyFieldConfigItem[]>([]);

  useEffect(() => {
    setReportItems(reportFields.map(f => ({ ...f })));
    setLineItems(lineFields.map(f => ({ ...f })));
  }, [reportFields, lineFields]);

  const dirty = useMemo(
    () => JSON.stringify(reportItems) !== JSON.stringify(reportFields) || JSON.stringify(lineItems) !== JSON.stringify(lineFields),
    [reportItems, lineItems, reportFields, lineFields],
  );

  const save = async () => {
    await saveLayout({
      reportFields: reportItems.map((f, i) => ({ ...f, order: i })),
      lineFields: lineItems.map((f, i) => ({ ...f, order: i })),
    });
  };

  if (isLoading && reportItems.length === 0 && lineItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading report fields…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 relative max-w-4xl mx-auto">
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-4 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
         <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Report Builder</h2>
            <p className="text-sm text-slate-500 mt-0.5">Configure how fields appear on pads and prints.</p>
         </div>
         <Button onClick={save} disabled={isSaving || !dirty} className="gap-2 h-11 px-6 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] transition-all disabled:opacity-50 disabled:shadow-none bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
        </Button>
      </div>

      <FieldListSection
        title="Report Fields"
        description="Filled in once per report -- e.g. Clinical History, Specimen Type, Comments."
        padLabel="In Report Details"
        items={reportItems}
        onItemsChange={setReportItems}
        defaultFields={DEFAULT_PATHOLOGY_REPORT_FIELDS}
      />

      <FieldListSection
        title="Per-Test Fields"
        description="Repeat on every test's result card, alongside Interpretation / Notes."
        padLabel="In Result Entry"
        items={lineItems}
        onItemsChange={setLineItems}
        defaultFields={DEFAULT_PATHOLOGY_LINE_FIELDS}
      />
    </div>
  );
};

export default PathologyReportFieldLayoutEditor;
