import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceExportData } from './invoiceExport';
import { formatCurrency } from './invoiceExport';

export function exportInvoiceToPdf(data: InvoiceExportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title - DELFAKTURA, SLUTFAKTURA, FAKTURAUNDERLAG, or multi-order
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  let title: string;
  if (data.isLastPartial) {
    title = 'SLUTFAKTURAUNDERLAG';
  } else if (data.isPartial) {
    title = 'DELFAKTURAUNDERLAG';
  } else if (data.orderCount > 1) {
    title = `FAKTURAUNDERLAG – ${data.orderCount} ORDRAR`;
  } else {
    title = 'FAKTURAUNDERLAG';
  }
  doc.text(title, pageWidth / 2, 25, { align: 'center' });
  
  // Multi-order subtitle
  let subtitleOffset = 0;
  if (data.orderCount > 1 && !data.isPartial) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Samlat underlag för ${data.orderCount} klara ordrar`, pageWidth / 2, 33, { align: 'center' });
    subtitleOffset = 10;
  }
  
  // Export metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Export-ID: ${data.exportId}`, 14, 40 + subtitleOffset);
  doc.text(`Exportdatum: ${data.exportDateFormatted}`, 14, 46 + subtitleOffset);
  doc.text(`Antal ordrar: ${data.orders.length}`, 14, 52 + subtitleOffset);
  doc.text(`Totalt belopp: ${formatCurrency(data.grandTotal)}`, 14, 58 + subtitleOffset);
  
  if (data.previouslyBilledGrandTotal > 0) {
    doc.text(`Tidigare fakturerat: ${formatCurrency(data.previouslyBilledGrandTotal)}`, 14, 64 + subtitleOffset);
  }
  
  let yPosition = (data.previouslyBilledGrandTotal > 0 ? 76 : 70) + subtitleOffset;
  
  // Process each order
  for (let i = 0; i < data.orders.length; i++) {
    const order = data.orders[i];
    
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
    
    // Show which trucks are included
    if (order.truckNumbers.length > 0) {
      const entityLabel = data.isPartial ? 'Enheter' : 'Arbetskort';
      doc.text(`${entityLabel}: ${order.truckNumbers.map(n => `#${n}`).join(', ')}`, 14, yPosition);
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
        `${row.quantity}${row.previouslyBilled > 0 ? ` (av ${row.totalQuantity})` : ''}`,
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
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 28, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });
      
      yPosition = (doc as any).lastAutoTable.finalY + 3;
    } else {
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text('(inga artikelrader)', 14, yPosition);
      doc.setTextColor(0);
      yPosition += 5;
    }
    
    // Previously billed info
    if (order.previouslyBilledTotal > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);
      doc.text(`Tidigare fakturerat: ${formatCurrency(order.previouslyBilledTotal)}`, pageWidth - 14, yPosition, { align: 'right' });
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      yPosition += 5;
    }
    
    // Order total
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Ordersumma denna faktura: ${formatCurrency(order.orderTotal)}`, pageWidth - 14, yPosition, { align: 'right' });
    yPosition += 12;
  }
  
  // Grand total
  if (yPosition > 260) {
    doc.addPage();
    yPosition = 30;
  }
  
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.line(14, yPosition, pageWidth - 14, yPosition);
  yPosition += 10;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTALT: ${formatCurrency(data.grandTotal)}`, pageWidth / 2, yPosition, { align: 'center' });
  
  // Page numbers
  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128);
    doc.text(`Sida ${i} av ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  const prefix = data.isPartial ? 'delfaktura' : (data.orderCount > 1 ? 'samlat-fakturaunderlag' : 'fakturaunderlag');
  doc.save(`${prefix}-${data.exportId}.pdf`);
}
