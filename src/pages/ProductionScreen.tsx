import { useEffect, useState } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ProductionOrderCard } from '@/components/ProductionOrderCard';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Pause, Box, Truck } from 'lucide-react';
import eeLogo from '@/assets/ee_logga.png';
import type { Order, TruckStatus } from '@/types/order';

// Helper to check if an order has any active trucks (based on truck status, not order status)
function hasActiveTrucks(order: Order): boolean {
  const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
  return allTrucks.some(truck => 
    truck.status === 'arrived' || 
    truck.status === 'started'
  );
}

// Get all paused trucks across all orders
function getPausedTrucks(orders: Order[]): { order: Order; truckNumber: string }[] {
  return orders.flatMap(order =>
    (order.objects || []).flatMap(obj =>
      (obj.trucks || [])
        .filter(t => t.status === 'paused')
        .map(t => ({ order, truckNumber: t.truckNumber }))
    )
  );
}

export default function ProductionScreen() {
  useDocumentTitle('Produktion');
  const { orders, refreshOrders, isLoading } = useOrders();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter orders that have at least one active truck (arrived or started)
  const activeOrders = orders.filter(hasActiveTrucks);

  // Get all paused trucks across all orders
  const pausedTrucks = getPausedTrucks(orders);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const refresh = async () => {
      await refreshOrders();
      setLastUpdated(new Date());
    };

    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <img src={eeLogo} alt="EE Logo" className="h-20 w-auto" />
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Produktionsvy
          </h1>
        </div>
        
        {/* Inline legend - now truck-focused */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">Truckstatus:</span>
          <span className="inline-block px-2 py-0.5 rounded-sm bg-[hsl(var(--status-arrived))] text-white text-xs font-medium">
            Ankommen
          </span>
          <span className="inline-block px-2 py-0.5 rounded-sm bg-[hsl(var(--status-started))] text-black text-xs font-medium">
            Startad
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[hsl(var(--status-paused))] text-white text-xs font-medium">
            <Pause className="h-3 w-3" />
            Pausad
          </span>
          <span className="text-muted-foreground ml-2">Steg:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full ring-1 ring-muted-foreground bg-transparent" />
            <span className="text-xs">Väntande</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full ring-1 ring-[hsl(var(--status-started))] bg-[hsl(var(--status-started))]" />
            <span className="text-xs">Pågående</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full ring-1 ring-[hsl(var(--status-completed))] bg-[hsl(var(--status-completed))]" />
            <span className="text-xs">Klar</span>
          </div>
        </div>

        <div className="text-lg text-muted-foreground">
          Uppdaterad:{' '}
          <span className="font-medium text-foreground">
            {format(lastUpdated, 'HH:mm:ss', { locale: sv })}
          </span>
        </div>
      </header>

      {/* Paused trucks section - across all orders */}
      {pausedTrucks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Pause className="h-4 w-4" />
            Pausade truckar
          </h2>
          <div className="flex flex-wrap gap-3">
            {pausedTrucks.map(({ order, truckNumber }, idx) => (
              <div
                key={`${order.id}-${truckNumber}-${idx}`}
                className="flex items-center gap-3 px-4 py-2 rounded-md bg-[hsl(var(--status-paused))] text-white"
              >
                <Pause className="h-4 w-4" />
                <span className="font-mono font-bold">#{truckNumber}</span>
                <span className="text-sm opacity-90">{order.orderNumber}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Orders grid - based on active trucks */}
      {isLoading && activeOrders.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-2xl text-muted-foreground">Laddar ordrar...</p>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-2xl text-muted-foreground">
              Inga aktiva truckar
            </p>
            <p className="text-muted-foreground mt-2">
              Truckar med status "Ankommen" eller "Startad" visas här
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeOrders.map((order) => (
            <ProductionOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
