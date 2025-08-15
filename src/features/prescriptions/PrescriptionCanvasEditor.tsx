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


// Main Editor Component
const PrescriptionCanvasEditor = () => {
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState('#ffffff');
  const [showElementToolbar, setShowElementToolbar] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

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
  }, []);

  const handleSelectTemplate = (template) => {
    setElements(template.elements);
    setShowTemplates(false);
    setSelectedId(null);
    setShowElementToolbar(false);
  };

  const addElement = (type) => {
    const newElement = {
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
        style: { strokeColor: '#000000', strokeWidth: 2 }
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
  };

  const updateElement = (id, updates) => {
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
        const duplicatedElement = {
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

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newElement = {
          id: nanoid(),
          type: 'image',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          src: e.target.result,
          style: {}
        };
        setElements(prev => [...prev, newElement]);
        setSelectedId(newElement.id);
        setShowElementToolbar(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
      setShowElementToolbar(false);
    }
  };

  const handleElementClick = (elementId, e) => {
    e.stopPropagation();
    setSelectedId(elementId);
    setShowElementToolbar(true);
  };

  const exportAsHTML = () => {
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
            elementHtml = `<div class="element" style="left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; height: ${el.height}px; border-top: ${el.style?.strokeWidth || 2}px solid ${el.style?.strokeColor || '#000'};"></div>`;
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
    window.print();
  };

  const saveTemplate = () => {
    const templateData = {
      elements,
      canvasBackground,
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
              onClick={() => setShowTemplates(!showTemplates)}
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
          
         {/* <Button size="sm" variant="ghost">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <RotateCw className="h-4 w-4" />
          </Button>*/} 
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Templates Sidebar */}
        {showTemplates && !showElementToolbar && (
          <PrescriptionTemplates
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplates(false)}
          />
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
                    position: 'absolute'
                  }}
                  onClick={(e) => handleElementClick(element.id, e)}
                >
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
                </div>
              </Draggable>
            ))}
          </div>

          {/* Element Properties Toolbar - Overlay */}
          {showElementToolbar && selectedElement &&  (
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

              {/* Shape-specific properties */}
              {(selectedElement.type === 'rectangle' || selectedElement.type === 'circle' || selectedElement.type === 'line') && (
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

                  {(selectedElement.type === 'rectangle' || selectedElement.type === 'circle') && (
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
                  )}
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

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default PrescriptionCanvasEditor;