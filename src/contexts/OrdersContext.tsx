import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Order, ProductionStatus, BillingStatus, OrderStep, StatusChange } from '@/types/order';

const ORDERS_STORAGE_KEY = 'order-management-orders';

interface OrdersContextType {
  orders: Order[];
  isLoading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  updateProductionStatus: (id: string, newStatus: ProductionStatus) => void;
  updateBillingStatus: (id: string, newStatus: BillingStatus) => void;
  updateOrderStep: (orderId: string, stepId: string, updates: Partial<OrderStep>) => void;
  deleteOrder: (id: string) => void;
  getOrderByNumber: (orderNumber: string) => Order | undefined;
  getOrderById: (id: string) => Order | undefined;
  orderNumberExists: (orderNumber: string) => boolean;
}

const OrdersContext = createContext<OrdersContextType | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load orders from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (stored) {
      try {
        setOrders(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse orders from localStorage', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Save orders to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders, isLoading]);

  const addOrder = useCallback((order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'>) => {
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...order,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      statusHistory: [],
    };
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  }, []);

  const updateOrder = useCallback((id: string, updates: Partial<Order>) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== id) return order;
      return {
        ...order,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const updateProductionStatus = useCallback((id: string, newStatus: ProductionStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== id) return order;
      
      const statusChange: StatusChange = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        fromStatus: order.productionStatus,
        toStatus: newStatus,
      };

      return {
        ...order,
        productionStatus: newStatus,
        statusHistory: [...order.statusHistory, statusChange],
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const updateBillingStatus = useCallback((id: string, newStatus: BillingStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== id) return order;
      return {
        ...order,
        billingStatus: newStatus,
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const updateOrderStep = useCallback((orderId: string, stepId: string, updates: Partial<OrderStep>) => {
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;
      return {
        ...order,
        steps: order.steps.map(step => 
          step.id === stepId ? { ...step, ...updates } : step
        ),
        totalPrice: order.steps.reduce((sum, step) => {
          if (step.id === stepId) {
            return sum + (updates.price ?? step.price ?? 0);
          }
          return sum + (step.price ?? 0);
        }, 0),
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const deleteOrder = useCallback((id: string) => {
    setOrders(prev => prev.filter(order => order.id !== id));
  }, []);

  const getOrderByNumber = useCallback((orderNumber: string) => {
    return orders.find(o => o.orderNumber === orderNumber);
  }, [orders]);

  const getOrderById = useCallback((id: string) => {
    return orders.find(o => o.id === id);
  }, [orders]);

  const orderNumberExists = useCallback((orderNumber: string) => {
    return orders.some(o => o.orderNumber === orderNumber);
  }, [orders]);

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
