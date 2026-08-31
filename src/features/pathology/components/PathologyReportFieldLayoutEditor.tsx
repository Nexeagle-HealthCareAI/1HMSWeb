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
      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2.5 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-600 shrink-0"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </button>

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

        {!field.builtIn && onRemove && (
          <button
            type="button"
            onClick={() => onRemove(field.key)}
            className="shrink-0 text-slate-400 hover:text-red-600"
            title="Delete this field"
            aria-label="Delete field"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 pl-7 sm:pl-0">
        <button
          type="button"
          onClick={() => update(field.key, { showInPad: !field.showInPad, showInPrint: !field.showInPad ? field.showInPrint : false })}
          className={`flex-1 sm:flex-none sm:w-28 shrink-0 flex items-center justify-center gap-1 h-9 rounded-md text-xs font-semibold border transition-colors ${
            field.showInPad ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
          title={padLabel}
        >
          {field.showInPad ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {field.showInPad ? padLabel : 'Hidden'}
        </button>

        <button
          type="button"
          onClick={() => field.showInPad && update(field.key, { showInPrint: !field.showInPrint })}
          disabled={!field.showInPad}
          className={`flex-1 sm:flex-none sm:w-24 shrink-0 flex items-center justify-center gap-1 h-9 rounded-md text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            field.showInPrint && field.showInPad ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}
          title={field.showInPad ? 'Include this field on the generated report' : `Enable "${padLabel}" first`}
        >
          <Printer className="h-3.5 w-3.5" />
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onItemsChange(defaultFields.map(f => ({ ...f })))} className="gap-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <div className="hidden sm:flex items-center gap-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span className="w-5" />
        <span className="flex-1">Field name</span>
        <span className="w-28 text-center">{padLabel}</span>
        <span className="w-24 text-center">On report</span>
      </div>

      <Reorder.Group axis="y" values={items} onReorder={onItemsChange} as="div" className="space-y-2">
        {items.map(field => (
          <FieldRow key={field.key} field={field} padLabel={padLabel} update={update} onRemove={remove} />
        ))}
      </Reorder.Group>
      {items.length === 0 && (
        <p className="text-xs text-slate-400 italic py-2">No fields yet -- add one below.</p>
      )}

      <div>
        {!showAdd ? (
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-1.5 border-dashed text-xs">
            <Plus className="h-4 w-4" /> Add field
          </Button>
        ) : (
          <div className="rounded-lg border border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20 p-3 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600">New field</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-semibold text-slate-600">Field name *</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 h-9 rounded-md" placeholder="e.g. Clinical History" />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-600">Field type</Label>
                <select
                  value={newType}
                  onChange={e => setNewType(e.target.value as PathologyFieldType)}
                  className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-500/25"
                >
                  {CUSTOM_FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {newType === 'select' && (
              <div>
                <Label className="text-[11px] font-semibold text-slate-600">Dropdown options (comma separated)</Label>
                <Input value={newOptions} onChange={e => setNewOptions(e.target.value)} className="mt-1 h-9 rounded-md" placeholder="e.g. Good, Hemolyzed, Clotted" />
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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={save} disabled={isSaving || !dirty} className="gap-1.5 disabled:opacity-50">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </Button>
      </div>

      <FieldListSection
        title="Report Fields"
        description="Filled in once per report -- e.g. Clinical History, Specimen Type, Comments."
        padLabel="In report details"
        items={reportItems}
        onItemsChange={setReportItems}
        defaultFields={DEFAULT_PATHOLOGY_REPORT_FIELDS}
      />

      <FieldListSection
        title="Per-Test Fields"
        description="Repeat on every test's result card, alongside Interpretation / Notes."
        padLabel="In result entry"
        items={lineItems}
        onItemsChange={setLineItems}
        defaultFields={DEFAULT_PATHOLOGY_LINE_FIELDS}
      />
    </div>
  );
};

export default PathologyReportFieldLayoutEditor;
