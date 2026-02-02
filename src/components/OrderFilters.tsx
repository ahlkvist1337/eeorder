import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function OrderFilters({ filters, onFiltersChange, searchQuery, onSearchChange }: OrderFiltersProps) {
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
    onSearchChange('');
  };

  const hasActiveFilters = 
    filters.productionStatus !== 'all' || 
    filters.billingStatus !== 'all' || 
    filters.hasDeviation !== null ||
    searchQuery.length > 0;

  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
      {/* Search field */}
      <div className="relative w-full md:w-[360px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök på ordernummer, kund, truck..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-9"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters - pushed to the right on desktop, stacked on mobile */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Status:</span>
          <Select value={filters.productionStatus} onValueChange={handleProductionStatusChange}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 bg-background">
              <SelectValue placeholder="Produktionsstatus" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Alla statusar</SelectItem>
              {Object.entries(productionStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Fakturering:</span>
          <Select value={filters.billingStatus} onValueChange={handleBillingStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background">
              <SelectValue placeholder="Faktureringsstatus" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All fakturering</SelectItem>
              {Object.entries(billingStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Avvikelse:</span>
          <Select 
            value={filters.hasDeviation === null ? 'all' : filters.hasDeviation ? 'yes' : 'no'} 
            onValueChange={handleDeviationChange}
          >
            <SelectTrigger className="w-full sm:w-[120px] h-9 bg-background">
              <SelectValue placeholder="Avvikelse" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">Alla</SelectItem>
              <SelectItem value="yes">Med avvikelse</SelectItem>
              <SelectItem value="no">Utan avvikelse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 w-full sm:w-auto">
            Rensa filter
          </Button>
        )}
      </div>
    </div>
  );
}
