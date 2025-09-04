export type LayoutMode = "none" | "header" | "footer";

export interface TemplateState {
  layoutMode: LayoutMode;               // "header" | "footer" | "none"
  headerHtml: string;
  footerHtml: string;
  headerHeightMm: number;               // default 30
  footerHeightMm: number;               // default 30
  minContentHeightMm: number;           // default 120 (must be respected)
  marginTopMm: number;                  // default 12
  marginRightMm: number;                // default 10
  marginBottomMm: number;               // default 12
  marginLeftMm: number;                 // default 10
  signatureDataUrl?: string;            // Data URL
  signatureWidthMm: number;             // default 35
  signatureAnchor: "top-right" | "bottom-right";
  zoomPct: number;                      // 50..150, default 90
}

export const DEFAULT_TEMPLATE_STATE: TemplateState = {
  layoutMode: "header",
  headerHtml: `<div style="display:flex;justify-content:space-between;gap:8px;">
     <div><strong>Dr. Your Name</strong><br/>MBBS, Reg No: 123456</div>
     <div style="text-align:right">Clinic Name<br/>Address line<br/>+91-XXXXXXXXXX</div>
   </div>`,
  footerHtml: `<div style="text-align:center;font-size:11px;opacity:0.8">This is a computer-generated prescription.</div>`,
  headerHeightMm: 30,
  footerHeightMm: 30,
  minContentHeightMm: 120,
  marginTopMm: 12,
  marginRightMm: 10,
  marginBottomMm: 12,
  marginLeftMm: 10,
  signatureWidthMm: 35,
  signatureAnchor: "bottom-right",
  zoomPct: 90,
};
