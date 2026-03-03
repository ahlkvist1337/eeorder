// Order Management System Types

// Administrative order status (back-office only)
// Note: Database enum has these values. In UI we show simplified labels.
export type ProductionStatus = 
  | 'created'      // Skapad → visas som "Aktiv" 
  | 'started'      // Startad → visas som "Aktiv"
  | 'paused'       // Pausad → visas som "Aktiv"
  | 'arrived'      // Ankommen → visas som "Aktiv"
  | 'completed'    // Avslutad
  | 'cancelled';   // Avbruten

// Simplified administrative statuses for UI dropdowns (maps to ProductionStatus)
export type OrderAdminStatus = 'created' | 'completed' | 'cancelled';

export type BillingStatus = 
  | 'not_ready'           // Ej klar
  | 'ready_for_billing'   // Klar för fakturering
  | 'billed';             // Fakturerad

export type StepStatus = 
  | 'pending'     // Väntande
  | 'in_progress' // Pågående
  | 'completed';  // Klar

// Truck production status (separate from order administrative status)
export type TruckStatus = 
  | 'waiting'     // Väntande (inte anlänt ännu)
  | 'arrived'     // Ankommen
  | 'started'     // Arbete påbörjat
  | 'paused'      // Pausad
  | 'completed'   // Klar
  | 'packed'      // Packat
  | 'delivered';  // Levererat

// Billing status per work card (truck)
export type TruckBillingStatus = 'not_billable' | 'ready_for_billing' | 'billed';

export interface TreatmentStepTemplate {
  id: string;
  name: string;
  createdAt: string;
}

export interface TruckStepStatus {
  id: string;
  truckId: string;
  stepId: string;
  status: StepStatus;
  actualStart?: string;
  actualEnd?: string;
}

export interface ObjectTruck {
  id: string;
  objectId: string;
  truckNumber: string;
  status: TruckStatus; // Production status for this truck
  billingStatus: TruckBillingStatus; // Billing status for this truck
  stepStatuses: TruckStepStatus[];
  sortOrder?: number; // Manual prioritization order
  createdAt?: string;
}

export interface OrderObject {
  id: string;
  name: string;
  description?: string;
  plannedQuantity: number;
  receivedQuantity: number;
  completedQuantity: number;
  trucks?: ObjectTruck[];
  createdAt?: string;
}

export interface OrderStep {
  id: string;
  templateId: string;
  name: string;
  status: StepStatus;
  objectId?: string; // Link to OrderObject
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

export interface StepStatusChange {
  id: string;
  timestamp: string;
  stepId: string;
  stepName: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
}

export interface TruckStatusChange {
  id: string;
  timestamp: string;
  truckId: string;
  truckNumber: string;
  stepId: string;
  stepName: string;
  fromStatus: StepStatus;
  toStatus: StepStatus;
  changedByName?: string;
}

// --- V2 types: Unit-centric model ---

export interface UnitObjectStep {
  id: string;
  unitObjectId: string;
  templateId: string;
  name: string;
  sortOrder: number;
  status: StepStatus;
}

export interface UnitObject {
  id: string;
  unitId: string;
  name: string;
  description?: string;
  status: TruckStatus;
  billingStatus: TruckBillingStatus;
  steps: UnitObjectStep[];
  createdAt?: string;
}

export interface OrderUnit {
  id: string;
  orderId: string;
  unitNumber: string;
  status: TruckStatus;
  billingStatus: TruckBillingStatus;
  sortOrder?: number;
  objects: UnitObject[];
  createdAt?: string;
}

// --- Order interface (supports both v1 and v2) ---

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
  objects?: OrderObject[]; // V1: Objects within the order
  steps: OrderStep[];
  statusHistory: StatusChange[];
  stepStatusHistory: StepStatusChange[];
  truckStatusHistory?: TruckStatusChange[];
  truckLifecycleEvents?: TruckLifecycleEvent[];
  hasDeviation: boolean;
  deviationComment?: string;
  comment?: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  // Data model version: 1 = legacy (object→truck), 2 = new (unit→object→step)
  dataModelVersion: number;
  // V2: Units (main production entities)
  units?: OrderUnit[];
  // XML import data
  xmlData?: {
    supplier?: string;
    partNumbers?: string[];
    orderDate?: string;
    deliveryDate?: string;
  };
  // Article rows (from XML or manual entry)
  articleRows?: ArticleRow[];
  // Instructions (from XML RowType 4)
  instructions?: Instruction[];
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
  objectId?: string; // Link to OrderObject for auto work card generation (V1)
  unitId?: string; // Link to OrderUnit (V2)
}

export interface Instruction {
  id: string;
  text: string;
  rowNumber: string;
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
  instructions: Instruction[];
}

// Status display helpers - administrative only
// All "active" states (created, started, paused, arrived) display as "Aktiv"
export const productionStatusLabels: Record<ProductionStatus, string> = {
  created: 'Aktiv',
  arrived: 'Aktiv',
  started: 'Aktiv',
  paused: 'Aktiv',
  completed: 'Avslutad',
  cancelled: 'Avbruten',
};

// Simplified labels for UI dropdowns (only 3 options)
// Uses 'created' as the "active" state since it's the default in DB
export const orderAdminStatusLabels: Record<OrderAdminStatus, string> = {
  created: 'Aktiv',
  completed: 'Avslutad',
  cancelled: 'Avbruten',
};

// Map any ProductionStatus to the simplified admin status for UI selection
export function toAdminStatus(status: ProductionStatus): OrderAdminStatus {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'created'; // All other statuses map to 'created' (displayed as "Aktiv")
}

