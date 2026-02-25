import type { Order, ArticleRow, Instruction, ObjectTruck } from '@/types/order';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export interface InvoiceExportArticleRow {
  partNumber: string;
  text: string;
  quantity: number;        // Quantity being billed in this export
  totalQuantity: number;   // Total quantity on the article row
  previouslyBilled: number; // Previously billed quantity
  price: number;
  total: number;
  articleRowId?: string;   // For tracking
}

export interface InvoiceExportOrder {
  orderNumber: string;
  orderId: string;
  customer: string;
  customerReference?: string;
  completedDate?: string;
  instructions?: string[];
  articleRows: InvoiceExportArticleRow[];
  orderTotal: number;
  previouslyBilledTotal: number;
  truckIds: string[];      // Which trucks are being billed
  truckNumbers: string[];  // Display names
}

export interface InvoiceExportData {
  exportId: string;
  exportDate: string;
  exportDateFormatted: string;
  orders: InvoiceExportOrder[];
  grandTotal: number;
  previouslyBilledGrandTotal: number;
  isPartial: boolean; // DELFAKTURA or SLUTFAKTURA
}

// Previously billed data fetched from DB
export interface PreviouslyBilledItem {
  article_row_id: string;
  total_billed_quantity: number;
  total_billed_amount: number;
}

// Generate unique export ID: EXP-YYYYMMDD-XXX
export function generateExportId(): string {
  const date = format(new Date(), 'yyyyMMdd');
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EXP-${date}-${randomSuffix}`;
}

// Get completed date from order
function getCompletedDate(order: Order): string | undefined {
  const dateStr = order.actualEnd || order.plannedEnd;
  if (!dateStr) return undefined;
  
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: sv });
  } catch {
    return undefined;
  }
}

// Calculate proportional billing for article rows based on trucks being billed
export function calculateProportionalBilling(
  order: Order,
  trucksToInvoice: ObjectTruck[],
  previouslyBilled: PreviouslyBilledItem[]
): InvoiceExportArticleRow[] {
  const articleRows = order.articleRows || [];
  const results: InvoiceExportArticleRow[] = [];

  for (const row of articleRows) {
    // Find the object this article row belongs to
    const object = order.objects?.find(o => o.id === row.objectId);
    
    if (!object || !object.trucks || object.trucks.length === 0) {
      // No object linkage - include full amount if not previously billed
      const prev = previouslyBilled.find(p => p.article_row_id === row.id);
      const prevQty = prev?.total_billed_quantity || 0;
      const remaining = row.quantity - prevQty;
      
      if (remaining > 0) {
        results.push({
          partNumber: row.partNumber,
          text: row.text,
          quantity: remaining,
          totalQuantity: row.quantity,
          previouslyBilled: prevQty,
          price: row.price,
          total: remaining * row.price,
          articleRowId: row.id,
        });
      }
      continue;
    }

    // Count how many of this object's trucks are being invoiced now
    const objectTruckIds = new Set(object.trucks.map(t => t.id));
    const trucksBeingInvoiced = trucksToInvoice.filter(t => objectTruckIds.has(t.id));
    
    if (trucksBeingInvoiced.length === 0) continue;

    const totalTrucks = object.trucks.length;
    const prev = previouslyBilled.find(p => p.article_row_id === row.id);
    const prevQty = prev?.total_billed_quantity || 0;
    const remainingQty = row.quantity - prevQty;

    // Proportional: (trucks invoiced / total trucks) * total quantity
    const proportionalQty = Math.min(
      (trucksBeingInvoiced.length / totalTrucks) * row.quantity,
      remainingQty
    );

    if (proportionalQty > 0) {
      // Round to 2 decimals for clean numbers
      const roundedQty = Math.round(proportionalQty * 100) / 100;
      results.push({
        partNumber: row.partNumber,
        text: row.text,
        quantity: roundedQty,
        totalQuantity: row.quantity,
        previouslyBilled: prevQty,
        price: row.price,
        total: roundedQty * row.price,
        articleRowId: row.id,
      });
    }
  }

  return results;
}

// Prepare export data from selected orders with proportional billing
export function prepareInvoiceExportData(
  orders: Order[],
  trucksByOrder: Record<string, ObjectTruck[]>,
  previouslyBilledByOrder: Record<string, PreviouslyBilledItem[]>
): InvoiceExportData {
  const exportId = generateExportId();
  const now = new Date();
  
  let isPartial = false;

  const exportOrders: InvoiceExportOrder[] = orders.map(order => {
    const trucksToInvoice = trucksByOrder[order.id] || [];
    const previouslyBilled = previouslyBilledByOrder[order.id] || [];
    
    // Check if this is a partial invoice
    const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
    if (trucksToInvoice.length < allTrucks.length) {
      isPartial = true;
    }
    
    // Check if there's previously billed items
    const prevTotal = previouslyBilled.reduce((sum, p) => sum + (p.total_billed_amount || 0), 0);
    if (prevTotal > 0) {
      isPartial = true;
    }

    const articleRows = calculateProportionalBilling(order, trucksToInvoice, previouslyBilled);
    const orderTotal = articleRows.reduce((sum, r) => sum + r.total, 0);

    return {
      orderNumber: order.orderNumber,
      orderId: order.id,
      customer: order.customer,
      customerReference: order.customerReference,
      completedDate: getCompletedDate(order),
      instructions: order.instructions?.length 
        ? order.instructions.map(inst => inst.text) 
        : undefined,
      articleRows,
      orderTotal,
      previouslyBilledTotal: prevTotal,
      truckIds: trucksToInvoice.map(t => t.id),
      truckNumbers: trucksToInvoice.map(t => t.truckNumber || t.id.slice(-4)),
    };
  });

  const grandTotal = exportOrders.reduce((sum, order) => sum + order.orderTotal, 0);
  const previouslyBilledGrandTotal = exportOrders.reduce((sum, order) => sum + order.previouslyBilledTotal, 0);

  return {
    exportId,
    exportDate: format(now, 'yyyy-MM-dd'),
    exportDateFormatted: format(now, 'd MMM yyyy', { locale: sv }),
    orders: exportOrders,
    grandTotal,
    previouslyBilledGrandTotal,
    isPartial,
  };
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + ' kr';
}

// Check if any orders have trucks ready for billing
export function getReadyTrucks(orders: Order[]): ObjectTruck[] {
  return orders.flatMap(order =>
    (order.objects || []).flatMap(obj =>
      (obj.trucks || []).filter(t => t.billingStatus === 'ready_for_billing')
    )
  );
}
