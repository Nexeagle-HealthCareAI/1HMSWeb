import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { nanoid } from 'nanoid';
import {
  Type,
  Image,
  Upload,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  Printer,
  Copy,
  Download,
  User,
  Palette,
  Settings,
  HelpCircle,
  Info,
  MousePointer,
  Square,
  Circle,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  FileText,
  Minus,
  Square as Rectangle,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Types
type CanvasElement = 
  | { 
      id: string; 
      type: 'text'; 
      x: number; 
      y: number; 
      width: number; 
      height: number; 
      zIndex: number; 
      content?: string; 
      style: { 
        fontFamily: string; 
        fontSize: number; 
        color: string; 
        fontWeight?: 'normal' | 'bold'; 
        textAlign?: 'left' | 'center' | 'right' 
      } 
    }
  | { 
      id: string; 
      type: 'image'; 
      x: number; 
      y: number; 
      width: number; 
      height: number; 
      zIndex: number; 
      src: string 
    }
  | {
      id: string;
      type: 'line';
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
      style: {
        strokeColor: string;
        strokeWidth: number;
        strokeStyle: 'solid' | 'dashed' | 'dotted';
      };
    }
  | {
      id: string;
      type: 'rectangle';
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
      style: {
        fillColor: string;
        strokeColor: string;
        strokeWidth: number;
        borderRadius: number;
      };
    }
  | {
      id: string;
      type: 'textbox';
      x: number;
      y: number;
      width: number;
      height: number;
      zIndex: number;
      content?: string;
      style: {
        fontFamily: string;
        fontSize: number;
        color: string;
        backgroundColor: string;
        borderColor: string;
        borderWidth: number;
        borderRadius: number;
        padding: number;
      };
    };

interface DesignJson {
  elements: CanvasElement[];
  styles: {
    fontFamily: string;
    fontSize: number;
    textColor: string;
    backgroundColor: string;
    backgroundImageUrl?: string | null;
  };
  logoUrl?: string | null;
}

interface PrescriptionTemplate {
  headerHtml: string;
  footerHtml: string;
  designJson?: DesignJson;
  logoUrl?: string;
  styles?: any;
  rowVersion?: string;
  updatedAt?: string;
}

interface PrescriptionCanvasEditorProps {
  hospitalId: string;
}

// API client helper
const jsonFetch = async (url: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
  }
  
  return response.json();
};

const copyToClipboardSafe = async (text: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' };
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const result = document.execCommand('copy');
      textArea.remove();
      return { success: result, method: 'execCommand' };
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return { success: false, method: 'failed', error };
  }
};

// A4 dimensions in pixels (assuming 96 DPI)
const A4_WIDTH = 794; // 210mm
const A4_HEIGHT = 1123; // 297mm
const PADDING = 45; // 12mm
const GRID_SIZE = 4; // 4px snap-to-grid

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Garamond', label: 'Garamond' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Montserrat', label: 'Montserrat' },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16];

