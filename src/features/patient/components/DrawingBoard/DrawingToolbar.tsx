import React from 'react';
import { Eraser, Pencil, Highlighter, Type, Undo2, Redo2, Trash2, Download, LayoutGrid, AlignLeft, Square } from 'lucide-react';
import { DrawTool, TOOL_DEFAULTS } from './types';
import './DrawingToolbar.css';

const COLORS = [
    { label: 'Ink Black', value: '#0f172a' },
    { label: 'Charcoal', value: '#334155' },
    { label: 'Blue Pen', value: '#1d4ed8' },
    { label: 'Sky Blue', value: '#0ea5e9' },
    { label: 'Medical Red', value: '#dc2626' },
    { label: 'Rose', value: '#f43f5e' },
    { label: 'Forest Green', value: '#16a34a' },
    { label: 'Emerald', value: '#10b981' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Orange', value: '#ea580c' },
    { label: 'Amber', value: '#d97706' },
    { label: 'Highlight Yellow', value: '#facc15' },
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
    onExport: () => void;
    background: 'white' | 'grid' | 'lined';
    onBackgroundChange: (bg: 'white' | 'grid' | 'lined') => void;
}

const TOOLS: { key: DrawTool; icon: React.ReactNode; label: string }[] = [
    { key: 'pen',         icon: <Pencil size={18} />,      label: 'Pen' },
    { key: 'marker',      icon: <Square size={18} />,      label: 'Marker' },
    { key: 'highlighter', icon: <Highlighter size={18} />, label: 'Highlight' },
    { key: 'eraser',      icon: <Eraser size={18} />,      label: 'Eraser' },
    { key: 'text',        icon: <Type size={18} />,        label: 'Text' },
];

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
    tool, onToolChange, color, onColorChange, strokeWidth, onStrokeWidthChange,
    canUndo, canRedo, onUndo, onRedo, onClear, onExport, background, onBackgroundChange,
}) => {
    const toolbarColor = tool === 'eraser' ? '#64748b' : color;
    const dotSize = Math.min(Math.max(strokeWidth * 1.5, 6), 32);

    return (
        <div className="rxpad-toolbar">
            {/* Drawing tools */}
            <div className="rxpad-toolbar-section">
                <div className="rxpad-section-label">Tools</div>
                {TOOLS.map(t => (
                    <button
                        key={t.key}
                        className={`rxpad-tool-btn ${tool === t.key ? 'active' : ''}`}
                        onClick={() => {
                            onToolChange(t.key);
                            // Auto-switch to that tool's default width
                            onStrokeWidthChange(TOOL_DEFAULTS[t.key].width);
                        }}
                        title={t.label}
                        type="button"
                    >
                        {t.icon}
                        <span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Stroke thickness */}
            <div className="rxpad-toolbar-section">
                <div className="rxpad-section-label">Size</div>
                <div className="rxpad-slider-wrap" style={{ color: toolbarColor }}>
                    <div className="rxpad-stroke-preview">
                        <div
                            className="rxpad-stroke-dot"
                            style={{ width: dotSize, height: dotSize, background: toolbarColor }}
                        />
                    </div>
                    <input
                        type="range"
                        min={1}
                        max={40}
                        step={1}
                        value={strokeWidth}
                        onChange={e => onStrokeWidthChange(Number(e.target.value))}
                        className="rxpad-slider"
                        title={`Stroke width: ${strokeWidth}px`}
                    />
                </div>
            </div>

            {/* Color palette */}
            <div className="rxpad-toolbar-section">
                <div className="rxpad-section-label">Color</div>
                <div className="rxpad-colors">
                    {COLORS.map(c => (
                        <button
                            key={c.value}
                            className={`rxpad-color-swatch ${color === c.value && tool !== 'eraser' ? 'active' : ''}`}
                            style={{ backgroundColor: c.value }}
                            onClick={() => {
                                onColorChange(c.value);
                                if (tool === 'eraser') onToolChange('pen');
                            }}
                            title={c.label}
                            type="button"
                        />
                    ))}
                    <input
                        type="color"
                        className="rxpad-color-picker"
                        value={color}
                        onChange={e => {
                            onColorChange(e.target.value);
                            if (tool === 'eraser') onToolChange('pen');
                        }}
                        title="Custom color"
                    />
                </div>
            </div>

            {/* Background */}
            <div className="rxpad-toolbar-section">
                <div className="rxpad-section-label">Paper</div>
                <div className="rxpad-bg-btns">
                    <button className={`rxpad-bg-btn ${background === 'white' ? 'active' : ''}`} onClick={() => onBackgroundChange('white')} title="Blank" type="button">
                        <Square size={12} />
                    </button>
                    <button className={`rxpad-bg-btn ${background === 'grid' ? 'active' : ''}`} onClick={() => onBackgroundChange('grid')} title="Grid" type="button">
                        <LayoutGrid size={12} />
                    </button>
                    <button className={`rxpad-bg-btn ${background === 'lined' ? 'active' : ''}`} onClick={() => onBackgroundChange('lined')} title="Lined" type="button">
                        <AlignLeft size={12} />
                    </button>
                </div>
            </div>

            {/* History / Actions */}
            <div className="rxpad-toolbar-section">
                <div className="rxpad-section-label">History</div>
                <button className="rxpad-tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)" type="button">
                    <Undo2 size={18} />
                    <span>Undo</span>
                </button>
                <button className="rxpad-tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo (⌘⇧Z)" type="button">
                    <Redo2 size={18} />
                    <span>Redo</span>
                </button>
                <button className="rxpad-tool-btn" onClick={onClear} disabled={!canUndo} title="Clear all" type="button" style={{ color: !canUndo ? undefined : '#f87171' }}>
                    <Trash2 size={18} />
                    <span>Clear</span>
                </button>
                <button className="rxpad-tool-btn" onClick={onExport} title="Export PNG" type="button" style={{ color: '#34d399' }}>
                    <Download size={18} />
                    <span>Export</span>
                </button>
            </div>
        </div>
    );
};


