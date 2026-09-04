import React, { useEffect, useState } from 'react';
import { pathologyService, PathologyTestMaster } from '../services/pathologyService';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Activity, CheckCircle2 } from 'lucide-react';

// Standalone catalog search + checklist against PathologyTestMaster. Deliberately a NEW component
// rather than an extraction of PathologyNewOrderModal.tsx's Step 3 -- that block is woven together
// with edit-mode-only concerns (the "click again to confirm removing an already-reported test"
// flow) that don't apply to a fresh pick-and-submit flow, and pulling it out risked regressing an
// already-tested, working screen for no benefit here. This is the simple case only: search, check,
// done -- used by both the prescription pad's lab-order section and (in time) could replace the
// modal's create-mode picker if that's ever worth the risk.
export interface PathologyTestPickerProps {
  hospitalId: string;
  selectedTestIds: string[];
  onToggle: (testId: string) => void;
  className?: string;
}

export const PathologyTestPicker: React.FC<PathologyTestPickerProps> = ({ hospitalId, selectedTestIds, onToggle, className }) => {
  const [testCatalog, setTestCatalog] = useState<PathologyTestMaster[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!hospitalId) return;
    pathologyService.getTests(hospitalId).then(setTestCatalog).catch(() => setTestCatalog([]));
  }, [hospitalId]);

  const filteredTests = testCatalog.filter(t =>
    t.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.testCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={className}>
      <div className="relative group">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-brand-600 transition-colors" />
        <Input
          className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus-visible:ring-brand-500 shadow-inner"
          placeholder="Search catalog..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white mt-2">
        {testCatalog.length === 0 ? (
          <div className="p-4 text-center text-slate-500 flex flex-col items-center">
            <Activity className="h-6 w-6 text-slate-300 mb-1" />
            <p className="font-medium text-xs text-slate-600">No active tests in the catalog</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">No tests matching "{searchQuery}".</div>
        ) : (
          <ScrollArea className="h-[20vh] min-h-[140px]">
            <div className="divide-y divide-slate-100">
              {filteredTests.map((t) => (
                <label key={t.testId} className="flex items-center justify-between p-2 cursor-pointer transition-colors group hover:bg-brand-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center h-4 w-4 rounded border ${selectedTestIds.includes(t.testId) ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-300 bg-white group-hover:border-brand-400'}`}>
                      {selectedTestIds.includes(t.testId) && <CheckCircle2 className="h-3 w-3" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800 text-xs">{t.testName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{t.testCode}</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedTestIds.includes(t.testId)}
                    onChange={() => onToggle(t.testId)}
                  />
                </label>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default PathologyTestPicker;
