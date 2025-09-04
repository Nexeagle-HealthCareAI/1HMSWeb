export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function mmToPx(mm: number): number {
  // 1mm = 3.7795275591 pixels at 96 DPI
  return mm * 3.7795275591;
}

export function pxToMm(px: number): number {
  return px / 3.7795275591;
}
