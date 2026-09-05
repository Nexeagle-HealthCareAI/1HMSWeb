// Shared rich-text model for pathology report keywords and the report fields they get expanded
// into. Deliberately NOT arbitrary HTML/CSS -- every field here maps 1:1 to something
// generatePathologyReportPdf.ts can actually draw with pdf-lib's built-in StandardFonts (12
// combinations: Helvetica/TimesRoman/Courier x regular/bold/italic/bold-italic), so what's
// authored on screen is exactly what prints, not an approximation of it.
export type RichFontFamily = 'Helvetica' | 'TimesRoman' | 'Courier';

export interface StyledRun {
    text: string;
    bold?: boolean;
    italic?: boolean;
    color?: string;             // hex, e.g. "#DC2626"
    fontFamily?: RichFontFamily; // default Helvetica
    fontSize?: number;          // default inherited from the field's own base size
}

const FONT_FAMILY_CSS: Record<RichFontFamily, string> = {
    Helvetica: 'Helvetica, Arial, sans-serif',
    TimesRoman: '"Times New Roman", Times, serif',
    Courier: '"Courier New", Courier, monospace',
};

const CSS_TO_FONT_FAMILY: { match: RegExp; family: RichFontFamily }[] = [
    { match: /times|serif/i, family: 'TimesRoman' },
    { match: /courier|mono/i, family: 'Courier' },
    { match: /helvetica|arial|sans/i, family: 'Helvetica' },
];

function resolveFontFamilyFromCss(fontFamilyCss: string | null): RichFontFamily | undefined {
    if (!fontFamilyCss) return undefined;
    for (const { match, family } of CSS_TO_FONT_FAMILY) {
        if (match.test(fontFamilyCss)) return family;
    }
    return undefined;
}

interface InheritedStyle {
    bold: boolean;
    italic: boolean;
    color?: string;
    fontFamily?: RichFontFamily;
    fontSize?: number;
}

// The only place HTML is ever parsed -- and only ever ` RichTextField`'s own well-formed output
// (bold/italic via execCommand -> <b>/<i>, color/font/size via our own <span style="...">), never
// arbitrary pasted/external HTML. RichTextField's paste handler forces plain-text insertion so
// nothing else ever reaches this parser.
export function htmlToRuns(container: HTMLElement): StyledRun[] {
    const runs: StyledRun[] = [];

    const walk = (node: Node, style: InheritedStyle) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent ?? '';
            if (text.length === 0) return;
            runs.push({
                text,
                bold: style.bold || undefined,
                italic: style.italic || undefined,
                color: style.color,
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
            });
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        let next = style;

        if (tag === 'br') {
            runs.push({ text: '\n' });
            return;
        }
        if (tag === 'b' || tag === 'strong') next = { ...style, bold: true };
        if (tag === 'i' || tag === 'em') next = { ...style, italic: true };
        if (tag === 'div' || tag === 'p') {
            // contentEditable wraps new lines in <div>/<p> on Enter in most browsers -- treat a
            // subsequent block as a line break rather than losing the paragraph structure.
            if (runs.length > 0) runs.push({ text: '\n' });
        }

        const inlineColor = el.style?.color || null;
        const inlineFontFamily = el.style?.fontFamily || null;
        const inlineFontSize = el.style?.fontSize || null;
        if (inlineColor) next = { ...next, color: rgbToHex(inlineColor) ?? next.color };
        if (inlineFontFamily) next = { ...next, fontFamily: resolveFontFamilyFromCss(inlineFontFamily) ?? next.fontFamily };
        if (inlineFontSize) {
            const px = parseFloat(inlineFontSize);
            if (!Number.isNaN(px)) next = { ...next, fontSize: Math.round(px * 0.75) }; // px -> pt
        }

        for (const child of Array.from(el.childNodes)) {
            walk(child, next);
        }
    };

    for (const child of Array.from(container.childNodes)) {
        walk(child, { bold: false, italic: false });
    }

    return runs;
}

function rgbToHex(color: string): string | null {
    if (color.startsWith('#')) return color;
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return null;
    const [, r, g, b] = m;
    return `#${[r, g, b].map(v => Number(v).toString(16).padStart(2, '0')).join('')}`;
}

// The reverse of htmlToRuns -- used to rehydrate saved content back into a contentEditable for
// further editing, and to insert an authored keyword's content into a report field at expansion
// time. Every span carries an explicit inline style (never a class) so it round-trips through
// htmlToRuns's own inline-style reader above.
export function runsToHtml(runs: StyledRun[]): string {
    return runs.map(run => {
        if (run.text === '\n') return '<br>';
        let text = escapeHtml(run.text);
        if (run.bold) text = `<b>${text}</b>`;
        if (run.italic) text = `<i>${text}</i>`;
        const styles: string[] = [];
        if (run.color) styles.push(`color:${run.color}`);
        if (run.fontFamily) styles.push(`font-family:${FONT_FAMILY_CSS[run.fontFamily]}`);
        if (run.fontSize) styles.push(`font-size:${Math.round(run.fontSize / 0.75)}px`); // pt -> px
        if (styles.length > 0) text = `<span style="${styles.join(';')}">${text}</span>`;
        return text;
    }).join('');
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// A plain string (pre-existing report values authored before this feature, or a keyword typed but
// never formatted) has no tags at all -- htmlToRuns on a container whose only child is a text node
// yields exactly one plain run, so no separate "is this legacy plain text" branch is needed
// anywhere else in the app.
export function plainTextToRuns(text: string): StyledRun[] {
    return text ? [{ text }] : [];
}

export function runsToPlainText(runs: StyledRun[]): string {
    return runs.map(r => (r.text === '\n' ? '\n' : r.text)).join('');
}
