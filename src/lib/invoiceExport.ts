import type { Order, ArticleRow } from '@/types/order';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export interface InvoiceExportArticleRow {
  partNumber: string;
  text: string;
  quantity: number;
  price: number;
  total: number;
}

export interface InvoiceExportOrder {
  orderNumber: string;
  customer: string;
  customerReference?: string;
  completedDate?: string;
  comment?: string;
  articleRows: InvoiceExportArticleRow[];
  orderTotal: number;
}

export interface InvoiceExportData {
  exportId: string;
  exportDate: string;
  exportDateFormatted: string;
  orders: InvoiceExportOrder[];
  grandTotal: number;
}

// Generate unique export ID: EXP-YYYYMMDD-XXX
export function generateExportId(): string {
  const date = format(new Date(), 'yyyyMMdd');
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `EXP-${date}-${randomSuffix}`;
}

// Convert order article rows to export format
function convertArticleRows(rows: ArticleRow[] = []): InvoiceExportArticleRow[] {
  return rows.map(row => ({
    partNumber: row.partNumber,
    text: row.text,
    quantity: row.quantity,
    price: row.price,
    total: row.quantity * row.price,
  }));
}

// Calculate order total from article rows
function calculateOrderTotal(rows: ArticleRow[] = []): number {
  return rows.reduce((sum, row) => sum + (row.quantity * row.price), 0);
}

// Get completed date from order (actualEnd or plannedEnd)
function getCompletedDate(order: Order): string | undefined {
  const dateStr = order.actualEnd || order.plannedEnd;
  if (!dateStr) return undefined;
  
  try {
    return format(new Date(dateStr), 'd MMM yyyy', { locale: sv });
  } catch {
    return undefined;
  }
}

// Prepare export data from selected orders
export function prepareInvoiceExportData(orders: Order[]): InvoiceExportData {
  const exportId = generateExportId();
  const now = new Date();
  
  const exportOrders: InvoiceExportOrder[] = orders.map(order => ({
    orderNumber: order.orderNumber,
    customer: order.customer,
    customerReference: order.customerReference,
    completedDate: getCompletedDate(order),
    comment: order.comment || undefined,
    articleRows: convertArticleRows(order.articleRows),
    orderTotal: calculateOrderTotal(order.articleRows),
  }));

  const grandTotal = exportOrders.reduce((sum, order) => sum + order.orderTotal, 0);

  return {
    exportId,
    exportDate: format(now, 'yyyy-MM-dd'),
    exportDateFormatted: format(now, 'd MMM yyyy', { locale: sv }),
    orders: exportOrders,
    grandTotal,
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

// Check if all orders are ready for billing
export function canExportOrders(orders: Order[]): boolean {
  if (orders.length === 0) return false;
  return orders.every(order => order.billingStatus === 'ready_for_billing');
}
