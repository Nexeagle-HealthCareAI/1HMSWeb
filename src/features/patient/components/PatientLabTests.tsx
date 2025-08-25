import React, { useState } from 'react';
import { 
  TestTube, 
  Upload, 
  FileText, 
  Plus, 
  Eye, 
  Download, 
  Trash2, 
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface LabTestDocument {
  id: string;
  appointmentId: string;
  fileName: string;
  fileSize: string;
  uploadDate: Date;
  fileType: string;
  uploadedBy: string;
  description?: string;
}

interface LabTestResult {
  id: string;
  appointmentId: string;
  testName: string;
  testDate: Date;
  orderedBy: string;
  status: 'ordered' | 'collected' | 'completed' | 'cancelled';
  results: {
    parameter: string;
    value: string;
    unit: string;
    normalRange: string;
    status: 'normal' | 'high' | 'low' | 'critical';
    notes?: string;
  }[];
  notes?: string;
  attachments?: string[];
}

interface Appointment {
  id: string;
  date: Date;
  time: string;
  doctor: string;
  type: string;
}

interface PatientLabTestsProps {
  labTests: LabTestResult[];
  appointments: Appointment[];
}

export const PatientLabTests: React.FC<PatientLabTestsProps> = ({
  labTests,
  appointments
}) => {
  const [activeTab, setActiveTab] = useState('documents');
  const [uploadedDocuments, setUploadedDocuments] = useState<LabTestDocument[]>([]);
  const [manualTests, setManualTests] = useState<LabTestResult[]>(labTests);
  const [isAddingTest, setIsAddingTest] = useState(false);
  const [newTest, setNewTest] = useState<Partial<LabTestResult>>({
    testName: '',
    testDate: new Date(),
    orderedBy: '',
    status: 'ordered',
    results: [],
    notes: ''
  });
  const [newResult, setNewResult] = useState({
    parameter: '',
    value: '',
    unit: '',
    normalRange: '',
    status: 'normal' as const,
    notes: ''
  });

  const getStatusBadge = (status: LabTestResult['status']) => {
    const variants = {
      ordered: 'secondary',
      collected: 'outline',
      completed: 'default',
      cancelled: 'destructive'
    };
    return <Badge variant={variants[status] as any}>{status.toUpperCase()}</Badge>;
  };

  const getResultStatus = (status: 'normal' | 'high' | 'low' | 'critical') => {
    const colors = {
      normal: 'text-green-600',
      high: 'text-orange-600',
      low: 'text-blue-600',
      critical: 'text-red-600'
    };
    return colors[status];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocuments: LabTestDocument[] = Array.from(files).map((file, index) => ({
        id: `doc-${Date.now()}-${index}`,
        appointmentId: appointments[0]?.id || '',
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        uploadDate: new Date(),
        fileType: file.type,
        uploadedBy: 'Dr. Sarah Johnson',
        description: ''
      }));
      
      setUploadedDocuments(prev => [...prev, ...newDocuments]);
      toast({
        title: "Documents Uploaded",
        description: `${files.length} document(s) uploaded successfully.`,
      });
    }
  };

  const handleAddTest = () => {
    if (!newTest.testName || !newTest.orderedBy) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const testToAdd: LabTestResult = {
      id: `test-${Date.now()}`,
      appointmentId: appointments[0]?.id || '',
      testName: newTest.testName!,
      testDate: newTest.testDate!,
      orderedBy: newTest.orderedBy!,
      status: newTest.status!,
      results: newTest.results || [],
      notes: newTest.notes || ''
    };

    setManualTests(prev => [...prev, testToAdd]);
    setNewTest({
      testName: '',
      testDate: new Date(),
      orderedBy: '',
      status: 'ordered',
      results: [],
      notes: ''
    });
    setIsAddingTest(false);
    toast({
      title: "Test Added",
      description: "Lab test has been added successfully.",
    });
  };

  const handleAddResult = () => {
    if (!newResult.parameter || !newResult.value) {
      toast({
        title: "Missing Information",
        description: "Please fill in parameter and value.",
        variant: "destructive"
      });
      return;
    }

    setNewTest(prev => ({
      ...prev,
      results: [...(prev.results || []), { ...newResult }]
    }));
    setNewResult({
      parameter: '',
      value: '',
      unit: '',
      normalRange: '',
      status: 'normal',
      notes: ''
    });
  };

  const removeResult = (index: number) => {
    setNewTest(prev => ({
      ...prev,
      results: prev.results?.filter((_, i) => i !== index) || []
    }));
  };

  const deleteDocument = (docId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
    toast({
      title: "Document Deleted",
      description: "Document has been removed successfully.",
    });
  };

  const deleteTest = (testId: string) => {
    setManualTests(prev => prev.filter(test => test.id !== testId));
    toast({
      title: "Test Deleted",
      description: "Lab test has been removed successfully.",
    });
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center gap-2 mb-4 lg:mb-6">
        <TestTube className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
        <h2 className="text-xl lg:text-2xl font-bold">Lab Test Management</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Upload className="h-3 w-3 lg:h-4 lg:w-4" />
            Upload Documents
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <FileText className="h-3 w-3 lg:h-4 lg:w-4" />
            Manual Entry
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
            <Eye className="h-3 w-3 lg:h-4 lg:w-4" />
            View All Tests
          </TabsTrigger>
        </TabsList>

        {/* Documents Upload Tab */}
        <TabsContent value="documents" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="text-lg lg:text-xl">Upload Lab Test Documents</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 lg:space-y-6">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 lg:p-8 text-center hover:border-gray-400 transition-colors">
                <Upload className="h-10 w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-3 lg:mb-4" />
                <h3 className="text-base lg:text-lg font-semibold mb-2">Upload Lab Test Documents</h3>
                <p className="text-gray-600 mb-3 lg:mb-4 text-sm lg:text-base">
                  Drag and drop files here, or click to select files
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild>
                    <span>Choose Files</span>
                  </Button>
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX (Max 10MB each)
                </p>
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocuments.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Uploaded Documents</h4>
                  <div className="space-y-3">
                    {uploadedDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium">{doc.fileName}</p>
                            <p className="text-sm text-gray-600">
                              {doc.fileSize} • {doc.uploadDate.toLocaleDateString()} • {doc.uploadedBy}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manual Lab Test Entry
                </div>
                <Button onClick={() => setIsAddingTest(true)} disabled={isAddingTest}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Test
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAddingTest ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Test Name *</Label>
                      <Input
                        value={newTest.testName}
                        onChange={(e) => setNewTest(prev => ({ ...prev, testName: e.target.value }))}
                        placeholder="e.g., Complete Blood Count"
                      />
                    </div>
                    <div>
                      <Label>Test Date</Label>
                      <Input
                        type="date"
                        value={newTest.testDate?.toISOString().split('T')[0]}
                        onChange={(e) => setNewTest(prev => ({ ...prev, testDate: new Date(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label>Ordered By *</Label>
                      <Input
                        value={newTest.orderedBy}
                        onChange={(e) => setNewTest(prev => ({ ...prev, orderedBy: e.target.value }))}
                        placeholder="e.g., Dr. Sarah Johnson"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={newTest.status}
                        onValueChange={(value) => setNewTest(prev => ({ ...prev, status: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ordered">Ordered</SelectItem>
                          <SelectItem value="collected">Collected</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={newTest.notes}
                      onChange={(e) => setNewTest(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes about the test..."
                      rows={3}
                    />
                  </div>

                  {/* Test Results Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Test Results</Label>
                      <Button variant="outline" size="sm" onClick={handleAddResult}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Result
                      </Button>
                    </div>

                    {/* Add New Result Form */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label>Parameter *</Label>
                        <Input
                          value={newResult.parameter}
                          onChange={(e) => setNewResult(prev => ({ ...prev, parameter: e.target.value }))}
                          placeholder="e.g., Hemoglobin"
                        />
                      </div>
                      <div>
                        <Label>Value *</Label>
                        <Input
                          value={newResult.value}
                          onChange={(e) => setNewResult(prev => ({ ...prev, value: e.target.value }))}
                          placeholder="e.g., 14.2"
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input
                          value={newResult.unit}
                          onChange={(e) => setNewResult(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="e.g., g/dL"
                        />
                      </div>
                      <div>
                        <Label>Normal Range</Label>
                        <Input
                          value={newResult.normalRange}
                          onChange={(e) => setNewResult(prev => ({ ...prev, normalRange: e.target.value }))}
                          placeholder="e.g., 12.0-16.0"
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={newResult.status}
                          onValueChange={(value) => setNewResult(prev => ({ ...prev, status: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Input
                          value={newResult.notes}
                          onChange={(e) => setNewResult(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Additional notes..."
                        />
                      </div>
                    </div>

                    {/* Existing Results */}
                    {newTest.results && newTest.results.length > 0 && (
                      <div className="space-y-2">
                        <Label>Added Results</Label>
                        <div className="space-y-2">
                          {newTest.results.map((result, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                              <div className="flex items-center gap-4">
                                <span className="font-medium">{result.parameter}</span>
                                <span className="text-lg">{result.value} {result.unit}</span>
                                <Badge variant={result.status === 'normal' ? 'default' : 'destructive'}>
                                  {result.status.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-gray-600">{result.normalRange}</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeResult(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleAddTest}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Test
                    </Button>
                    <Button variant="outline" onClick={() => setIsAddingTest(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No manual tests added yet. Click "Add New Test" to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* View All Tests Tab */}
        <TabsContent value="view" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                All Lab Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {manualTests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No lab tests found. Add tests manually or upload documents.</p>
                  </div>
                ) : (
                  manualTests.map((test) => (
                    <div key={test.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold">{test.testName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {test.testDate.toLocaleDateString()} - {test.orderedBy}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(test.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTest(test.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {test.results && test.results.length > 0 && (
                        <div className="space-y-4">
                          <Label className="font-semibold">Results</Label>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-2">Parameter</th>
                                  <th className="text-left p-2">Value</th>
                                  <th className="text-left p-2">Unit</th>
                                  <th className="text-left p-2">Normal Range</th>
                                  <th className="text-left p-2">Status</th>
                                  <th className="text-left p-2">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {test.results.map((result, index) => (
                                  <tr key={index} className="border-b">
                                    <td className="p-2 font-medium">{result.parameter}</td>
                                    <td className="p-2 font-semibold">{result.value}</td>
                                    <td className="p-2 text-muted-foreground">{result.unit}</td>
                                    <td className="p-2 text-muted-foreground">{result.normalRange}</td>
                                    <td className="p-2">
                                      <Badge 
                                        variant={result.status === 'normal' ? 'default' : 'destructive'}
                                        className={getResultStatus(result.status)}
                                      >
                                        {result.status.toUpperCase()}
                                      </Badge>
                                    </td>
                                    <td className="p-2 text-sm">{result.notes}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {test.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <Label className="font-semibold">Notes</Label>
                          <p className="text-sm mt-1">{test.notes}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
