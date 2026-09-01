import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyTestMaster } from '../services/pathologyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit2 } from 'lucide-react';
import { TestCatalogForm } from './TestCatalogForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const TestCatalogManager: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [tests, setTests] = useState<PathologyTestMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sampleTypeFilter, setSampleTypeFilter] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<PathologyTestMaster | null>(null);

  const fetchTests = async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      const data = await pathologyService.getTests(hospitalId);
      setTests(data);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [hospitalId]);

  // Small dataset (a hospital's whole catalog, typically well under 200 rows) -- filtered entirely
  // client-side over the one already-loaded list, same pattern as ChargeMaster.tsx.
  const categoryOptions = useMemo(
    () => Array.from(new Set(tests.map(t => t.category).filter((c): c is string => !!c))).sort(),
    [tests]
  );
  const sampleTypeOptions = useMemo(
    () => Array.from(new Set(tests.map(t => t.sampleType).filter((s): s is string => !!s))).sort(),
    [tests]
  );
  const filteredTests = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return tests.filter(t => {
      const matchesSearch = !search || t.testName.toLowerCase().includes(search) || t.testCode.toLowerCase().includes(search);
      const matchesCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      const matchesSampleType = sampleTypeFilter === 'ALL' || t.sampleType === sampleTypeFilter;
      return matchesSearch && matchesCategory && matchesSampleType;
    });
  }, [tests, searchTerm, categoryFilter, sampleTypeFilter]);

  const handleAddNew = () => {
    setEditingTest(null);
    setIsFormOpen(true);
  };

  const handleEdit = (test: PathologyTestMaster) => {
    setEditingTest(test);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchTests();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sampleTypeFilter} onValueChange={setSampleTypeFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sample Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sample Types</SelectItem>
              {sampleTypeOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Add Test
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Test Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sample Type</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : filteredTests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                  No tests found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTests.map((test) => (
                <TableRow key={test.testId}>
                  <TableCell className="font-medium">{test.testCode}</TableCell>
                  <TableCell>{test.testName}</TableCell>
                  <TableCell>{test.category || '-'}</TableCell>
                  <TableCell>{test.sampleType || '-'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {test.price != null ? `₹${test.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : (
                      <span className="text-gray-400">Not priced</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${test.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {test.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(test)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isFormOpen && (
        <TestCatalogForm
          test={editingTest}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};
