export interface PriceListItem {
  part_number: string;
  description: string;
  step_name: string | null;
  price: number;
}

export function exportToCsv(data: PriceListItem[], filename: string) {
  const headers = ['Artikelnummer', 'Benämning', 'Steg', 'Pris'];
  const rows = data.map(item => [
    item.part_number,
    item.description,
    item.step_name || '',
    item.price.toString()
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(';'))
    .join('\n');
  
  // BOM for UTF-8 encoding + content
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  
  // Create download link and trigger
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
