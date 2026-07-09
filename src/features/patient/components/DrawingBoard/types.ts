export interface Point {
    x: number;
    y: number;
}

export type DrawTool = 'pen' | 'eraser' | 'text';

export interface StrokeItem {
    kind: 'stroke';
    tool: 'pen' | 'eraser';
    color: string;
    width: number;
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

// Reuses the pen's Thin/Medium/Thick stroke-width presets as text-size presets when the Text
// tool is active, so the toolbar doesn't need a second, redundant size control.
export const strokeWidthToFontSize = (width: number): number => {
    if (width <= 2) return 16;
    if (width <= 5) return 22;
    return 30;
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
