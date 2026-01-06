import { jsPDF } from 'jspdf';
import { ComplianceCertificateData } from '../types';

export const generateComplianceCertificatePDF = (
  data: ComplianceCertificateData
): Blob => {
  const doc = new jsPDF();
  const margin = 20;
  let y = 30;

  const addText = (text: string, fontSize = 10, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, 170);
    doc.text(lines, margin, y);
    y += (lines.length * (fontSize / 2)) + 5;
  };

  const addHeading = (text: string) => {
    y += 5;
    addText(text, 14, true);
    y += 2;
  };

  // Header
  addText('SCHEDULE 7', 12, true);
  addText('FORM OF COMPLIANCE CERTIFICATE', 16, true);
  y += 10;

  addText(`To: ${data.header.to}`, 10);
  addText(`From: ${data.header.from}`, 10);
  addText(`Dated: ${data.header.date}`, 10);
  y += 5;

  addText(data.header.agreement_title, 11, true);
  y += 5;

  addText(`1. We refer to the Agreement. This is a Compliance Certificate. Terms defined in the Agreement have the same meaning when used in this Compliance Certificate unless otherwise defined.`, 10);
  
  addText(`2. We confirm that for the Relevant Period ending on ${data.period}:`, 10);

  // Financial Covenants
  addHeading('Financial Covenants');
  
  data.covenants.forEach((cov, idx) => {
    const letter = String.fromCharCode(97 + idx); // a, b, c...
    addText(`(${letter}) ${cov.name}:`, 11, true);
    addText(`    Formula: ${cov.formula}`, 10);
    addText(`    Actual: ${cov.actual_value}`, 10);
    addText(`    Required: ${cov.required_value}`, 10);
    addText(`    Status: ${cov.compliant ? 'Compliant' : 'Non-Compliant'}`, 10, true);
    y += 2;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  // Sustainability
  if (data.sustainability && data.sustainability.length > 0) {
    addHeading('Sustainability KPI Performance');
    data.sustainability.forEach((kpi, index) => {
        addText(`${index + 1}. ${kpi.kpi}: Target ${kpi.target} (Actual: ${kpi.actual || 'N/A'}) - Status: ${kpi.status}`, 10);
        if (y > 270) { doc.addPage(); y = 20; }
    });
  }

  // Confirmation
  y += 10;
  addText(`3. ${data.confirmation_text}`, 10);

  // Reconciliation data (Bridge)
  if (y > 220) { doc.addPage(); y = 20; }
  addHeading('Financial Definitions Reconciliation');
  
  addText('EBITDA Reconciliation:', 11, true);
  data.ebitda_reconciliation.forEach(item => {
    const prefix = item.is_add_back ? '+' : '-';
    addText(`   ${prefix} ${item.item}: ${item.amount}`, 9);
    if (y > 270) { doc.addPage(); y = 20; }
  });
  addText(`   Adjusted EBITDA: ${data.ebitda_total}`, 10, true);
  
  y += 5;
  addText('Net Debt Reconciliation:', 11, true);
  data.net_debt_reconciliation.forEach(item => {
    addText(`   ${item.item}: ${item.amount}`, 9);
    if (y > 270) { doc.addPage(); y = 20; }
  });
  addText(`   Total Net Debt: ${data.net_debt_total}`, 10, true);

  // Signatures
  if (y > 240) { doc.addPage(); y = 20; }
  y += 20;
  doc.line(margin, y, margin + 60, y);
  doc.line(margin + 100, y, margin + 160, y);
  y += 5;
  doc.setFontSize(8);
  doc.text('Director / Authorized Signatory', margin, y);
  doc.text('Director / Authorized Signatory', margin + 100, y);

  return doc.output('blob');
};
