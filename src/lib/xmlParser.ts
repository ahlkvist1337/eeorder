import type { ParsedXMLOrder } from '@/types/order';

export function parseMonitorXML(xmlString: string): ParsedXMLOrder {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parsing errors
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Ogiltig XML-fil. Kontrollera att filen är korrekt formaterad.');
  }

  const order = doc.querySelector('Order');
  if (!order) {
    throw new Error('Ingen order hittades i XML-filen.');
  }

  const orderNumber = order.getAttribute('OrderNumber');
  if (!orderNumber) {
    throw new Error('Ordernummer saknas i XML-filen.');
  }

  // Get buyer/customer info
  const buyerName = doc.querySelector('Buyer > Name')?.textContent || '';
  const buyerReference = doc.querySelector('BuyerReference')?.textContent || '';
  
  // Get supplier info
  const supplierName = doc.querySelector('Supplier > Name')?.textContent || '';

  // Get delivery address
  const deliveryName = doc.querySelector('DeliveryAddress > Name')?.textContent || '';
  const deliveryStreet = doc.querySelector('DeliveryAddress > StreetBox1')?.textContent || '';
  const deliveryZip = doc.querySelector('DeliveryAddress > ZipCity1')?.textContent || '';
  const deliveryAddress = [deliveryName, deliveryStreet, deliveryZip].filter(Boolean).join(', ');

  // Get dates
  const orderDate = doc.querySelector('OrderDate')?.textContent || '';
  const deliveryDate = doc.querySelector('Row DeliveryPeriod')?.textContent || '';

  // Get rows
  const rows: ParsedXMLOrder['rows'] = [];
  const rowElements = doc.querySelectorAll('Row');
  
  rowElements.forEach((row) => {
    const rowNumber = row.getAttribute('RowNumber') || '';
    const partNumber = row.querySelector('Part')?.getAttribute('PartNumber') || '';
    const text = row.querySelector('Text')?.textContent || '';
    const quantityStr = row.querySelector('Quantity')?.textContent || '0';
    const unit = row.querySelector('Unit')?.textContent || '';
    const eachStr = row.querySelector('Each')?.textContent || '0';

    rows.push({
      id: crypto.randomUUID(),
      rowNumber,
      partNumber,
      text,
      quantity: parseFloat(quantityStr) || 0,
      unit,
      price: parseFloat(eachStr) || 0,
    });
  });

  return {
    orderNumber,
    customer: buyerName,
    customerReference: buyerReference,
    deliveryAddress,
    supplier: supplierName,
    orderDate,
    deliveryDate,
    rows,
  };
}
