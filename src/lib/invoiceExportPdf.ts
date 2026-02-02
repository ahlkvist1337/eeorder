import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceExportData } from './invoiceExport';
import { formatCurrency } from './invoiceExport';

export function exportInvoiceToPdf(data: InvoiceExportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FAKTURAUNDERLAG', pageWidth / 2, 25, { align: 'center' });
  
  // Export metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Export-ID: ${data.exportId}`, 14, 40);
  doc.text(`Exportdatum: ${data.exportDateFormatted}`, 14, 46);
  doc.text(`Antal ordrar: ${data.orders.length}`, 14, 52);
  doc.text(`Totalt belopp: ${formatCurrency(data.grandTotal)}`, 14, 58);
  
  let yPosition = 70;
  
  // Process each order
  for (let i = 0; i < data.orders.length; i++) {
    const order = data.orders[i];
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Separator line
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(14, yPosition, pageWidth - 14, yPosition);
    yPosition += 8;
    
    // Order header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order: ${order.orderNumber}`, 14, yPosition);
    yPosition += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kund: ${order.customer}`, 14, yPosition);
    yPosition += 5;
    
    if (order.customerReference) {
      doc.text(`Referens: ${order.customerReference}`, 14, yPosition);
      yPosition += 5;
    }
    
    if (order.completedDate) {
      doc.text(`Klart: ${order.completedDate}`, 14, yPosition);
      yPosition += 5;
    }
    
    if (order.instructions && order.instructions.length > 0) {
      doc.text('Instruktioner:', 14, yPosition);
      yPosition += 5;
      for (const instruction of order.instructions) {
        doc.text(`  • ${instruction}`, 14, yPosition);
        yPosition += 5;
      }
    }
    
    yPosition += 3;
    
    // Article rows table
    if (order.articleRows.length > 0) {
      const tableData = order.articleRows.map(row => [
        row.partNumber,
        row.text,
        row.quantity.toString(),
        formatCurrency(row.price),
        formatCurrency(row.total),
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Artikel', 'Benämning', 'Antal', 'Pris', 'Summa']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [80, 80, 80],
          fontSize: 9,
          fontStyle: 'bold',
        },
        bodyStyles: {
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 28, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });
      
      // Get table end position
      yPosition = (doc as any).lastAutoTable.finalY + 3;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text('(inga artikelrader)', 14, yPosition);
      doc.setTextColor(0);
      yPosition += 5;
    }
    
    // Order total
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ordersumma: ${formatCurrency(order.orderTotal)}`, pageWidth - 14, yPosition, { align: 'right' });
    yPosition += 12;
  }
  
  // Grand total at the end
  if (yPosition > 260) {
    doc.addPage();
    yPosition = 30;
  }
  
  // Final separator
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.line(14, yPosition, pageWidth - 14, yPosition);
  yPosition += 10;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTALT: ${formatCurrency(data.grandTotal)}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Save the PDF
  doc.save(`fakturaunderlag-${data.exportId}.pdf`);
}
