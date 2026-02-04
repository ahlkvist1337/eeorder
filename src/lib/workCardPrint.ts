import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { ObjectTruck, OrderStep } from '@/types/order';
import { getWorkUnitDisplayName } from '@/types/order';

interface WorkCardPrintData {
  truck: ObjectTruck;
  objectName: string;
  steps: OrderStep[];
  order: {
    id: string;
    orderNumber: string;
    customer: string;
  };
  baseUrl: string;
}

export async function printWorkCard(data: WorkCardPrintData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Arbetskort ID - stor och tydlig
  const workCardId = getWorkUnitDisplayName(
    data.truck.truckNumber, 
    data.objectName, 
    data.truck.id
  );
  
  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('ARBETSKORT', pageWidth / 2, 25, { align: 'center' });
  
  // Arbetskort ID - STOR
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(workCardId, 20, 50);
  
  // Objekttyp
  doc.setFontSize(18);
  doc.setFont('helvetica', 'normal');
  doc.text(data.objectName.toUpperCase(), 20, 65);
  
  // Order och kund
  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(`Order: ${data.order.orderNumber}`, 20, 80);
  doc.text(`Kund: ${data.order.customer}`, 20, 88);
  
  // QR-kod (höger sida)
  const orderUrl = `${data.baseUrl}/order/${data.order.id}`;
  const qrDataUrl = await QRCode.toDataURL(orderUrl, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  
  // Placera QR-kod till höger
  doc.addImage(qrDataUrl, 'PNG', pageWidth - 70, 30, 50, 50);
  
  // QR-kod text
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Skanna för att öppna', pageWidth - 45, 85, { align: 'center' });
  doc.text('i systemet', pageWidth - 45, 90, { align: 'center' });
  
  // Separator
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(20, 105, pageWidth - 20, 105);
  
  // Arbetsmoment rubrik
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('ARBETSMOMENT', 20, 120);
  
  // Lista stegen
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  let yPos = 135;
  
  data.steps.forEach((step, index) => {
    doc.text(`${index + 1}. ${step.name}`, 25, yPos);
    yPos += 12;
  });
  
  // Footer
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    'Uppdatera status genom att skanna QR-koden',
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );
  
  // Spara/öppna för utskrift
  const safeFileName = workCardId.replace('#', '').replace(/[^a-zA-Z0-9-_]/g, '');
  doc.save(`arbetskort-${safeFileName}.pdf`);
}
