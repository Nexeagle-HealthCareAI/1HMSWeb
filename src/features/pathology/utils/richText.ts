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

// Single-quoted (not double) -- runsToHtml below embeds these directly inside a double-quoted
// HTML style="..." attribute; a double-quoted font name here would terminate that attribute early
// and corrupt the markup.
const FONT_FAMILY_CSS: Record<RichFontFamily, string> = {
    Helvetica: 'Helvetica, Arial, sans-serif',
    TimesRoman: "'Times New Roman', Times, serif",
    Courier: "'Courier New', Courier, monospace",
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

        // document.execCommand('foreColor') (RichTextField's color swatches) produces a legacy
        // <font color="#hex"> element, not a style="color:..." span -- el.style.color only ever
        // reflects the latter, so without this branch every color choice silently vanished on save.
        const fontColorAttr = tag === 'font' ? el.getAttribute('color') : null;
        const inlineColor = el.style?.color || fontColorAttr || null;
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

// --- Block layer (bullet/numbered lists, paragraph alignment) -------------------------------
// Bold/italic/color/font are character-run properties (StyledRun, above); a bullet marker or "this
// paragraph is centered" is a block/paragraph property, which a flat run array has no way to
// express. StyledBlock wraps StyledRun[] with that block-level metadata. Every existing consumer
// of a keyword's ContentJson goes through parseKeywordContent (below), which transparently
// upgrades the old flat StyledRun[] shape (still used by every keyword saved before this) into a
// single-block-per-line StyledBlock[] -- so nothing already saved needs to change or breaks.
export type BlockAlign = 'left' | 'center' | 'right';

export interface StyledBlock {
    runs: StyledRun[];
    align?: BlockAlign;                                    // default 'left'
    list?: { type: 'bullet' | 'number'; index?: number };  // index set for 'number', at parse time
}

function readAlign(el: HTMLElement): BlockAlign | undefined {
    const ta = el.style?.textAlign;
    if (ta === 'center' || ta === 'right' || ta === 'left') return ta;
    return undefined;
}

// document.execCommand('insertUnorderedList'/'insertOrderedList'), when applied to a selection that
// doesn't start at the very first line, sometimes wraps the produced <ul>/<ol> in a <div> rather
// than leaving it as a direct child (verified empirically against Chrome) -- unwrap that one level
// so the list is still recognized as a list, not misread as an ordinary paragraph block.
function unwrapSoleListChild(el: HTMLElement): HTMLElement {
    if ((el.tagName === 'DIV' || el.tagName === 'P') && el.children.length === 1) {
        const only = el.children[0];
        if (only.tagName === 'UL' || only.tagName === 'OL') return only as HTMLElement;
    }
    return el;
}

// The only place HTML is ever parsed into blocks -- same trust boundary as htmlToRuns (RichTextField's
// own output only; paste is forced to plain text).
export function htmlToBlocks(container: HTMLElement): StyledBlock[] {
    const blocks: StyledBlock[] = [];
    let pending: Node[] = [];

    // Bare top-level text/inline nodes (the un-wrapped first line, before Enter has ever been
    // pressed) accumulate here until a real block element ends the implicit first block.
    const flushPending = () => {
        if (pending.length === 0) return;
        const wrapper = document.createElement('div');
        for (const n of pending) wrapper.appendChild(n.cloneNode(true));
        blocks.push({ runs: htmlToRuns(wrapper) });
        pending = [];
    };

    const pushListBlocks = (listEl: HTMLElement) => {
        const type: 'bullet' | 'number' = listEl.tagName === 'OL' ? 'number' : 'bullet';
        let index = 0;
        for (const li of Array.from(listEl.children)) {
            if (li.tagName !== 'LI') continue;
            index += 1;
            blocks.push({
                runs: htmlToRuns(li as HTMLElement),
                align: readAlign(li as HTMLElement),
                list: type === 'number' ? { type, index } : { type },
            });
        }
    };

    for (const child of Array.from(container.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            const rawEl = child as HTMLElement;
            const rawTag = rawEl.tagName.toLowerCase();
            if (rawTag === 'div' || rawTag === 'p' || rawTag === 'ul' || rawTag === 'ol') {
                flushPending();
                const el = unwrapSoleListChild(rawEl);
                const tag = el.tagName.toLowerCase();
                if (tag === 'ul' || tag === 'ol') {
                    pushListBlocks(el);
                } else {
                    const runs = htmlToRuns(el);
                    // Skip a genuinely empty trailing line (e.g. a stray <div><br></div>) rather
                    // than saving a meaningless blank block, but never drop the very first block --
                    // an intentionally-empty field should still round-trip as one empty block.
                    if (runs.length > 0 || blocks.length === 0) {
                        blocks.push({ runs, align: readAlign(el) });
                    }
                }
                continue;
            }
        }
        pending.push(child);
    }
    flushPending();

    return blocks.length > 0 ? blocks : [{ runs: [] }];
}

// The reverse of htmlToBlocks -- used to rehydrate a saved keyword back into the editor, and to
// build the HTML fragment a keyword expands to at insertion time. Consecutive same-type list blocks
// share one wrapping <ul>/<ol>, matching what the browser itself produces, so a round trip through
// here and back through htmlToBlocks is stable.
export function blocksToHtml(blocks: StyledBlock[]): string {
    const parts: string[] = [];
    let i = 0;
    while (i < blocks.length) {
        const block = blocks[i];
        if (block.list) {
            const type = block.list.type;
            const tag = type === 'number' ? 'ol' : 'ul';
            const items: string[] = [];
            while (i < blocks.length && blocks[i].list?.type === type) {
                const b = blocks[i];
                const styleAttr = b.align && b.align !== 'left' ? ` style="text-align:${b.align}"` : '';
                items.push(`<li${styleAttr}>${runsToHtml(b.runs)}</li>`);
                i += 1;
            }
            parts.push(`<${tag}>${items.join('')}</${tag}>`);
            continue;
        }
        const styleAttr = block.align && block.align !== 'left' ? ` style="text-align:${block.align}"` : '';
        const inner = runsToHtml(block.runs);
        // Keep the very first plain, left-aligned block bare (no wrapping <div>) -- the overwhelming
        // majority of keywords are one plain line, and this keeps their HTML identical to what the
        // editor itself produces for a freshly-typed single line.
        parts.push(i === 0 && !styleAttr ? inner : `<div${styleAttr}>${inner}</div>`);
        i += 1;
    }
    return parts.join('');
}

export function blocksToPlainText(blocks: StyledBlock[]): string {
    return blocks
        .map(b => (b.list ? (b.list.type === 'number' ? `${b.list.index}. ` : '• ') : '') + runsToPlainText(b.runs))
        .join('\n');
}

function isLegacyRunArray(parsed: unknown): parsed is StyledRun[] {
    return Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object' && 'text' in item);
}

// The one place any stored keyword ContentJson is ever turned into blocks. Transparently upgrades
// every keyword saved before this feature (a flat StyledRun[] JSON array) into StyledBlock[] by
// splitting on '\n' run boundaries -- lossless, and reproduces exactly how that content already
// rendered.
export function parseKeywordContent(json: string): StyledBlock[] {
    if (!json) return [{ runs: [] }];
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch {
        return [{ runs: plainTextToRuns(json) }];
    }
    if (!Array.isArray(parsed) || parsed.length === 0) return [{ runs: [] }];
    if (isLegacyRunArray(parsed)) {
        const blocks: StyledBlock[] = [];
        let current: StyledRun[] = [];
        for (const run of parsed) {
            if (run.text === '\n') {
                blocks.push({ runs: current });
                current = [];
            } else {
                current.push(run);
            }
        }
        blocks.push({ runs: current });
        return blocks;
    }
    return parsed as StyledBlock[];
}

export function stringifyKeywordContent(blocks: StyledBlock[]): string {
    return JSON.stringify(blocks);
}
