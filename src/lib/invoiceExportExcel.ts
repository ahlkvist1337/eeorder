import type { InvoiceExportData } from './invoiceExport';

export function exportInvoiceToExcel(data: InvoiceExportData): void {
  const headers = [
    'Export-ID',
    'Exportdatum',
    'Typ',
    'Ordernummer',
    'Kund',
    'Kundreferens',
    'Instruktioner',
    'Arbetskort',
    'Artikelnr',
    'Benämning',
    'Antal (denna faktura)',
    'Antal (totalt)',
    'Tidigare fakturerat',
    'Pris',
    'Summa'
  ];

  const rows: string[][] = [];

  for (const order of data.orders) {
    const instructionsText = order.instructions?.join(' | ') || '';
    const truckNumbers = order.truckNumbers.map(n => `#${n}`).join(', ');
    
    for (const article of order.articleRows) {
      rows.push([
        data.exportId,
        data.exportDate,
        data.isLastPartial ? 'SLUTFAKTURA' : data.isPartial ? 'DELFAKTURA' : 'SLUTFAKTURA',
        order.orderNumber,
        order.customer,
        order.customerReference || '',
        instructionsText,
        truckNumbers,
        article.partNumber,
        article.text,
        article.quantity.toString(),
        article.totalQuantity.toString(),
        article.previouslyBilled.toString(),
        article.price.toString(),
        article.total.toString(),
      ]);
    }
    
    if (order.articleRows.length === 0) {
      rows.push([
        data.exportId,
        data.exportDate,
        data.isLastPartial ? 'SLUTFAKTURA' : data.isPartial ? 'DELFAKTURA' : 'SLUTFAKTURA',
        order.orderNumber,
        order.customer,
        order.customerReference || '',
        instructionsText,
        truckNumbers,
        '',
        '(inga artikelrader)',
        '',
        '',
        '',
        '',
        '0',
      ]);
    }
  }

  // Total row
  rows.push([
    '', '', '', '', '', '', '', '', '', '', '', '', '',
    'TOTALT:',
    data.grandTotal.toString(),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const prefix = data.isPartial ? 'delfaktura' : 'fakturaunderlag';
  link.download = `${prefix}-${data.exportId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
