import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Order, StepStatus } from '@/types/order';
import { productionStatusLabels } from '@/types/order';

interface ProductionOrderCardProps {
  order: Order;
}

const statusColors: Record<string, string> = {
  started: 'bg-[hsl(var(--status-started))] text-black',
  arrived: 'bg-[hsl(var(--status-arrived))] text-white',
};

const stepStatusIcons: Record<StepStatus, { bg: string; ring: string }> = {
  completed: {
    bg: 'bg-[hsl(var(--status-completed))]',
    ring: 'ring-[hsl(var(--status-completed))]',
  },
  in_progress: {
    bg: 'bg-[hsl(var(--status-started))]',
    ring: 'ring-[hsl(var(--status-started))]',
  },
  pending: {
    bg: 'bg-transparent',
    ring: 'ring-muted-foreground',
  },
};

export function ProductionOrderCard({ order }: ProductionOrderCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        {/* Order number - large and prominent */}
        <div className="text-3xl font-bold text-foreground tracking-tight">
          {order.orderNumber}
        </div>
        
        {/* Production status badge */}
        <div
          className={cn(
            'inline-flex self-start items-center rounded-sm px-4 py-2 text-lg font-semibold mt-2',
            statusColors[order.productionStatus] || 'bg-muted text-muted-foreground'
          )}
        >
          {productionStatusLabels[order.productionStatus]}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Treatment steps */}
        <div className="space-y-3 flex-1">
          {order.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {/* Status indicator */}
              <div
                className={cn(
                  'w-5 h-5 rounded-full ring-2 flex-shrink-0',
                  stepStatusIcons[step.status].bg,
                  stepStatusIcons[step.status].ring
                )}
              />
              {/* Step name */}
              <span
                className={cn(
                  'text-xl',
                  step.status === 'completed' && 'text-muted-foreground',
                  step.status === 'in_progress' && 'font-semibold text-foreground',
                  step.status === 'pending' && 'text-muted-foreground'
                )}
              >
                {step.name}
              </span>
            </div>
          ))}
        </div>

        {/* Customer name */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-lg text-muted-foreground truncate">
            {order.customer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