export const PrescriptionCanvasEditor: React.FC<PrescriptionCanvasEditorProps> = ({ hospitalId }) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [styles, setStyles] = useState({
    fontFamily: 'Inter',
    fontSize: 12,
    textColor: '#000000',
    backgroundColor: '#ffffff',
    backgroundImageUrl: null as string | null,
  });
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [rowVersion, setRowVersion] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showClipboardFallback, setShowClipboardFallback] = useState(false);
  const [clipboardText, setClipboardText] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load template on mount
  useEffect(() => {
    loadTemplate();
  }, [hospitalId]);

  // Unsaved changes guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadTemplate = async () => {
    try {
      setIsLoading(true);
      const template = await jsonFetch(`/v1/hospitals/${hospitalId}/prescription-template`);
      
      if (template.designJson?.elements) {
        setElements(template.designJson.elements);
      }
      if (template.designJson?.styles) {
        setStyles(template.designJson.styles);
      }
      setLogoUrl(template.logoUrl || '');
      setRowVersion(template.rowVersion || '');
      setUpdatedAt(template.updatedAt || '');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to load template:', error);
      // Mock data for development
      setElements([
        {
          id: nanoid(),
          type: 'text',
          x: 50,
          y: 50,
          width: 200,
          height: 50,
          zIndex: 1,
          content: 'Sample Text',
          style: {
            fontFamily: 'Inter',
            fontSize: 12,
            color: '#000000',
            fontWeight: 'normal',
            textAlign: 'left',
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTemplate = async () => {
    try {
      setIsLoading(true);
      const designJson: DesignJson = {
        elements,
        styles,
        logoUrl: logoUrl || null,
      };
      
      const template: PrescriptionTemplate = {
        headerHtml: '',
        footerHtml: '',
        designJson,
        logoUrl,
        styles,
        rowVersion,
      };

      const response = await jsonFetch(`/v1/hospitals/${hospitalId}/prescription-template`, {
        method: 'PUT',
        body: JSON.stringify(template),
      });

      // Update row version and timestamp
      if (response.rowVersion) {
        setRowVersion(response.rowVersion);
      }
      if (response.updatedAt) {
        setUpdatedAt(response.updatedAt);
      }
      
      // Clear unsaved changes flag
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Failed to save template:', error);
      if (error.message.includes('409')) {
        alert('Template was modified by another user. Please reload and try again.');
      } else {
        alert('Failed to save template. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addElement = (type: 'text' | 'image' | 'line' | 'rectangle' | 'textbox') => {
    if (type === 'text') {
      const newElement: CanvasElement = {
        id: nanoid(),
        type: 'text',
        x: 50,
        y: 50,
        width: 200,
        height: 50,
        zIndex: elements.length + 1,
        content: 'New Text',
        style: {
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          color: styles.textColor,
          fontWeight: 'normal',
          textAlign: 'left',
        },
      };
      setElements(prev => [...prev, newElement]);
      setSelectedId(newElement.id);
      setHasUnsavedChanges(true);
    } else if (type === 'line') {
      const newElement: CanvasElement = {
        id: nanoid(),
        type: 'line',
        x: 50,
        y: 50,
        width: 200,
        height: 2,
        zIndex: elements.length + 1,
        style: {
          strokeColor: '#000000',
          strokeWidth: 2,
          strokeStyle: 'solid',
        },
      };
      setElements(prev => [...prev, newElement]);
      setSelectedId(newElement.id);
      setHasUnsavedChanges(true);
    } else if (type === 'rectangle') {
      const newElement: CanvasElement = {
        id: nanoid(),
        type: 'rectangle',
        x: 50,
        y: 50,
        width: 150,
        height: 100,
        zIndex: elements.length + 1,
        style: {
          fillColor: 'transparent',
          strokeColor: '#000000',
          strokeWidth: 1,
          borderRadius: 0,
        },
      };
      setElements(prev => [...prev, newElement]);
      setSelectedId(newElement.id);
      setHasUnsavedChanges(true);
    } else if (type === 'textbox') {
      const newElement: CanvasElement = {
        id: nanoid(),
        type: 'textbox',
        x: 50,
        y: 50,
        width: 200,
        height: 80,
        zIndex: elements.length + 1,
        content: 'Text Box',
        style: {
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          color: styles.textColor,
          backgroundColor: '#ffffff',
          borderColor: '#000000',
          borderWidth: 1,
          borderRadius: 4,
          padding: 8,
        },
      };
      setElements(prev => [...prev, newElement]);
      setSelectedId(newElement.id);
      setHasUnsavedChanges(true);
    }
  };

  const addDoctorToken = () => {
    const newElement: CanvasElement = {
      id: nanoid(),
      type: 'text',
      x: 50,
      y: 50,
      width: 300,
      height: 50,
      zIndex: elements.length + 1,
      content: '{{Doctor.FullName}} — {{Doctor.Qualification}}',
      style: {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        color: styles.textColor,
        fontWeight: 'normal',
        textAlign: 'left',
      },
    };

    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    setHasUnsavedChanges(true);
  };

  const uploadImage = async (file: File) => {
    try {
      // Prepare upload
      const prepareResponse = await jsonFetch(`/v1/hospitals/${hospitalId}/prescription-template/logo:prepare`, {
        method: 'POST',
        body: JSON.stringify({
          extension: file.name.split('.').pop(),
          contentType: file.type,
        }),
      });

      // Upload to blob storage
      await fetch(prepareResponse.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      // Finalize upload
      const finalizeResponse = await jsonFetch(`/v1/hospitals/${hospitalId}/prescription-template/logo:finalize`, {
        method: 'POST',
        body: JSON.stringify({
          objectKey: prepareResponse.objectKey,
        }),
      });

      const newElement: CanvasElement = {
        id: nanoid(),
        type: 'image',
        x: 50,
        y: 50,
        width: 150,
        height: 150,
        zIndex: elements.length + 1,
        src: finalizeResponse.url,
      };

      setElements(prev => [...prev, newElement]);
      setSelectedId(newElement.id);
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const addLogoToCanvas = () => {
    if (logoUrl) {
      const newElement: CanvasElement = {
        id: nanoid(),
        type: 'image',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        zIndex: elements.length + 1,
        src: logoUrl,
      };

      setElements(prev => [...prev, newElement]);
      setSelectedId(newElement.id);
    }
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedId(null);
    setHasUnsavedChanges(true);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(prev =>
      prev.map(el => {
        if (el.id === id) {
          // Type-safe update based on element type
          if (el.type === 'text' && updates.type === 'text') {
            return { ...el, ...updates } as CanvasElement;
          } else if (el.type === 'image' && updates.type === 'image') {
            return { ...el, ...updates } as CanvasElement;
          } else {
            // Handle non-type-changing updates
            return { ...el, ...updates } as CanvasElement;
          }
        }
        return el;
      })
    );
    setHasUnsavedChanges(true);
  };

  const bringForward = (id: string) => {
    setElements(prev => {
      const maxZ = Math.max(...prev.map(el => el.zIndex));
      return prev.map(el =>
        el.id === id ? { ...el, zIndex: maxZ + 1 } : el
      );
    });
  };

  const sendBackward = (id: string) => {
    setElements(prev => {
      const minZ = Math.min(...prev.map(el => el.zIndex));
      return prev.map(el =>
        el.id === id ? { ...el, zIndex: minZ - 1 } : el
      );
    });
  };

  const generatePrintableHTML = () => {
    const elementsHTML = elements
      .sort((a, b) => a.zIndex - b.zIndex)
      .map(element => {
        if (element.type === 'text') {
          return `
            <div style="
              position: absolute;
              left: ${element.x}px;
              top: ${element.y}px;
              width: ${element.width}px;
              height: ${element.height}px;
              font-family: ${element.style?.fontFamily || 'Inter'};
              font-size: ${element.style?.fontSize || 12}pt;
              color: ${element.style?.color || '#000000'};
              font-weight: ${element.style?.fontWeight || 'normal'};
              text-align: ${element.style?.textAlign || 'left'};
              z-index: ${element.zIndex};
            ">${element.content || ''}</div>
          `;
        } else if (element.type === 'image') {
          return `
            <img src="${element.src}" style="
              position: absolute;
              left: ${element.x}px;
              top: ${element.y}px;
              width: ${element.width}px;
              height: ${element.height}px;
              z-index: ${element.zIndex};
            " />
          `;
        } else if (element.type === 'line') {
          return `
            <div style="
              position: absolute;
              left: ${element.x}px;
              top: ${element.y}px;
              width: ${element.width}px;
              height: ${element.height}px;
              background-color: ${element.style?.strokeColor || '#000000'};
              border-top: ${element.style?.strokeWidth || 2}px ${element.style?.strokeStyle || 'solid'} ${element.style?.strokeColor || '#000000'};
              z-index: ${element.zIndex};
            "></div>
          `;
        } else if (element.type === 'rectangle') {
          return `
            <div style="
              position: absolute;
              left: ${element.x}px;
              top: ${element.y}px;
              width: ${element.width}px;
              height: ${element.height}px;
              background-color: ${element.style?.fillColor || 'transparent'};
              border: ${element.style?.strokeWidth || 1}px solid ${element.style?.strokeColor || '#000000'};
              border-radius: ${element.style?.borderRadius || 0}px;
              z-index: ${element.zIndex};
            "></div>
          `;
        } else if (element.type === 'textbox') {
          return `
            <div style="
              position: absolute;
              left: ${element.x}px;
              top: ${element.y}px;
              width: ${element.width}px;
              height: ${element.height}px;
              font-family: ${element.style?.fontFamily || 'Inter'};
              font-size: ${element.style?.fontSize || 12}pt;
              color: ${element.style?.color || '#000000'};
              background-color: ${element.style?.backgroundColor || '#ffffff'};
              border: ${element.style?.borderWidth || 1}px solid ${element.style?.borderColor || '#000000'};
              border-radius: ${element.style?.borderRadius || 4}px;
              padding: ${element.style?.padding || 8}px;
              z-index: ${element.zIndex};
            ">${element.content || ''}</div>
          `;
        }
        return '';
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Prescription Template</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Inter, sans-serif;
          }
          .page {
            width: ${A4_WIDTH}px;
            height: ${A4_HEIGHT}px;
            margin: 0 auto;
            background: white;
            position: relative;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          @media print {
            .page {
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${elementsHTML}
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintPreview = () => {
    const html = generatePrintableHTML();
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  const handleCopyHTML = async () => {
    const html = generatePrintableHTML();
    const result = await copyToClipboardSafe(html);
    
    if (result.success) {
      alert('HTML copied to clipboard!');
    } else {
      // Show fallback modal
      setClipboardText(html);
      setShowClipboardFallback(true);
    }
  };

  const handleDownloadHTML = () => {
    const html = generatePrintableHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prescription-template.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  // Save to history
  const saveToHistory = useCallback((newElements: CanvasElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newElements]);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Undo/Redo functions
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => {
    if (canUndo) {
      setHistoryIndex(prev => prev - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (canRedo) {
      setHistoryIndex(prev => prev + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  // Save to history when elements change
  useEffect(() => {
    if (elements.length > 0) {
      saveToHistory(elements);
    }
  }, [elements, saveToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            saveTemplate();
            break;
        }
      } else if (selectedId) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          deleteElement(selectedId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, canUndo, canRedo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Welcome Modal */}
        {showWelcome && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Welcome to Prescription Canvas Editor!</h2>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <p>🎨 <strong>Drag & Drop:</strong> Add elements and position them freely</p>
                <p>✏️ <strong>Click to Edit:</strong> Double-click text elements to edit</p>
                <p>⌨️ <strong>Keyboard Shortcuts:</strong> Ctrl+Z (Undo), Ctrl+Y (Redo), Delete</p>
                <p>💾 <strong>Auto-Save:</strong> Your work is automatically saved</p>
                <p>📱 <strong>Responsive:</strong> Works on all screen sizes</p>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={() => setShowWelcome(false)} className="flex-1">
                  Get Started
                </Button>
                <Button variant="outline" onClick={() => setShowHelp(true)}>
                  Show Help
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <HelpCircle className="h-6 w-6 text-blue-600" />
                  Canvas Editor Help
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowHelp(false)}>
                  ✕
                </Button>
              </div>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold mb-2">🎯 Getting Started</h3>
                                     <ul className="space-y-1 text-gray-600">
                     <li>• Click "Add Text" to add text elements</li>
                     <li>• Click "Add Doctor Token" for doctor information placeholders</li>
                     <li>• Click "Add Line" to add horizontal lines (solid, dashed, dotted)</li>
                     <li>• Click "Add Rectangle" to add shape containers</li>
                     <li>• Click "Add Text Box" to add bordered text areas</li>
                     <li>• Upload images or add logos from the toolbar</li>
                     <li>• Drag elements to position them on the canvas</li>
                   </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">⌨️ Keyboard Shortcuts</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Z</kbd> Undo</li>
                    <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+Y</kbd> Redo</li>
                    <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Delete</kbd> Remove selected element</li>
                    <li>• <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl+S</kbd> Save template</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">🎨 Editing Elements</h3>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Click an element to select it</li>
                    <li>• Use the inspector panel to adjust properties</li>
                    <li>• Double-click text to edit content</li>
                    <li>• Drag corners to resize elements</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clipboard Fallback Modal */}
        {showClipboardFallback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Copy className="h-6 w-6 text-blue-600" />
                  Copy HTML Code
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setShowClipboardFallback(false)}>
                  ✕
                </Button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Clipboard access was blocked. Please copy the HTML code manually:
                </p>
                <div className="relative">
                  <textarea
                    value={clipboardText}
                    readOnly
                    className="w-full h-64 p-3 border rounded-lg font-mono text-xs bg-gray-50"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (textarea) {
                        textarea.select();
                        document.execCommand('copy');
                        alert('HTML code selected! Press Ctrl+C to copy.');
                      }
                    }}
                  >
                    Select All
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowClipboardFallback(false)}>
                    Close
                  </Button>
                  <Button variant="outline" onClick={handleDownloadHTML}>
                    Download HTML
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

                {/* Toolbar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-4 overflow-y-auto">
          {/* Header with Help */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Toolbar</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHelp(true)}
                  className="h-8 w-8 p-0"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show help and keyboard shortcuts</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Quick Stats */}
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <div className="text-xs text-blue-700">
              <div className="flex justify-between">
                <span>Elements:</span>
                <span className="font-medium">{elements.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Selected:</span>
                <span className="font-medium">{selectedId ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Add Elements
            </h4>
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => addElement('text')}
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add a text element to the canvas</p>
                </TooltipContent>
              </Tooltip>

                             <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full justify-start"
                     onClick={addDoctorToken}
                   >
                     <User className="h-4 w-4 mr-2" />
                     Add Doctor Token
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Add doctor information placeholder</p>
                 </TooltipContent>
               </Tooltip>

               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full justify-start"
                     onClick={() => addElement('line')}
                   >
                     <Minus className="h-4 w-4 mr-2" />
                     Add Line
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Add a horizontal line to the canvas</p>
                 </TooltipContent>
               </Tooltip>

               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full justify-start"
                     onClick={() => addElement('rectangle')}
                   >
                     <Rectangle className="h-4 w-4 mr-2" />
                     Add Rectangle
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Add a rectangle shape to the canvas</p>
                 </TooltipContent>
               </Tooltip>

               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full justify-start"
                     onClick={() => addElement('textbox')}
                   >
                     <MessageSquare className="h-4 w-4 mr-2" />
                     Add Text Box
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Add a text box with border and background</p>
                 </TooltipContent>
               </Tooltip>

               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button
                     variant="outline"
                     size="sm"
                     className="w-full justify-start"
                     onClick={() => document.getElementById('image-upload')?.click()}
                   >
                     <Upload className="h-4 w-4 mr-2" />
                     Upload Image
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Upload and add an image to the canvas</p>
                 </TooltipContent>
               </Tooltip>

              <input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />

              {logoUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={addLogoToCanvas}
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Add Logo
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add the hospital logo to the canvas</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Global Styles</h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Font Family</Label>
              <Select value={styles.fontFamily} onValueChange={(value) => setStyles(prev => ({ ...prev, fontFamily: value }))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map(font => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Font Size</Label>
              <Select value={styles.fontSize.toString()} onValueChange={(value) => setStyles(prev => ({ ...prev, fontSize: parseInt(value) }))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZES.map(size => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}pt
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Text Color</Label>
              <Input
                type="color"
                value={styles.textColor}
                onChange={(e) => setStyles(prev => ({ ...prev, textColor: e.target.value }))}
                className="h-8 w-full"
              />
            </div>

            <div>
              <Label className="text-xs">Background Color</Label>
              <Input
                type="color"
                value={styles.backgroundColor}
                onChange={(e) => setStyles(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="h-8 w-full"
              />
            </div>
          </div>
        </div>

                  <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Actions
            </h4>
            <div className="space-y-2">
              {/* Undo/Redo */}
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={undo}
                      disabled={!canUndo}
                    >
                      <Undo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Undo (Ctrl+Z)</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={redo}
                      disabled={!canRedo}
                    >
                      <Redo className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Redo (Ctrl+Y)</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Layer Management */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => selectedId && bringForward(selectedId)}
                    disabled={!selectedId}
                  >
                    <MoveUp className="h-4 w-4 mr-2" />
                    Bring Forward
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move selected element to front</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => selectedId && sendBackward(selectedId)}
                    disabled={!selectedId}
                  >
                    <MoveDown className="h-4 w-4 mr-2" />
                    Send Backward
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move selected element to back</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-red-600"
                    onClick={() => selectedId && deleteElement(selectedId)}
                    disabled={!selectedId}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete selected element (Delete key)</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

                  <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export & Save
            </h4>
            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={saveTemplate}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Template
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save template to server (Ctrl+S)</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handlePrintPreview}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview how the prescription will look when printed</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleCopyHTML}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy HTML
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy the HTML code to clipboard</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleDownloadHTML}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download HTML
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download the HTML file</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
      </div>

              {/* Canvas */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Prescription Template Editor</h2>
                <p className="text-sm text-gray-600">A4 Canvas with snap-to-grid • Drag elements to position them</p>
              </div>
                             <div className="flex items-center gap-2">
                 {elements.length === 0 && (
                   <Alert className="w-auto">
                     <Info className="h-4 w-4" />
                     <AlertDescription>
                       Start by adding elements from the toolbar
                     </AlertDescription>
                   </Alert>
                 )}
                 <div className="text-xs text-gray-500">
                   {elements.length} element{elements.length !== 1 ? 's' : ''}
                 </div>
                 {hasUnsavedChanges && (
                   <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                     Unsaved changes
                   </div>
                 )}
                 {updatedAt && (
                   <div className="text-xs text-gray-400">
                     Last saved: {new Date(updatedAt).toLocaleString()}
                   </div>
                 )}
               </div>
            </div>
          </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-gray-100">
          <div
            ref={canvasRef}
            className="relative bg-white shadow-lg"
            style={{
              width: A4_WIDTH,
              height: A4_HEIGHT,
              padding: PADDING,
            }}
          >
            {/* Background */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: styles.backgroundColor,
                backgroundImage: styles.backgroundImageUrl ? `url(${styles.backgroundImageUrl})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

            {/* Elements */}
            {elements
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((element) => (
                <Rnd
                  key={element.id}
                  position={{ x: element.x, y: element.y }}
                  size={{ width: element.width, height: element.height }}
                  onDragStop={(e, d) => {
                    updateElement(element.id, { x: d.x, y: d.y });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElement(element.id, {
                      x: position.x,
                      y: position.y,
                      width: ref.offsetWidth,
                      height: ref.offsetHeight,
                    });
                  }}
                                     bounds="parent"
                   grid={[GRID_SIZE, GRID_SIZE]}
                  onClick={() => setSelectedId(element.id)}
                  className={`cursor-move ${
                    selectedId === element.id
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : ''
                  }`}
                >
                                     {element.type === 'text' && (
                     <div
                       contentEditable
                       suppressContentEditableWarning
                       onBlur={(e) =>
                         updateElement(element.id, { content: e.currentTarget.innerHTML })
                       }
                       style={{
                         width: '100%',
                         height: '100%',
                         fontFamily: element.style?.fontFamily || 'Inter',
                         fontSize: `${element.style?.fontSize || 12}pt`,
                         color: element.style?.color || '#000000',
                         fontWeight: element.style?.fontWeight || 'normal',
                         textAlign: (element.style?.textAlign as any) || 'left',
                         outline: 'none',
                         cursor: 'text',
                       }}
                       dangerouslySetInnerHTML={{ __html: element.content || '' }}
                     />
                   )}
                   {element.type === 'image' && (
                     <img
                       src={element.src}
                       alt=""
                       style={{
                         width: '100%',
                         height: '100%',
                         objectFit: 'contain',
                       }}
                     />
                   )}
                   {element.type === 'line' && (
                     <div
                       style={{
                         width: '100%',
                         height: '100%',
                         backgroundColor: element.style?.strokeColor || '#000000',
                         borderTop: `${element.style?.strokeWidth || 2}px ${element.style?.strokeStyle || 'solid'} ${element.style?.strokeColor || '#000000'}`,
                       }}
                     />
                   )}
                   {element.type === 'rectangle' && (
                     <div
                       style={{
                         width: '100%',
                         height: '100%',
                         backgroundColor: element.style?.fillColor || 'transparent',
                         border: `${element.style?.strokeWidth || 1}px solid ${element.style?.strokeColor || '#000000'}`,
                         borderRadius: `${element.style?.borderRadius || 0}px`,
                       }}
                     />
                   )}
                   {element.type === 'textbox' && (
                     <div
                       contentEditable
                       suppressContentEditableWarning
                       onBlur={(e) =>
                         updateElement(element.id, { content: e.currentTarget.innerHTML })
                       }
                       style={{
                         width: '100%',
                         height: '100%',
                         fontFamily: element.style?.fontFamily || 'Inter',
                         fontSize: `${element.style?.fontSize || 12}pt`,
                         color: element.style?.color || '#000000',
                         backgroundColor: element.style?.backgroundColor || '#ffffff',
                         border: `${element.style?.borderWidth || 1}px solid ${element.style?.borderColor || '#000000'}`,
                         borderRadius: `${element.style?.borderRadius || 4}px`,
                         padding: `${element.style?.padding || 8}px`,
                         outline: 'none',
                         cursor: 'text',
                       }}
                       dangerouslySetInnerHTML={{ __html: element.content || '' }}
                     />
                   )}
                </Rnd>
              ))}
          </div>
        </div>
      </div>

      {/* Inspector Panel */}
      {selectedElement && (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Inspector</h3>
          
          <Tabs defaultValue="properties" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">X Position</Label>
                  <Input
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { x: parseInt(e.target.value) || 0 })
                    }
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y Position</Label>
                  <Input
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { y: parseInt(e.target.value) || 0 })
                    }
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Width</Label>
                  <Input
                    type="number"
                    value={selectedElement.width}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { width: parseInt(e.target.value) || 0 })
                    }
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height</Label>
                  <Input
                    type="number"
                    value={selectedElement.height}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { height: parseInt(e.target.value) || 0 })
                    }
                    className="h-8"
                  />
                </div>
              </div>
            </TabsContent>

                         <TabsContent value="style" className="space-y-4">
               {selectedElement.type === 'text' && (
                 <>
                   <div>
                     <Label className="text-xs">Font Family</Label>
                     <Select
                       value={selectedElement.style?.fontFamily || 'Inter'}
                       onValueChange={(value) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, fontFamily: value },
                         })
                       }
                     >
                       <SelectTrigger className="h-8">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {FONT_FAMILIES.map(font => (
                           <SelectItem key={font.value} value={font.value}>
                             {font.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   <div>
                     <Label className="text-xs">Font Size</Label>
                     <Select
                       value={(selectedElement.style?.fontSize || 12).toString()}
                       onValueChange={(value) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, fontSize: parseInt(value) },
                         })
                       }
                     >
                       <SelectTrigger className="h-8">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {FONT_SIZES.map(size => (
                           <SelectItem key={size} value={size.toString()}>
                             {size}pt
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   <div>
                     <Label className="text-xs">Text Color</Label>
                     <Input
                       type="color"
                       value={selectedElement.style?.color || '#000000'}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, color: e.target.value },
                         })
                       }
                       className="h-8 w-full"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Font Weight</Label>
                     <Select
                       value={selectedElement.style?.fontWeight || 'normal'}
                       onValueChange={(value) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, fontWeight: value as 'normal' | 'bold' },
                         })
                       }
                     >
                       <SelectTrigger className="h-8">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="normal">Normal</SelectItem>
                         <SelectItem value="bold">Bold</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>

                   <div>
                     <Label className="text-xs">Text Align</Label>
                     <Select
                       value={selectedElement.style?.textAlign || 'left'}
                       onValueChange={(value) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, textAlign: value as 'left' | 'center' | 'right' },
                         })
                       }
                     >
                       <SelectTrigger className="h-8">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="left">Left</SelectItem>
                         <SelectItem value="center">Center</SelectItem>
                         <SelectItem value="right">Right</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </>
               )}

               {selectedElement.type === 'line' && (
                 <>
                   <div>
                     <Label className="text-xs">Line Color</Label>
                     <Input
                       type="color"
                       value={selectedElement.style?.strokeColor || '#000000'}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, strokeColor: e.target.value },
                         })
                       }
                       className="h-8 w-full"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Line Width</Label>
                     <Input
                       type="number"
                       min="1"
                       max="10"
                       value={selectedElement.style?.strokeWidth || 2}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, strokeWidth: parseInt(e.target.value) || 2 },
                         })
                       }
                       className="h-8"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Line Style</Label>
                     <Select
                       value={selectedElement.style?.strokeStyle || 'solid'}
                       onValueChange={(value) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, strokeStyle: value as 'solid' | 'dashed' | 'dotted' },
                         })
                       }
                     >
                       <SelectTrigger className="h-8">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="solid">Solid</SelectItem>
                         <SelectItem value="dashed">Dashed</SelectItem>
                         <SelectItem value="dotted">Dotted</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </>
               )}

               {selectedElement.type === 'rectangle' && (
                 <>
                   <div>
                     <Label className="text-xs">Fill Color</Label>
                     <Input
                       type="color"
                       value={selectedElement.style?.fillColor || 'transparent'}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, fillColor: e.target.value },
                         })
                       }
                       className="h-8 w-full"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Border Color</Label>
                     <Input
                       type="color"
                       value={selectedElement.style?.strokeColor || '#000000'}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, strokeColor: e.target.value },
                         })
                       }
                       className="h-8 w-full"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Border Width</Label>
                     <Input
                       type="number"
                       min="0"
                       max="10"
                       value={selectedElement.style?.strokeWidth || 1}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, strokeWidth: parseInt(e.target.value) || 1 },
                         })
                       }
                       className="h-8"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Border Radius</Label>
                     <Input
                       type="number"
                       min="0"
                       max="50"
                       value={selectedElement.style?.borderRadius || 0}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) || 0 },
                         })
                       }
                       className="h-8"
                     />
                   </div>
                 </>
               )}

               {selectedElement.type === 'textbox' && (
                 <>
                   <div>
                     <Label className="text-xs">Font Family</Label>
                     <Select
                       value={selectedElement.style?.fontFamily || 'Inter'}
                       onValueChange={(value) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, fontFamily: value },
                         })
                       }
                     >
                       <SelectTrigger className="h-8">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {FONT_FAMILIES.map(font => (
                           <SelectItem key={font.value} value={font.value}>
                             {font.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   <div>
                     <Label className="text-xs">Font Size</Label>
                     <Select
                       value={(selectedElement.style?.fontSize || 12).toString()}
                       onValueChange={(value) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, fontSize: parseInt(value) },
                         })
                       }
                     >
                       <SelectTrigger className="h-8">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {FONT_SIZES.map(size => (
                           <SelectItem key={size} value={size.toString()}>
                             {size}pt
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   <div>
                     <Label className="text-xs">Text Color</Label>
                     <Input
                       type="color"
                       value={selectedElement.style?.color || '#000000'}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, color: e.target.value },
                         })
                       }
                       className="h-8 w-full"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Background Color</Label>
                     <Input
                       type="color"
                       value={selectedElement.style?.backgroundColor || '#ffffff'}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, backgroundColor: e.target.value },
                         })
                       }
                       className="h-8 w-full"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Border Color</Label>
                     <Input
                       type="color"
                       value={selectedElement.style?.borderColor || '#000000'}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, borderColor: e.target.value },
                         })
                       }
                       className="h-8 w-full"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Border Width</Label>
                     <Input
                       type="number"
                       min="0"
                       max="10"
                       value={selectedElement.style?.borderWidth || 1}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, borderWidth: parseInt(e.target.value) || 1 },
                         })
                       }
                       className="h-8"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Border Radius</Label>
                     <Input
                       type="number"
                       min="0"
                       max="20"
                       value={selectedElement.style?.borderRadius || 4}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) || 4 },
                         })
                       }
                       className="h-8"
                     />
                   </div>

                   <div>
                     <Label className="text-xs">Padding</Label>
                     <Input
                       type="number"
                       min="0"
                       max="20"
                       value={selectedElement.style?.padding || 8}
                       onChange={(e) =>
                         updateElement(selectedElement.id, {
                           style: { ...selectedElement.style, padding: parseInt(e.target.value) || 8 },
                         })
                       }
                       className="h-8"
                     />
                   </div>
                 </>
               )}
             </TabsContent>
          </Tabs>
        </div>
      )}
        </div>
      </TooltipProvider>
    );
  };

// Wrapper component
const PrescriptionCanvasEditorWrapper: React.FC<PrescriptionCanvasEditorProps> = (props) => {
  return <PrescriptionCanvasEditor {...props} />;
};

export default PrescriptionCanvasEditorWrapper;
