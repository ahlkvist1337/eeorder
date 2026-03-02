import { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Order, ObjectTruck } from '@/types/order';
import { prepareInvoiceExportData, formatCurrency, getReadyTrucks } from '@/lib/invoiceExport';
import type { PreviouslyBilledItem } from '@/lib/invoiceExport';
import { exportInvoiceToPdf } from '@/lib/invoiceExportPdf';
import { exportInvoiceToExcel } from '@/lib/invoiceExportExcel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvoiceExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  trucksByOrderOverride?: Record<string, ObjectTruck[]>;
  previouslyBilledOverride?: Record<string, PreviouslyBilledItem[]>;
  quantityOverrides?: Record<string, number>; // articleRowId -> quantity
}

export function InvoiceExportDialog({ open, onOpenChange, orders, trucksByOrderOverride, previouslyBilledOverride, quantityOverrides }: InvoiceExportDialogProps) {
  const [exportPdf, setExportPdf] = useState(true);
  const [exportExcel, setExportExcel] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Get ready trucks grouped by order (use override if provided)
  const readyTrucks = trucksByOrderOverride 
    ? Object.values(trucksByOrderOverride).flat()
    : getReadyTrucks(orders);
  const trucksByOrder: Record<string, ObjectTruck[]> = trucksByOrderOverride || {};
  if (!trucksByOrderOverride) {
    for (const order of orders) {
      const orderTrucks = (order.objects || []).flatMap(obj =>
        (obj.trucks || []).filter(t => t.billingStatus === 'ready_for_billing')
      );
      if (orderTrucks.length > 0) {
        trucksByOrder[order.id] = orderTrucks;
      }
    }
  }

  // Calculate total from ready trucks proportionally (simplified preview)
  const totalAmount = readyTrucks.length > 0
    ? orders.reduce((sum, order) => {
        const orderTrucks = trucksByOrder[order.id] || [];
        if (orderTrucks.length === 0) return sum;
        const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
        const ratio = allTrucks.length > 0 ? orderTrucks.length / allTrucks.length : 0;
        const orderTotal = (order.articleRows || []).reduce(
          (rowSum, row) => rowSum + (row.quantity * row.price), 0
        );
        return sum + (orderTotal * ratio);
      }, 0)
    : 0;

  const handleExport = async () => {
    if (!exportPdf && !exportExcel) {
      toast.error('Välj minst ett exportformat');
      return;
    }

    setIsExporting(true);
    
    try {
      // Use override if provided, otherwise fetch from DB
      let previouslyBilledByOrder: Record<string, PreviouslyBilledItem[]> = {};
      if (previouslyBilledOverride) {
        previouslyBilledByOrder = previouslyBilledOverride;
      } else {
        // Fetch previously billed items for all orders
        const orderIds = orders.map(o => o.id);
        const { data: billedItems } = await supabase
          .from('invoice_export_items')
          .select('order_id, article_row_id, billed_quantity, billed_amount')
          .in('order_id', orderIds);

        for (const item of billedItems || []) {
          if (!item.article_row_id) continue;
          if (!previouslyBilledByOrder[item.order_id]) {
            previouslyBilledByOrder[item.order_id] = [];
          }
          const existing = previouslyBilledByOrder[item.order_id].find(
            p => p.article_row_id === item.article_row_id
          );
          if (existing) {
            existing.total_billed_quantity += Number(item.billed_quantity);
            existing.total_billed_amount += Number(item.billed_amount);
          } else {
            previouslyBilledByOrder[item.order_id].push({
              article_row_id: item.article_row_id,
              total_billed_quantity: Number(item.billed_quantity),
              total_billed_amount: Number(item.billed_amount),
            });
          }
        }
      }

      const exportData = prepareInvoiceExportData(orders, trucksByOrder, previouslyBilledByOrder, quantityOverrides);
      
      if (exportPdf) {
        exportInvoiceToPdf(exportData);
      }
      
      if (exportExcel) {
        exportInvoiceToExcel(exportData);
      }

      // Save export record and mark trucks as billed
      const { data: exportRecord } = await supabase
        .from('invoice_exports')
        .insert({
          export_id: exportData.exportId,
          exported_by: (await supabase.auth.getUser()).data.user?.id || '',
          total_amount: exportData.grandTotal,
        } as any)
        .select('id')
        .single();

      if (exportRecord) {
        // Save export items for tracking
        const exportItems = exportData.orders.flatMap(order =>
          order.articleRows.map(row => ({
            invoice_export_id: exportRecord.id,
            order_id: order.orderId,
            truck_id: order.truckIds[0] || '', // Primary truck
            article_row_id: row.articleRowId || null,
            billed_quantity: row.quantity,
            billed_amount: row.total,
          }))
        );

        if (exportItems.length > 0) {
          await supabase.from('invoice_export_items').insert(exportItems as any);
        }

        // Mark trucks as billed
        const allTruckIds = exportData.orders.flatMap(o => o.truckIds);
        if (allTruckIds.length > 0) {
          await supabase.from('object_trucks')
            .update({ billing_status: 'billed' } as any)
            .in('id', allTruckIds);
        }
      }

      const typeLabel = exportData.isPartial ? 'Delfaktura' : 'Fakturaunderlag';
      const formats = [exportPdf && 'PDF', exportExcel && 'Excel'].filter(Boolean).join(' och ');
      toast.success(`${typeLabel} exporterat (${readyTrucks.length} arbetskort) som ${formats}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Kunde inte exportera fakturaunderlag');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportera fakturaunderlag</DialogTitle>
          <DialogDescription>
            Skapa fakturaunderlag för arbetskort markerade som "Klar för fakturering".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <p className="font-medium">
              {readyTrucks.length} arbetskort klara för fakturering
            </p>
            <p className="text-2xl font-bold">
              ~{formatCurrency(Math.round(totalAmount))}
            </p>
            <p className="text-xs text-muted-foreground">
              Belopp beräknas proportionellt baserat på antal arbetskort. Eventuell avräkning sker automatiskt.
            </p>
          </div>

          {/* Format selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Format:</Label>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="export-pdf"
                checked={exportPdf}
                onCheckedChange={(checked) => setExportPdf(!!checked)}
              />
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="export-pdf" className="font-normal cursor-pointer">
                  PDF <span className="text-muted-foreground">(för granskning och utskick)</span>
                </Label>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="export-excel"
                checked={exportExcel}
                onCheckedChange={(checked) => setExportExcel(!!checked)}
              />
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="export-excel" className="font-normal cursor-pointer">
                  Excel <span className="text-muted-foreground">(för ekonomi/import)</span>
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || (!exportPdf && !exportExcel) || readyTrucks.length === 0}
          >
            {isExporting ? 'Exporterar...' : 'Exportera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
