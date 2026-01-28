import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Order, ProductionStatus, BillingStatus, OrderStep, StatusChange, ArticleRow, StepStatusChange, StepStatus } from '@/types/order';

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
  bulkUpdateOrders: (orderIds: string[], updates: BulkOrderUpdates) => Promise<void>;
}

const OrdersContext = createContext<OrdersContextType | null>(null);

function mapDbOrderToOrder(
  dbOrder: DbOrder,
  steps: DbOrderStep[],
  articleRows: DbArticleRow[],
  statusHistory: DbStatusHistory[],
  stepStatusHistory: DbStepStatusHistory[]
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
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
    steps: steps.map(s => ({
      id: s.id,
      templateId: s.template_id,
      name: s.name,
      status: s.status,
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

      // Fetch related data in parallel
      const [stepsResult, articleRowsResult, historyResult, stepHistoryResult] = await Promise.all([
        supabase.from('order_steps').select('*').in('order_id', orderIds),
        supabase.from('article_rows').select('*').in('order_id', orderIds),
        supabase.from('status_history').select('*').in('order_id', orderIds),
        supabase.from('step_status_history').select('*').in('order_id', orderIds),
      ]);

      if (stepsResult.error) throw stepsResult.error;
      if (articleRowsResult.error) throw articleRowsResult.error;
      if (historyResult.error) throw historyResult.error;
      if (stepHistoryResult.error) throw stepHistoryResult.error;

      const mappedOrders = ordersData.map(dbOrder => 
        mapDbOrderToOrder(
          dbOrder as DbOrder,
          (stepsResult.data || []).filter(s => s.order_id === dbOrder.id) as DbOrderStep[],
          (articleRowsResult.data || []).filter(r => r.order_id === dbOrder.id) as DbArticleRow[],
          (historyResult.data || []).filter(h => h.order_id === dbOrder.id) as DbStatusHistory[],
          (stepHistoryResult.data || []).filter(h => h.order_id === dbOrder.id) as DbStepStatusHistory[]
        )
      );

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

  const addOrder = useCallback(async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>): Promise<Order> => {
    // Insert order
    const { data: newOrderData, error: orderError } = await supabase
      .from('orders')
      .insert({
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
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderId = newOrderData.id;

    // Insert steps if any
    if (order.steps && order.steps.length > 0) {
      const { error: stepsError } = await supabase.from('order_steps').insert(
        order.steps.map(step => ({
          order_id: orderId,
          template_id: step.templateId,
          name: step.name,
          status: step.status,
          planned_start: step.plannedStart || null,
          planned_end: step.plannedEnd || null,
          actual_start: step.actualStart || null,
          actual_end: step.actualEnd || null,
          price: step.price ?? null,
        }))
      );
      if (stepsError) throw stepsError;
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

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase
        .from('orders')
        .update(dbUpdates)
        .eq('id', id);
      if (error) throw error;
    }

    // Update steps if provided
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

        // Auto-change order status to "started" when a step begins
        if (hasNewInProgress) {
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
          }))
        );
        if (error) throw error;
      }
    }

    await fetchOrders();
  }, [fetchOrders, orders]);

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
