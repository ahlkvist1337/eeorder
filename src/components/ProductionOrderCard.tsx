import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarClock, Box, Truck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Order, OrderStep, StepStatus, ObjectTruck } from '@/types/order';
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

function getTruckCurrentStep(truck: ObjectTruck, objectSteps: OrderStep[]): { step: OrderStep | null; status: 'completed' | 'in_progress' | 'pending' } {
  // Check if all steps are completed
  const allCompleted = objectSteps.every(step => {
    const truckStatus = truck.stepStatuses.find(s => s.stepId === step.id);
    return truckStatus?.status === 'completed';
  });
  
  if (allCompleted) {
    return { step: null, status: 'completed' };
  }
  
  // Find in_progress step
  for (const step of objectSteps) {
    const truckStatus = truck.stepStatuses.find(s => s.stepId === step.id);
    if (truckStatus?.status === 'in_progress') {
      return { step, status: 'in_progress' };
    }
  }
  
  // Find first pending step
  for (const step of objectSteps) {
    const truckStatus = truck.stepStatuses.find(s => s.stepId === step.id);
    if (!truckStatus || truckStatus.status === 'pending') {
      return { step, status: 'pending' };
    }
  }
  
  return { step: null, status: 'pending' };
}

function TruckCard({ truck, objectSteps }: { truck: ObjectTruck; objectSteps: OrderStep[] }) {
  const { step, status } = getTruckCurrentStep(truck, objectSteps);
  
  if (status === 'completed') {
    return null; // We'll show completed trucks separately
  }
  
  return (
    <div className={cn(
      'rounded-lg border-2 p-3 text-center',
      status === 'in_progress' 
        ? 'border-[hsl(var(--status-started))] bg-[hsl(var(--status-started)/0.1)]'
        : 'border-muted bg-muted/30'
    )}>
      <div className="text-2xl font-bold font-mono">
        #{truck.truckNumber}
      </div>
      {step && (
        <div className={cn(
          'flex items-center justify-center gap-2 mt-1 text-sm',
          status === 'in_progress' ? 'text-foreground' : 'text-muted-foreground'
        )}>
          <div
            className={cn(
              'w-3 h-3 rounded-full ring-1',
              stepStatusIcons[status].bg,
              stepStatusIcons[status].ring
            )}
          />
          <span>{step.name}</span>
          <span className="text-xs">
            ({status === 'in_progress' ? 'pågående' : 'väntande'})
          </span>
        </div>
      )}
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

          {/* Objects with their steps and trucks */}
          {allObjects.map(obj => {
            const objectSteps = stepsByObject.get(obj.id) || [];
            const hasTrucks = obj.trucks && obj.trucks.length > 0;
            
            // Separate active and completed trucks
            const activeTrucks = hasTrucks 
              ? obj.trucks!.filter(truck => {
                  const { status } = getTruckCurrentStep(truck, objectSteps);
                  return status !== 'completed';
                })
              : [];
            
            const completedTrucks = hasTrucks
              ? obj.trucks!.filter(truck => {
                  const { status } = getTruckCurrentStep(truck, objectSteps);
                  return status === 'completed';
                })
              : [];
            
            const isAllReceived = obj.receivedQuantity >= obj.plannedQuantity;
            const isAllCompleted = obj.completedQuantity >= obj.plannedQuantity;
            
            return (
              <div key={obj.id}>
                {/* Object name as header with quantity info */}
                <div className="flex items-center gap-2 mb-2">
                  <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className={cn(
                    "font-semibold",
                    isAllCompleted ? "text-[hsl(var(--status-completed))]" : "text-foreground"
                  )}>
                    {obj.name}
                  </span>
                  {hasTrucks && (
                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      {obj.trucks!.length} st
                    </span>
                  )}
                  {!hasTrucks && (
                    <span className={cn(
                      "text-sm ml-auto",
                      isAllReceived ? "text-[hsl(var(--status-completed))]" : "text-muted-foreground"
                    )}>
                      {obj.receivedQuantity}/{obj.plannedQuantity} mott.
                    </span>
                  )}
                </div>
                
                {/* Trucks display - active trucks as cards */}
                {hasTrucks && activeTrucks.length > 0 && (
                  <div className="pl-6 space-y-2 mb-2">
                    {activeTrucks.map(truck => (
                      <TruckCard key={truck.id} truck={truck} objectSteps={objectSteps} />
                    ))}
                  </div>
                )}
                
                {/* Completed trucks - compact display */}
                {hasTrucks && completedTrucks.length > 0 && (
                  <div className="pl-6 flex flex-wrap items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-completed))]" />
                    {completedTrucks.map(truck => (
                      <span key={truck.id} className="text-sm text-[hsl(var(--status-completed))] font-mono">
                        #{truck.truckNumber}
                      </span>
                    ))}
                    <span className="text-sm text-muted-foreground">klar{completedTrucks.length > 1 ? 'a' : ''}</span>
                  </div>
                )}
                
                {/* Steps for this object (when no trucks), indented */}
                {!hasTrucks && (
                  <div className="pl-6 space-y-2">
                    {objectSteps.length > 0 ? (
                      objectSteps.map(step => (
                        <div key={step.id} className="flex items-center justify-between">
                          <StepRow step={step} />
                          {obj.plannedQuantity > 1 && step.status === 'completed' && (
                            <span className="text-sm text-[hsl(var(--status-completed))] ml-2">
                              {obj.completedQuantity}/{obj.plannedQuantity}
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">(inga steg)</span>
                    )}
                  </div>
                )}
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
