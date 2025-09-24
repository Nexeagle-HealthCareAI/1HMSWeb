export type FontFamily = 'Arial' | 'Times New Roman' | 'Helvetica' | 'Georgia' | 'Verdana';

export interface PageLayout {
  orientation: 'portrait' | 'landscape';
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PdfLayout {
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface Images {
  header?: string;
  footer?: string;
  signature?: string;
}

export interface HeaderFooterSettings {
  page: PageLayout;
  pdf: PdfLayout;
  images: Images;
  useLetterhead: boolean;
  letterhead: {
    headerHeight: number;
    footerHeight: number;
  };
  useHeaderSettings: boolean;
  useFooterSettings: boolean;
  useDoctorSetting: boolean;
  header: {
    height: number;
    width: number;
    showImage: boolean;
    showText: boolean;
    text: string;
    showOnAllPages: boolean;
  };
  footer: {
    height: number;
    width: number;
    showImage: boolean;
    showText: boolean;
    showSignature: boolean;
    text: string;
    signatureHeight: number;
    signatureWidth: number;
    doctorName: string;
    showOnAllPages: boolean;
  };
  font: {
    family: FontFamily;
    size: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
}
