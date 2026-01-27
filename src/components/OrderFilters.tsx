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

interface OrderFiltersProps {
  filters: {
    productionStatus: ProductionStatus | 'all';
    billingStatus: BillingStatus | 'all';
    hasDeviation: boolean | null;
  };
  onFiltersChange: (filters: OrderFiltersProps['filters']) => void;
}

export function OrderFilters({ filters, onFiltersChange }: OrderFiltersProps) {
  const handleProductionStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      productionStatus: value as ProductionStatus | 'all',
    });
  };

  const handleBillingStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      billingStatus: value as BillingStatus | 'all',
    });
  };

  const handleDeviationChange = (value: string) => {
    onFiltersChange({
      ...filters,
      hasDeviation: value === 'all' ? null : value === 'yes',
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      productionStatus: 'all',
      billingStatus: 'all',
      hasDeviation: null,
    });
  };

  const hasActiveFilters = 
    filters.productionStatus !== 'all' || 
    filters.billingStatus !== 'all' || 
    filters.hasDeviation !== null;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Produktionsstatus:</span>
        <Select value={filters.productionStatus} onValueChange={handleProductionStatusChange}>
          <SelectTrigger className="w-[160px] h-9 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Alla</SelectItem>
            {Object.entries(productionStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Fakturering:</span>
        <Select value={filters.billingStatus} onValueChange={handleBillingStatusChange}>
          <SelectTrigger className="w-[180px] h-9 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Alla</SelectItem>
            {Object.entries(billingStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Avvikelse:</span>
        <Select 
          value={filters.hasDeviation === null ? 'all' : filters.hasDeviation ? 'yes' : 'no'} 
          onValueChange={handleDeviationChange}
        >
          <SelectTrigger className="w-[120px] h-9 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Alla</SelectItem>
            <SelectItem value="yes">Ja</SelectItem>
            <SelectItem value="no">Nej</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
          Rensa filter
        </Button>
      )}
    </div>
  );
}
