import React, { useState, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
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
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

// Import the separate templates component
import PrescriptionTemplates from '@/components/ui/PrescriptionTemplates';

// Main Editor Component
const PrescriptionCanvasEditor = () => {
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarType, setToolbarType] = useState('');
  const [canvasBackground, setCanvasBackground] = useState('#ffffff');
  const canvasRef = useRef(null);

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
  };

  const openToolbar = (type) => {
    setToolbarType(type);
    setShowToolbar(true);
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
      })
    };
    
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
    setShowToolbar(false);
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
    }
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  // Toolbar content based on type
  const renderToolbarContent = () => {
    switch (toolbarType) {
      case 'text':
        return (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-white mb-4">Text Tools</h3>
            
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addElement('text')} className="bg-white/10 hover:bg-white/20">
                <Type className="h-4 w-4 mr-2" />
                Add Text
              </Button>
              <Button size="sm" onClick={() => addElement('text')} className="bg-white/10 hover:bg-white/20">
                <User className="h-4 w-4 mr-2" />
                Doctor Name
              </Button>
            </div>

            {selectedElement?.type === 'text' && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div>
                  <Label className="text-white text-xs">Font Family</Label>
                  <Select 
                    value={selectedElement.style?.fontFamily || 'Inter'}
                    onValueChange={(value) => 
                      updateElement(selectedId, { 
                        style: { ...selectedElement.style, fontFamily: value }
                      })
                    }
                  >
                    <SelectTrigger className="h-8 bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white text-xs">Font Size: {selectedElement.style?.fontSize || 16}px</Label>
                  <Slider
                    value={[selectedElement.style?.fontSize || 16]}
                    onValueChange={([value]) =>
                      updateElement(selectedId, {
                        style: { ...selectedElement.style, fontSize: value }
                      })
                    }
                    min={10}
                    max={48}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedElement.style?.fontWeight === 'bold' ? 'default' : 'ghost'}
                    onClick={() =>
                      updateElement(selectedId, {
                        style: { 
                          ...selectedElement.style, 
                          fontWeight: selectedElement.style?.fontWeight === 'bold' ? 'normal' : 'bold' 
                        }
                      })
                    }
                    className="text-white"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white">
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white">
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-white">
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white">
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white">
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'elements':
        return (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-white mb-4">Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => addElement('text')} className="bg-white/10 hover:bg-white/20 justify-start">
                <Type className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button size="sm" onClick={() => addElement('line')} className="bg-white/10 hover:bg-white/20 justify-start">
                <Minus className="h-4 w-4 mr-2" />
                Line
              </Button>
              <Button size="sm" onClick={() => addElement('rectangle')} className="bg-white/10 hover:bg-white/20 justify-start">
                <Square className="h-4 w-4 mr-2" />
                Shape
              </Button>
              <Button size="sm" className="bg-white/10 hover:bg-white/20 justify-start">
                <Image className="h-4 w-4 mr-2" />
                Image
              </Button>
            </div>
          </div>
        );

      case 'background':
        return (
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-white mb-4">Background</h3>
            
            <div>
              <Label className="text-white text-xs">Background Color</Label>
              <div className="flex gap-2 mt-2">
                {['#ffffff', '#f8fafc', '#fef3c7', '#dbeafe', '#e0e7ff', '#f3e8ff'].map((color) => (
                  <button
                    key={color}
                    className="w-8 h-8 rounded border-2 border-white/20"
                    style={{ backgroundColor: color }}
                    onClick={() => setCanvasBackground(color)}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-white text-xs">Custom Color</Label>
              <Input
                type="color"
                value={canvasBackground}
                onChange={(e) => setCanvasBackground(e.target.value)}
                className="h-8 mt-2 bg-white/10 border-white/20"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
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
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy HTML
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Templates Sidebar */}
        {showTemplates && (
          <PrescriptionTemplates
            onSelectTemplate={handleSelectTemplate}
            onClose={() => setShowTemplates(false)}
          />
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Canvas Controls */}
          <div className="bg-white border-b border-gray-200 px-6 py-2">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={toolbarType === 'text' && showToolbar ? 'default' : 'ghost'}
                onClick={() => openToolbar('text')}
              >
                <Type className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button
                size="sm"
                variant={toolbarType === 'elements' && showToolbar ? 'default' : 'ghost'}
                onClick={() => openToolbar('elements')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Elements
              </Button>
              <Button
                size="sm"
                variant={toolbarType === 'background' && showToolbar ? 'default' : 'ghost'}
                onClick={() => openToolbar('background')}
              >
                <Palette className="h-4 w-4 mr-2" />
                Background
              </Button>
              
              <Separator orientation="vertical" className="h-6 mx-2" />
              
              <Button size="sm" variant="ghost">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost">
                <RotateCw className="h-4 w-4" />
              </Button>
              
              {selectedId && (
                <>
                  <Separator orientation="vertical" className="h-6 mx-2" />
                  <Button size="sm" variant="ghost" onClick={deleteSelectedElement} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Toolbar */}
          {showToolbar && (
            <div className="bg-gray-900 text-white relative">
              {renderToolbarContent()}
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-white hover:bg-white/10"
                onClick={() => setShowToolbar(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 flex items-center justify-center p-8 bg-gray-100 overflow-auto">
            <div
              ref={canvasRef}
              className="relative shadow-xl border border-gray-300"
              style={{
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
                backgroundColor: canvasBackground,
              }}
            >
              {elements.map((element) => (
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
                  onClick={() => setSelectedId(element.id)}
                  className={`cursor-move ${
                    selectedId === element.id
                      ? 'ring-2 ring-blue-500'
                      : 'hover:ring-2 hover:ring-blue-300'
                  }`}
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
                </Rnd>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionCanvasEditor;