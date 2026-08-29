import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { HrPayslipDto } from '../types';

export const usePayslipPdf = () => {
  const payslipRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async (payslip: HrPayslipDto, monthYear: string) => {
    if (!payslipRef.current) return;
    
    try {
      setIsGenerating(true);
      
      const canvas = await html2canvas(payslipRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // A4 dimensions: 210 x 297 mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const filename = `Payslip_${payslip.employeeCode}_${monthYear.replace('/', '-')}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('Error generating payslip PDF:', error);
      throw new Error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return { payslipRef, generatePdf, isGenerating };
};
