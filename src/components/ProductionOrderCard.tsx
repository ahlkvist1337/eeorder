import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarClock, Box, Truck, CheckCircle2, Pause } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Order, OrderStep, StepStatus, ObjectTruck, TruckStatus } from '@/types/order';
import { truckStatusLabels } from '@/types/order';

interface ProductionOrderCardProps {
  order: Order;
}

const truckStatusColors: Record<TruckStatus, { bg: string; text: string; border: string }> = {
  waiting: { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-muted' },
  arrived: { bg: 'bg-[hsl(var(--status-arrived)/0.1)]', text: 'text-[hsl(var(--status-arrived))]', border: 'border-[hsl(var(--status-arrived))]' },
  started: { bg: 'bg-[hsl(var(--status-started)/0.1)]', text: 'text-foreground', border: 'border-[hsl(var(--status-started))]' },
  paused: { bg: 'bg-[hsl(var(--status-paused)/0.1)]', text: 'text-[hsl(var(--status-paused))]', border: 'border-[hsl(var(--status-paused))]' },
  completed: { bg: 'bg-[hsl(var(--status-completed)/0.1)]', text: 'text-[hsl(var(--status-completed))]', border: 'border-[hsl(var(--status-completed))]' },
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

function getTruckCurrentStep(truck: ObjectTruck, objectSteps: OrderStep[]): { step: OrderStep | null; status: StepStatus } {
  // Check if all steps are completed based on truck step statuses
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
  const { step: currentStep, status: stepProgress } = getTruckCurrentStep(truck, objectSteps);
  const colors = truckStatusColors[truck.status];
  
  // Don't show completed trucks as cards (they're shown separately)
  if (truck.status === 'completed') {
    return null;
  }
  
  return (
    <div className={cn(
      'rounded-lg border-2 p-3 text-center',
      colors.border,
      colors.bg
    )}>
      <div className={cn('text-2xl font-bold font-mono', colors.text)}>
        #{truck.truckNumber}
      </div>
      
      {/* Truck status label */}
      <div className={cn('text-xs font-medium mt-1 flex items-center justify-center gap-1', colors.text)}>
        {truck.status === 'paused' && <Pause className="h-3 w-3" />}
        {truckStatusLabels[truck.status]}
      </div>
      
      {/* Current step info */}
      {currentStep && (
        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
          <div
            className={cn(
              'w-3 h-3 rounded-full ring-1',
              stepStatusIcons[stepProgress].bg,
              stepStatusIcons[stepProgress].ring
            )}
          />
          <span>{currentStep.name}</span>
        </div>
      )}
    </div>
  );
}

export function ProductionOrderCard({ order }: ProductionOrderCardProps) {
  // Group steps by object
  const stepsWithObject = order.steps.filter(s => s.objectId);
  
  // Create map: objectId -> steps[]
  const stepsByObject = new Map<string, OrderStep[]>();
  stepsWithObject.forEach(step => {
    const list = stepsByObject.get(step.objectId!) || [];
    list.push(step);
    stepsByObject.set(step.objectId!, list);
  });

  // Get all objects
  const allObjects = order.objects || [];
  
  // Get all trucks with their objects
  const allTrucks = allObjects.flatMap(obj => 
    (obj.trucks || []).map(truck => ({ truck, object: obj }))
  );
  
  // Separate trucks by status for display
  const activeTrucks = allTrucks.filter(({ truck }) => 
    truck.status === 'arrived' || truck.status === 'started'
  );
  const pausedTrucks = allTrucks.filter(({ truck }) => truck.status === 'paused');
  const completedTrucks = allTrucks.filter(({ truck }) => truck.status === 'completed');
  
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        {/* Order number - large and prominent */}
        <div className="text-3xl font-bold text-foreground tracking-tight">
          {order.orderNumber}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* Active trucks by object */}
        <div className="space-y-4 flex-1">
          {allObjects.map(obj => {
            const objectSteps = stepsByObject.get(obj.id) || [];
            const objectTrucks = (obj.trucks || []).filter(t => 
              t.status === 'arrived' || t.status === 'started'
            );
            
            if (objectTrucks.length === 0) return null;
            
            return (
              <div key={obj.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-foreground">{obj.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    <Truck className="h-3 w-3 inline mr-1" />
                    {objectTrucks.length} aktiv{objectTrucks.length !== 1 ? 'a' : ''}
                  </span>
                </div>
                
                <div className="pl-6 space-y-2">
                  {objectTrucks.map(truck => (
                    <TruckCard key={truck.id} truck={truck} objectSteps={objectSteps} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Paused trucks section */}
        {pausedTrucks.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-[hsl(var(--status-paused))]">
              <Pause className="h-4 w-4" />
              <span className="text-sm font-medium">Pausade:</span>
              {pausedTrucks.map(({ truck }) => (
                <span key={truck.id} className="font-mono text-sm">#{truck.truckNumber}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Completed trucks section */}
        {completedTrucks.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-completed))]" />
              {completedTrucks.map(({ truck }) => (
                <span key={truck.id} className="text-sm text-[hsl(var(--status-completed))] font-mono">
                  #{truck.truckNumber}
                </span>
              ))}
              <span className="text-sm text-muted-foreground">klar{completedTrucks.length > 1 ? 'a' : ''}</span>
            </div>
          </div>
        )}

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
