import { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Upload, Search, X } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Layout } from '@/components/Layout';
import { OrdersTable } from '@/components/OrdersTable';
import { OrderFilters } from '@/components/OrderFilters';
import { BulkEditToolbar } from '@/components/BulkEditToolbar';
import { BulkEditConfirmDialog, type BulkEditType } from '@/components/BulkEditConfirmDialog';
import { InvoiceExportDialog } from '@/components/InvoiceExportDialog';
import { InvoicingTab } from '@/components/InvoicingTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ProductionStatus, BillingStatus, OrderAdminStatus } from '@/types/order';
import { toAdminStatus, calculateOrderBillingStatus } from '@/types/order';
import { getReadyTrucks } from '@/lib/invoiceExport';

const Index = () => {
  useDocumentTitle('Ordrar');
  const { orders, isLoading, bulkUpdateOrders } = useOrders();
  const { isProduction, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'active';
  const searchQuery = searchParams.get('q') || '';
  const archiveSearchQuery = searchParams.get('aq') || '';

  const filters = useMemo(() => ({
    productionStatus: (searchParams.get('status') || 'created') as OrderAdminStatus | 'all',
    billingStatus: (searchParams.get('billing') || 'all') as BillingStatus | 'all',
    hasDeviation: searchParams.get('deviation') === null ? null : searchParams.get('deviation') === 'yes',
  }), [searchParams]);

  const updateParam = useCallback((key: string, value: string | null) => {
    setSearchParams(prev => {
      if (value === null || value === '') prev.delete(key);
      else prev.set(key, value);
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  const setSearchQuery = useCallback((q: string) => updateParam('q', q), [updateParam]);
  const setArchiveSearchQuery = useCallback((q: string) => updateParam('aq', q), [updateParam]);
  const setFilters = useCallback((f: typeof filters) => {
    setSearchParams(prev => {
      if (f.productionStatus === 'created') prev.delete('status'); else prev.set('status', f.productionStatus);
      if (f.billingStatus === 'all') prev.delete('billing'); else prev.set('billing', f.billingStatus);
      if (f.hasDeviation === null) prev.delete('deviation'); else prev.set('deviation', f.hasDeviation ? 'yes' : 'no');
      return prev;
    }, { replace: true });
  }, [setSearchParams]);

  // Separate orders into active and archived
  const activeOrders = useMemo(() => 
    orders.filter(o => calculateOrderBillingStatus(o) !== 'billed'), [orders]
  );

  const archivedOrders = useMemo(() => 
    orders.filter(o => calculateOrderBillingStatus(o) === 'billed'), [orders]
  );

  // Bulk edit state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingEditType, setPendingEditType] = useState<BulkEditType | null>(null);
  const [pendingEditValue, setPendingEditValue] = useState<OrderAdminStatus | boolean | null>(null);
  const [invoiceExportDialogOpen, setInvoiceExportDialogOpen] = useState(false);

  // Get selected orders and check if they can be exported
  const selectedOrders = useMemo(() => 
    orders.filter(o => selectedOrderIds.has(o.id)), 
    [orders, selectedOrderIds]
  );
  const canExportSelectedOrders = useMemo(() => 
    selectedOrders.length > 0 && getReadyTrucks(selectedOrders).length > 0, 
    [selectedOrders]
  );

  const handleProductionStatusChange = (status: ProductionStatus) => {
    setPendingEditType('productionStatus');
    setPendingEditValue(status as OrderAdminStatus);
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

  const handleExportInvoice = () => {
    setInvoiceExportDialogOpen(true);
  };

  // No filters for archived orders - just pass 'all' values
  const noFilters = {
    productionStatus: 'all' as const,
    billingStatus: 'all' as const,
    hasDeviation: null,
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
          {isProduction && (
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
          )}
        </div>

        {/* Tabs for active/archived orders */}
        <Tabs value={activeTab} onValueChange={(v) => updateParam('tab', v === 'active' ? null : v)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">
              Aktuella ordrar ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="invoicing">
              Fakturering
            </TabsTrigger>
            <TabsTrigger value="archive">
              Orderhistorik ({archivedOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Active orders tab */}
          <TabsContent value="active" className="space-y-4">
            {/* Search and Filters */}
            <OrderFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            {/* Bulk edit toolbar - only for production/admin */}
            {isProduction && selectedOrderIds.size > 0 && (
              <BulkEditToolbar
                selectedCount={selectedOrderIds.size}
                canExportInvoice={canExportSelectedOrders && isAdmin}
                onProductionStatusChange={handleProductionStatusChange}
                onExportInvoice={isAdmin ? handleExportInvoice : undefined}
                onDeviationChange={handleDeviationChange}
                onClearSelection={handleClearSelection}
              />
            )}

            {/* Orders table */}
            <OrdersTable
              orders={activeOrders}
              filters={filters}
              searchQuery={searchQuery}
              selectedOrderIds={isProduction ? selectedOrderIds : new Set()}
              onSelectionChange={isProduction ? setSelectedOrderIds : () => {}}
            />
          </TabsContent>

          {/* Invoicing tab */}
          <TabsContent value="invoicing" className="space-y-4">
            <InvoicingTab />
          </TabsContent>

          {/* Archived orders tab */}
          <TabsContent value="archive" className="space-y-4">
            {/* Simple search field only */}
            <div className="relative w-full md:w-[360px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök på ordernr, kund, artikelnr..."
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9"
              />
              {archiveSearchQuery && (
                <button
                  onClick={() => setArchiveSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Archived orders table - no selection, no filters */}
            <OrdersTable
              orders={archivedOrders}
              filters={noFilters}
              searchQuery={archiveSearchQuery}
              selectedOrderIds={new Set()}
              onSelectionChange={() => {}}
            />
          </TabsContent>
        </Tabs>
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

      {/* Invoice export dialog */}
      <InvoiceExportDialog
        open={invoiceExportDialogOpen}
        onOpenChange={setInvoiceExportDialogOpen}
        orders={selectedOrders}
      />
    </Layout>
  );
};

export default Index;
