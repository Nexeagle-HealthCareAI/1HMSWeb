export interface Point {
    x: number;
    y: number;
    /** Normalized pressure from PointerEvent (0–1). Defaults to 0.5 for mouse/touch. */
    pressure?: number;
}

export type DrawTool = 'pen' | 'marker' | 'highlighter' | 'eraser' | 'text';

export interface StrokeItem {
    kind: 'stroke';
    tool: DrawTool;
    color: string;
    width: number;
    opacity: number;  // 0–1; highlighter uses ~0.35, others 1.0
    points: Point[];
}

export interface TextItem {
    kind: 'text';
    text: string;
    x: number;
    y: number;
    color: string;
    fontSize: number;
}

// A single ordered history of everything drawn — strokes and text labels interleaved in the
// order they were created. Keeping them in one array (rather than separate lists) is what makes
// an eraser stroke drawn after a label correctly paint over it on replay, and undo/redo/clear
// work uniformly across both kinds.
export type DrawItem = StrokeItem | TextItem;

export const CANVAS_WIDTH = 794;
export const CANVAS_HEIGHT = 1123;
export const CANVAS_BACKGROUND = '#FFFFFF';

// Default settings per tool
export const TOOL_DEFAULTS: Record<DrawTool, { width: number; opacity: number }> = {
    pen: { width: 3, opacity: 1.0 },
    marker: { width: 8, opacity: 1.0 },
    highlighter: { width: 22, opacity: 0.35 },
    eraser: { width: 20, opacity: 1.0 },
    text: { width: 5, opacity: 1.0 },
};

// Reuses the pen's stroke-width presets as text-size presets when the Text tool is active
export const strokeWidthToFontSize = (width: number): number => {
    if (width <= 2) return 14;
    if (width <= 5) return 20;
    if (width <= 10) return 28;
    return 36;
};

export const dataUrlToFile = (dataUrl: string, fileName: string): File => {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = /:(.*?);/.exec(header);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
};

