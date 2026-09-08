import React, { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyReportKeyword, PathologyTestMaster } from '../services/pathologyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Plus, Edit2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { RichTextField } from './RichTextField';
import { blocksToHtml, blocksToPlainText, parseKeywordContent, stringifyKeywordContent, type StyledBlock } from '../utils/richText';

const GLOBAL_SCOPE = '__global__';

type EditingKeyword = {
  keywordId?: string;
  testId?: string;   // GLOBAL_SCOPE sentinel or a real testId, resolved to null/testId on save
  keyword: string;
  html: string;
  blocks: StyledBlock[];
  isActive: boolean;
};

// A top-level "type a keyword, get a formatted paragraph" template manager, scoped per test or
// global (any test) -- see OrderResultEntry.tsx for where these actually get expanded while
// writing a report, and generatePathologyReportPdf.ts for how the formatting survives into print.
export const ReportKeywordsManager: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [keywords, setKeywords] = useState<PathologyReportKeyword[]>([]);
  const [tests, setTests] = useState<PathologyTestMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditingKeyword | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const testNameById = useMemo(() => new Map(tests.map(t => [t.testId, t.testName])), [tests]);

  const load = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const [kw, testList] = await Promise.all([
        pathologyService.getReportKeywords(hospitalId, undefined, true),
        pathologyService.getTests(hospitalId),
      ]);
      setKeywords(kw);
      setTests(testList);
    } catch {
      toast.error('Could not load report keywords');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [hospitalId]);

  const filteredKeywords = useMemo(() => {
    if (scopeFilter === 'all') return keywords;
    if (scopeFilter === GLOBAL_SCOPE) return keywords.filter(k => !k.testId);
    return keywords.filter(k => k.testId === scopeFilter);
  }, [keywords, scopeFilter]);

  const openNew = () => setEditing({ testId: GLOBAL_SCOPE, keyword: '', html: '', blocks: [], isActive: true });

  const openEdit = (k: PathologyReportKeyword) => {
    const blocks = parseKeywordContent(k.contentJson);
    setEditing({
      keywordId: k.keywordId,
      testId: k.testId ?? GLOBAL_SCOPE,
      keyword: k.keyword,
      html: blocksToHtml(blocks),
      blocks,
      isActive: k.isActive,
    });
  };

  const handleSave = async () => {
    if (!hospitalId || !editing?.keyword.trim()) {
      toast.error('Keyword name is required');
      return;
    }
    if (editing.blocks.length === 0 || blocksToPlainText(editing.blocks).trim().length === 0) {
      toast.error('The paragraph cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      const res = await pathologyService.upsertReportKeyword(hospitalId, {
        keywordId: editing.keywordId,
        testId: editing.testId === GLOBAL_SCOPE ? null : editing.testId,
        keyword: editing.keyword.trim(),
        contentJson: stringifyKeywordContent(editing.blocks),
        isActive: editing.isActive,
      });
      if (!res.success) throw new Error(res.message);
      toast.success(editing.keywordId ? 'Keyword updated' : 'Keyword added');
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save keyword');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Report Keywords</h2>
          <p className="text-sm text-muted-foreground">
            Type a keyword and press Enter while writing a report's Interpretation/Notes to expand it into a formatted paragraph.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="h-9 w-[200px] text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All scopes</SelectItem>
              <SelectItem value={GLOBAL_SCOPE}>Global (Any Test)</SelectItem>
              {tests.map(t => <SelectItem key={t.testId} value={t.testId}>{t.testName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Add Keyword
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-10"><LoadingSpinner /></div>
      ) : filteredKeywords.length === 0 ? (
        <div className="text-center p-10 border-2 border-dashed rounded-lg text-gray-500 text-sm">
          No report keywords configured yet.
        </div>
      ) : (
        <div className="border rounded-md divide-y bg-white dark:bg-slate-900">
          {filteredKeywords.map(k => {
            const preview = blocksToPlainText(parseKeywordContent(k.contentJson)).replace(/\n/g, ' ');
            return (
              <div key={k.keywordId} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Sparkles className="h-4 w-4 text-brand-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold font-mono">{k.keyword}</span>
                      <Badge variant="outline" className="text-[10px] h-5">
                        {k.testId ? (testNameById.get(k.testId) ?? k.testName ?? 'Test') : 'Global'}
                      </Badge>
                      {!k.isActive && <Badge variant="outline" className="text-[10px] h-5 text-slate-400">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-md">{preview || '—'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(k)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.keywordId ? 'Edit Keyword' : 'Add Keyword'}</SheetTitle>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Keyword *</Label>
                  <Input
                    value={editing.keyword}
                    onChange={(e) => setEditing(p => p && ({ ...p, keyword: e.target.value }))}
                    placeholder="e.g. normalcbc"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Applies To</Label>
                  <Select value={editing.testId} onValueChange={(v) => setEditing(p => p && ({ ...p, testId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GLOBAL_SCOPE}>Global (Any Test)</SelectItem>
                      {tests.map(t => <SelectItem key={t.testId} value={t.testId}>{t.testName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Paragraph *</Label>
                <RichTextField
                  value={editing.html}
                  onChange={(html, blocks) => setEditing(p => p && ({ ...p, html, blocks }))}
                  placeholder="Type the paragraph this keyword expands to..."
                  minHeight="140px"
                />
                <p className="text-[11px] text-muted-foreground">Select text, then apply Bold/Italic/Color/Font/Size/List/Align from the toolbar.</p>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch checked={editing.isActive} onCheckedChange={(v) => setEditing(p => p && ({ ...p, isActive: v }))} />
                <Label>Active</Label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ReportKeywordsManager;
