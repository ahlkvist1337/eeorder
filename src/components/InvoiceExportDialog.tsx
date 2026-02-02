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
import type { Order } from '@/types/order';
import { prepareInvoiceExportData, formatCurrency } from '@/lib/invoiceExport';
import { exportInvoiceToPdf } from '@/lib/invoiceExportPdf';
import { exportInvoiceToExcel } from '@/lib/invoiceExportExcel';
import { toast } from 'sonner';

interface InvoiceExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
}

export function InvoiceExportDialog({ open, onOpenChange, orders }: InvoiceExportDialogProps) {
  const [exportPdf, setExportPdf] = useState(true);
  const [exportExcel, setExportExcel] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Calculate total from article rows
  const totalAmount = orders.reduce((sum, order) => {
    const orderTotal = order.articleRows?.reduce(
      (rowSum, row) => rowSum + (row.quantity * row.price), 
      0
    ) || 0;
    return sum + orderTotal;
  }, 0);

  const handleExport = async () => {
    if (!exportPdf && !exportExcel) {
      toast.error('Välj minst ett exportformat');
      return;
    }

    setIsExporting(true);
    
    try {
      const exportData = prepareInvoiceExportData(orders);
      
      if (exportPdf) {
        exportInvoiceToPdf(exportData);
      }
      
      if (exportExcel) {
        exportInvoiceToExcel(exportData);
      }

      const formats = [exportPdf && 'PDF', exportExcel && 'Excel'].filter(Boolean).join(' och ');
      toast.success(`Fakturaunderlag exporterat (${orders.length} ${orders.length === 1 ? 'order' : 'ordrar'}) som ${formats}`);
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
            Skapa fakturaunderlag för granskning och ekonomiimport.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-1">
            <p className="font-medium">
              {orders.length} {orders.length === 1 ? 'order vald' : 'ordrar valda'}
            </p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalAmount)}
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
            disabled={isExporting || (!exportPdf && !exportExcel)}
          >
            {isExporting ? 'Exporterar...' : 'Exportera'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
