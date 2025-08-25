import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Draggable from 'react-draggable';
import { nanoid } from 'nanoid';
import {
  Type,
  Image as ImageIcon,
  Upload,
  Save,
  Download,
  Copy,
  Settings,
  Menu,
  X,
  Square,
  Minus,
  Circle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import PrescriptionTemplates from '@/components/ui/PrescriptionTemplates';

// =================== Types ===================
interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  borderRadius?: number;
  rotation?: number; // reserved for future (kept)
}

export type ElementType = 'text' | 'line' | 'rectangle' | 'circle' | 'image';

interface ElementBase {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: ElementStyle;
}

interface TextElement extends ElementBase {
  type: 'text';
  content: string;
}

interface ImageElement extends ElementBase {
  type: 'image';
  src: string;
}

interface LineElement extends ElementBase {
  type: 'line';
  x1: number; y1: number; x2: number; y2: number;
}

export type Element = TextElement | ImageElement | LineElement | ElementBase; // ElementBase covers rectangle/circle

interface Template {
  name: string;
  elements: Element[];
}

// =================== Helpers ===================
const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const snap = (val: number, step: number) => Math.round(val / step) * step;

// very subtle edge snap (5px) without any UI change
const magneticSnap = (val: number, limit: number, threshold = 5) => {
  if (Math.abs(val) <= threshold) return 0;
  if (Math.abs(limit - val) <= threshold) return limit;
  return val;
};

