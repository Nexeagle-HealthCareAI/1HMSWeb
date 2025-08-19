import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { nanoid } from 'nanoid';
import {
  Type,
  Image,
  Upload,
  Save,
  Download,
  Copy,
  Palette,
  Settings,
  Menu,
  X,
  MousePointer,
  Square,
  Minus,
  User,
  FileText,
  Layout,
  Trash2,
  RotateCcw,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Plus,
  Search,
  Star,
  Circle,
  Triangle,
  Move3D,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import PrescriptionTemplates from '@/components/ui/PrescriptionTemplates';

// Types
interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  borderRadius?: number;
  rotation?: number;
}

interface Element {
  id: string;
  type: 'text' | 'line' | 'rectangle' | 'circle' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  src?: string;
  style?: ElementStyle;
}

interface Template {
  name: string;
  elements: Element[];
}



// Main Editor Component
const PrescriptionCanvasEditor: React.FC = () => {
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState('#ffffff');
  const [showElementToolbar, setShowElementToolbar] = useState(false);
  
  // Background image states
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundSize, setBackgroundSize] = useState(100);
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [showBackgroundControls, setShowBackgroundControls] = useState(false);
  
  // Resize states
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [resizeStartElementPos, setResizeStartElementPos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  // Canvas dimensions (A4)
  const CANVAS_WIDTH = 794;
  const CANVAS_HEIGHT = 1123;

  // Initialize with a sample template
  useEffect(() => {
    if (elements.length === 0) {
      setElements([
        {
          id: nanoid(),
          type: 'text',
          x: 50,
          y: 50,
          width: 400,
          height: 50,
          content: 'Dr. John Smith',
          style: { fontFamily: 'Inter', fontSize: 24, color: '#1e293b', fontWeight: 'bold' }
        },
        {
          id: nanoid(),
          type: 'text',
          x: 50,
          y: 100,
          width: 300,
          height: 30,
          content: 'MBBS, MD - General Medicine',
          style: { fontFamily: 'Inter', fontSize: 14, color: '#64748b' }
        },
        {
          id: nanoid(),
          type: 'line',
          x: 50,
          y: 150,
          width: 694,
          height: 2,
          style: { strokeColor: '#e2e8f0', strokeWidth: 1 }
        },
        {
          id: nanoid(),
          type: 'text',
          x: 50,
          y: 200,
          width: 200,
          height: 40,
          content: 'PRESCRIPTION',
          style: { fontFamily: 'Inter', fontSize: 18, color: '#1e293b', fontWeight: 'bold' }
        }
      ]);
    }
  }, [elements.length]);

  // Auto close toolbars function
  const closeAllToolbars = () => {
    setShowElementToolbar(false);
    setShowBackgroundControls(false);
    setShowTemplates(false);
  };

  const handleSelectTemplate = (template: Template) => {
    setElements(template.elements);
    setSelectedId(null);
    closeAllToolbars();
  };

  const addElement = (type: Element['type']) => {
    const newElement: Element = {
      id: nanoid(),
      type,
      x: 100 + elements.length * 20,
      y: 100 + elements.length * 20,
      width: type === 'line' ? 200 : 150,
      height: type === 'line' ? 2 : type === 'text' ? 40 : 100,
      ...(type === 'text' && {
        content: 'New Text',
        style: { fontFamily: 'Inter', fontSize: 16, color: '#000000' }
      }),
      ...(type === 'line' && {
        style: { strokeColor: '#000000', strokeWidth: 2, rotation: 0 }
      }),
      ...(type === 'rectangle' && {
        style: { fillColor: 'transparent', strokeColor: '#000000', strokeWidth: 1 }
      }),
      ...(type === 'circle' && {
        style: { fillColor: 'transparent', strokeColor: '#000000', strokeWidth: 1 }
      }),
      ...(type === 'image' && {
        src: '',
        style: {}
      })
    };
    
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    setShowElementToolbar(true);
    setShowBackgroundControls(false);
    setShowTemplates(false);
  };

  const updateElement = (id: string, updates: Partial<Element>) => {
    setElements(prev =>
      prev.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  };

  const deleteSelectedElement = () => {
    if (selectedId) {
      setElements(prev => prev.filter(el => el.id !== selectedId));
      setSelectedId(null);
      setShowElementToolbar(false);
    }
  };

  const duplicateElement = () => {
    if (selectedId) {
      const elementToDuplicate = elements.find(el => el.id === selectedId);
      if (elementToDuplicate) {
        const duplicatedElement: Element = {
          ...elementToDuplicate,
          id: nanoid(),
          x: elementToDuplicate.x + 20,
          y: elementToDuplicate.y + 20
        };
        setElements(prev => [...prev, duplicatedElement]);
        setSelectedId(duplicatedElement.id);
      }
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        const newElement: Element = {
          id: nanoid(),
          type: 'image',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          src: result,
          style: {}
        };
        setElements(prev => [...prev, newElement]);
        setSelectedId(newElement.id);
        setShowElementToolbar(true);
        setShowBackgroundControls(false);
        setShowTemplates(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setBackgroundImage(result);
        setShowBackgroundControls(true);
        setShowElementToolbar(false);
        setShowTemplates(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackgroundImage = () => {
    setBackgroundImage(null);
    setBackgroundSize(100);
    setBackgroundBlur(0);
    setShowBackgroundControls(false);
  };

  // Fixed resize handlers
  const handleResizeStart = (e: React.MouseEvent, elementId: string, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: element.width, height: element.height });
    setResizeStartElementPos({ x: element.x, y: element.y });
  };

  // Global resize move handler
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !selectedId || !resizeHandle) return;
      
      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;
      
      let newWidth = resizeStartSize.width;
      let newHeight = resizeStartSize.height;
      let newX = resizeStartElementPos.x;
      let newY = resizeStartElementPos.y;
      
      // Calculate new dimensions based on resize handle
      switch (resizeHandle) {
        case 'se': // Southeast
          newWidth = Math.max(20, resizeStartSize.width + deltaX);
          newHeight = Math.max(20, resizeStartSize.height + deltaY);
          break;
        case 'sw': // Southwest
          newWidth = Math.max(20, resizeStartSize.width - deltaX);
          newHeight = Math.max(20, resizeStartSize.height + deltaY);
          newX = resizeStartElementPos.x + (resizeStartSize.width - newWidth);
          break;
        case 'ne': // Northeast
          newWidth = Math.max(20, resizeStartSize.width + deltaX);
          newHeight = Math.max(20, resizeStartSize.height - deltaY);
          newY = resizeStartElementPos.y + (resizeStartSize.height - newHeight);
          break;
        case 'nw': // Northwest
          newWidth = Math.max(20, resizeStartSize.width - deltaX);
          newHeight = Math.max(20, resizeStartSize.height - deltaY);
          newX = resizeStartElementPos.x + (resizeStartSize.width - newWidth);
          newY = resizeStartElementPos.y + (resizeStartSize.height - newHeight);
          break;
        case 'n': // North
          newHeight = Math.max(20, resizeStartSize.height - deltaY);
          newY = resizeStartElementPos.y + (resizeStartSize.height - newHeight);
          break;
        case 's': // South
          newHeight = Math.max(20, resizeStartSize.height + deltaY);
          break;
        case 'e': // East
          newWidth = Math.max(20, resizeStartSize.width + deltaX);
          break;
        case 'w': // West
          newWidth = Math.max(20, resizeStartSize.width - deltaX);
          newX = resizeStartElementPos.x + (resizeStartSize.width - newWidth);
          break;
      }
      
      // Ensure element stays within canvas bounds
      newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - newWidth));
      newY = Math.max(0, Math.min(newY, CANVAS_HEIGHT - newHeight));
      
      // Update element with new dimensions and position
      updateElement(selectedId, { 
        width: newWidth, 
        height: newHeight, 
        x: newX, 
        y: newY 
      });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeHandle(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, selectedId, resizeHandle, resizeStartPos, resizeStartSize, resizeStartElementPos]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null); // Unselect element
      closeAllToolbars(); // Close all toolbars including element toolbar
    }
  };

  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If clicking the same element that's already selected, toggle it off
    if (selectedId === elementId) {
      setSelectedId(null);
      setShowElementToolbar(false);
    } else {
      // If clicking a different element or no element selected, select this one
      setSelectedId(elementId);
      setShowElementToolbar(true);
    }
    
    // Always close background controls and templates when clicking elements
    setShowBackgroundControls(false);
    setShowTemplates(false);
  };

  const exportAsHTML = () => {
    const backgroundStyle = backgroundImage ? 
      `background-image: url('${backgroundImage}'); background-size: ${backgroundSize}%; background-position: center; background-repeat: no-repeat;` : '';
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Prescription</title>
    <style>
        body { font-family: Inter, sans-serif; margin: 0; padding: 20px; }
        .prescription { 
            position: relative; 
            width: ${CANVAS_WIDTH}px; 
            height: ${CANVAS_HEIGHT}px; 
            background-color: ${canvasBackground};
            ${backgroundStyle}
            margin: 0 auto;
            border: 1px solid #ccc;
        }
        .element { position: absolute; }
    </style>
</head>
<body>
    <div class="prescription">
        ${elements.map(el => {
          let elementHtml = '';
          if (el.type === 'text') {
            elementHtml = `<div class="element" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; font-family: ${el.style?.fontFamily || 'Inter'}; font-size: ${el.style?.fontSize || 16}px; color: ${el.style?.color || '#000'}; font-weight: ${el.style?.fontWeight || 'normal'}; display: flex; align-items: center;">${el.content}</div>`;
          } else if (el.type === 'line') {
            const rotation = el.style?.rotation || 0;
            elementHtml = `<div class="element" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; border-top: ${el.style?.strokeWidth || 2}px solid ${el.style?.strokeColor || '#000'}; transform: rotate(${rotation}deg); transform-origin: center;"></div>`;
          } else if (el.type === 'rectangle') {
            elementHtml = `<div class="element" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; background-color: ${el.style?.fillColor || 'transparent'}; border: ${el.style?.strokeWidth || 1}px solid ${el.style?.strokeColor || '#000'};"></div>`;
          } else if (el.type === 'circle') {
            elementHtml = `<div class="element" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; background-color: ${el.style?.fillColor || 'transparent'}; border: ${el.style?.strokeWidth || 1}px solid ${el.style?.strokeColor || '#000'}; border-radius: 50%;"></div>`;
          } else if (el.type === 'image') {
            elementHtml = `<img class="element" src="${el.src}" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px;" />`;
          }
          return elementHtml;
        }).join('')}
    </div>
</body>
</html>`;
    
    navigator.clipboard.writeText(html).then(() => {
      alert('HTML copied to clipboard!');
    });
  };

  const downloadPDF = () => {
    if (!canvasRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate the HTML content for printing - Fixed background image issue
    const printHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            min-height: 100vh;
          }
          
          .prescription-container {
            position: relative;
            width: ${CANVAS_WIDTH}px;
            height: ${CANVAS_HEIGHT}px;
            background-color: ${canvasBackground};
            border: 1px solid #ddd;
            overflow: hidden;
          }
          
          .background-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0;
            ${backgroundImage ? `
              background-image: url('${backgroundImage}');
              background-size: ${backgroundSize}%;
              background-position: center;
              background-repeat: no-repeat;
              filter: blur(${backgroundBlur}px);
            ` : ''}
          }
          
          .elements-layer {
            position: relative;
            z-index: 1;
            width: 100%;
            height: 100%;
          }
          
          .element {
            position: absolute;
            box-sizing: border-box;
          }
          
          .text-element {
            display: flex;
            align-items: center;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .line-element {
            border-top-style: solid;
            transform-origin: center;
          }
          
          .rectangle-element {
            border-style: solid;
          }
          
          .circle-element {
            border-style: solid;
            border-radius: 50%;
          }
          
          .image-element {
            object-fit: cover;
          }
          
          @media print {
            body {
              padding: 0;
              background: white !important;
            }
            
            .prescription-container {
              border: none;
              box-shadow: none;
            }
            
            .background-layer {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            @page {
              margin: 0.5in;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="prescription-container">
          ${backgroundImage ? '<div class="background-layer"></div>' : ''}
          <div class="elements-layer">
            ${elements.map(el => {
              let elementHtml = '';
              
              if (el.type === 'text') {
                elementHtml = `
                  <div class="element text-element" style="
                    left: ${el.x}px; 
                    top: ${el.y}px; 
                    width: ${el.width}px; 
                    height: ${el.height}px; 
                    font-family: ${el.style?.fontFamily || 'Inter, sans-serif'}; 
                    font-size: ${el.style?.fontSize || 16}px; 
                    color: ${el.style?.color || '#000'}; 
                    font-weight: ${el.style?.fontWeight || 'normal'};
                  ">${el.content || ''}</div>`;
              } else if (el.type === 'line') {
                const rotation = el.style?.rotation || 0;
                elementHtml = `
                  <div class="element line-element" style="
                    left: ${el.x}px; 
                    top: ${el.y}px; 
                    width: ${el.width}px; 
                    height: ${el.height}px; 
                    border-top-width: ${el.style?.strokeWidth || 2}px;
                    border-top-color: ${el.style?.strokeColor || '#000'};
                    transform: rotate(${rotation}deg);
                  "></div>`;
              } else if (el.type === 'rectangle') {
                elementHtml = `
                  <div class="element rectangle-element" style="
                    left: ${el.x}px; 
                    top: ${el.y}px; 
                    width: ${el.width}px; 
                    height: ${el.height}px; 
                    background-color: ${el.style?.fillColor === 'transparent' ? 'transparent' : el.style?.fillColor || 'transparent'}; 
                    border-width: ${el.style?.strokeWidth || 1}px;
                    border-color: ${el.style?.strokeColor || '#000'};
                  "></div>`;
              } else if (el.type === 'circle') {
                elementHtml = `
                  <div class="element circle-element" style="
                    left: ${el.x}px; 
                    top: ${el.y}px; 
                    width: ${el.width}px; 
                    height: ${el.height}px; 
                    background-color: ${el.style?.fillColor === 'transparent' ? 'transparent' : el.style?.fillColor || 'transparent'}; 
                    border-width: ${el.style?.strokeWidth || 1}px;
                    border-color: ${el.style?.strokeColor || '#000'};
                  "></div>`;
              } else if (el.type === 'image' && el.src) {
                elementHtml = `
                  <img class="element image-element" 
                    src="${el.src}" 
                    alt="Prescription Image"
                    style="
                      left: ${el.x}px; 
                      top: ${el.y}px; 
                      width: ${el.width}px; 
                      height: ${el.height}px;
                    " />`;
              }
              
              return elementHtml;
            }).join('')}
          </div>
        </div>
      </body>
      </html>
    `;

    // Write the HTML to the new window
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // Wait for the content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  const saveTemplate = () => {
    const templateData = {
      elements,
      canvasBackground,
      backgroundImage,
      backgroundSize,
      backgroundBlur,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prescription-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setShowTemplates(!showTemplates);
                if (!showTemplates) {
                  setShowElementToolbar(false);
                  setShowBackgroundControls(false);
                }
              }}
            >
              <Menu className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="font-semibold text-lg">Prescription Template Editor</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportAsHTML}>
              <Copy className="h-4 w-4 mr-2" />
              Copy HTML
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Print/PDF
            </Button>
            <Button size="sm" onClick={saveTemplate}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Canvas Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => addElement('text')}>
            <Type className="h-4 w-4 mr-2" />
            Text
          </Button>
          
          <Button size="sm" variant="ghost" onClick={() => addElement('line')}>
            <Minus className="h-4 w-4 mr-2" />
            Line
          </Button>
          
          <Button size="sm" variant="ghost" onClick={() => addElement('rectangle')}>
            <Square className="h-4 w-4 mr-2" />
            Rectangle
          </Button>
          
          <Button size="sm" variant="ghost" onClick={() => addElement('circle')}>
            <Circle className="h-4 w-4 mr-2" />
            Circle
          </Button>
          
          <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          <div className="flex items-center gap-2">
            <Label className="text-sm">Background:</Label>
            <Input
              type="color"
              value={canvasBackground}
              onChange={(e) => setCanvasBackground(e.target.value)}
              className="w-10 h-8 p-0 border-0"
            />
            {['#ffffff', '#f8fafc', '#fef3c7', '#dbeafe', '#e0e7ff'].map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: color }}
                onClick={() => setCanvasBackground(color)}
              />
            ))}
          </div>
          
          <Separator orientation="vertical" className="h-6 mx-2" />
          
          {/* Background Image Button */}
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => backgroundFileInputRef.current?.click()}
            className={backgroundImage ? "bg-blue-100 text-blue-700" : ""}
          >
            <Image className="h-4 w-4 mr-2" />
            Background
          </Button>
          
          {backgroundImage && (
            <>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => {
                  setShowBackgroundControls(!showBackgroundControls);
                  if (!showBackgroundControls) {
                    setShowElementToolbar(false);
                    setShowTemplates(false);
                  }
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                BG Settings
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={removeBackgroundImage}
                className="text-red-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Templates Sidebar */}
        {showTemplates && !showElementToolbar && !showBackgroundControls && (
          <PrescriptionTemplates
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplates(false)}
          />
        )}

        {/* Background Controls Sidebar */}
        {showBackgroundControls && backgroundImage && (
          <div className="w-72 bg-white border-r border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Background Settings</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowBackgroundControls(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Background Image Preview */}
              <div>
                <Label className="text-sm">Current Background</Label>
                <div className="mt-2 border border-gray-200 rounded-lg p-2">
                  <img 
                    src={backgroundImage} 
                    alt="Background preview" 
                    className="w-full h-20 object-cover rounded"
                    style={{ filter: `blur(${backgroundBlur}px)` }}
                  />
                </div>
              </div>

              {/* Size Control */}
              <div>
                <Label className="text-sm">Size: {backgroundSize}%</Label>
                <Slider
                  value={[backgroundSize]}
                  onValueChange={([value]) => setBackgroundSize(value)}
                  min={10}
                  max={200}
                  step={5}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10%</span>
                  <span>200%</span>
                </div>
              </div>

              {/* Blur Control */}
              <div>
                <Label className="text-sm">Blur: {backgroundBlur}px</Label>
                <Slider
                  value={[backgroundBlur]}
                  onValueChange={([value]) => setBackgroundBlur(value)}
                  min={0}
                  max={20}
                  step={0.5}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0px</span>
                  <span>20px</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => backgroundFileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change Background
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={removeBackgroundImage}
                  className="w-full text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Background
                </Button>
              </div>

              {/* Reset Controls */}
              <div className="pt-4 border-t border-gray-200">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setBackgroundSize(100);
                    setBackgroundBlur(0);
                  }}
                  className="w-full"
                >
                  Reset Settings
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 flex justify-center items-start p-8 bg-gray-100 overflow-auto relative">
          <div
            ref={canvasRef}
            className="relative shadow-xl border border-gray-300"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundColor: canvasBackground,
            }}
            onClick={handleCanvasClick}
          >
            {/* Background Image Layer - Only this gets blurred */}
            {backgroundImage && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundSize: `${backgroundSize}%`,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  filter: `blur(${backgroundBlur}px)`,
                  zIndex: 0,
                }}
              />
            )}
            
            {/* Elements Layer - Never blurred */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
              {elements.map((element) => (
                <Draggable
                  key={element.id}
                  position={{ x: element.x, y: element.y }}
                  onStop={(e, d) => {
                    updateElement(element.id, { x: d.x, y: d.y });
                  }}
                  bounds="parent"
                >
                  <div
                    className={`cursor-move ${
                      selectedId === element.id
                        ? 'ring-2 ring-blue-500'
                        : 'hover:ring-2 hover:ring-blue-300'
                    }`}
                    style={{
                      width: element.width,
                      height: element.height,
                      position: 'absolute',
                    }}
                    onClick={(e) => handleElementClick(element.id, e)}
                  >
                    {/* Element Content */}
                    {element.type === 'text' && (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) =>
                          updateElement(element.id, { content: e.currentTarget.textContent })
                        }
                        style={{
                          width: '100%',
                          height: '100%',
                          fontFamily: element.style?.fontFamily || 'Inter',
                          fontSize: `${element.style?.fontSize || 16}px`,
                          color: element.style?.color || '#000000',
                          fontWeight: element.style?.fontWeight || 'normal',
                          outline: 'none',
                          cursor: 'text',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {element.content}
                      </div>
                    )}
                    
                    {element.type === 'line' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderTop: `${element.style?.strokeWidth || 2}px solid ${element.style?.strokeColor || '#000000'}`,
                          transform: `rotate(${element.style?.rotation || 0}deg)`,
                          transformOrigin: 'center',
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
                    
                    {element.type === 'circle' && (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: element.style?.fillColor || 'transparent',
                          border: `${element.style?.strokeWidth || 1}px solid ${element.style?.strokeColor || '#000000'}`,
                          borderRadius: '50%',
                        }}
                      />
                    )}
                    
                    {element.type === 'image' && element.src && (
                      <img
                        src={element.src}
                        alt="Uploaded"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    )}

                    {/* Resize Handles - Only show for selected element */}
                    {selectedId === element.id && (
                      <>
                        {/* Corner resize handles */}
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-nw-resize"
                          style={{ top: -6, left: -6 }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 'nw')}
                        />
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-ne-resize"
                          style={{ top: -6, right: -6 }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 'ne')}
                        />
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-sw-resize"
                          style={{ bottom: -6, left: -6 }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 'sw')}
                        />
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-se-resize"
                          style={{ bottom: -6, right: -6 }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 'se')}
                        />
                        
                        {/* Edge resize handles */}
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-n-resize"
                          style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 'n')}
                        />
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-s-resize"
                          style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 's')}
                        />
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-w-resize"
                          style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 'w')}
                        />
                        <div
                          className="absolute w-3 h-3 bg-blue-500 border border-white cursor-e-resize"
                          style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }}
                          onMouseDown={(e) => handleResizeStart(e, element.id, 'e')}
                        />
                      </>
                    )}
                  </div>
                </Draggable>
              ))}
            </div>
          </div>

          {/* Element Properties Toolbar - Overlay */}
          {showElementToolbar && selectedElement && !showBackgroundControls && (
            <div className="ml-4 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-h-[90vh] overflow-y-auto flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Element Properties</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowElementToolbar(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Element Actions */}
              <div className="flex gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={duplicateElement}>
                  <Copy className="h-4 w-4 mr-1" />
                  Duplicate
                </Button>
                <Button size="sm" variant="outline" onClick={deleteSelectedElement} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>

              {/* Position & Size */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X Position</Label>
                    <Input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) => updateElement(selectedId, { x: parseInt(e.target.value) || 0 })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Y Position</Label>
                    <Input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) => updateElement(selectedId, { y: parseInt(e.target.value) || 0 })}
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={selectedElement.width}
                      onChange={(e) => updateElement(selectedId, { width: parseInt(e.target.value) || 100 })}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) => updateElement(selectedId, { height: parseInt(e.target.value) || 100 })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Text-specific properties */}
              {selectedElement.type === 'text' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Font Family</Label>
                    <Select 
                      value={selectedElement.style?.fontFamily || 'Inter'}
                      onValueChange={(value) => 
                        updateElement(selectedId, { 
                          style: { ...selectedElement.style, fontFamily: value }
                        })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Font Size: {selectedElement.style?.fontSize || 16}px</Label>
                    <Slider
                      value={[selectedElement.style?.fontSize || 16]}
                      onValueChange={([value]) =>
                        updateElement(selectedId, {
                          style: { ...selectedElement.style, fontSize: value }
                        })
                      }
                      min={8}
                      max={48}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Text Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.style?.color || '#000000'}
                      onChange={(e) =>
                        updateElement(selectedId, {
                          style: { ...selectedElement.style, color: e.target.value }
                        })
                      }
                      className="h-8"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedElement.style?.fontWeight === 'bold' ? 'default' : 'outline'}
                      onClick={() =>
                        updateElement(selectedId, {
                          style: { 
                            ...selectedElement.style, 
                            fontWeight: selectedElement.style?.fontWeight === 'bold' ? 'normal' : 'bold' 
                          }
                        })
                      }
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Underline className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Line-specific properties with rotation */}
              {selectedElement.type === 'line' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Stroke Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.style?.strokeColor || '#000000'}
                      onChange={(e) =>
                        updateElement(selectedId, {
                          style: { ...selectedElement.style, strokeColor: e.target.value }
                        })
                      }
                      className="h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Stroke Width: {selectedElement.style?.strokeWidth || 1}px</Label>
                    <Slider
                      value={[selectedElement.style?.strokeWidth || 1]}
                      onValueChange={([value]) =>
                        updateElement(selectedId, {
                          style: { ...selectedElement.style, strokeWidth: value }
                        })
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  {/* Line Rotation Controls */}
                  <div>
                    <Label className="text-xs">Rotation: {selectedElement.style?.rotation || 0}°</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, rotation: (selectedElement.style?.rotation || 0) - 15 }
                          })
                        }
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      
                      <Slider
                        value={[selectedElement.style?.rotation || 0]}
                        onValueChange={([value]) =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, rotation: value }
                          })
                        }
                        min={-180}
                        max={180}
                        step={15}
                        className="flex-1"
                      />
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, rotation: (selectedElement.style?.rotation || 0) + 15 }
                          })
                        }
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Quick rotation buttons */}
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, rotation: 0 }
                          })
                        }
                        className="text-xs px-2"
                      >
                        0°
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, rotation: 45 }
                          })
                        }
                        className="text-xs px-2"
                      >
                        45°
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, rotation: 90 }
                          })
                        }
                        className="text-xs px-2"
                      >
                        90°
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, rotation: 135 }
                          })
                        }
                        className="text-xs px-2"
                      >
                        135°
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Shape-specific properties (rectangle and circle) */}
              {(selectedElement.type === 'rectangle' || selectedElement.type === 'circle') && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Stroke Color</Label>
                    <Input
                      type="color"
                      value={selectedElement.style?.strokeColor || '#000000'}
                      onChange={(e) =>
                        updateElement(selectedId, {
                          style: { ...selectedElement.style, strokeColor: e.target.value }
                        })
                      }
                      className="h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Stroke Width: {selectedElement.style?.strokeWidth || 1}px</Label>
                    <Slider
                      value={[selectedElement.style?.strokeWidth || 1]}
                      onValueChange={([value]) =>
                        updateElement(selectedId, {
                          style: { ...selectedElement.style, strokeWidth: value }
                        })
                      }
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Fill Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={selectedElement.style?.fillColor === 'transparent' ? '#ffffff' : selectedElement.style?.fillColor || '#ffffff'}
                        onChange={(e) =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, fillColor: e.target.value }
                          })
                        }
                        className="h-8 flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateElement(selectedId, {
                            style: { ...selectedElement.style, fillColor: 'transparent' }
                          })
                        }
                      >
                        None
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Image-specific properties */}
              {selectedElement.type === 'image' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Replace Image</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full mt-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Image
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
      
      <input
        ref={backgroundFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleBackgroundImageUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default PrescriptionCanvasEditor;