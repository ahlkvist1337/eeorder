import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Order, ProductionStatus, BillingStatus, OrderStep, StatusChange, ArticleRow, StepStatusChange, StepStatus, OrderObject, ObjectTruck, TruckStepStatus, TruckStatusChange, TruckStatus, Instruction, TruckLifecycleEvent, TruckLifecycleEventType } from '@/types/order';

// Database types (manual since types.ts may not be updated yet)
interface DbOrder {
  id: string;
  order_number: string;
  customer: string;
  customer_reference: string | null;
  delivery_address: string | null;
  production_status: ProductionStatus;
  billing_status: BillingStatus;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  has_deviation: boolean;
  deviation_comment: string | null;
  comment: string | null;
  total_price: number;
  xml_data: Record<string, unknown> | null;
  instructions: Instruction[] | null;
  created_at: string;
  updated_at: string;
}

interface DbOrderStep {
  id: string;
  order_id: string;
  template_id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed';
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  price: number | null;
  object_id: string | null;
}

interface DbOrderObject {
  id: string;
  order_id: string;
  name: string;
  description: string | null;
  planned_quantity: number;
  received_quantity: number;
  completed_quantity: number;
  created_at: string;
}

interface DbObjectTruck {
  id: string;
  object_id: string;
  truck_number: string | null; // Now nullable for work units without truck numbers
  status: 'waiting' | 'arrived' | 'started' | 'paused' | 'completed';
  sort_order: number | null;
  created_at: string;
}

interface DbTruckStepStatus {
  id: string;
  truck_id: string;
  step_id: string;
  status: 'pending' | 'in_progress' | 'completed';
  actual_start: string | null;
  actual_end: string | null;
}

interface DbArticleRow {
  id: string;
  order_id: string;
  row_number: string;
  part_number: string;
  text: string;
  quantity: number;
  unit: string;
  price: number;
  step_id: string | null;
  object_id: string | null;
}

interface DbStatusHistory {
  id: string;
  order_id: string;
  from_status: ProductionStatus;
  to_status: ProductionStatus;
  timestamp: string;
}

interface DbStepStatusHistory {
  id: string;
  order_id: string;
  step_id: string;
  step_name: string;
  from_status: StepStatus;
  to_status: StepStatus;
  timestamp: string;
}

interface DbTruckStatusHistory {
  id: string;
  order_id: string;
  truck_id: string;
  truck_number: string;
  step_id: string;
  step_name: string;
  from_status: StepStatus;
  to_status: StepStatus;
  timestamp: string;
}

interface DbTruckLifecycleEvent {
  id: string;
  order_id: string;
  truck_id: string;
  truck_number: string | null;
  event_type: string;
  step_name: string | null;
  timestamp: string;
  note: string | null;
}

interface BulkOrderUpdates {
  productionStatus?: ProductionStatus;
  billingStatus?: BillingStatus;
  hasDeviation?: boolean;
}

