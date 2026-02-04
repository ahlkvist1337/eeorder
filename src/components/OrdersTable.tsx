import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowUpDown, AlertTriangle, MessageSquare, Truck } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ProductionStatusBadge, BillingStatusBadge } from '@/components/StatusBadge';
import type { Order, ProductionStatus, BillingStatus, TruckStatus } from '@/types/order';
import { truckStatusLabels } from '@/types/order';

interface OrdersTableProps {
  orders: Order[];
  filters: {
    productionStatus: ProductionStatus | 'all';
    billingStatus: BillingStatus | 'all';
    hasDeviation: boolean | null;
  };
  searchQuery: string;
  selectedOrderIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

type SortField = 'orderNumber' | 'customer' | 'productionStatus' | 'plannedStart' | 'plannedEnd' | 'billingStatus';
type SortDirection = 'asc' | 'desc';

export function OrdersTable({ orders, filters, searchQuery, selectedOrderIds, onSelectionChange }: OrdersTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('orderNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter - include truck numbers and article part numbers
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        
        // Get all truck numbers from the order
        const allTruckNumbers = (order.objects || [])
          .flatMap(obj => (obj.trucks || []).map(t => t.truckNumber.toLowerCase()));
        
        // Get all article part numbers from the order
        const allPartNumbers = (order.articleRows || [])
          .map(row => row.partNumber.toLowerCase());
        
        const matchesSearch = 
          order.orderNumber.toLowerCase().includes(query) ||
          order.customer.toLowerCase().includes(query) ||
          (order.comment && order.comment.toLowerCase().includes(query)) ||
          (order.customerReference && order.customerReference.toLowerCase().includes(query)) ||
          allTruckNumbers.some(tn => tn.includes(query)) ||
          allPartNumbers.some(pn => pn.includes(query));
        if (!matchesSearch) return false;
      }
      
      // Status filters
      if (filters.productionStatus !== 'all' && order.productionStatus !== filters.productionStatus) {
        return false;
      }
      if (filters.billingStatus !== 'all' && order.billingStatus !== filters.billingStatus) {
        return false;
      }
      if (filters.hasDeviation !== null && order.hasDeviation !== filters.hasDeviation) {
        return false;
      }
      return true;
    });
  }, [orders, filters, searchQuery]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let aValue: string | number = '';
      let bValue: string | number = '';

      switch (sortField) {
        case 'orderNumber':
          aValue = a.orderNumber;
          bValue = b.orderNumber;
          break;
        case 'customer':
          aValue = a.customer.toLowerCase();
          bValue = b.customer.toLowerCase();
          break;
        case 'productionStatus':
          aValue = a.productionStatus;
          bValue = b.productionStatus;
          break;
        case 'plannedStart':
          aValue = a.plannedStart || '';
          bValue = b.plannedStart || '';
          break;
        case 'plannedEnd':
          aValue = a.plannedEnd || '';
          bValue = b.plannedEnd || '';
          break;
        case 'billingStatus':
          aValue = a.billingStatus;
          bValue = b.billingStatus;
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getNextStep = (order: Order): string => {
    // Collect all step statuses from all work cards (trucks) that are arrived or started
    const allStepStatuses = (order.objects || [])
      .flatMap(obj => (obj.trucks || [])
        .filter(t => t.status === 'arrived' || t.status === 'started')
        .flatMap(t => t.stepStatuses.map(ss => ({
          ...ss,
          stepName: order.steps.find(s => s.id === ss.stepId)?.name || 'Okänt steg'
        })))
      );
    
    // Find in-progress step
    const inProgress = allStepStatuses.find(ss => ss.status === 'in_progress');
    if (inProgress) return `Pågår: ${inProgress.stepName}`;
    
    // Find next pending step
    const pending = allStepStatuses.find(ss => ss.status === 'pending');
    if (pending) return `Nästa: ${pending.stepName}`;
    
    // Check if all work cards are completed
    const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
    if (allTrucks.length > 0 && allTrucks.every(t => t.status === 'completed')) {
      return 'Alla klara';
    }
    
    // Fallback: If active work cards exist but no stepStatuses, show object's first step
    const activeTrucks = (order.objects || [])
      .flatMap(obj => (obj.trucks || [])
        .filter(t => t.status === 'arrived' || t.status === 'started')
        .map(t => ({ truck: t, objectId: obj.id }))
      );
    
    if (activeTrucks.length > 0) {
      const firstActive = activeTrucks[0];
      const objectStep = order.steps.find(s => s.objectId === firstActive.objectId);
      if (objectStep) {
        return `Nästa: ${objectStep.name}`;
      }
    }
    
    return '-';
  };

  // Get truck summary for an order (counts by status)
  const getTruckSummary = (order: Order): { total: number; active: number; completed: number } => {
    const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
    const active = allTrucks.filter(t => t.status === 'arrived' || t.status === 'started').length;
    const completed = allTrucks.filter(t => t.status === 'completed').length;
    return { total: allTrucks.length, active, completed };
  };

  // Get all truck numbers for an order
  const getTruckNumbers = (order: Order): string[] => {
    return (order.objects || [])
      .flatMap(obj => (obj.trucks || []).map(t => `#${t.truckNumber}`));
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2 font-semibold hover:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const allVisibleSelected = sortedOrders.length > 0 && sortedOrders.every(order => selectedOrderIds.has(order.id));
  const someSelected = sortedOrders.some(order => selectedOrderIds.has(order.id));

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect all visible
      const newSelection = new Set(selectedOrderIds);
      sortedOrders.forEach(order => newSelection.delete(order.id));
      onSelectionChange(newSelection);
    } else {
      // Select all visible
      const newSelection = new Set(selectedOrderIds);
      sortedOrders.forEach(order => newSelection.add(order.id));
      onSelectionChange(newSelection);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    const newSelection = new Set(selectedOrderIds);
    if (checked) {
      newSelection.add(orderId);
    } else {
      newSelection.delete(orderId);
    }
    onSelectionChange(newSelection);
  };

  if (sortedOrders.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {orders.length === 0 
          ? 'Inga ordrar finns ännu. Skapa en ny order för att komma igång.'
          : 'Inga ordrar matchar dina filter.'}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement).dataset.state = someSelected && !allVisibleSelected ? 'indeterminate' : allVisibleSelected ? 'checked' : 'unchecked';
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="Markera alla"
                />
              </TableHead>
              <TableHead className="w-[140px]">
                <SortButton field="orderNumber">Ordernr</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="customer">Kund</SortButton>
              </TableHead>
              <TableHead className="w-[120px]">
                <SortButton field="productionStatus">Status</SortButton>
              </TableHead>
              <TableHead className="w-[100px]">
                <SortButton field="plannedStart">Start</SortButton>
              </TableHead>
              <TableHead className="w-[100px]">
                <SortButton field="plannedEnd">Klart</SortButton>
              </TableHead>
              <TableHead className="w-[160px]">Nästa steg</TableHead>
              <TableHead className="w-[140px]">Arbetskort</TableHead>
              <TableHead className="w-[200px]">Kommentar</TableHead>
              <TableHead className="w-[150px]">
                <SortButton field="billingStatus">Fakturering</SortButton>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOrders.map(order => {
              const isSelected = selectedOrderIds.has(order.id);
              return (
                <TableRow
                  key={order.id}
                  className={`cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-primary/10' : ''}`}
                  onClick={() => navigate(`/order/${order.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      aria-label={`Markera order ${order.orderNumber}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono font-semibold">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>{order.customer || '-'}</TableCell>
                  <TableCell>
                    <ProductionStatusBadge status={order.productionStatus} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.plannedStart 
                      ? format(new Date(order.plannedStart), 'd MMM', { locale: sv })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.plannedEnd 
                      ? format(new Date(order.plannedEnd), 'd MMM', { locale: sv })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getNextStep(order)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {(() => {
                      const summary = getTruckSummary(order);
                      if (summary.total === 0) return <span className="text-muted-foreground">-</span>;
                      return (
                        <span className="flex items-center gap-1 text-xs">
                          <Truck className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{summary.total}</span>
                          {summary.active > 0 && (
                            <span className="text-[hsl(var(--status-started))]">({summary.active} aktiv{summary.active !== 1 ? 'a' : ''})</span>
                          )}
                          {summary.completed > 0 && summary.active === 0 && (
                            <span className="text-[hsl(var(--status-completed))]">({summary.completed} klar{summary.completed !== 1 ? 'a' : ''})</span>
                          )}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]" title={order.comment || ''}>
                    {order.comment ? (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{order.comment}</span>
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <BillingStatusBadge status={order.billingStatus} />
                  </TableCell>
                  <TableCell>
                    {order.hasDeviation && (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {sortedOrders.map(order => {
          const isSelected = selectedOrderIds.has(order.id);
          return (
            <div
              key={order.id}
              className={`border rounded-lg p-4 cursor-pointer active:bg-accent/50 ${isSelected ? 'bg-primary/10 border-primary/30' : 'bg-card'}`}
              onClick={() => navigate(`/order/${order.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      aria-label={`Markera order ${order.orderNumber}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-base">
                        {order.orderNumber}
                      </span>
                      {order.hasDeviation && (
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {order.customer || 'Ingen kund'}
                    </p>
                  </div>
                </div>
                <ProductionStatusBadge status={order.productionStatus} />
              </div>
              
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {order.plannedEnd && (
                  <span>
                    Klart: {format(new Date(order.plannedEnd), 'd MMM', { locale: sv })}
                  </span>
                )}
                <span className="text-muted-foreground/50">•</span>
                <BillingStatusBadge status={order.billingStatus} />
              </div>
              
              {order.comment && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 flex items-start gap-1">
                  <MessageSquare className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  {order.comment}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
