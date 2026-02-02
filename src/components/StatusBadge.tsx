import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ProductionStatus, BillingStatus, StepStatus, TruckStatus } from '@/types/order';
import { productionStatusLabels, billingStatusLabels, stepStatusLabels, truckStatusLabels } from '@/types/order';

interface ProductionStatusBadgeProps {
  status: ProductionStatus;
  className?: string;
}

const productionStatusColors: Record<ProductionStatus, string> = {
  created: 'bg-[hsl(var(--status-created))] text-white',
  started: 'bg-[hsl(var(--status-created))] text-white',
  paused: 'bg-[hsl(var(--status-created))] text-white',
  arrived: 'bg-[hsl(var(--status-created))] text-white',
  completed: 'bg-[hsl(var(--status-completed))] text-white',
  cancelled: 'bg-[hsl(var(--status-cancelled))] text-white',
};

export function ProductionStatusBadge({ status, className }: ProductionStatusBadgeProps) {
  return (
    <Badge 
      className={cn(
        'font-medium rounded-sm',
        productionStatusColors[status],
        className
      )}
    >
      {productionStatusLabels[status]}
    </Badge>
  );
}

interface BillingStatusBadgeProps {
  status: BillingStatus;
  className?: string;
}

const billingStatusColors: Record<BillingStatus, string> = {
  not_ready: 'bg-[hsl(var(--billing-not-ready))] text-white',
  ready_for_billing: 'bg-[hsl(var(--billing-ready))] text-black',
  billed: 'bg-[hsl(var(--billing-billed))] text-white',
};

export function BillingStatusBadge({ status, className }: BillingStatusBadgeProps) {
  return (
    <Badge 
      className={cn(
        'font-medium rounded-sm',
        billingStatusColors[status],
        className
      )}
    >
      {billingStatusLabels[status]}
    </Badge>
  );
}

interface StepStatusBadgeProps {
  status: StepStatus;
  className?: string;
}

const stepStatusColors: Record<StepStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-[hsl(var(--status-started))] text-black',
  completed: 'bg-[hsl(var(--status-completed))] text-white',
};

export function StepStatusBadge({ status, className }: StepStatusBadgeProps) {
  return (
    <Badge 
      className={cn(
        'font-medium rounded-sm',
        stepStatusColors[status],
        className
      )}
    >
      {stepStatusLabels[status]}
    </Badge>
  );
}

interface TruckStatusBadgeProps {
  status: TruckStatus;
  className?: string;
}

const truckStatusColors: Record<TruckStatus, string> = {
  waiting: 'bg-muted text-muted-foreground',
  arrived: 'bg-[hsl(var(--status-arrived))] text-white',
  started: 'bg-[hsl(var(--status-started))] text-black',
  paused: 'bg-[hsl(var(--status-paused))] text-white',
  completed: 'bg-[hsl(var(--status-completed))] text-white',
};

export function TruckStatusBadge({ status, className }: TruckStatusBadgeProps) {
  return (
    <Badge 
      className={cn(
        'font-medium rounded-sm',
        truckStatusColors[status],
        className
      )}
    >
      {truckStatusLabels[status]}
    </Badge>
  );
}
