import { X, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { orderAdminStatusLabels, billingStatusLabels } from '@/types/order';
import type { ProductionStatus, BillingStatus, OrderAdminStatus } from '@/types/order';

interface BulkEditToolbarProps {
  selectedCount: number;
  canExportInvoice: boolean;
  onProductionStatusChange: (status: ProductionStatus) => void;
  onBillingStatusChange: (status: BillingStatus) => void;
  onDeviationChange: (hasDeviation: boolean) => void;
  onExportInvoice: () => void;
  onClearSelection: () => void;
}

export function BulkEditToolbar({
  selectedCount,
  canExportInvoice,
  onProductionStatusChange,
  onBillingStatusChange,
  onDeviationChange,
  onExportInvoice,
  onClearSelection,
}: BulkEditToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 p-4 bg-muted/50 border rounded-lg">
      <span className="font-medium text-sm">
        {selectedCount} {selectedCount === 1 ? 'order markerad' : 'ordrar markerade'}
      </span>

      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 w-full sm:w-auto">
        <Select onValueChange={(value) => onProductionStatusChange(value as ProductionStatus)}>
          <SelectTrigger className="w-full sm:w-[160px] bg-background">
            <SelectValue placeholder="Orderstatus" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {Object.entries(orderAdminStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => onBillingStatusChange(value as BillingStatus)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="Faktureringsstatus" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {Object.entries(billingStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 w-full sm:w-auto">
          <span className="text-sm text-muted-foreground mr-1">Avvikelse:</span>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => onDeviationChange(true)}
          >
            Ja
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => onDeviationChange(false)}
          >
            Nej
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onExportInvoice}
          disabled={!canExportInvoice}
          className="w-full sm:w-auto"
          title={canExportInvoice ? 'Exportera fakturaunderlag' : 'Alla valda ordrar måste ha status "Klar för fakturering"'}
        >
          <FileDown className="h-4 w-4 mr-1" />
          Fakturaunderlag
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="w-full sm:w-auto sm:ml-2"
        >
          <X className="h-4 w-4 mr-1" />
          Rensa markering
        </Button>
      </div>
    </div>
  );
}
