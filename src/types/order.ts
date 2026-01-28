// Order Management System Types

export type ProductionStatus = 
  | 'created'      // Skapad
  | 'planned'      // Planerad
  | 'started'      // Startad
  | 'paused'       // Pausad
  | 'arrived'      // Ankommen
  | 'completed'    // Avslutad
  | 'cancelled';   // Avbruten

export type BillingStatus = 
  | 'not_ready'           // Ej klar
  | 'ready_for_billing'   // Klar för fakturering
  | 'billed';             // Fakturerad

export type StepStatus = 
  | 'pending'     // Väntande
  | 'in_progress' // Pågående
  | 'completed';  // Klar

export interface TreatmentStepTemplate {
  id: string;
  name: string;
  createdAt: string;
}

export interface OrderStep {
  id: string;
  templateId: string;
  name: string;
  status: StepStatus;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  price?: number;
}

export interface StatusChange {
  id: string;
  timestamp: string;
  fromStatus: ProductionStatus;
  toStatus: ProductionStatus;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerReference?: string;
  deliveryAddress?: string;
  productionStatus: ProductionStatus;
  billingStatus: BillingStatus;
  plannedStart?: string;
  plannedEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  steps: OrderStep[];
  statusHistory: StatusChange[];
  hasDeviation: boolean;
  deviationComment?: string;
  comment?: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  // XML import data
  xmlData?: {
    supplier?: string;
    partNumbers?: string[];
    orderDate?: string;
    deliveryDate?: string;
  };
  // Article rows (from XML or manual entry)
  articleRows?: ArticleRow[];
}

export interface ArticleRow {
  id: string;
  rowNumber: string;
  partNumber: string;
  text: string;
  quantity: number;
  unit: string;
  price: number;
  stepId?: string; // Optional link to treatment step
}

export interface ParsedXMLOrder {
  orderNumber: string;
  customer: string;
  customerReference?: string;
  deliveryAddress?: string;
  supplier?: string;
  orderDate?: string;
  deliveryDate?: string;
  rows: ArticleRow[];
}

// Status display helpers
export const productionStatusLabels: Record<ProductionStatus, string> = {
  created: 'Skapad',
  planned: 'Planerad',
  started: 'Startad',
  paused: 'Pausad',
  arrived: 'Ankommen',
  completed: 'Avslutad',
  cancelled: 'Avbruten',
};

export const billingStatusLabels: Record<BillingStatus, string> = {
  not_ready: 'Ej klar',
  ready_for_billing: 'Klar för fakturering',
  billed: 'Fakturerad',
};

export const stepStatusLabels: Record<StepStatus, string> = {
  pending: 'Väntande',
  in_progress: 'Pågående',
  completed: 'Klar',
};
