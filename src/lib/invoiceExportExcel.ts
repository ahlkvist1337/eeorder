import type { InvoiceExportData } from './invoiceExport';

export function exportInvoiceToExcel(data: InvoiceExportData): void {
  const headers = [
    'Export-ID',
    'Exportdatum',
    'Ordernummer',
    'Kund',
    'Kundreferens',
    'Kommentar',
    'Artikelnr',
    'Benämning',
    'Antal',
    'Pris',
    'Summa'
  ];

  const rows: string[][] = [];

  // Add data rows for each article in each order
  for (const order of data.orders) {
    for (const article of order.articleRows) {
      rows.push([
        data.exportId,
        data.exportDate,
        order.orderNumber,
        order.customer,
        order.customerReference || '',
        order.comment || '',
        article.partNumber,
        article.text,
        article.quantity.toString(),
        article.price.toString(),
        article.total.toString(),
      ]);
    }
    
    // If order has no article rows, add a line with order info only
    if (order.articleRows.length === 0) {
      rows.push([
        data.exportId,
        data.exportDate,
        order.orderNumber,
        order.customer,
        order.customerReference || '',
        order.comment || '',
        '',
        '(inga artikelrader)',
        '',
        '',
        '0',
      ]);
    }
  }

  // Add total row
  rows.push([
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTALT:',
    data.grandTotal.toString(),
  ]);

  // Build CSV content with semicolon separator (Excel-friendly for Swedish locale)
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // Create and download file with BOM for UTF-8
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fakturaunderlag-${data.exportId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
