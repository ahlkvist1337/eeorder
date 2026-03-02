import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ExternalLink, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { InvoiceExportDialog } from '@/components/InvoiceExportDialog';
import { useOrders } from '@/contexts/OrdersContext';
import { formatCurrency } from '@/lib/invoiceExport';
import type { Order, ObjectTruck, ArticleRow } from '@/types/order';
import { getWorkUnitDisplayName } from '@/types/order';
import { supabase } from '@/integrations/supabase/client';
import type { PreviouslyBilledItem } from '@/lib/invoiceExport';

interface InvoicableOrder {
  order: Order;
  readyTrucks: ObjectTruck[];
  allTrucks: ObjectTruck[];
  articleRows: ArticleRow[];
}

// Quantity overrides: keyed by `${orderId}:${articleRowId}`
type QuantityOverrides = Record<string, number>;

export function InvoicingTab() {
  const { orders } = useOrders();
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [quantityOverrides, setQuantityOverrides] = useState<QuantityOverrides>({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [previouslyBilledByOrder, setPreviouslyBilledByOrder] = useState<Record<string, PreviouslyBilledItem[]>>({});
  const [billedLoaded, setBilledLoaded] = useState(false);

  // Orders with at least one ready_for_billing truck
  const invoicableOrders: InvoicableOrder[] = useMemo(() => {
    return orders
      .map(order => {
        const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
        const readyTrucks = allTrucks.filter(t => t.billingStatus === 'ready_for_billing');
        return {
          order,
          readyTrucks,
          allTrucks,
          articleRows: order.articleRows || [],
        };
      })
      .filter(io => io.readyTrucks.length > 0);
  }, [orders]);

  // Load previously billed data
  const loadPreviouslyBilled = useCallback(async () => {
    if (billedLoaded) return;
    const orderIds = invoicableOrders.map(io => io.order.id);
    if (orderIds.length === 0) return;

    const { data } = await supabase
      .from('invoice_export_items')
      .select('order_id, article_row_id, billed_quantity, billed_amount')
      .in('order_id', orderIds);

    const grouped: Record<string, PreviouslyBilledItem[]> = {};
    for (const item of data || []) {
      if (!item.article_row_id) continue;
      if (!grouped[item.order_id]) grouped[item.order_id] = [];
      const existing = grouped[item.order_id].find(p => p.article_row_id === item.article_row_id);
      if (existing) {
        existing.total_billed_quantity += Number(item.billed_quantity);
        existing.total_billed_amount += Number(item.billed_amount);
      } else {
        grouped[item.order_id].push({
          article_row_id: item.article_row_id,
          total_billed_quantity: Number(item.billed_quantity),
          total_billed_amount: Number(item.billed_amount),
        });
      }
    }
    setPreviouslyBilledByOrder(grouped);
    setBilledLoaded(true);
  }, [invoicableOrders, billedLoaded]);

  // Load on first render when there are invoicable orders
  useMemo(() => {
    if (invoicableOrders.length > 0 && !billedLoaded) {
      loadPreviouslyBilled();
    }
  }, [invoicableOrders.length, billedLoaded, loadPreviouslyBilled]);

  // Calculate suggested quantity for an article row
  const getSuggestedQuantity = useCallback((
    row: ArticleRow,
    order: Order,
    readyTrucks: ObjectTruck[],
    allTrucks: ObjectTruck[]
  ): number => {
    const prev = (previouslyBilledByOrder[order.id] || [])
      .find(p => p.article_row_id === row.id);
    const prevQty = prev?.total_billed_quantity || 0;
    const remaining = row.quantity - prevQty;

    if (!row.objectId) return Math.max(0, remaining);

    const object = order.objects?.find(o => o.id === row.objectId);
    if (!object || !object.trucks || object.trucks.length === 0) return Math.max(0, remaining);

    const objectTruckIds = new Set(object.trucks.map(t => t.id));
    const readyCount = readyTrucks.filter(t => objectTruckIds.has(t.id)).length;
    const totalCount = object.trucks.length;

    const proportional = (readyCount / totalCount) * row.quantity;
    return Math.max(0, Math.min(Math.round(proportional * 100) / 100, remaining));
  }, [previouslyBilledByOrder]);

  const getOverrideKey = (orderId: string, rowId: string) => `${orderId}:${rowId}`;

  const getQuantityToInvoice = (orderId: string, row: ArticleRow, order: Order, readyTrucks: ObjectTruck[], allTrucks: ObjectTruck[]) => {
    const key = getOverrideKey(orderId, row.id);
    if (quantityOverrides[key] !== undefined) return quantityOverrides[key];
    return getSuggestedQuantity(row, order, readyTrucks, allTrucks);
  };

  const handleQuantityChange = (orderId: string, rowId: string, value: string) => {
    const key = getOverrideKey(orderId, rowId);
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) return;
    setQuantityOverrides(prev => ({ ...prev, [key]: num }));
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedOrderIds.size === invoicableOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(invoicableOrders.map(io => io.order.id)));
    }
  };

  // Calculate total for selected orders
  const selectedTotal = useMemo(() => {
    return invoicableOrders
      .filter(io => selectedOrderIds.has(io.order.id))
      .reduce((sum, io) => {
        const orderSum = io.articleRows.reduce((rowSum, row) => {
          const qty = getQuantityToInvoice(io.order.id, row, io.order, io.readyTrucks, io.allTrucks);
          return rowSum + qty * row.price;
        }, 0);
        return sum + orderSum;
      }, 0);
  }, [selectedOrderIds, invoicableOrders, quantityOverrides, previouslyBilledByOrder]);

  // Build override data for export dialog
  const selectedOrdersForExport = useMemo(() => 
    orders.filter(o => selectedOrderIds.has(o.id)),
    [orders, selectedOrderIds]
  );

  const trucksByOrderForExport = useMemo(() => {
    const result: Record<string, ObjectTruck[]> = {};
    for (const io of invoicableOrders) {
      if (selectedOrderIds.has(io.order.id)) {
        result[io.order.id] = io.readyTrucks;
      }
    }
    return result;
  }, [invoicableOrders, selectedOrderIds]);

  // Build quantity overrides map for export: { articleRowId: quantity }
  const articleRowOverridesForExport = useMemo(() => {
    const result: Record<string, number> = {};
    for (const io of invoicableOrders) {
      if (!selectedOrderIds.has(io.order.id)) continue;
      for (const row of io.articleRows) {
        const key = getOverrideKey(io.order.id, row.id);
        if (quantityOverrides[key] !== undefined) {
          result[row.id] = quantityOverrides[key];
        }
      }
    }
    return result;
  }, [invoicableOrders, selectedOrderIds, quantityOverrides]);

  if (invoicableOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">Inga ordrar redo för fakturering</h3>
        <p className="text-sm text-muted-foreground">
          Arbetskort som markeras som "Levererat" blir automatiskt klara för fakturering.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {selectedOrderIds.size === invoicableOrders.length ? (
              <><CheckSquare className="h-4 w-4 mr-1" /> Avmarkera alla</>
            ) : (
              <><Square className="h-4 w-4 mr-1" /> Markera alla</>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {invoicableOrders.length} {invoicableOrders.length === 1 ? 'order' : 'ordrar'} redo
          </span>
        </div>
        {selectedOrderIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              Totalt: {formatCurrency(Math.round(selectedTotal))}
            </span>
            <Button onClick={() => setExportDialogOpen(true)}>
              <FileText className="h-4 w-4 mr-1" />
              Exportera faktura ({selectedOrderIds.size})
            </Button>
          </div>
        )}
      </div>

      {/* Order cards */}
      {invoicableOrders.map(({ order, readyTrucks, allTrucks, articleRows }) => {
        const isSelected = selectedOrderIds.has(order.id);
        const orderSubtotal = articleRows.reduce((sum, row) => {
          const qty = getQuantityToInvoice(order.id, row, order, readyTrucks, allTrucks);
          return sum + qty * row.price;
        }, 0);

        return (
          <Card key={order.id} className={isSelected ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOrder(order.id)}
                  />
                  <div>
                    <CardTitle className="text-base">
                      {order.orderNumber} | {order.customer}
                    </CardTitle>
                    {order.customerReference && (
                      <p className="text-sm text-muted-foreground">Ref: {order.customerReference}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatCurrency(Math.round(orderSubtotal))}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link to={`/order/${order.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Article rows table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Art.nr</TableHead>
                    <TableHead>Beskrivning</TableHead>
                    <TableHead className="w-20 text-right">Antal</TableHead>
                    <TableHead className="w-20 text-right">Pris</TableHead>
                    <TableHead className="w-28 text-right">Att fakturera</TableHead>
                    <TableHead className="w-24 text-right">Summa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articleRows.map(row => {
                    const qty = getQuantityToInvoice(order.id, row, order, readyTrucks, allTrucks);
                    const prev = (previouslyBilledByOrder[order.id] || [])
                      .find(p => p.article_row_id === row.id);
                    const prevQty = prev?.total_billed_quantity || 0;

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-sm">{row.partNumber}</TableCell>
                        <TableCell className="text-sm">{row.text}</TableCell>
                        <TableCell className="text-right text-sm">
                          {row.quantity}
                          {prevQty > 0 && (
                            <span className="text-xs text-muted-foreground block">
                              ({prevQty} fakturerat)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm">{row.price}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            max={row.quantity - prevQty}
                            step="0.01"
                            value={quantityOverrides[getOverrideKey(order.id, row.id)] ?? qty}
                            onChange={e => handleQuantityChange(order.id, row.id, e.target.value)}
                            className="h-8 w-24 text-right text-sm ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(Math.round(qty * row.price))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Delivered trucks info */}
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Levererade kort: {readyTrucks.map(t => getWorkUnitDisplayName(t.truckNumber, '', t.id)).join(', ')}
                  {' '}({readyTrucks.length} av {allTrucks.length})
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Export dialog - pass overrides */}
      <InvoiceExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        orders={selectedOrdersForExport}
        trucksByOrderOverride={trucksByOrderForExport}
        previouslyBilledOverride={previouslyBilledByOrder}
        quantityOverrides={articleRowOverridesForExport}
      />
    </div>
  );
}