export const billingStatusLabels: Record<BillingStatus, string> = {
  not_ready: 'Ej klar',
  ready_for_billing: 'Klar för fakturering',
  billed: 'Fakturerad',
};

// Returns a display-friendly billing label for the order level,
// distinguishing partial readiness from full readiness.
export function getOrderBillingLabel(order: Order): string {
  const computed = calculateOrderBillingStatus(order);
  if (computed === 'not_ready') return billingStatusLabels.not_ready;
  if (computed === 'billed') return billingStatusLabels.billed;

  // ready_for_billing — check if ALL or only SOME are ready/billed
  if (order.dataModelVersion === 2 && order.units && order.units.length > 1) {
    const allReady = order.units.every(u => u.billingStatus === 'ready_for_billing' || u.billingStatus === 'billed');
    if (!allReady) return 'Delvis klar för fakturering';
  } else if (order.dataModelVersion !== 2) {
    const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
    if (allTrucks.length > 1) {
      const allReady = allTrucks.every(t => t.billingStatus === 'ready_for_billing' || t.billingStatus === 'billed');
      if (!allReady) return 'Delvis klar för fakturering';
    }
  }

  return billingStatusLabels.ready_for_billing;
}

export const stepStatusLabels: Record<StepStatus, string> = {
  pending: 'Väntande',
  in_progress: 'Pågående',
  completed: 'Klar',
};

export const truckStatusLabels: Record<TruckStatus, string> = {
  waiting: 'Väntande',
  arrived: 'Ankommen',
  started: 'Startad',
  paused: 'Pausad',
  completed: 'Klar',
  packed: 'Packat',
  delivered: 'Levererat',
};

export const truckBillingStatusLabels: Record<TruckBillingStatus, string> = {
  not_billable: 'Ej fakturerbar',
  ready_for_billing: 'Klar för fakturering',
  billed: 'Fakturerad',
};

// Truck lifecycle events for unified history
export type TruckLifecycleEventType = 
  | 'planned'
  | 'arrived'
  | 'started'
  | 'paused'
  | 'completed'
  | 'packed'
  | 'delivered'
  | 'step_started'
  | 'step_completed';

export interface TruckLifecycleEvent {
  id: string;
  orderId: string;
  truckId: string;
  truckNumber: string;
  eventType: TruckLifecycleEventType;
  stepName?: string;
  timestamp: string;
  note?: string;
  changedByName?: string;
}

export const truckLifecycleEventLabels: Record<TruckLifecycleEventType, string> = {
  planned: 'Arbetskort planerat',
  arrived: 'Arbetskort ankommet',
  started: 'Arbete påbörjat',
  paused: 'Pausat',
  completed: 'Arbetskort klart',
  packed: 'Packat',
  delivered: 'Levererat',
  step_started: 'Steg påbörjat',
  step_completed: 'Steg klart',
};

// Helper to get display name for work cards (supports optional identification numbers)
export function getWorkUnitDisplayName(truckNumber: string | null | undefined, objectName: string, truckId: string): string {
  if (truckNumber && truckNumber.trim()) {
    return `#${truckNumber}`;
  }
  // Fallback: object name + short ID
  return `${objectName.substring(0, 12)} ${truckId.slice(-4).toUpperCase()}`;
}

// Calculate object quantities automatically from work cards
export function calculateObjectQuantities(trucks: ObjectTruck[] | undefined): {
  planned: number;
  received: number;
  completed: number;
  packed: number;
  delivered: number;
} {
  const allTrucks = trucks || [];
  return {
    planned: allTrucks.length,
    received: allTrucks.filter(t => 
      t.status === 'arrived' || 
      t.status === 'started' || 
      t.status === 'paused' || 
      t.status === 'completed' ||
      t.status === 'packed' ||
      t.status === 'delivered'
    ).length,
    completed: allTrucks.filter(t => 
      t.status === 'completed' || 
      t.status === 'packed' || 
      t.status === 'delivered'
    ).length,
    packed: allTrucks.filter(t => t.status === 'packed' || t.status === 'delivered').length,
    delivered: allTrucks.filter(t => t.status === 'delivered').length,
  };
}

// Calculate computed billing status for an order based on its trucks
export function calculateOrderBillingStatus(order: Order): BillingStatus {
  // V2: use units
  if (order.dataModelVersion === 2 && order.units) {
    if (order.units.length === 0) return order.billingStatus;
    const allBilled = order.units.every(u => u.billingStatus === 'billed');
    if (allBilled) return 'billed';
    const someBilledOrReady = order.units.some(u => u.billingStatus === 'billed' || u.billingStatus === 'ready_for_billing');
    if (someBilledOrReady) return 'ready_for_billing';
    return 'not_ready';
  }

  // V1: use trucks
  const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
  if (allTrucks.length === 0) return order.billingStatus;
  
  const allBilled = allTrucks.every(t => t.billingStatus === 'billed');
  if (allBilled) return 'billed';
  
  const someBilledOrReady = allTrucks.some(t => t.billingStatus === 'billed' || t.billingStatus === 'ready_for_billing');
  if (someBilledOrReady) return 'ready_for_billing';
  
  return 'not_ready';
}

// Get delivery summary for an order
export function getDeliverySummary(order: Order): { delivered: number; total: number } {
  // V2: use units
  if (order.dataModelVersion === 2 && order.units) {
    return {
      delivered: order.units.filter(u => u.status === 'delivered').length,
      total: order.units.length,
    };
  }

  // V1: use trucks
  const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
  return {
    delivered: allTrucks.filter(t => t.status === 'delivered').length,
    total: allTrucks.length,
  };
}
