import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowUpDown, AlertTriangle } from 'lucide-react';
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
import { ProductionStatusBadge, BillingStatusBadge } from '@/components/StatusBadge';
import type { Order, ProductionStatus, BillingStatus } from '@/types/order';

interface OrdersTableProps {
  orders: Order[];
  filters: {
    productionStatus: ProductionStatus | 'all';
    billingStatus: BillingStatus | 'all';
    hasDeviation: boolean | null;
  };
  selectedOrderIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

type SortField = 'orderNumber' | 'customer' | 'productionStatus' | 'plannedStart' | 'plannedEnd' | 'billingStatus';
type SortDirection = 'asc' | 'desc';

export function OrdersTable({ orders, filters, selectedOrderIds, onSelectionChange }: OrdersTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('orderNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
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
  }, [orders, filters]);

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
    const pendingStep = order.steps.find(s => s.status === 'pending');
    const inProgressStep = order.steps.find(s => s.status === 'in_progress');
    
    if (inProgressStep) return `Pågår: ${inProgressStep.name}`;
    if (pendingStep) return `Nästa: ${pendingStep.name}`;
    if (order.steps.every(s => s.status === 'completed')) return 'Alla steg klara';
    return '-';
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
    <div className="border rounded-sm">
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
  );
}
