import { useCallback, useRef, useState } from 'react';

interface PdfExportOptions {
  filename: string;
  pageOrientation?: 'portrait' | 'landscape';
}

export function usePdfExport(options: PdfExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateCanvas = useCallback(async () => {
    if (!containerRef.current) return null;
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(containerRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
  }, []);

  const getPdfBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = await generateCanvas();
    if (!canvas) return null;

    const { default: jsPDF } = await import('jspdf');
    const imgData = canvas.toDataURL('image/png');
    const orientation = options.pageOrientation || 'portrait';
    const pdf = new jsPDF(orientation, 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 10;
    const margin = 5;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    while (heightLeft > 0) {
      position = margin - (imgHeight - (pageHeight - margin * 2));
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    return pdf.output('blob');
  }, [generateCanvas, options.pageOrientation]);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) return;

      const { default: jsPDF } = await import('jspdf');
      const imgData = canvas.toDataURL('image/png');
      const orientation = options.pageOrientation || 'portrait';
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 10;
      const margin = 5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        position = margin - (imgHeight - (pageHeight - margin * 2));
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      pdf.save(options.filename);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [generateCanvas, options.filename, options.pageOrientation]);

  return { containerRef, exportPdf, getPdfBlob, isExporting };
}