import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { OrdersTable } from '@/components/OrdersTable';
import { OrderFilters } from '@/components/OrderFilters';
import { BulkEditToolbar } from '@/components/BulkEditToolbar';
import { BulkEditConfirmDialog, type BulkEditType } from '@/components/BulkEditConfirmDialog';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/contexts/OrdersContext';
import { toast } from 'sonner';
import type { ProductionStatus, BillingStatus } from '@/types/order';

const Index = () => {
  const { orders, isLoading, bulkUpdateOrders } = useOrders();
  const [filters, setFilters] = useState<{
    productionStatus: ProductionStatus | 'all';
    billingStatus: BillingStatus | 'all';
    hasDeviation: boolean | null;
  }>({
    productionStatus: 'all',
    billingStatus: 'all',
    hasDeviation: null,
  });

  // Bulk edit state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingEditType, setPendingEditType] = useState<BulkEditType | null>(null);
  const [pendingEditValue, setPendingEditValue] = useState<ProductionStatus | BillingStatus | boolean | null>(null);

  const handleProductionStatusChange = (status: ProductionStatus) => {
    setPendingEditType('productionStatus');
    setPendingEditValue(status);
    setConfirmDialogOpen(true);
  };

  const handleBillingStatusChange = (status: BillingStatus) => {
    setPendingEditType('billingStatus');
    setPendingEditValue(status);
    setConfirmDialogOpen(true);
  };

  const handleDeviationChange = (hasDeviation: boolean) => {
    setPendingEditType('deviation');
    setPendingEditValue(hasDeviation);
    setConfirmDialogOpen(true);
  };

  const handleConfirmBulkEdit = async () => {
    if (!pendingEditType || pendingEditValue === null) return;

    const orderIds = Array.from(selectedOrderIds);

    try {
      if (pendingEditType === 'productionStatus') {
        await bulkUpdateOrders(orderIds, { productionStatus: pendingEditValue as ProductionStatus });
      } else if (pendingEditType === 'billingStatus') {
        await bulkUpdateOrders(orderIds, { billingStatus: pendingEditValue as BillingStatus });
      } else if (pendingEditType === 'deviation') {
        await bulkUpdateOrders(orderIds, { hasDeviation: pendingEditValue as boolean });
      }

      toast.success(`${orderIds.length} ${orderIds.length === 1 ? 'order' : 'ordrar'} uppdaterade`);
      setSelectedOrderIds(new Set());
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error('Kunde inte uppdatera ordrar');
    }

    setConfirmDialogOpen(false);
    setPendingEditType(null);
    setPendingEditValue(null);
  };

  const handleClearSelection = () => {
    setSelectedOrderIds(new Set());
  };

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

        {/* Bulk edit toolbar */}
        {selectedOrderIds.size > 0 && (
          <BulkEditToolbar
            selectedCount={selectedOrderIds.size}
            onProductionStatusChange={handleProductionStatusChange}
            onBillingStatusChange={handleBillingStatusChange}
            onDeviationChange={handleDeviationChange}
            onClearSelection={handleClearSelection}
          />
        )}

        {/* Orders table */}
        <OrdersTable
          orders={orders}
          filters={filters}
          selectedOrderIds={selectedOrderIds}
          onSelectionChange={setSelectedOrderIds}
        />
      </div>

      {/* Confirmation dialog */}
      <BulkEditConfirmDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        editType={pendingEditType}
        newValue={pendingEditValue}
        orderCount={selectedOrderIds.size}
        onConfirm={handleConfirmBulkEdit}
      />
    </Layout>
  );
};

export default Index;
