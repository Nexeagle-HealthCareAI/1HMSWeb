import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { pathologyService, PathologyReportTemplate } from '../services/pathologyService';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2 } from 'lucide-react';
import { ReportTemplateForm } from './ReportTemplateForm';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const ReportTemplateManager: React.FC = () => {
  const hospitalId = useAuthStore(state => state.hospitalId);
  const [templates, setTemplates] = useState<PathologyReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PathologyReportTemplate | null>(null);

  const fetchTemplates = async () => {
    if (!hospitalId) return;
    try {
      setLoading(true);
      const data = await pathologyService.getTemplates(hospitalId);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [hospitalId]);

  const handleAddNew = () => {
    setEditingTemplate(null);
    setIsFormOpen(true);
  };

  const handleEdit = (template: PathologyReportTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchTemplates();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Add Template
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden bg-white dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                  No templates configured.
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.templateId}>
                  <TableCell className="font-medium">{template.templateCode}</TableCell>
                  <TableCell>{template.templateName}</TableCell>
                  <TableCell>
                    {template.isDefault ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Default
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
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
        <ReportTemplateForm
          template={editingTemplate}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};
