import React, { useCallback, useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { htmlToBlocks, type RichFontFamily, type StyledBlock } from '../utils/richText';

const COLOR_SWATCHES: { label: string; value: string }[] = [
    { label: 'Default', value: '' },
    { label: 'Red', value: '#DC2626' },
    { label: 'Amber', value: '#D97706' },
    { label: 'Green', value: '#059669' },
    { label: 'Blue', value: '#2563EB' },
];

const FONT_FAMILY_OPTIONS: { label: string; value: RichFontFamily }[] = [
    { label: 'Sans-serif', value: 'Helvetica' },
    { label: 'Serif', value: 'TimesRoman' },
    { label: 'Monospace', value: 'Courier' },
];

const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 14, 16];

interface RichTextFieldProps {
    value: string;                                    // HTML string (the persisted format)
    onChange: (html: string, blocks: StyledBlock[]) => void;
    placeholder?: string;
    showToolbar?: boolean;                             // default true
    minHeight?: string;
    className?: string;
    // Fires on Enter with the word immediately typed before the caret -- OrderResultEntry.tsx uses
    // this for keyword expansion. Return true to indicate the word was consumed (a keyword
    // matched, the field already handled clearing it + inserting the replacement, and this
    // component should suppress the default Enter/newline behavior).
    onEnterWord?: (word: string, insertAtCaret: (html: string) => void) => boolean;
}

