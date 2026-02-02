import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarClock, Box, Pause, GripVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order, OrderObject, OrderStep, ObjectTruck, StepStatus, TruckStatus } from '@/types/order';
import { truckStatusLabels, getWorkUnitDisplayName } from '@/types/order';

interface ProductionTruckCardProps {
  truck: ObjectTruck;
  object: OrderObject;
  order: Order;
  objectSteps: OrderStep[];
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

const truckStatusColors: Record<TruckStatus, { bg: string; text: string; border: string }> = {
  waiting: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-muted' },
  arrived: { bg: 'bg-[hsl(var(--status-arrived)/0.15)]', text: 'text-[hsl(var(--status-arrived))]', border: 'border-[hsl(var(--status-arrived))]' },
  started: { bg: 'bg-[hsl(var(--status-started)/0.15)]', text: 'text-foreground', border: 'border-[hsl(var(--status-started))]' },
  paused: { bg: 'bg-[hsl(var(--status-paused)/0.15)]', text: 'text-[hsl(var(--status-paused))]', border: 'border-[hsl(var(--status-paused))]' },
  completed: { bg: 'bg-[hsl(var(--status-completed)/0.15)]', text: 'text-[hsl(var(--status-completed))]', border: 'border-[hsl(var(--status-completed))]' },
};

const stepStatusColors: Record<StepStatus, { bg: string; ring: string; label: string }> = {
  completed: { bg: 'bg-[hsl(var(--status-completed))]', ring: 'ring-[hsl(var(--status-completed))]', label: '✓' },
  in_progress: { bg: 'bg-[hsl(var(--status-started))]', ring: 'ring-[hsl(var(--status-started))]', label: '●' },
  pending: { bg: 'bg-transparent', ring: 'ring-muted-foreground', label: '○' },
};

function getStepStatusForTruck(truck: ObjectTruck, stepId: string): StepStatus {
  const status = truck.stepStatuses.find(s => s.stepId === stepId);
  return status?.status || 'pending';
}

function getCurrentStep(truck: ObjectTruck, steps: OrderStep[]): { step: OrderStep | null; status: StepStatus } {
  // Check if all steps are completed
  const allCompleted = steps.every(step => {
    const status = getStepStatusForTruck(truck, step.id);
    return status === 'completed';
  });
  
  if (allCompleted) {
    return { step: null, status: 'completed' };
  }
  
  // Find in_progress step
  for (const step of steps) {
    const status = getStepStatusForTruck(truck, step.id);
    if (status === 'in_progress') {
      return { step, status: 'in_progress' };
    }
  }
  
  // Find first pending step
  for (const step of steps) {
    const status = getStepStatusForTruck(truck, step.id);
    if (status === 'pending') {
      return { step, status: 'pending' };
    }
  }
  
  return { step: null, status: 'pending' };
}

export function ProductionTruckCard({
  truck,
  object,
  order,
  objectSteps,
  isDragging,
  dragHandleProps,
}: ProductionTruckCardProps) {
  const colors = truckStatusColors[truck.status];
  const { step: currentStep, status: currentStepStatus } = getCurrentStep(truck, objectSteps);

  return (
    <Card className={cn(
      'flex flex-col h-full transition-all border-2',
      colors.border,
      isDragging && 'opacity-50 shadow-lg scale-[1.02]'
    )}>
      <CardContent className="p-4 flex flex-col h-full">
        {/* Header: Drag handle + Truck number */}
        <div className="flex items-start gap-2">
          {dragHandleProps && (
            <div 
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Display name (truck number or fallback) */}
            <div className={cn('text-4xl font-bold font-mono leading-none', colors.text)}>
              {getWorkUnitDisplayName(truck.truckNumber, object.name, truck.id)}
            </div>
            
            {/* Truck status badge */}
            <Badge 
              className={cn(
                'mt-2 font-medium',
                colors.bg,
                colors.text,
                'border-0'
              )}
            >
              {truck.status === 'paused' && <Pause className="h-3 w-3 mr-1" />}
              {truckStatusLabels[truck.status]}
            </Badge>
          </div>
        </div>

        {/* Object name */}
        <div className="mt-4 flex items-center gap-2">
          <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-semibold text-foreground truncate">{object.name}</span>
        </div>

        {/* Step progress */}
        <div className="mt-3 flex-1">
          <div className="space-y-1.5">
            {objectSteps.map((step, index) => {
              const status = getStepStatusForTruck(truck, step.id);
              const stepColors = stepStatusColors[status];
              const isCurrent = currentStep?.id === step.id;
              
              return (
                <div 
                  key={step.id}
                  className={cn(
                    'flex items-center gap-2 text-sm py-1 px-2 rounded-md transition-colors',
                    isCurrent && 'bg-muted/50'
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-full ring-2 flex-shrink-0 flex items-center justify-center text-xs',
                    stepColors.bg,
                    stepColors.ring
                  )}>
                    {status === 'completed' && (
                      <span className="text-white text-[10px]">✓</span>
                    )}
                  </div>
                  <span className={cn(
                    'truncate',
                    status === 'completed' && 'text-muted-foreground line-through',
                    isCurrent && 'font-medium'
                  )}>
                    {step.name}
                  </span>
                  {isCurrent && (
                    <span className="text-xs text-muted-foreground ml-auto">←</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: Order info */}
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{order.orderNumber}</span>
            <span className="text-xs">•</span>
            <span className="truncate">{order.customer}</span>
          </div>
          {order.plannedEnd && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Klart: {format(new Date(order.plannedEnd), 'd MMM', { locale: sv })}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
