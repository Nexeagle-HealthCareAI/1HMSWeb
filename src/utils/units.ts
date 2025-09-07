// A4 dimensions in mm
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

// Convert mm to pixels (assuming 96 DPI)
export const mmToPx = (mm: number): number => {
  return (mm * 96) / 25.4;
};

// Convert cm to pixels
export const cmToPx = (cm: number): number => {
  return mmToPx(cm * 10);
};