// =================== Main ===================
const PrescriptionCanvasEditor: React.FC = () => {
  // ------- Canvas constants -------
  const CANVAS_WIDTH = 794;
  const CANVAS_HEIGHT = 1123;
  const GRID = 1; // keep movement pixel-perfect; change to 5 for snappier feel

  // ------- State -------
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [canvasBackground, setCanvasBackground] = useState('#ffffff');
  const [showElementToolbar, setShowElementToolbar] = useState(false);

  // background
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundSize, setBackgroundSize] = useState(100);
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [showBackgroundControls, setShowBackgroundControls] = useState(false);

  // resize
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [resizeStartElementPos, setResizeStartElementPos] = useState({ x: 0, y: 0 });

  // input/file refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  // keyboard/raf helpers
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const rafMove = useRef<number | null>(null);

  // history (undo/redo) – invisible upgrade, no UI change
  const history = useRef<{ elements: Element[]; meta: any }[]>([]);
  const historyIndex = useRef(-1);

  const pushHistory = useCallback((els: Element[]) => {
    // drop future
    if (historyIndex.current < history.current.length - 1) {
      history.current = history.current.slice(0, historyIndex.current + 1);
    }
    history.current.push({ elements: deepClone(els), meta: { canvasBackground, backgroundImage, backgroundSize, backgroundBlur } });
    historyIndex.current++;
  }, [canvasBackground, backgroundImage, backgroundSize, backgroundBlur]);

  const undo = useCallback(() => {
    if (historyIndex.current <= 0) return;
    historyIndex.current--;
    const { elements: els, meta } = history.current[historyIndex.current];
    setElements(deepClone(els));
    setCanvasBackground(meta.canvasBackground);
    setBackgroundImage(meta.backgroundImage);
    setBackgroundSize(meta.backgroundSize);
    setBackgroundBlur(meta.backgroundBlur);
  }, []);

  const redo = useCallback(() => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current++;
    const { elements: els, meta } = history.current[historyIndex.current];
    setElements(deepClone(els));
    setCanvasBackground(meta.canvasBackground);
    setBackgroundImage(meta.backgroundImage);
    setBackgroundSize(meta.backgroundSize);
    setBackgroundBlur(meta.backgroundBlur);
  }, []);

  // ---------- Init template (kept) ----------
  useEffect(() => {
    // load from localStorage (kept behavior)
    const saved = localStorage.getItem('prescriptionTemplate');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const migrated: Element[] = (data.elements || []).map((el: any) => {
          if (el.type === 'line' && (el.x1 === undefined || el.y1 === undefined)) {
            return { ...el, x1: el.x ?? 0, y1: el.y ?? 0, x2: (el.x ?? 0) + (el.width ?? 100), y2: el.y ?? 0 } as LineElement;
          }
          return el;
        });
        setElements(migrated);
        setCanvasBackground(data.canvasBackground || '#ffffff');
        setBackgroundImage(data.backgroundImage || null);
        setBackgroundSize(data.backgroundSize || 100);
        setBackgroundBlur(data.backgroundBlur || 0);
        pushHistory(migrated);
        return;
      } catch {}
    }

    if (elements.length === 0) {
      const initial: Element[] = [
        {
          id: nanoid(),
          type: 'text',
          x: 50,
          y: 50,
          width: 400,
          height: 50,
          content: 'Dr. John Smith',
          style: { fontFamily: 'Inter', fontSize: 24, color: '#1e293b', fontWeight: 'bold' }
        } as TextElement,
        {
          id: nanoid(),
          type: 'text',
          x: 50,
          y: 100,
          width: 300,
          height: 30,
          content: 'MBBS, MD - General Medicine',
          style: { fontFamily: 'Inter', fontSize: 14, color: '#64748b' }
        } as TextElement,
        {
          id: nanoid(),
          type: 'line',
          x: 50,
          y: 150,
          width: 694,
          height: 2,
          x1: 50,
          y1: 150,
          x2: 744,
          y2: 150,
          style: { strokeColor: '#e2e8f0', strokeWidth: 1 }
        } as LineElement,
        {
          id: nanoid(),
          type: 'text',
          x: 50,
          y: 200,
          width: 200,
          height: 40,
          content: 'PRESCRIPTION',
          style: { fontFamily: 'Inter', fontSize: 18, color: '#1e293b', fontWeight: 'bold' }
        } as TextElement
      ];
      setElements(initial);
      pushHistory(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Subtle autosave (debounced, no UI change) ----------
  const autosaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      const data = {
        elements,
        canvasBackground,
        backgroundImage,
        backgroundSize,
        backgroundBlur,
        timestamp: new Date().toISOString(),
      };
      try { localStorage.setItem('prescriptionTemplate', JSON.stringify(data)); } catch {}
    }, 500);
    return () => { if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current); };
  }, [elements, canvasBackground, backgroundImage, backgroundSize, backgroundBlur]);

  // ---------- Keyboard shortcuts (Canva-like) ----------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);

      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        setElements(prev => {
          const next = prev.filter(el => el.id !== selectedId);
          pushHistory(next);
          return next;
        });
        setSelectedId(null);
        return;
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }

      // Duplicate (Cmd/Ctrl + D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedId) {
        e.preventDefault();
        duplicateElement();
        return;
      }

      // Arrow key nudge
      if (selectedId && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        setElements(prev => {
          const next = prev.map(el => {
            if (el.id !== selectedId) return el;
            if (el.type === 'line') {
              const dx = (e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0);
              const dy = (e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0);
              const line = el as LineElement;
              const nx1 = clamp(line.x1 + dx, 0, CANVAS_WIDTH);
              const ny1 = clamp(line.y1 + dy, 0, CANVAS_HEIGHT);
              const nx2 = clamp(line.x2 + dx, 0, CANVAS_WIDTH);
              const ny2 = clamp(line.y2 + dy, 0, CANVAS_HEIGHT);
              return { ...el, x1: nx1, y1: ny1, x2: nx2, y2: ny2 } as LineElement;
            }
            const nx = clamp(el.x + (e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0), 0, CANVAS_WIDTH - el.width);
            const ny = clamp(el.y + (e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0), 0, CANVAS_HEIGHT - el.height);
            return { ...el, x: nx, y: ny };
          });
          pushHistory(next);
          return next;
        });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(false); };
    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown as any);
      window.removeEventListener('keyup', onKeyUp as any);
    };
  }, [selectedId, undo, redo, pushHistory]);

  // ---------- Toolbar visibility helpers ----------
  const closeAllToolbars = () => {
    setShowElementToolbar(false);
    setShowBackgroundControls(false);
    setShowTemplates(false);
  };

  const handleSelectTemplate = (template: Template) => {
    const next = deepClone(template.elements || []);
    setElements(next);
    setSelectedId(null);
    closeAllToolbars();
    pushHistory(next);
  };

  // ---------- Line endpoint resize (kept but smoothed with rAF) ----------
  const startLineResize = (e: React.MouseEvent, id: string, point: 'start' | 'end') => {
    e.preventDefault();
    e.stopPropagation();

    const onMouseMove = (ev: MouseEvent) => {
      if (rafMove.current) cancelAnimationFrame(rafMove.current);
      rafMove.current = requestAnimationFrame(() => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        let newX = ev.clientX - rect.left;
        let newY = ev.clientY - rect.top;

        // subtle edge snapping
        newX = magneticSnap(newX, CANVAS_WIDTH);
        newY = magneticSnap(newY, CANVAS_HEIGHT);

        setElements(prev => prev.map(el => {
          if (el.id !== id) return el;
          const line = el as LineElement;
          if (point === 'start') {
            return { ...line, x1: clamp(newX, 0, CANVAS_WIDTH), y1: clamp(newY, 0, CANVAS_HEIGHT) } as LineElement;
          }
          return { ...line, x2: clamp(newX, 0, CANVAS_WIDTH), y2: clamp(newY, 0, CANVAS_HEIGHT) } as LineElement;
        }));
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      // push current snapshot once at the end (fixes previous double/mis-push)
      setElements(prev => { const next = deepClone(prev); pushHistory(next); return prev; });
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
  };

  // ---------- Element CRUD ----------
  const addElement = (type: ElementType) => {
    const baseX = 100 + elements.length * 20;
    const baseY = 100 + elements.length * 20;
    const id = nanoid();

    let newEl: Element;
    if (type === 'text') {
      newEl = { id, type, x: baseX, y: baseY, width: 150, height: 40, content: 'New text', style: { fontFamily: 'Inter', fontSize: 16, color: '#000' } } as TextElement;
    } else if (type === 'image') {
      newEl = { id, type, x: baseX, y: baseY, width: 200, height: 150, src: '', style: {} } as ImageElement;
    } else if (type === 'line') {
      newEl = { id, type, x: baseX, y: baseY, width: 200, height: 2, x1: baseX, y1: baseY, x2: baseX + 200, y2: baseY, style: { strokeColor: '#000', strokeWidth: 2 } } as LineElement;
    } else if (type === 'rectangle') {
      newEl = { id, type, x: baseX, y: baseY, width: 150, height: 100, style: { fillColor: 'transparent', strokeColor: '#000', strokeWidth: 1, borderRadius: 0 } } as Element;
    } else { // circle
      newEl = { id, type: 'circle', x: baseX, y: baseY, width: 100, height: 100, style: { fillColor: 'transparent', strokeColor: '#000', strokeWidth: 1 } } as Element;
    }

    const next = [...elements, newEl];
    setElements(next);
    setSelectedId(id);
    setShowElementToolbar(true);
    setShowBackgroundControls(false);
    setShowTemplates(false);
    pushHistory(next);
  };

  const updateElement = (id: string | null, updates: Partial<Element>) => {
    if (!id) return;
    setElements(prev => {
      const next = prev.map(el => (el.id === id ? ({ ...el, ...updates } as Element) : el));
      return next;
    });
  };

  const deleteSelectedElement = () => {
    if (!selectedId) return;
    setElements(prev => {
      const next = prev.filter(el => el.id !== selectedId);
      pushHistory(next);
      return next;
    });
    setSelectedId(null);
    setShowElementToolbar(false);
  };

  const duplicateElement = () => {
    if (!selectedId) return;
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;
    const clone = { ...deepClone(el), id: nanoid(), x: (el as any).x + 20, y: (el as any).y + 20 } as Element;
    const next = [...elements, clone];
    setElements(next);
    setSelectedId(clone.id);
    pushHistory(next);
  };

  // ---------- Uploads ----------
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = String(e.target?.result || '');
      const id = nanoid();
      const newEl: ImageElement = { id, type: 'image', x: 100, y: 100, width: 200, height: 150, src, style: {} };
      const next = [...elements, newEl];
      setElements(next);
      setSelectedId(id);
      setShowElementToolbar(true);
      setShowBackgroundControls(false);
      setShowTemplates(false);
      pushHistory(next);
    };
    reader.readAsDataURL(file);
  };

  const handleBackgroundImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      setBackgroundImage(String(e.target?.result || ''));
      setShowBackgroundControls(true);
      setShowElementToolbar(false);
      setShowTemplates(false);
      // history snapshot
      setElements(prev => { const next = deepClone(prev); pushHistory(next); return prev; });
    };
    reader.readAsDataURL(file);
  };

  const removeBackgroundImage = () => {
    setBackgroundImage(null);
    setBackgroundSize(100);
    setBackgroundBlur(0);
    setShowBackgroundControls(false);
    setElements(prev => { const next = deepClone(prev); pushHistory(next); return prev; });
  };

  // ---------- Resize (with Shift to preserve ratio) ----------
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

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing || !selectedId || !resizeHandle) return;
      const element = elements.find(el => el.id === selectedId);
      if (!element || element.type === 'line') return; // lines resize via endpoints

      const deltaX = e.clientX - resizeStartPos.x;
      const deltaY = e.clientY - resizeStartPos.y;

      let newWidth = resizeStartSize.width;
      let newHeight = resizeStartSize.height;
      let newX = resizeStartElementPos.x;
      let newY = resizeStartElementPos.y;

      const keepRatio = isShiftPressed;
      const aspect = resizeStartSize.width / Math.max(1, resizeStartSize.height);

      switch (resizeHandle) {
        case 'se':
          newWidth = Math.max(20, resizeStartSize.width + deltaX);
          newHeight = keepRatio ? Math.max(20, newWidth / aspect) : Math.max(20, resizeStartSize.height + deltaY);
          break;
        case 'sw':
          newWidth = Math.max(20, resizeStartSize.width - deltaX);
          newHeight = keepRatio ? Math.max(20, newWidth / aspect) : Math.max(20, resizeStartSize.height + deltaY);
          newX = resizeStartElementPos.x + (resizeStartSize.width - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(20, resizeStartSize.width + deltaX);
          newHeight = keepRatio ? Math.max(20, newWidth / aspect) : Math.max(20, resizeStartSize.height - deltaY);
          newY = resizeStartElementPos.y + (resizeStartSize.height - newHeight);
          break;
        case 'nw':
          newWidth = Math.max(20, resizeStartSize.width - deltaX);
          newHeight = keepRatio ? Math.max(20, newWidth / aspect) : Math.max(20, resizeStartSize.height - deltaY);
          newX = resizeStartElementPos.x + (resizeStartSize.width - newWidth);
          newY = resizeStartElementPos.y + (resizeStartSize.height - newHeight);
          break;
        case 'n':
          newHeight = Math.max(20, resizeStartSize.height - deltaY);
          newY = resizeStartElementPos.y + (resizeStartSize.height - newHeight);
          break;
        case 's':
          newHeight = Math.max(20, resizeStartSize.height + deltaY);
          break;
        case 'e':
          newWidth = Math.max(20, resizeStartSize.width + deltaX);
          break;
        case 'w':
          newWidth = Math.max(20, resizeStartSize.width - deltaX);
          newX = resizeStartElementPos.x + (resizeStartSize.width - newWidth);
          break;
      }

      newX = clamp(newX, 0, CANVAS_WIDTH - newWidth);
      newY = clamp(newY, 0, CANVAS_HEIGHT - newHeight);

      // subtle edge snap
      newX = magneticSnap(newX, CANVAS_WIDTH - newWidth);
      newY = magneticSnap(newY, CANVAS_HEIGHT - newHeight);

      updateElement(selectedId, { width: snap(newWidth, GRID), height: snap(newHeight, GRID), x: snap(newX, GRID), y: snap(newY, GRID) });
    };

    const handleResizeEnd = () => {
      if (!isResizing) return;
      setIsResizing(false);
      setResizeHandle(null);
      setElements(prev => { const next = deepClone(prev); pushHistory(next); return prev; });
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, selectedId, resizeHandle, resizeStartPos, resizeStartSize, resizeStartElementPos, elements, isShiftPressed, pushHistory]);

  // ---------- Canvas click/select ----------
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
      closeAllToolbars();
    }
  };

  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedId === elementId) {
      setSelectedId(null);
      setShowElementToolbar(false);
    } else {
      setSelectedId(elementId);
      setShowElementToolbar(true);
    }
    setShowBackgroundControls(false);
    setShowTemplates(false);
  };

  // ---------- Export (unchanged) ----------
  const exportAsHTML = () => {
    const backgroundStyle = backgroundImage ? `background-image: url('${backgroundImage}'); background-size: ${backgroundSize}%; background-position: center; background-repeat: no-repeat;` : '';
    const html = `<!DOCTYPE html><html><head><title>Prescription</title><style>body{font-family:Inter,sans-serif;margin:0;padding:20px}.prescription{position:relative;width:${CANVAS_WIDTH}px;height:${CANVAS_HEIGHT}px;background-color:${canvasBackground};${backgroundStyle}margin:0 auto;border:1px solid #ccc}.element{position:absolute}</style></head><body><div class="prescription">${elements.map(el => {
      if (el.type === 'text') {
        return `<div class="element" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;font-family:${el.style?.fontFamily || 'Inter'};font-size:${(el as any).style?.fontSize || 16}px;color:${el.style?.color || '#000'};font-weight:${el.style?.fontWeight || 'normal'};display:flex;align-items:center;">${(el as TextElement).content || ''}</div>`;
      }
      if (el.type === 'line') {
        const l = el as LineElement;
        return `<svg class="element" style="position:absolute;left:0;top:0;" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"><line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${el.style?.strokeColor || '#000'}" stroke-width="${el.style?.strokeWidth || 2}" /></svg>`;
      }
      if (el.type === 'rectangle') {
        return `<div class="element" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;background-color:${el.style?.fillColor || 'transparent'};border:${el.style?.strokeWidth || 1}px solid ${el.style?.strokeColor || '#000'};"></div>`;
      }
      if (el.type === 'circle') {
        return `<div class="element" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;background-color:${el.style?.fillColor || 'transparent'};border:${el.style?.strokeWidth || 1}px solid ${el.style?.strokeColor || '#000'};border-radius:50%;"></div>`;
      }
      if (el.type === 'image' && (el as ImageElement).src) {
        return `<img class="element" src="${(el as ImageElement).src}" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;object-fit:cover;" />`;
      }
      return '';
    }).join('')}</div></body></html>`;
    navigator.clipboard.writeText(html).then(() => alert('HTML copied to clipboard!'));
  };

  const downloadPDF = () => {
    if (!canvasRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printHTML = `<!DOCTYPE html><html><head><title>Prescription</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:20px;background:#fff;display:flex;justify-content:center;align-items:flex-start;min-height:100vh}.prescription-container{position:relative;width:${CANVAS_WIDTH}px;height:${CANVAS_HEIGHT}px;background-color:${canvasBackground};border:1px solid #ddd;overflow:hidden}.background-layer{position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;${backgroundImage ? `background-image:url('${backgroundImage}');background-size:${backgroundSize}%;background-position:center;background-repeat:no-repeat;filter:blur(${backgroundBlur}px);` : ''}}.elements-layer{position:relative;z-index:1;width:100%;height:100%}.element{position:absolute;box-sizing:border-box}.text-element{display:flex;align-items:center;word-wrap:break-word;overflow-wrap:break-word}.image-element{object-fit:cover}@media print{body{padding:0;background:white!important}.prescription-container{border:none;box-shadow:none}.background-layer{-webkit-print-color-adjust:exact!important;color-adjust:exact!important;print-color-adjust:exact!important}@page{margin:0.5in;size:A4}}</style></head><body><div class="prescription-container">${backgroundImage ? '<div class="background-layer"></div>' : ''}<div class="elements-layer">${elements.map(el => {
      if (el.type === 'text') {
        const t = el as TextElement;
        return `<div class="element text-element" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;font-family:${el.style?.fontFamily || 'Inter,sans-serif'};font-size:${el.style?.fontSize || 16}px;color:${el.style?.color || '#000'};font-weight:${el.style?.fontWeight || 'normal'};">${t.content || ''}</div>`;
      }
      if (el.type === 'line') {
        const l = el as LineElement;
        return `<svg class="element" style="position:absolute;left:0;top:0;" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"><line x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}" stroke="${el.style?.strokeColor || '#000'}" stroke-width="${el.style?.strokeWidth || 2}" /></svg>`;
      }
      if (el.type === 'rectangle') {
        return `<div class="element" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;background-color:${el.style?.fillColor === 'transparent' ? 'transparent' : (el.style?.fillColor || 'transparent')};border-width:${el.style?.strokeWidth || 1}px;border-color:${el.style?.strokeColor || '#000'};border-style:solid;"></div>`;
      }
      if (el.type === 'circle') {
        return `<div class="element" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;background-color:${el.style?.fillColor === 'transparent' ? 'transparent' : (el.style?.fillColor || 'transparent')};border-width:${el.style?.strokeWidth || 1}px;border-color:${el.style?.strokeColor || '#000'};border-style:solid;border-radius:50%;"></div>`;
      }
      if (el.type === 'image') {
        const i = el as ImageElement;
        return `<img class="element image-element" src="${i.src}" alt="Prescription Image" style="left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;"/>`;
      }
      return '';
    }).join('')}</div></div></body></html>`;
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.onload = () => { setTimeout(() => { printWindow.print(); printWindow.close(); }, 300); };
  };

  const saveToLocal = () => {
    const data = { elements, canvasBackground, backgroundImage, backgroundSize, backgroundBlur, timestamp: new Date().toISOString() };
    try { localStorage.setItem('prescriptionTemplate', JSON.stringify(data)); alert('Prescription saved locally!'); } catch { alert('Save failed'); }
  };

  // ---------- Derived ----------
  const selectedElement = useMemo(() => elements.find(el => el.id === selectedId) || null, [elements, selectedId]);

  // =================== UI ===================
  return (
    <div className="h-screen bg-gray-50 flex flex-col select-none transition-all duration-300">
      {/* Top Navigation (unchanged) */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowTemplates(!showTemplates); if (!showTemplates) { setShowElementToolbar(false); setShowBackgroundControls(false); } }}
            >
              <Menu className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="font-semibold text-lg">Prescription Template Editor</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportAsHTML}><Copy className="h-4 w-4 mr-2"/>Copy HTML</Button>
            <Button variant="outline" size="sm" onClick={downloadPDF}><Download className="h-4 w-4 mr-2"/>Print/PDF</Button>
            <Button size="sm" onClick={saveToLocal}><Save className="h-4 w-4 mr-2"/>Save</Button>
          </div>
        </div>
      </div>

      {/* Main Canvas Toolbar (unchanged options) */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => addElement('text')}><Type className="h-4 w-4 mr-2"/>Text</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement('line')}><Minus className="h-4 w-4 mr-2"/>Line</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement('rectangle')}><Square className="h-4 w-4 mr-2"/>Rectangle</Button>
          <Button size="sm" variant="ghost" onClick={() => addElement('circle')}><Circle className="h-4 w-4 mr-2"/>Circle</Button>
          <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2"/>Upload Image</Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          <div className="flex items-center gap-2">
            <Label className="text-sm">Background:</Label>
            <Input type="color" value={canvasBackground} onChange={e => setCanvasBackground(e.target.value)} className="w-10 h-8 p-0 border-0"/>
            {['#ffffff','#f8fafc','#fef3c7','#dbeafe','#e0e7ff'].map(color => (
              <button key={color} className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: color }} onClick={() => setCanvasBackground(color)} />
            ))}
          </div>

          <Separator orientation="vertical" className="h-6 mx-2" />

          <Button size="sm" variant="ghost" onClick={() => backgroundFileInputRef.current?.click()} className={backgroundImage ? 'bg-blue-100 text-blue-700' : ''}>
            <ImageIcon className="h-4 w-4 mr-2"/>Background
          </Button>

          {backgroundImage && (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setShowBackgroundControls(!showBackgroundControls); if (!showBackgroundControls) { setShowElementToolbar(false); setShowTemplates(false);} }}>
                <Settings className="h-4 w-4 mr-2"/>BG Settings
              </Button>
              <Button size="sm" variant="ghost" onClick={removeBackgroundImage} className="text-red-600">
                <X className="h-4 w-4"/>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Templates Sidebar (kept) */}
        {showTemplates && !showElementToolbar && !showBackgroundControls && (
          <PrescriptionTemplates onSelectTemplate={handleSelectTemplate} onClose={() => setShowTemplates(false)} />
        )}

        {/* Background Controls (kept) */}
        {showBackgroundControls && backgroundImage && (
          <div className="w-72 bg-white border-r border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Background Settings</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowBackgroundControls(false)}><X className="h-4 w-4"/></Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Current Background</Label>
                <div className="mt-2 border border-gray-200 rounded-lg p-2">
                  <img src={backgroundImage} alt="Background preview" className="w-full h-20 object-cover rounded" style={{ filter: `blur(${backgroundBlur}px)` }} />
                </div>
              </div>
              <div>
                <Label className="text-sm">Size: {backgroundSize}%</Label>
                <Slider value={[backgroundSize]} onValueChange={([v]) => setBackgroundSize(v)} min={10} max={200} step={5} className="mt-2"/>
                <div className="flex justify-between text-xs text-gray-500 mt-1"><span>10%</span><span>200%</span></div>
              </div>
              <div>
                <Label className="text-sm">Blur: {backgroundBlur}px</Label>
                <Slider value={[backgroundBlur]} onValueChange={([v]) => setBackgroundBlur(v)} min={0} max={20} step={0.5} className="mt-2"/>
                <div className="flex justify-between text-xs text-gray-500 mt-1"><span>0px</span><span>20px</span></div>
              </div>
              <div className="space-y-2">
                <Button size="sm" variant="outline" onClick={() => backgroundFileInputRef.current?.click()} className="w-full"><Upload className="h-4 w-4 mr-2"/>Change Background</Button>
                <Button size="sm" variant="outline" onClick={removeBackgroundImage} className="w-full text-red-600"><Trash2 className="h-4 w-4 mr-2"/>Remove Background</Button>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <Button size="sm" variant="ghost" onClick={() => { setBackgroundSize(100); setBackgroundBlur(0); }} className="w-full">Reset Settings</Button>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 flex justify-center items-start p-8 bg-gray-100 overflow-auto relative">
          <div
            ref={canvasRef}
            className="relative shadow-xl border border-gray-300"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: canvasBackground }}
            onClick={handleCanvasClick}
          >
            {/* Background Layer */}
            {backgroundImage && (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${backgroundImage})`, backgroundSize: `${backgroundSize}%`, backgroundPosition: 'center', backgroundRepeat: 'no-repeat', filter: `blur(${backgroundBlur}px)`, zIndex: 0 }} />
            )}

            {/* Elements Layer */}
            <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
              {elements.map((el) => {
                // ---- LINE (draggable as a whole) ----
                if (el.type === 'line') {
                  const line = el as LineElement;
                  const minX = Math.min(line.x1, line.x2);
                  const minY = Math.min(line.y1, line.y2);
                  const width = Math.max(2, Math.abs(line.x2 - line.x1));
                  const height = Math.max(2, Math.abs(line.y2 - line.y1));

                  return (
                    <Draggable
                      key={`${el.id}-${minX}-${minY}`}
                      defaultPosition={{ x: minX, y: minY }}
                      grid={[GRID, GRID]}
                      bounds="parent"
                      onStart={(e) => { (e as any).stopPropagation?.(); }}
                      onStop={(e, data) => {
                        const dx = data.x - minX;
                        const dy = data.y - minY;
                        setElements(prev => {
                          const next = prev.map(item => {
                            if (item.id !== el.id) return item;
                            const L = item as LineElement;
                            return { ...L, x1: clamp(L.x1 + dx, 0, CANVAS_WIDTH), y1: clamp(L.y1 + dy, 0, CANVAS_HEIGHT), x2: clamp(L.x2 + dx, 0, CANVAS_WIDTH), y2: clamp(L.y2 + dy, 0, CANVAS_HEIGHT) } as LineElement;
                          });
                          pushHistory(next);
                          return next;
                        });
                      }}
                    >
                      <div onClick={(e) => handleElementClick(el.id, e)} style={{ position: 'absolute', left: 0, top: 0, width, height, willChange: 'transform' }}>
                        <svg width="100%" height="100%">
                          <line x1={line.x1 - minX} y1={line.y1 - minY} x2={line.x2 - minX} y2={line.y2 - minY} stroke={el.style?.strokeColor || '#000'} strokeWidth={el.style?.strokeWidth || 2} />
                        </svg>
                        {selectedId === el.id && (
                          <>
                            <div
                              style={{ position: 'absolute', left: (line.x1 - minX) - 5, top: (line.y1 - minY) - 5, width: 10, height: 10, background: '#3b82f6', borderRadius: '50%', cursor: 'move' }}
                              onMouseDown={(e) => startLineResize(e, el.id, 'start')}
                            />
                            <div
                              style={{ position: 'absolute', left: (line.x2 - minX) - 5, top: (line.y2 - minY) - 5, width: 10, height: 10, background: '#3b82f6', borderRadius: '50%', cursor: 'move' }}
                              onMouseDown={(e) => startLineResize(e, el.id, 'end')}
                            />
                          </>
                        )}
                      </div>
                    </Draggable>
                  );
                }

                // ---- OTHER ELEMENTS ----
                return (
                  <Draggable
                    key={`${el.id}-${el.x}-${el.y}`}
                    defaultPosition={{ x: el.x, y: el.y }}
                    grid={[GRID, GRID]}
                    bounds="parent"
                    onStart={(e) => { (e as any).stopPropagation?.(); }}
                    onStop={(e, d) => {
                      // snap and clamp on drop
                      const nx = clamp(snap(magneticSnap(d.x, CANVAS_WIDTH - el.width), GRID), 0, CANVAS_WIDTH - el.width);
                      const ny = clamp(snap(magneticSnap(d.y, CANVAS_HEIGHT - el.height), GRID), 0, CANVAS_HEIGHT - el.height);
                      setElements(prev => {
                        const next = prev.map(item => item.id === el.id ? ({ ...item, x: nx, y: ny } as Element) : item);
                        pushHistory(next);
                        return next;
                      });
                    }}
                  >
                    <div
                      className={`cursor-move ${selectedId === el.id ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-300'}`}
                      style={{ width: el.width, height: el.height, position: 'absolute', willChange: 'transform' }}
                      onClick={(e) => handleElementClick(el.id, e)}
                    >
                      {/* TEXT */}
                      {el.type === 'text' && (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const content = e.currentTarget.textContent || '';
                            setElements(prev => prev.map(it => it.id === el.id ? ({ ...(it as TextElement), content }) : it));
                            // history snapshot only once after edit
                            setTimeout(() => {
                              setElements(prev => { const next = deepClone(prev); pushHistory(next); return prev; });
                            }, 0);
                          }}
                          style={{ width: '100%', height: '100%', fontFamily: el.style?.fontFamily || 'Inter', fontSize: `${el.style?.fontSize || 16}px`, color: el.style?.color || '#000', fontWeight: el.style?.fontWeight || 'normal', outline: 'none', cursor: 'text', display: 'flex', alignItems: 'center' }}
                        >
                          {(el as TextElement).content}
                        </div>
                      )}

                      {/* RECTANGLE */}
                      {el.type === 'rectangle' && (
                        <div style={{ width: '100%', height: '100%', backgroundColor: el.style?.fillColor || 'transparent', border: `${el.style?.strokeWidth || 1}px solid ${el.style?.strokeColor || '#000'}`, borderRadius: `${el.style?.borderRadius || 0}px` }} />
                      )}

                      {/* CIRCLE */}
                      {el.type === 'circle' && (
                        <div style={{ width: '100%', height: '100%', backgroundColor: el.style?.fillColor || 'transparent', border: `${el.style?.strokeWidth || 1}px solid ${el.style?.strokeColor || '#000'}`, borderRadius: '50%' }} />
                      )}

                      {/* IMAGE */}
                      {el.type === 'image' && (el as ImageElement).src && (
                        <img src={(el as ImageElement).src} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', pointerEvents: 'none' }} />
                      )}

                      {/* Resize handles (non-line) */}
                      {selectedId === el.id && el.type !== 'line' && (
                        <>
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-nw-resize" style={{ top: -6, left: -6 }} onMouseDown={(e) => handleResizeStart(e, el.id, 'nw')} />
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-ne-resize" style={{ top: -6, right: -6 }} onMouseDown={(e) => handleResizeStart(e, el.id, 'ne')} />
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-sw-resize" style={{ bottom: -6, left: -6 }} onMouseDown={(e) => handleResizeStart(e, el.id, 'sw')} />
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-se-resize" style={{ bottom: -6, right: -6 }} onMouseDown={(e) => handleResizeStart(e, el.id, 'se')} />
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-n-resize" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={(e) => handleResizeStart(e, el.id, 'n')} />
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-s-resize" style={{ bottom: -6, left: '50%', transform: 'translateX(-50%)' }} onMouseDown={(e) => handleResizeStart(e, el.id, 's')} />
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-w-resize" style={{ left: -6, top: '50%', transform: 'translateY(-50%)' }} onMouseDown={(e) => handleResizeStart(e, el.id, 'w')} />
                          <div className="absolute w-3 h-3 bg-blue-500 border border-white cursor-e-resize" style={{ right: -6, top: '50%', transform: 'translateY(-50%)' }} onMouseDown={(e) => handleResizeStart(e, el.id, 'e')} />
                        </>
                      )}
                    </div>
                  </Draggable>
                );
              })}
            </div>
          </div>

          {/* Element Properties (kept UI, same controls) */}
          {showElementToolbar && selectedElement && !showBackgroundControls && (
            <div className="ml-4 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-h-[90vh] overflow-y-auto flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Element Properties</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowElementToolbar(false)}><X className="h-4 w-4"/></Button>
              </div>

              <div className="flex gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={duplicateElement}><Copy className="h-4 w-4 mr-1"/>Duplicate</Button>
                <Button size="sm" variant="outline" onClick={deleteSelectedElement} className="text-red-600"><Trash2 className="h-4 w-4 mr-1"/>Delete</Button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">X</Label>
                    <Input type="number" value={selectedElement.x} onChange={(e) => updateElement(selectedId, { x: clamp(parseInt(e.target.value) || 0, 0, CANVAS_WIDTH - selectedElement.width) })} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Y</Label>
                    <Input type="number" value={selectedElement.y} onChange={(e) => updateElement(selectedId, { y: clamp(parseInt(e.target.value) || 0, 0, CANVAS_HEIGHT - selectedElement.height) })} className="h-8" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Width</Label>
                    <Input type="number" value={selectedElement.width} onChange={(e) => updateElement(selectedId, { width: Math.max(20, parseInt(e.target.value) || 100) })} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Height</Label>
                    <Input type="number" value={selectedElement.height} onChange={(e) => updateElement(selectedId, { height: Math.max(20, parseInt(e.target.value) || 100) })} className="h-8" />
                  </div>
                </div>
              </div>

              {selectedElement.type === 'text' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Font Family</Label>
                    <Select value={selectedElement.style?.fontFamily || 'Inter'} onValueChange={(value) => updateElement(selectedId, { style: { ...selectedElement.style, fontFamily: value } })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
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
                    <Slider value={[selectedElement.style?.fontSize || 16]} onValueChange={([v]) => updateElement(selectedId, { style: { ...selectedElement.style, fontSize: v } })} min={8} max={48} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-xs">Text Color</Label>
                    <Input type="color" value={selectedElement.style?.color || '#000000'} onChange={(e) => updateElement(selectedId, { style: { ...selectedElement.style, color: e.target.value } })} className="h-8" />
                  </div>
                </div>
              )}

              {selectedElement.type === 'line' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Stroke Color</Label>
                    <Input type="color" value={selectedElement.style?.strokeColor || '#000000'} onChange={(e) => updateElement(selectedId, { style: { ...selectedElement.style, strokeColor: e.target.value } })} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Stroke Width: {selectedElement.style?.strokeWidth || 1}px</Label>
                    <Slider value={[selectedElement.style?.strokeWidth || 1]} onValueChange={([v]) => updateElement(selectedId, { style: { ...selectedElement.style, strokeWidth: v } })} min={1} max={10} step={1} className="mt-2" />
                  </div>
                </div>
              )}

              {(selectedElement.type === 'rectangle' || selectedElement.type === 'circle') && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Stroke Color</Label>
                    <Input type="color" value={selectedElement.style?.strokeColor || '#000000'} onChange={(e) => updateElement(selectedId, { style: { ...selectedElement.style, strokeColor: e.target.value } })} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Stroke Width: {selectedElement.style?.strokeWidth || 1}px</Label>
                    <Slider value={[selectedElement.style?.strokeWidth || 1]} onValueChange={([v]) => updateElement(selectedId, { style: { ...selectedElement.style, strokeWidth: v } })} min={1} max={10} step={1} className="mt-2" />
                  </div>
                  <div>
                    <Label className="text-xs">Fill Color</Label>
                    <div className="flex gap-2 mt-1">
                      <Input type="color" value={selectedElement.style?.fillColor === 'transparent' ? '#ffffff' : (selectedElement.style?.fillColor || '#ffffff')} onChange={(e) => updateElement(selectedId, { style: { ...selectedElement.style, fillColor: e.target.value } })} className="h-8 flex-1" />
                      <Button size="sm" variant="outline" onClick={() => updateElement(selectedId, { style: { ...selectedElement.style, fillColor: 'transparent' } })}>None</Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedElement.type === 'image' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Replace Image</Label>
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full mt-1"><Upload className="h-4 w-4 mr-2"/>Upload New Image</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
      <input ref={backgroundFileInputRef} type="file" accept="image/*" onChange={handleBackgroundImageUpload} style={{ display: 'none' }} />
    </div>
  );
};

export default PrescriptionCanvasEditor;
