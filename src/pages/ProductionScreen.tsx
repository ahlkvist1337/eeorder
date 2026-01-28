import { useEffect, useState } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { ProductionOrderCard } from '@/components/ProductionOrderCard';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function ProductionScreen() {
  const { orders, refreshOrders, isLoading } = useOrders();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter active orders (only arrived and started)
  const activeOrders = orders.filter(
    (o) => o.productionStatus === 'arrived' || o.productionStatus === 'started'
  );

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
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
          Produktionsvy
        </h1>
        <div className="text-lg text-muted-foreground">
          Senast uppdaterad:{' '}
          <span className="font-medium text-foreground">
            {format(lastUpdated, 'HH:mm:ss', { locale: sv })}
          </span>
        </div>
      </header>

      {/* Status legend */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Förklaring</h3>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {/* Order status */}
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">Orderstatus:</span>
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-sm bg-[hsl(var(--status-arrived))] text-white text-sm font-medium">
                Ankommen
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-sm bg-[hsl(var(--status-started))] text-black text-sm font-medium">
                Startad
              </span>
            </div>
          </div>
          
          {/* Step status */}
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">Stegstatus:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full ring-2 ring-muted-foreground bg-transparent" />
              <span className="text-sm">Väntande</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full ring-2 ring-[hsl(var(--status-started))] bg-[hsl(var(--status-started))]" />
              <span className="text-sm">Pågående</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full ring-2 ring-[hsl(var(--status-completed))] bg-[hsl(var(--status-completed))]" />
              <span className="text-sm">Klar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders grid */}
      {isLoading && activeOrders.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-2xl text-muted-foreground">Laddar ordrar...</p>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-2xl text-muted-foreground">
            Inga aktiva ordrar (Ankommen eller Startad)
          </p>
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
