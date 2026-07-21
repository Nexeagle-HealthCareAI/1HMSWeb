// Renders the FIRST page of a PDF (given by URL) to a PNG data URL, so a PDF letterhead can be
// shown as a bitmap background behind the InkDischarge canvas — the discharge letterhead is a PDF
// (unlike the OPD prescription letterhead, which is already an image). pdf-lib can compose PDFs
// but can't rasterize them, so pdfjs-dist does the render.
//
// The worker is wired via Vite's `?url` import (the pdfjs worker is an ESM module in v4); this is
// the supported way to give the main thread a same-origin worker URL under a bundler.
import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error — Vite resolves `?url` to a string at build time; no type decl for the suffix.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface RasterizedPage {
    dataUrl: string;
    width: number;
    height: number;
}

/**
 * Rasterize page 1 of the PDF at `url` to a PNG data URL.
 * @param targetWidthPx  Desired output width in pixels (height follows the page's aspect ratio).
 *                       A4 at 96dpi is 794px; we render a bit higher for crisper on-screen ink.
 */
export async function rasterizePdfFirstPage(url: string, targetWidthPx = 1240): Promise<RasterizedPage> {
    // credentials/referrer kept minimal — presigned S3/MinIO URLs authenticate via the query string.
    const res = await fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(`Could not fetch letterhead (${res.status}).`);
    const buffer = await res.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    try {
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = targetWidthPx / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable.');
        // Flatten onto white — a letterhead PDF may have a transparent background.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;
        return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
    } finally {
        pdf.destroy();
    }
}
