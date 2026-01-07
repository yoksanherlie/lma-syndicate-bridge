import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ComplianceCertificateData } from '../types';

export const generateComplianceCertificatePDF = async (
  data: ComplianceCertificateData
): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < margin) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - margin;
      return true;
    }
    return false;
  };

  const drawText = (text: string, size = 10, isBold = false, indent = 0) => {
    const font = isBold ? timesRomanBoldFont : timesRomanFont;
    const maxWidth = width - (margin * 2) - indent;
    
    // Simple text wrapping
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (const word of words) {
      const testLine = line + word + ' ';
      const testLineWidth = font.widthOfTextAtSize(testLine, size);
      if (testLineWidth > maxWidth && line !== '') {
        lines.push(line.trim());
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    for (const l of lines) {
      checkPageBreak(size + 5);
      page.drawText(l, {
        x: margin + indent,
        y: y - size,
        size,
        font,
        color: rgb(0, 0, 0),
      });
      y -= (size + 5);
    }
  };

  const drawDivider = () => {
    checkPageBreak(10);
    y -= 5;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 10;
  };

  // Header
  drawText('SCHEDULE 7', 12, true);
  drawText('FORM OF COMPLIANCE CERTIFICATE', 14, true);
  y -= 20;

  drawText(`To: ${data.header.to}`, 10);
  drawText(`From: ${data.header.from}`, 10);
  drawText(`Dated: ${data.header.date}`, 10);
  y -= 10;

  drawText(data.header.agreement_title, 11, true);
  y -= 15;

  drawText(`Dear Sirs,`, 10);
  y -= 5;
  drawText(`1. We refer to the Agreement. This is a Compliance Certificate. Terms defined in the Agreement have the same meaning when used in this Compliance Certificate unless otherwise defined.`, 10);
  y -= 5;
  drawText(`2. We confirm that for the Relevant Period ending on ${data.period}:`, 10);
  y -= 10;

  // Financial Covenants
  drawText('FINANCIAL COVENANTS', 11, true);
  drawDivider();
  
  data.covenants.forEach((cov, idx) => {
    const letter = String.fromCharCode(97 + idx); // a, b, c...
    drawText(`(${letter}) ${cov.name}`, 10, true, 20);
    drawText(`Formula: ${cov.formula}`, 9, false, 40);
    drawText(`Actual: ${cov.actual_value}`, 9, false, 40);
    drawText(`Required: ${cov.required_value}`, 9, false, 40);
    drawText(`Status: ${cov.compliant ? 'COMPLIANT' : 'BREACH'}`, 10, true, 40);
    y -= 10;
  });

  // Sustainability
  if (data.sustainability && data.sustainability.length > 0) {
    y -= 10;
    drawText('SUSTAINABILITY KPI PERFORMANCE', 11, true);
    drawDivider();
    data.sustainability.forEach((kpi, index) => {
        drawText(`${index + 1}. ${kpi.kpi}: Target ${kpi.target} (Actual: ${kpi.actual || 'N/A'}) - Status: ${kpi.status}`, 10, false, 20);
        y -= 5;
    });
  }

  // Reconciliation data (EBITDA)
  y -= 15;
  drawText('RECONCILIATION: CONSOLIDATED EBITDA', 11, true);
  drawDivider();
  
  data.ebitda_reconciliation.forEach(item => {
    const prefix = item.is_add_back ? '+' : '-';
    const text = `${item.item}`;
    const amount = `${prefix} ${item.amount}`;
    
    checkPageBreak(15);
    page.drawText(text, { x: margin + 20, y: y - 10, size: 9, font: timesRomanFont });
    const amountWidth = timesRomanFont.widthOfTextAtSize(amount, 9);
    page.drawText(amount, { x: width - margin - amountWidth, y: y - 10, size: 9, font: timesRomanFont });
    y -= 14;
  });
  
  y -= 5;
  checkPageBreak(15);
  page.drawText('Adjusted EBITDA:', { x: margin + 20, y: y - 10, size: 10, font: timesRomanBoldFont });
  const totalEbitdaWidth = timesRomanBoldFont.widthOfTextAtSize(data.ebitda_total, 10);
  page.drawText(data.ebitda_total, { x: width - margin - totalEbitdaWidth, y: y - 10, size: 10, font: timesRomanBoldFont });
  y -= 20;

  // Reconciliation data (Net Debt)
  checkPageBreak(50);
  drawText('RECONCILIATION: CONSOLIDATED TOTAL NET DEBT', 11, true);
  drawDivider();
  
  data.net_debt_reconciliation.forEach(item => {
    checkPageBreak(15);
    page.drawText(item.item, { x: margin + 20, y: y - 10, size: 9, font: timesRomanFont });
    const amountWidth = timesRomanFont.widthOfTextAtSize(item.amount, 9);
    page.drawText(item.amount, { x: width - margin - amountWidth, y: y - 10, size: 9, font: timesRomanFont });
    y -= 14;
  });
  
  y -= 5;
  checkPageBreak(15);
  page.drawText('Consolidated Total Net Debt:', { x: margin + 20, y: y - 10, size: 10, font: timesRomanBoldFont });
  const totalNetDebtWidth = timesRomanBoldFont.widthOfTextAtSize(data.net_debt_total, 10);
  page.drawText(data.net_debt_total, { x: width - margin - totalNetDebtWidth, y: y - 10, size: 10, font: timesRomanBoldFont });
  y -= 25;

  // Confirmation
  drawText(`3. ${data.confirmation_text}`, 10);
  y -= 40;

  // Signatures
  checkPageBreak(100);
  const sigY = y;
  page.drawLine({ start: { x: margin, y: sigY }, end: { x: margin + 150, y: sigY }, thickness: 1 });
  page.drawLine({ start: { x: width - margin - 150, y: sigY }, end: { x: width - margin, y: sigY }, thickness: 1 });
  
  page.drawText('Director / Authorized Signatory', { x: margin, y: sigY - 15, size: 8, font: timesRomanFont });
  page.drawText('Director / Authorized Signatory', { x: width - margin - 150, y: sigY - 15, size: 8, font: timesRomanFont });
  
  page.drawText(`for and on behalf of`, { x: margin, y: sigY - 30, size: 8, font: timesRomanFont });
  page.drawText(`for and on behalf of`, { x: width - margin - 150, y: sigY - 30, size: 8, font: timesRomanFont });
  
  page.drawText(data.header.from, { x: margin, y: sigY - 45, size: 8, font: timesRomanBoldFont });
  page.drawText(data.header.from, { x: width - margin - 150, y: sigY - 45, size: 8, font: timesRomanBoldFont });

  const pdfBytes = await pdfDoc.save();
  
  // Re-open to add page numbers (simpler than tracking during generation for this structure)
  const finalDoc = await PDFDocument.load(pdfBytes);
  const totalPages = finalDoc.getPageCount();
  const font = await finalDoc.embedFont(StandardFonts.TimesRoman);
  
  finalDoc.getPages().forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${totalPages}`, {
      x: width - margin - 60,
      y: 30,
      size: 8,
      font: font,
    });
  });

  const finalPdfBytes = await finalDoc.save();
  return new Blob([finalPdfBytes], { type: 'application/pdf' });
};