interface OrdersContextType {
  orders: Order[];
  isLoading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>) => Promise<Order>;
  updateOrder: (id: string, updates: Partial<Order>, previousSteps?: OrderStep[]) => Promise<void>;
  updateProductionStatus: (id: string, newStatus: ProductionStatus) => Promise<void>;
  updateBillingStatus: (id: string, newStatus: BillingStatus) => Promise<void>;
  updateOrderStep: (orderId: string, stepId: string, updates: Partial<OrderStep>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  getOrderByNumber: (orderNumber: string) => Order | undefined;
  getOrderById: (id: string) => Order | undefined;
  orderNumberExists: (orderNumber: string) => boolean;
  refreshOrders: () => Promise<void>;
  updateTruckStepStatus: (orderId: string, truckId: string, stepId: string, newStatus: StepStatus, truckNumber: string, stepName: string) => Promise<void>;
  updateTruckStatus: (orderId: string, truckId: string, newStatus: TruckStatus) => Promise<void>;
  bulkUpdateOrders: (orderIds: string[], updates: BulkOrderUpdates) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | null>(null);

function mapDbOrderToOrder(
  dbOrder: DbOrder,
  objects: DbOrderObject[],
  steps: DbOrderStep[],
  articleRows: DbArticleRow[],
  statusHistory: DbStatusHistory[],
  stepStatusHistory: DbStepStatusHistory[],
  trucks: DbObjectTruck[],
  truckStepStatuses: DbTruckStepStatus[],
  truckStatusHistory: DbTruckStatusHistory[],
  lifecycleEvents: DbTruckLifecycleEvent[]
): Order {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    customer: dbOrder.customer,
    customerReference: dbOrder.customer_reference || undefined,
    deliveryAddress: dbOrder.delivery_address || undefined,
    productionStatus: dbOrder.production_status,
    billingStatus: dbOrder.billing_status,
    plannedStart: dbOrder.planned_start || undefined,
    plannedEnd: dbOrder.planned_end || undefined,
    actualStart: dbOrder.actual_start || undefined,
    actualEnd: dbOrder.actual_end || undefined,
    hasDeviation: dbOrder.has_deviation,
    deviationComment: dbOrder.deviation_comment || undefined,
    comment: dbOrder.comment || undefined,
    totalPrice: Number(dbOrder.total_price) || 0,
    xmlData: dbOrder.xml_data as Order['xmlData'],
    instructions: (dbOrder.instructions as Instruction[]) || undefined,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
    objects: objects.map(o => {
      // Get trucks for this object
      const objectTrucks = trucks.filter(t => t.object_id === o.id);
      const mappedTrucks: ObjectTruck[] = objectTrucks.map(t => ({
        id: t.id,
        objectId: t.object_id,
        truckNumber: t.truck_number,
        status: t.status,
        sortOrder: t.sort_order ?? undefined,
        createdAt: t.created_at,
        stepStatuses: truckStepStatuses
          .filter(s => s.truck_id === t.id)
          .map(s => ({
            id: s.id,
            truckId: s.truck_id,
            stepId: s.step_id,
            status: s.status,
            actualStart: s.actual_start || undefined,
            actualEnd: s.actual_end || undefined,
          })),
      }));
      
      return {
        id: o.id,
        name: o.name,
        description: o.description || undefined,
        plannedQuantity: o.planned_quantity ?? 1,
        receivedQuantity: o.received_quantity ?? 0,
        completedQuantity: o.completed_quantity ?? 0,
        trucks: mappedTrucks.length > 0 ? mappedTrucks : undefined,
        createdAt: o.created_at,
      };
    }),
    steps: steps.map(s => ({
      id: s.id,
      templateId: s.template_id,
      name: s.name,
      status: s.status,
      objectId: s.object_id || undefined,
      plannedStart: s.planned_start || undefined,
      plannedEnd: s.planned_end || undefined,
      actualStart: s.actual_start || undefined,
      actualEnd: s.actual_end || undefined,
      price: s.price !== null ? Number(s.price) : undefined,
    })),
    articleRows: articleRows.map(r => ({
      id: r.id,
      rowNumber: r.row_number,
      partNumber: r.part_number,
      text: r.text,
      quantity: Number(r.quantity),
      unit: r.unit,
      price: Number(r.price),
      stepId: r.step_id || undefined,
      objectId: r.object_id || undefined,
    })),
    statusHistory: statusHistory.map(h => ({
      id: h.id,
      timestamp: h.timestamp,
      fromStatus: h.from_status,
      toStatus: h.to_status,
    })),
    stepStatusHistory: stepStatusHistory.map(h => ({
      id: h.id,
      timestamp: h.timestamp,
      stepId: h.step_id,
      stepName: h.step_name,
      fromStatus: h.from_status,
      toStatus: h.to_status,
    })),
    truckStatusHistory: truckStatusHistory.map(h => ({
      id: h.id,
      timestamp: h.timestamp,
      truckId: h.truck_id,
      truckNumber: h.truck_number,
      stepId: h.step_id,
      stepName: h.step_name,
      fromStatus: h.from_status,
      toStatus: h.to_status,
    })),
    truckLifecycleEvents: lifecycleEvents.map(e => ({
      id: e.id,
      orderId: e.order_id,
      truckId: e.truck_id,
      truckNumber: e.truck_number || '',
      eventType: e.event_type as import('@/types/order').TruckLifecycleEventType,
      stepName: e.step_name || undefined,
      timestamp: e.timestamp,
      note: e.note || undefined,
    })),
  };
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = ordersData.map(o => o.id);

      // Fetch related data in parallel (including order_objects, trucks, and truck statuses)
      const [objectsResult, stepsResult, articleRowsResult, historyResult, stepHistoryResult, truckHistoryResult, lifecycleEventsResult] = await Promise.all([
        supabase.from('order_objects').select('*').in('order_id', orderIds),
        supabase.from('order_steps').select('*').in('order_id', orderIds),
        supabase.from('article_rows').select('*').in('order_id', orderIds),
        supabase.from('status_history').select('*').in('order_id', orderIds),
        supabase.from('step_status_history').select('*').in('order_id', orderIds),
        supabase.from('truck_status_history').select('*').in('order_id', orderIds),
        supabase.from('truck_lifecycle_events').select('*').in('order_id', orderIds),
      ]);

      if (objectsResult.error) throw objectsResult.error;
      if (stepsResult.error) throw stepsResult.error;
      if (articleRowsResult.error) throw articleRowsResult.error;
      if (historyResult.error) throw historyResult.error;
      if (stepHistoryResult.error) throw stepHistoryResult.error;
      if (truckHistoryResult.error) throw truckHistoryResult.error;
      if (lifecycleEventsResult.error) throw lifecycleEventsResult.error;

      // Fetch trucks and their step statuses
      const objectIds = (objectsResult.data || []).map(o => o.id);
      
      let trucksData: DbObjectTruck[] = [];
      let truckStepStatusData: DbTruckStepStatus[] = [];
      
      if (objectIds.length > 0) {
        const trucksResult = await supabase.from('object_trucks').select('*').in('object_id', objectIds);
        if (trucksResult.error) throw trucksResult.error;
        trucksData = (trucksResult.data || []) as DbObjectTruck[];
        
        if (trucksData.length > 0) {
          const truckIds = trucksData.map(t => t.id);
          const truckStatusResult = await supabase.from('truck_step_status').select('*').in('truck_id', truckIds);
          if (truckStatusResult.error) throw truckStatusResult.error;
          truckStepStatusData = (truckStatusResult.data || []) as DbTruckStepStatus[];
        }
      }

      const mappedOrders = ordersData.map(dbOrder => {
        const orderObjects = (objectsResult.data || []).filter(o => o.order_id === dbOrder.id) as DbOrderObject[];
        const orderObjectIds = orderObjects.map(o => o.id);
        const orderTrucks = trucksData.filter(t => orderObjectIds.includes(t.object_id));
        const orderTruckIds = orderTrucks.map(t => t.id);
        const orderTruckStatuses = truckStepStatusData.filter(s => orderTruckIds.includes(s.truck_id));
        const orderTruckHistory = (truckHistoryResult.data || []).filter(h => h.order_id === dbOrder.id) as DbTruckStatusHistory[];
        
        const orderLifecycleEvents = (lifecycleEventsResult.data || []).filter(e => e.order_id === dbOrder.id) as DbTruckLifecycleEvent[];
        
        return mapDbOrderToOrder(
          dbOrder as unknown as DbOrder,
          orderObjects,
          (stepsResult.data || []).filter(s => s.order_id === dbOrder.id) as DbOrderStep[],
          (articleRowsResult.data || []).filter(r => r.order_id === dbOrder.id) as DbArticleRow[],
          (historyResult.data || []).filter(h => h.order_id === dbOrder.id) as DbStatusHistory[],
          (stepHistoryResult.data || []).filter(h => h.order_id === dbOrder.id) as DbStepStatusHistory[],
          orderTrucks,
          orderTruckStatuses,
          orderTruckHistory,
          orderLifecycleEvents
        );
      });

      setOrders(mappedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setOrders([]);
      setIsLoading(false);
    }
  }, [user, fetchOrders]);

  // Realtime subscription for live updates
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'object_trucks',
        },
        () => {
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'truck_step_status',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchOrders]);

  const addOrder = useCallback(async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>): Promise<Order> => {
    // Insert order
    const insertData = {
      order_number: order.orderNumber,
      customer: order.customer,
      customer_reference: order.customerReference || null,
      delivery_address: order.deliveryAddress || null,
      production_status: order.productionStatus,
      billing_status: order.billingStatus,
      planned_start: order.plannedStart || null,
      planned_end: order.plannedEnd || null,
      actual_start: order.actualStart || null,
      actual_end: order.actualEnd || null,
      has_deviation: order.hasDeviation,
      deviation_comment: order.deviationComment || null,
      comment: order.comment || null,
      total_price: order.totalPrice,
      xml_data: order.xmlData || null,
      instructions: order.instructions || null,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newOrderData, error: orderError } = await supabase
      .from('orders')
      .insert(insertData as any)
      .select()
      .single();

    if (orderError) throw orderError;

    const orderId = newOrderData.id;

    // Insert objects if any (before steps, as steps reference objects)
    const objectIdMap: Record<string, string> = {};
    if (order.objects && order.objects.length > 0) {
      const objectsToInsert = order.objects.map(obj => ({
        id: obj.id,
        order_id: orderId,
        name: obj.name,
        description: obj.description || null,
        planned_quantity: obj.plannedQuantity ?? 1,
        received_quantity: obj.receivedQuantity ?? 0,
        completed_quantity: obj.completedQuantity ?? 0,
      }));
      
      const { error: objectsError } = await supabase.from('order_objects').insert(objectsToInsert);
      if (objectsError) throw objectsError;
      
      // Map old object IDs to new ones (in case they're the same, just keep track)
      order.objects.forEach(obj => {
        objectIdMap[obj.id] = obj.id;
      });
    }

    // Insert steps BEFORE trucks (truck_step_status references step_id via foreign key)
    if (order.steps && order.steps.length > 0) {
      const { error: stepsError } = await supabase.from('order_steps').insert(
        order.steps.map(step => ({
          id: step.id,
          order_id: orderId,
          template_id: step.templateId,
          name: step.name,
          status: step.status,
          object_id: step.objectId || null,
          planned_start: step.plannedStart || null,
          planned_end: step.plannedEnd || null,
          actual_start: step.actualStart || null,
          actual_end: step.actualEnd || null,
          price: step.price ?? null,
        }))
      );
      if (stepsError) throw stepsError;
    }

    // Insert trucks for each object (AFTER steps are created)
    if (order.objects && order.objects.length > 0) {
      for (const obj of order.objects) {
        if (obj.trucks && obj.trucks.length > 0) {
          const trucksToInsert = obj.trucks.map(t => ({
            id: t.id,
            object_id: obj.id,
            truck_number: t.truckNumber,
          }));
          
          const { error: trucksError } = await supabase.from('object_trucks').insert(trucksToInsert);
          if (trucksError) throw trucksError;
          
          // Insert truck step statuses (now step_id references exist)
          const allStepStatuses = obj.trucks.flatMap(t =>
            t.stepStatuses.map(s => ({
              id: s.id,
              truck_id: t.id,
              step_id: s.stepId,
              status: s.status,
              actual_start: s.actualStart || null,
              actual_end: s.actualEnd || null,
            }))
          );
          
          if (allStepStatuses.length > 0) {
            const { error: statusError } = await supabase.from('truck_step_status').insert(allStepStatuses);
            if (statusError) throw statusError;
          }
        }
      }
    }

    // Insert article rows if any
    if (order.articleRows && order.articleRows.length > 0) {
      const { error: rowsError } = await supabase.from('article_rows').insert(
        order.articleRows.map(row => ({
          order_id: orderId,
          row_number: row.rowNumber,
          part_number: row.partNumber,
          text: row.text,
          quantity: row.quantity,
          unit: row.unit,
          price: row.price,
          step_id: row.stepId || null,
          object_id: row.objectId || null,
        }))
      );
      if (rowsError) throw rowsError;
    }

    // Refresh and return the new order
    await fetchOrders();
    const newOrder = orders.find(o => o.id === orderId) || {
      ...order,
      id: orderId,
      createdAt: newOrderData.created_at,
      updatedAt: newOrderData.updated_at,
      statusHistory: [],
    } as Order;

    return newOrder;
  }, [fetchOrders, orders]);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>, previousSteps?: OrderStep[]) => {
    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.orderNumber !== undefined) dbUpdates.order_number = updates.orderNumber;
    if (updates.customer !== undefined) dbUpdates.customer = updates.customer;
    if (updates.customerReference !== undefined) dbUpdates.customer_reference = updates.customerReference || null;
    if (updates.deliveryAddress !== undefined) dbUpdates.delivery_address = updates.deliveryAddress || null;
    if (updates.productionStatus !== undefined) dbUpdates.production_status = updates.productionStatus;
    if (updates.billingStatus !== undefined) dbUpdates.billing_status = updates.billingStatus;
    if (updates.plannedStart !== undefined) dbUpdates.planned_start = updates.plannedStart || null;
    if (updates.plannedEnd !== undefined) dbUpdates.planned_end = updates.plannedEnd || null;
    if (updates.actualStart !== undefined) dbUpdates.actual_start = updates.actualStart || null;
    if (updates.actualEnd !== undefined) dbUpdates.actual_end = updates.actualEnd || null;
    if (updates.hasDeviation !== undefined) dbUpdates.has_deviation = updates.hasDeviation;
    if (updates.deviationComment !== undefined) dbUpdates.deviation_comment = updates.deviationComment || null;
    if (updates.comment !== undefined) dbUpdates.comment = updates.comment || null;
    if (updates.totalPrice !== undefined) dbUpdates.total_price = updates.totalPrice;
    if (updates.xmlData !== undefined) dbUpdates.xml_data = updates.xmlData || null;
    if (updates.instructions !== undefined) dbUpdates.instructions = updates.instructions || null;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('orders')
        .update(dbUpdates)
        .eq('id', id);
      if (error) throw error;
    }

    // IMPORTANT: Handle objects BEFORE steps to avoid cascade-delete issues
    // When order_objects are deleted, order_steps with object_id pointing to them are cascade-deleted
    
    // Update objects if provided - use UPSERT strategy to avoid cascade-delete issues
    if (updates.objects !== undefined) {
      const currentOrder = orders.find(o => o.id === id);
      const currentObjectIds = new Set((currentOrder?.objects || []).map(o => o.id));
      const newObjectIds = new Set(updates.objects.map(o => o.id));
      
      // Find objects that were removed
      const removedObjectIds = [...currentObjectIds].filter(objId => !newObjectIds.has(objId));
      
      // UPSERT all current objects (insert new ones, update existing ones)
      if (updates.objects.length > 0) {
        const { error } = await supabase.from('order_objects').upsert(
          updates.objects.map(obj => ({
            id: obj.id,
            order_id: id,
            name: obj.name,
            description: obj.description || null,
            planned_quantity: obj.plannedQuantity ?? 1,
            received_quantity: obj.receivedQuantity ?? 0,
            completed_quantity: obj.completedQuantity ?? 0,
          })),
          { onConflict: 'id' }
        );
        if (error) throw error;
      }
      
      // Delete removed objects (this will cascade-delete their steps, which is correct)
      if (removedObjectIds.length > 0) {
        const { error } = await supabase.from('order_objects').delete().in('id', removedObjectIds);
        if (error) throw error;
      }
    }

    // Update steps if provided (AFTER objects are handled)
    if (updates.steps !== undefined) {
      const currentOrder = orders.find(o => o.id === id);
      
      if (currentOrder) {
        // Use previousSteps if provided, otherwise fallback to currentOrder.steps
        const oldSteps = previousSteps || currentOrder.steps;
        
        // Check if any step is being changed to 'in_progress'
        const hasNewInProgress = updates.steps.some(newStep => {
          const oldStep = oldSteps.find(s => s.id === newStep.id);
          return oldStep && oldStep.status !== 'in_progress' && newStep.status === 'in_progress';
        });

        // Check if all steps are now completed
        const allStepsCompleted = updates.steps.length > 0 && updates.steps.every(step => step.status === 'completed');
        
        // Check if this is a new completion (at least one step wasn't completed before)
        const wasNotAllCompleted = oldSteps.some(step => step.status !== 'completed');
        
        // Auto-change order status to "completed" when all steps are done
        if (allStepsCompleted && wasNotAllCompleted) {
          const statusesThatShouldChangeToCompleted: ProductionStatus[] = ['created', 'arrived', 'started', 'paused'];
          
          if (statusesThatShouldChangeToCompleted.includes(currentOrder.productionStatus)) {
            await supabase.from('status_history').insert({
              order_id: id,
              from_status: currentOrder.productionStatus,
              to_status: 'completed',
            });
            
            await supabase
              .from('orders')
              .update({ production_status: 'completed' })
              .eq('id', id);
          }
        }
        // Auto-change order status to "started" when a step begins (only if not completing all)
        else if (hasNewInProgress) {
          const statusesThatShouldChangeToStarted: ProductionStatus[] = ['created', 'arrived'];
          
          if (statusesThatShouldChangeToStarted.includes(currentOrder.productionStatus)) {
            await supabase.from('status_history').insert({
              order_id: id,
              from_status: currentOrder.productionStatus,
              to_status: 'started',
            });
            
            // Update the order status immediately
            await supabase
              .from('orders')
              .update({ production_status: 'started' })
              .eq('id', id);
          }
        }

        // Log step status changes
        const stepHistoryEntries = updates.steps
          .map(newStep => {
            const oldStep = oldSteps.find(s => s.id === newStep.id);
            if (oldStep && oldStep.status !== newStep.status) {
              return {
                order_id: id,
                step_id: newStep.id,
                step_name: newStep.name,
                from_status: oldStep.status,
                to_status: newStep.status,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (stepHistoryEntries.length > 0) {
          await supabase.from('step_status_history').insert(stepHistoryEntries);
        }
      }

      // Delete existing steps and insert new ones
      await supabase.from('order_steps').delete().eq('order_id', id);
      if (updates.steps.length > 0) {
        const { error } = await supabase.from('order_steps').insert(
          updates.steps.map(step => ({
            id: step.id,
            order_id: id,
            template_id: step.templateId,
            name: step.name,
            status: step.status,
            object_id: step.objectId || null,
            planned_start: step.plannedStart || null,
            planned_end: step.plannedEnd || null,
            actual_start: step.actualStart || null,
            actual_end: step.actualEnd || null,
            price: step.price ?? null,
          }))
        );
        if (error) throw error;
      }
    }

    // Handle trucks for objects if provided
    if (updates.objects !== undefined) {
      for (const obj of updates.objects) {
        if (obj.trucks) {
          // Get current trucks for this object
          const { data: existingTrucks } = await supabase
            .from('object_trucks')
            .select('id')
            .eq('object_id', obj.id);
          
          const existingTruckIds = new Set((existingTrucks || []).map(t => t.id));
          const newTruckIds = new Set(obj.trucks.map(t => t.id));
          
          // Find trucks to remove
          const removedTruckIds = [...existingTruckIds].filter(id => !newTruckIds.has(id));
          
          // Delete removed trucks (cascade deletes their step statuses)
          if (removedTruckIds.length > 0) {
            await supabase.from('object_trucks').delete().in('id', removedTruckIds);
          }
          
          // Upsert trucks
          if (obj.trucks.length > 0) {
            const { error: trucksError } = await supabase.from('object_trucks').upsert(
              obj.trucks.map(t => ({
                id: t.id,
                object_id: obj.id,
                truck_number: t.truckNumber,
                status: t.status,
                sort_order: t.sortOrder ?? null,
              })),
              { onConflict: 'id' }
            );
            if (trucksError) throw trucksError;
            
            // Upsert truck step statuses
            const allStepStatuses = obj.trucks.flatMap(t => 
              t.stepStatuses.map(s => ({
                id: s.id,
                truck_id: t.id,
                step_id: s.stepId,
                status: s.status,
                actual_start: s.actualStart || null,
                actual_end: s.actualEnd || null,
              }))
            );
            
            if (allStepStatuses.length > 0) {
              const { error: statusError } = await supabase.from('truck_step_status').upsert(
                allStepStatuses,
                { onConflict: 'id' }
              );
              if (statusError) throw statusError;
            }
          }
        }
      }
    }

    // Update article rows if provided
    if (updates.articleRows !== undefined) {
      // Delete existing rows and insert new ones
      await supabase.from('article_rows').delete().eq('order_id', id);
      if (updates.articleRows.length > 0) {
        const { error } = await supabase.from('article_rows').insert(
          updates.articleRows.map(row => ({
            id: row.id,
            order_id: id,
            row_number: row.rowNumber,
            part_number: row.partNumber,
            text: row.text,
            quantity: row.quantity,
            unit: row.unit,
            price: row.price,
            step_id: row.stepId || null,
            object_id: row.objectId || null,
          }))
        );
        if (error) throw error;
      }
    }

    // Optimistic update - update local state immediately
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const updatedOrder = { ...o, ...updates, updatedAt: new Date().toISOString() };
      // Handle objects update specifically if provided
      if (updates.objects !== undefined) {
        updatedOrder.objects = updates.objects;
      }
      if (updates.steps !== undefined) {
        updatedOrder.steps = updates.steps;
      }
      return updatedOrder;
    }));
  }, [orders]);

  const updateProductionStatus = useCallback(async (id: string, newStatus: ProductionStatus) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;

    // Skip if status is the same (no actual change)
    if (order.productionStatus === newStatus) return;

    // Insert status history
    await supabase.from('status_history').insert({
      order_id: id,
      from_status: order.productionStatus,
      to_status: newStatus,
    });

    // Update order status
    await supabase
      .from('orders')
      .update({ production_status: newStatus })
      .eq('id', id);

    await fetchOrders();
  }, [orders, fetchOrders]);

  const updateBillingStatus = useCallback(async (id: string, newStatus: BillingStatus) => {
    await supabase
      .from('orders')
      .update({ billing_status: newStatus })
      .eq('id', id);

    await fetchOrders();
  }, [fetchOrders]);

  const updateOrderStep = useCallback(async (orderId: string, stepId: string, updates: Partial<OrderStep>) => {
    // Check if status is being changed and log it
    const order = orders.find(o => o.id === orderId);
    const currentStep = order?.steps.find(s => s.id === stepId);
    
    if (updates.status !== undefined && currentStep && currentStep.status !== updates.status) {
      await supabase.from('step_status_history').insert({
        order_id: orderId,
        step_id: stepId,
        step_name: currentStep.name,
        from_status: currentStep.status,
        to_status: updates.status,
      });

      // Auto-change order status to "started" when a step begins
      if (updates.status === 'in_progress' && order) {
        const statusesThatShouldChangeToStarted: ProductionStatus[] = ['created', 'arrived'];
        
        if (statusesThatShouldChangeToStarted.includes(order.productionStatus)) {
          await supabase.from('status_history').insert({
            order_id: orderId,
            from_status: order.productionStatus,
            to_status: 'started',
          });
          
          await supabase
            .from('orders')
            .update({ production_status: 'started' })
            .eq('id', orderId);
        }
      }
    }

    const dbUpdates: Record<string, unknown> = {};
    
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.plannedStart !== undefined) dbUpdates.planned_start = updates.plannedStart || null;
    if (updates.plannedEnd !== undefined) dbUpdates.planned_end = updates.plannedEnd || null;
    if (updates.actualStart !== undefined) dbUpdates.actual_start = updates.actualStart || null;
    if (updates.actualEnd !== undefined) dbUpdates.actual_end = updates.actualEnd || null;
    if (updates.price !== undefined) dbUpdates.price = updates.price ?? null;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('order_steps')
        .update(dbUpdates)
        .eq('id', stepId);
      if (error) throw error;
    }

    // Update total price on the order
    if (order) {
      const newTotalPrice = order.steps.reduce((sum, step) => {
        if (step.id === stepId) {
          return sum + (updates.price ?? step.price ?? 0);
        }
        return sum + (step.price ?? 0);
      }, 0);

      await supabase
        .from('orders')
        .update({ total_price: newTotalPrice })
        .eq('id', orderId);
    }

    await fetchOrders();
  }, [orders, fetchOrders]);

  const deleteOrder = useCallback(async (id: string) => {
    // Related rows are deleted via CASCADE
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;

    await fetchOrders();
  }, [fetchOrders]);

  const getOrderByNumber = useCallback((orderNumber: string) => {
    return orders.find(o => o.orderNumber === orderNumber);
  }, [orders]);

  const getOrderById = useCallback((id: string) => {
    return orders.find(o => o.id === id);
  }, [orders]);

  const orderNumberExists = useCallback((orderNumber: string) => {
    return orders.some(o => o.orderNumber === orderNumber);
  }, [orders]);

  const updateTruckStepStatus = useCallback(async (
    orderId: string,
    truckId: string,
    stepId: string,
    newStatus: StepStatus,
    truckNumber: string,
    stepName: string
  ) => {
    // Find current status
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    let currentStatus: StepStatus = 'pending';
    for (const obj of order.objects || []) {
      for (const truck of obj.trucks || []) {
        if (truck.id === truckId) {
          const stepStatus = truck.stepStatuses.find(s => s.stepId === stepId);
          currentStatus = stepStatus?.status || 'pending';
          break;
        }
      }
    }
    
    // Skip if no actual change
    if (currentStatus === newStatus) return;

    // Optimistic update - update local state immediately
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        objects: o.objects?.map(obj => ({
          ...obj,
          trucks: obj.trucks?.map(t => {
            if (t.id !== truckId) return t;
            return {
              ...t,
              stepStatuses: t.stepStatuses.map(s =>
                s.stepId === stepId ? { ...s, status: newStatus } : s
              ),
            };
          }),
        })),
        truckStatusHistory: [
          ...(o.truckStatusHistory || []),
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            truckId,
            truckNumber,
            stepId,
            stepName,
            fromStatus: currentStatus,
            toStatus: newStatus,
          },
        ],
      };
    }));

    // Save to DB in background - use upsert in case the row doesn't exist yet
    const existingStepStatus = orders.find(o => o.id === orderId)
      ?.objects?.flatMap(obj => obj.trucks || [])
      .find(t => t.id === truckId)
      ?.stepStatuses.find(s => s.stepId === stepId);
    
    await supabase.from('truck_step_status').upsert({
      id: existingStepStatus?.id || crypto.randomUUID(),
      truck_id: truckId,
      step_id: stepId,
      status: newStatus,
    }, { onConflict: 'id' });
    
    // Log to history
    await supabase.from('truck_status_history').insert({
      order_id: orderId,
      truck_id: truckId,
      truck_number: truckNumber,
      step_id: stepId,
      step_name: stepName,
      from_status: currentStatus,
      to_status: newStatus,
    });
  }, [orders]);

  const updateTruckStatus = useCallback(async (
    orderId: string,
    truckId: string,
    newStatus: TruckStatus
  ) => {
    // Find current status and object
    const order = orders.find(o => o.id === orderId);
    let objectId: string | undefined;
    let currentStatus: TruckStatus = 'waiting';
    
    for (const obj of order?.objects || []) {
      const truck = obj.trucks?.find(t => t.id === truckId);
      if (truck) {
        currentStatus = truck.status;
        objectId = obj.id;
        break;
      }
    }
    
    // Skip if no actual change - prevents duplicate history entries
    if (currentStatus === newStatus) return;
    
    // Calculate quantity changes
    let receivedDelta = 0;
    let completedDelta = 0;
    
    // Mott: increase when arrived, decrease when back to waiting
    if (newStatus === 'arrived' && currentStatus === 'waiting') receivedDelta = 1;
    if (currentStatus === 'arrived' && newStatus === 'waiting') receivedDelta = -1;
    
    // Klart: increase when completed, decrease when back from completed
    if (newStatus === 'completed' && currentStatus !== 'completed') completedDelta = 1;
    if (currentStatus === 'completed' && newStatus !== 'completed') completedDelta = -1;
    
    // Get current quantities for DB update
    const currentObj = order?.objects?.find(o => o.id === objectId);
    const newReceivedQuantity = currentObj ? Math.max(0, currentObj.receivedQuantity + receivedDelta) : 0;
    const newCompletedQuantity = currentObj ? Math.max(0, currentObj.completedQuantity + completedDelta) : 0;
    
    // Find truck number for lifecycle event
    const truck = order?.objects?.flatMap(obj => obj.trucks || []).find(t => t.id === truckId);
    
    // Create lifecycle event for optimistic update
    const newLifecycleEvent: TruckLifecycleEvent = {
      id: crypto.randomUUID(),
      orderId,
      truckId,
      truckNumber: truck?.truckNumber || '',
      eventType: newStatus as TruckLifecycleEventType,
      timestamp: new Date().toISOString(),
    };

    // Optimistic update with quantities AND lifecycle event
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        objects: o.objects?.map(obj => ({
          ...obj,
          receivedQuantity: obj.id === objectId 
            ? Math.max(0, obj.receivedQuantity + receivedDelta) 
            : obj.receivedQuantity,
          completedQuantity: obj.id === objectId 
            ? Math.max(0, obj.completedQuantity + completedDelta) 
            : obj.completedQuantity,
          trucks: obj.trucks?.map(t =>
            t.id === truckId ? { ...t, status: newStatus } : t
          ),
        })),
        truckLifecycleEvents: [
          ...(o.truckLifecycleEvents || []),
          newLifecycleEvent,
        ],
      };
    }));

    // Update truck status in DB
    await supabase.from('object_trucks').update({ status: newStatus }).eq('id', truckId);
    
    // Update object quantities in DB
    if (objectId && (receivedDelta !== 0 || completedDelta !== 0)) {
      await supabase.from('order_objects').update({
        received_quantity: newReceivedQuantity,
        completed_quantity: newCompletedQuantity,
      }).eq('id', objectId);
    }

    // Ensure truck_step_status records exist when truck becomes active
    // This creates step status records if they're missing (handles legacy data)
    if (order && objectId && (newStatus === 'arrived' || newStatus === 'started')) {
      const truck = order.objects?.flatMap(obj => obj.trucks || []).find(t => t.id === truckId);
      if (truck && (!truck.stepStatuses || truck.stepStatuses.length === 0)) {
        // Get steps for this object
        const objectSteps = order.steps.filter(s => s.objectId === objectId);
        if (objectSteps.length > 0) {
          const stepStatusesToInsert = objectSteps.map(step => ({
            id: crypto.randomUUID(),
            truck_id: truckId,
            step_id: step.id,
            status: 'pending' as const,
          }));
          
          await supabase.from('truck_step_status').insert(stepStatusesToInsert);
          
          // Update local state optimistically
          setOrders(prev => prev.map(o => {
            if (o.id !== orderId) return o;
            return {
              ...o,
              objects: o.objects?.map(obj => ({
                ...obj,
                trucks: obj.trucks?.map(t => {
                  if (t.id !== truckId) return t;
                  return {
                    ...t,
                    stepStatuses: stepStatusesToInsert.map(ss => ({
                      id: ss.id,
                      truckId: ss.truck_id,
                      stepId: ss.step_id,
                      status: ss.status,
                    })),
                  };
                }),
              })),
            };
          }));
        }
      }
    }

    // Log lifecycle event to database
    await supabase.from('truck_lifecycle_events').insert({
      id: newLifecycleEvent.id,
      order_id: orderId,
      truck_id: truckId,
      truck_number: truck?.truckNumber || null,
      event_type: newStatus,
    });

    // Auto-complete order when ALL trucks are completed
    if (newStatus === 'completed' && order) {
      const allTrucks = order.objects?.flatMap(obj => obj.trucks || []) || [];
      
      // Count completed trucks (including this one that we just updated)
      const completedCount = allTrucks.filter(t => 
        t.id === truckId ? true : t.status === 'completed'
      ).length;
      
      // If all trucks are now completed, set order to completed
      if (completedCount === allTrucks.length && allTrucks.length > 0) {
        const statusesThatShouldChangeToCompleted = ['created', 'arrived', 'started', 'paused'];
        
        if (statusesThatShouldChangeToCompleted.includes(order.productionStatus)) {
          // Log status change history
          await supabase.from('status_history').insert({
            order_id: orderId,
            from_status: order.productionStatus,
            to_status: 'completed',
          });
          
          // Update order status in database
          await supabase.from('orders')
            .update({ production_status: 'completed' })
            .eq('id', orderId);
          
          // Update optimistic state
          setOrders(prev => prev.map(o => 
            o.id === orderId 
              ? { ...o, productionStatus: 'completed' as ProductionStatus }
              : o
          ));
        }
      }
    }
  }, [orders]);

  const bulkUpdateOrders = useCallback(async (orderIds: string[], updates: BulkOrderUpdates) => {
    if (orderIds.length === 0) return;

    // Build the update object for the orders table
    const dbUpdates: Record<string, unknown> = {};
    if (updates.productionStatus !== undefined) dbUpdates.production_status = updates.productionStatus;
    if (updates.billingStatus !== undefined) dbUpdates.billing_status = updates.billingStatus;
    if (updates.hasDeviation !== undefined) dbUpdates.has_deviation = updates.hasDeviation;

    // If updating production status, we need to create status history entries
    if (updates.productionStatus !== undefined) {
      const historyEntries = orderIds
        .map(orderId => {
          const order = orders.find(o => o.id === orderId);
          if (!order) return null;
          // Skip if status is the same (no actual change)
          if (order.productionStatus === updates.productionStatus) return null;
          return {
            order_id: orderId,
            from_status: order.productionStatus,
            to_status: updates.productionStatus!,
          };
        })
        .filter(Boolean);

      if (historyEntries.length > 0) {
        const { error: historyError } = await supabase
          .from('status_history')
          .insert(historyEntries);
        if (historyError) throw historyError;
      }
    }

    // Update all selected orders
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('orders')
        .update(dbUpdates)
        .in('id', orderIds);
      if (error) throw error;
    }

    await fetchOrders();
  }, [orders, fetchOrders]);

  return (
    <OrdersContext.Provider value={{
      orders,
      isLoading,
      addOrder,
      updateOrder,
      updateProductionStatus,
      updateBillingStatus,
      updateOrderStep,
      deleteOrder,
      getOrderByNumber,
      getOrderById,
      orderNumberExists,
      refreshOrders: fetchOrders,
      updateTruckStepStatus,
      updateTruckStatus,
      bulkUpdateOrders,
    }}>
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
}
