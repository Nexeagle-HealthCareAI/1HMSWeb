declare module 'react-easy-crop';
declare module 'browser-image-compression';

// No @types/qrcode installed -- only the one function this codebase actually calls
// (generatePathologyReportPdf.ts) is typed, not the full API surface.
declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    margin?: number;
    width?: number;
  }
  function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  const QRCode: { toDataURL: typeof toDataURL };
  export default QRCode;
}


