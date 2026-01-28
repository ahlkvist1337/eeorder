import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productionStatusLabels, billingStatusLabels } from '@/types/order';
import type { ProductionStatus, BillingStatus } from '@/types/order';

interface BulkEditToolbarProps {
  selectedCount: number;
  onProductionStatusChange: (status: ProductionStatus) => void;
  onBillingStatusChange: (status: BillingStatus) => void;
  onDeviationChange: (hasDeviation: boolean) => void;
  onClearSelection: () => void;
}

export function BulkEditToolbar({
  selectedCount,
  onProductionStatusChange,
  onBillingStatusChange,
  onDeviationChange,
  onClearSelection,
}: BulkEditToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 border rounded-lg">
      <span className="font-medium text-sm">
        {selectedCount} {selectedCount === 1 ? 'order markerad' : 'ordrar markerade'}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={(value) => onProductionStatusChange(value as ProductionStatus)}>
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder="Produktionsstatus" />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            {Object.entries(productionStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(value) => onBillingStatusChange(value as BillingStatus)}>
          <SelectTrigger className="w-[180px] bg-background">
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

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-1">Avvikelse:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeviationChange(true)}
          >
            Ja
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeviationChange(false)}
          >
            Nej
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="ml-2"
        >
          <X className="h-4 w-4 mr-1" />
          Rensa markering
        </Button>
      </div>
    </div>
  );
}
