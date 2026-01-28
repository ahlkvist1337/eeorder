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
      <header className="flex items-center justify-between mb-8">
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
