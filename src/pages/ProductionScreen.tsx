import { useEffect, useState } from 'react';
import { useOrders } from '@/contexts/OrdersContext';
import { ProductionOrderCard } from '@/components/ProductionOrderCard';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import eeLogo from '@/assets/ee_logga.png';

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
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <img src={eeLogo} alt="EE Logo" className="h-20 w-auto" />
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Produktionsvy
          </h1>
        </div>
        
        {/* Inline legend */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">Status:</span>
          <span className="inline-block px-2 py-0.5 rounded-sm bg-[hsl(var(--status-arrived))] text-white text-xs font-medium">
            Ankommen
          </span>
          <span className="inline-block px-2 py-0.5 rounded-sm bg-[hsl(var(--status-started))] text-black text-xs font-medium">
            Startad
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
