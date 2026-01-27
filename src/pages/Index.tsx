import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { OrdersTable } from '@/components/OrdersTable';
import { OrderFilters } from '@/components/OrderFilters';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/useOrders';
import type { ProductionStatus, BillingStatus } from '@/types/order';

const Index = () => {
  const { orders, isLoading } = useOrders();
  const [filters, setFilters] = useState<{
    productionStatus: ProductionStatus | 'all';
    billingStatus: BillingStatus | 'all';
    hasDeviation: boolean | null;
  }>({
    productionStatus: 'all',
    billingStatus: 'all',
    hasDeviation: null,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Laddar ordrar...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orderöversikt</h1>
            <p className="text-muted-foreground">
              {orders.length} {orders.length === 1 ? 'order' : 'ordrar'} totalt
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/create?mode=xml">
                <Upload className="h-4 w-4 mr-2" />
                Importera XML
              </Link>
            </Button>
            <Button asChild>
              <Link to="/create">
                <Plus className="h-4 w-4 mr-2" />
                Ny order
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <OrderFilters filters={filters} onFiltersChange={setFilters} />

        {/* Orders table */}
        <OrdersTable orders={orders} filters={filters} />
      </div>
    </Layout>
  );
};

export default Index;