// contentEditable + a minimal toolbar (Bold/Italic/Color/Font/Size) -- not a general-purpose rich
// text editor, deliberately constrained to exactly what generatePathologyReportPdf.ts can draw
// (see richText.ts). Two modes: full toolbar (keyword authoring) or hidden (drop-in replacement
// for the plain Textarea in OrderResultEntry.tsx, which only needs the keyword-expansion hook).
export const RichTextField: React.FC<RichTextFieldProps> = ({
    value, onChange, placeholder, showToolbar = true, minHeight = '80px', className, onEnterWord,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    // null (never a real HTML string) so the mount run below always hydrates the DOM at least
    // once, even when `value` starts out non-empty (e.g. opening the editor on an existing record).
    const lastEmittedHtml = useRef<string | null>(null);

    // Only push the `value` prop into the DOM when it changed from OUTSIDE this component (e.g.
    // loading a different record) -- never on our own onChange round-trip, which would otherwise
    // reset the caret to the start on every keystroke.
    useEffect(() => {
        if (ref.current && value !== lastEmittedHtml.current) {
            ref.current.innerHTML = value;
            lastEmittedHtml.current = value;
        }
    }, [value]);

    const emitChange = useCallback(() => {
        if (!ref.current) return;
        const html = ref.current.innerHTML;
        lastEmittedHtml.current = html;
        onChange(html, htmlToBlocks(ref.current));
    }, [onChange]);

    // Chrome, when justify* promotes a still-bare (never wrapped in a block yet) first line into
    // its own block for the very first time, sometimes also wraps that line's text in a
    // <span style="font-size:...;color:..."> that merely restates the editor's own ambient
    // computed style -- not anything the user asked for. Only strip a span when doing so has zero
    // visual effect (its values already match what would render without it), so a genuine,
    // deliberately-chosen color/size is never touched.
    const stripAmbientStyleArtifact = () => {
        const container = ref.current;
        if (!container) return;
        const containerComputed = window.getComputedStyle(container);
        for (const span of Array.from(container.getElementsByTagName('span'))) {
            const parent = span.parentElement;
            if (!parent || parent.childNodes.length !== 1) continue;
            const styleProps = Array.from(span.style).filter(Boolean);
            if (styleProps.length === 0 || !styleProps.every(p => p === 'font-size' || p === 'color')) continue;
            // Compare resolved computed values, not the raw inline-style strings -- the artifact's
            // span writes "0.875rem" while getComputedStyle always normalizes to "14px", so a naive
            // string comparison never matches even when the two are visually identical.
            const spanComputed = window.getComputedStyle(span);
            const sizeOk = !span.style.fontSize || spanComputed.fontSize === containerComputed.fontSize;
            const colorOk = !span.style.color || spanComputed.color === containerComputed.color;
            if (sizeOk && colorOk) {
                while (span.firstChild) parent.insertBefore(span.firstChild, span);
                parent.removeChild(span);
            }
        }
    };

    const exec = (command: string, arg?: string) => {
        ref.current?.focus();
        document.execCommand(command, false, arg);
        if (command.startsWith('justify')) stripAmbientStyleArtifact();
        emitChange();
    };

    // Bold/Italic/Color use execCommand -- still reliably supported for these three in every
    // evergreen browser despite the API's deprecated status, and (unlike a manual Range wrap) they
    // correctly toggle "style the next typed characters" when nothing is selected, matching how
    // every familiar word processor behaves.
    const applyColor = (hex: string) => exec(hex ? 'foreColor' : 'removeFormat', hex || undefined);

    // Font family/size have no reliable execCommand equivalent (fontSize takes a legacy 1-7 index,
    // fontName produces inconsistent deprecated <font> tags) -- wrap the current selection in a
    // styled span by hand instead. No-ops on a collapsed selection (nothing to wrap): the user
    // must select existing text first to change its family/size.
    const wrapSelection = (styleCss: string) => {
        const container = ref.current;
        const sel = window.getSelection();
        if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
        const range = sel.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;
        const span = document.createElement('span');
        span.style.cssText = styleCss;
        try {
            range.surroundContents(span);
        } catch {
            const frag = range.extractContents();
            span.appendChild(frag);
            range.insertNode(span);
        }
        sel.removeAllRanges();
        const after = document.createRange();
        after.selectNodeContents(span);
        after.collapse(false);
        sel.addRange(after);
        emitChange();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        // Never let arbitrary external HTML reach htmlToRuns -- plain text only.
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        emitChange();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Enter' || !onEnterWord) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || !sel.isCollapsed || !ref.current) return;

        const range = sel.getRangeAt(0);
        const node = range.startContainer;
        if (node.nodeType !== Node.TEXT_NODE) return;
        const textBeforeCaret = (node.textContent ?? '').slice(0, range.startOffset);
        const wordMatch = textBeforeCaret.match(/(\S+)$/);
        if (!wordMatch) return;
        const word = wordMatch[1];
        const wordStart = range.startOffset - word.length;

        const consumed = onEnterWord(word, (html: string) => {
            // Delete the typed word, then insert the expansion in its place.
            const deleteRange = document.createRange();
            deleteRange.setStart(node, wordStart);
            deleteRange.setEnd(node, range.startOffset);
            deleteRange.deleteContents();

            const wrapper = document.createElement('span');
            wrapper.innerHTML = html;
            const frag = document.createDocumentFragment();
            let lastNode: ChildNode | null = null;
            while (wrapper.firstChild) {
                lastNode = wrapper.firstChild;
                frag.appendChild(wrapper.firstChild);
            }
            deleteRange.insertNode(frag);

            const after = document.createRange();
            if (lastNode) {
                after.setStartAfter(lastNode);
            } else {
                after.setStart(node, wordStart);
            }
            after.collapse(true);
            sel.removeAllRanges();
            sel.addRange(after);
            emitChange();
        });
        if (consumed) e.preventDefault();
    };

    return (
        <div className={cn('rounded-md border border-input bg-background', className)}>
            {showToolbar && (
                <div className="flex flex-wrap items-center gap-1 border-b border-input px-2 py-1.5">
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted" title="Bold">
                        <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted" title="Italic">
                        <Italic className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    {COLOR_SWATCHES.map(c => (
                        <button
                            key={c.label} type="button" title={c.label}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => applyColor(c.value)}
                            className="h-5 w-5 rounded-full border border-border shrink-0"
                            style={{ backgroundColor: c.value || '#94a3b8' }}
                        />
                    ))}
                    <div className="w-px h-5 bg-border mx-1" />
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted" title="Bullet list">
                        <List className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted" title="Numbered list">
                        <ListOrdered className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('justifyLeft')}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted" title="Align left">
                        <AlignLeft className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('justifyCenter')}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted" title="Align center">
                        <AlignCenter className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('justifyRight')}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted" title="Align right">
                        <AlignRight className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border mx-1" />
                    <Select onValueChange={(v) => wrapSelection(`font-family:${v === 'TimesRoman' ? '"Times New Roman", Times, serif' : v === 'Courier' ? '"Courier New", monospace' : 'Helvetica, Arial, sans-serif'}`)}>
                        <SelectTrigger className="h-7 w-[110px] text-xs"><SelectValue placeholder="Font" /></SelectTrigger>
                        <SelectContent>
                            {FONT_FAMILY_OPTIONS.map(f => <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={(v) => wrapSelection(`font-size:${v}px`)}>
                        <SelectTrigger className="h-7 w-[68px] text-xs"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>
                            {FONT_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(Math.round(s / 0.75))} className="text-xs">{s}pt</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                onInput={emitChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                data-placeholder={placeholder}
                className={cn(
                    'px-3 py-2 text-sm outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
                    'overflow-y-auto',
                )}
                style={{ minHeight }}
            />
        </div>
    );
};
