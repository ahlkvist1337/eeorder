import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarClock, Box } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Order, OrderStep, StepStatus } from '@/types/order';
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

function StepRow({ step }: { step: OrderStep }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'w-4 h-4 rounded-full ring-2 flex-shrink-0',
          stepStatusIcons[step.status].bg,
          stepStatusIcons[step.status].ring
        )}
      />
      <span
        className={cn(
          'text-lg',
          step.status === 'completed' && 'text-muted-foreground line-through',
          step.status === 'in_progress' && 'font-semibold text-foreground',
          step.status === 'pending' && 'text-muted-foreground'
        )}
      >
        {step.name}
      </span>
    </div>
  );
}

export function ProductionOrderCard({ order }: ProductionOrderCardProps) {
  // Group steps by object
  const stepsWithObject = order.steps.filter(s => s.objectId);
  const stepsWithoutObject = order.steps.filter(s => !s.objectId);

  // Create map: objectId -> steps[]
  const stepsByObject = new Map<string, OrderStep[]>();
  stepsWithObject.forEach(step => {
    const list = stepsByObject.get(step.objectId!) || [];
    list.push(step);
    stepsByObject.set(step.objectId!, list);
  });

  // Get object info from order.objects, include all objects (even without steps)
  const allObjects = order.objects || [];
  
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
        {/* Treatment steps section */}
        <div className="space-y-4 flex-1">
          {/* Steps without object (legacy / backward compatibility) */}
          {stepsWithoutObject.length > 0 && (
            <div className="space-y-2">
              {stepsWithoutObject.map((step) => (
                <StepRow key={step.id} step={step} />
              ))}
            </div>
          )}

          {/* Objects with their steps */}
          {allObjects.map(obj => {
            const objectSteps = stepsByObject.get(obj.id) || [];
            return (
              <div key={obj.id}>
                {/* Object name as header */}
                <div className="flex items-center gap-2 mb-2">
                  <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-foreground">{obj.name}</span>
                </div>
                
                {/* Steps for this object, indented */}
                <div className="pl-6 space-y-2">
                  {objectSteps.length > 0 ? (
                    objectSteps.map(step => (
                      <StepRow key={step.id} step={step} />
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">(inga steg)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Customer name and delivery date */}
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-lg text-muted-foreground truncate">
            {order.customer}
          </p>
          {order.plannedEnd && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              <span className="text-sm">
                Leveransredo: {format(new Date(order.plannedEnd), 'd MMM yyyy', { locale: sv })}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
