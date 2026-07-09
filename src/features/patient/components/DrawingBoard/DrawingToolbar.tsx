import React from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Pencil, Redo2, Trash2, Type, Undo2 } from 'lucide-react';
import { DrawTool } from './types';

const COLORS = [
    { label: 'Black', value: '#1e293b' },
    { label: 'Red', value: '#dc2626' },
    { label: 'Blue', value: '#2563eb' },
    { label: 'Green', value: '#16a34a' },
];

// Doubles as text-size presets when the Text tool is active — same three buttons, relabeled,
// so the toolbar doesn't need a second, redundant size control.
const WIDTHS = [
    { label: 'Thin', textLabel: 'Small', value: 2 },
    { label: 'Medium', textLabel: 'Medium', value: 5 },
    { label: 'Thick', textLabel: 'Large', value: 10 },
];

interface DrawingToolbarProps {
    tool: DrawTool;
    onToolChange: (tool: DrawTool) => void;
    color: string;
    onColorChange: (color: string) => void;
    strokeWidth: number;
    onStrokeWidthChange: (width: number) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    onClear: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
    tool, onToolChange, color, onColorChange, strokeWidth, onStrokeWidthChange,
    canUndo, canRedo, onUndo, onRedo, onClear,
}) => {
    return (
        <div className="flex flex-wrap items-center gap-3 px-1">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                <Button
                    type="button"
                    variant={tool === 'pen' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => onToolChange('pen')}
                >
                    <Pencil className="h-3.5 w-3.5" /> Pen
                </Button>
                <Button
                    type="button"
                    variant={tool === 'eraser' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => onToolChange('eraser')}
                >
                    <Eraser className="h-3.5 w-3.5" /> Eraser
                </Button>
                <Button
                    type="button"
                    variant={tool === 'text' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => onToolChange('text')}
                >
                    <Type className="h-3.5 w-3.5" /> Text
                </Button>
            </div>

            <div className="flex items-center gap-1.5">
                {COLORS.map(c => (
                    <button
                        key={c.value}
                        type="button"
                        title={c.label}
                        onClick={() => onColorChange(c.value)}
                        className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c.value && tool !== 'eraser' ? 'scale-110 border-gray-900' : 'border-transparent'}`}
                        style={{ backgroundColor: c.value }}
                    />
                ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                {WIDTHS.map(w => (
                    <Button
                        key={w.value}
                        type="button"
                        variant={strokeWidth === w.value ? 'default' : 'ghost'}
                        size="sm"
                        className="h-8"
                        onClick={() => onStrokeWidthChange(w.value)}
                    >
                        {tool === 'text' ? w.textLabel : w.label}
                    </Button>
                ))}
            </div>

            <div className="flex items-center gap-1 ml-auto">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onUndo} disabled={!canUndo}>
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRedo} disabled={!canRedo}>
                    <Redo2 className="h-3.5 w-3.5" /> Redo
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-red-600 hover:text-red-700" onClick={onClear} disabled={!canUndo}>
                    <Trash2 className="h-3.5 w-3.5" /> Clear
                </Button>
            </div>
        </div>
    );
};
