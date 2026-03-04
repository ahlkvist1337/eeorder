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

  // Calculate total from ready trucks/units proportionally (simplified preview)
  const isV2 = orders.some(o => o.dataModelVersion === 2);
  const totalUnitsCount = orders.reduce((sum, order) => {
    if (order.dataModelVersion === 2 && order.units) return sum + order.units.length;
    return sum + (order.objects || []).flatMap(obj => obj.trucks || []).length;
  }, 0);
  const totalAmount = readyTrucks.length > 0
    ? orders.reduce((sum, order) => {
        const orderTrucks = trucksByOrder[order.id] || [];
        if (orderTrucks.length === 0) return sum;
        let allCount: number;
        if (order.dataModelVersion === 2 && order.units) {
          allCount = order.units.length;
        } else {
          allCount = (order.objects || []).flatMap(obj => obj.trucks || []).length;
        }
        const ratio = allCount > 0 ? orderTrucks.length / allCount : 0;
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

        // Mark trucks/units as billed
        const allTruckIds = exportData.orders.flatMap(o => o.truckIds);
        if (allTruckIds.length > 0) {
          if (isV2) {
            // V2: mark unit_objects and order_units as billed
            // Get all unit objects for the ready units
            for (const order of orders) {
              if (order.dataModelVersion !== 2 || !order.units) continue;
              const readyUnitIds = (trucksByOrder[order.id] || []).map(t => t.id);
              const readyUnits = order.units.filter(u => readyUnitIds.includes(u.id));
              const objectIds = readyUnits.flatMap(u => u.objects.map(o => o.id));
              if (objectIds.length > 0) {
                await supabase.from('unit_objects')
                  .update({ billing_status: 'billed' } as any)
                  .in('id', objectIds);
              }
              if (readyUnitIds.length > 0) {
                await supabase.from('order_units')
                  .update({ billing_status: 'billed' } as any)
                  .in('id', readyUnitIds);
              }
              const unitNames = readyUnits.map((u, i) => u.unitNumber || `Enhet ${i + 1}`);
              console.log(`Export: ${readyUnitIds.length} av ${order.units.length} enheter, belopp: ${Math.round(exportData.grandTotal)} kr, enhet-ID/namn: ${unitNames.join(', ')}`);
            }
          } else {
            await supabase.from('object_trucks')
              .update({ billing_status: 'billed' } as any)
              .in('id', allTruckIds);
          }
        }
      }

      const typeLabel = exportData.isPartial ? 'Delfaktura' : 'Fakturaunderlag';
      const formats = [exportPdf && 'PDF', exportExcel && 'Excel'].filter(Boolean).join(' och ');
      const entityLabel = isV2 ? `${readyTrucks.length} av ${totalUnitsCount} enheter` : `${readyTrucks.length} arbetskort`;
      toast.success(`${typeLabel} exporterat (${entityLabel}) som ${formats}`);
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
          <DialogTitle>
            {orders.length > 1 && readyTrucks.length === totalUnitsCount
              ? `Fakturaunderlag – ${orders.length} ordrar`
              : readyTrucks.length < totalUnitsCount
                ? 'Exportera delfakturaunderlag'
                : 'Exportera fakturaunderlag'}
          </DialogTitle>
          <DialogDescription>
            {orders.length > 1 && readyTrucks.length === totalUnitsCount
              ? `Samlat underlag för ${orders.length} klara ordrar.`
              : `Skapa fakturaunderlag för ${isV2 ? 'enheter' : 'arbetskort'} markerade som "Klar för fakturering".`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <p className="font-medium">
              {orders.length > 1 && readyTrucks.length === totalUnitsCount
                ? `${orders.length} ordrar – samtliga enheter klara för fakturering`
                : isV2
                  ? `Delfaktura – ${readyTrucks.length} av ${totalUnitsCount} enheter klara för fakturering`
                  : `${readyTrucks.length} arbetskort klara för fakturering`}
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
