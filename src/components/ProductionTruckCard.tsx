import { format, differenceInCalendarDays } from 'date-fns';
import { sv } from 'date-fns/locale';
import { CalendarClock, Box, Pause, GripVertical, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Order, OrderObject, OrderStep, ObjectTruck, StepStatus, TruckStatus, OrderUnit, UnitObject } from '@/types/order';
import { truckStatusLabels, getWorkUnitDisplayName } from '@/types/order';

interface ProductionTruckCardProps {
  truck: ObjectTruck;
  object: OrderObject;
  order: Order;
  objectSteps: OrderStep[];
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  // V2 support
  unit?: OrderUnit;
  unitObject?: UnitObject;
  isV2?: boolean;
}

const truckStatusColors: Record<TruckStatus, { bg: string; text: string; border: string }> = {
  waiting: { bg: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-muted' },
  arrived: { bg: 'bg-[hsl(var(--status-arrived)/0.15)]', text: 'text-[hsl(var(--status-arrived))]', border: 'border-[hsl(var(--status-arrived))]' },
  started: { bg: 'bg-[hsl(var(--status-started)/0.15)]', text: 'text-foreground', border: 'border-[hsl(var(--status-started))]' },
  paused: { bg: 'bg-[hsl(var(--status-paused)/0.15)]', text: 'text-[hsl(var(--status-paused))]', border: 'border-[hsl(var(--status-paused))]' },
  completed: { bg: 'bg-[hsl(var(--status-completed)/0.15)]', text: 'text-[hsl(var(--status-completed))]', border: 'border-[hsl(var(--status-completed))]' },
  packed: { bg: 'bg-amber-500/15', text: 'text-amber-600', border: 'border-amber-500' },
  delivered: { bg: 'bg-emerald-600/15', text: 'text-emerald-600', border: 'border-emerald-600' },
};

const stepStatusColors: Record<StepStatus, { bg: string; ring: string }> = {
  completed: { bg: 'bg-[hsl(var(--status-completed))]', ring: 'ring-[hsl(var(--status-completed))]' },
  in_progress: { bg: 'bg-[hsl(var(--status-started))]', ring: 'ring-[hsl(var(--status-started))]' },
  pending: { bg: 'bg-transparent', ring: 'ring-muted-foreground' },
};

function getStepStatusForTruck(truck: ObjectTruck, stepId: string): StepStatus {
  const status = truck.stepStatuses.find(s => s.stepId === stepId);
  return status?.status || 'pending';
}

function getCurrentStep(truck: ObjectTruck, steps: OrderStep[]): { step: OrderStep | null; status: StepStatus } {
  const allCompleted = steps.every(step => {
    const status = getStepStatusForTruck(truck, step.id);
    return status === 'completed';
  });
  
  if (allCompleted) return { step: null, status: 'completed' };
  
  for (const step of steps) {
    const status = getStepStatusForTruck(truck, step.id);
    if (status === 'in_progress') return { step, status: 'in_progress' };
  }
  
  for (const step of steps) {
    const status = getStepStatusForTruck(truck, step.id);
    if (status === 'pending') return { step, status: 'pending' };
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
  unit,
  unitObject,
  isV2,
}: ProductionTruckCardProps) {
  const colors = truckStatusColors[truck.status];
  const { step: currentStep } = !isV2 ? getCurrentStep(truck, objectSteps) : { step: null };

  // Deadline calculation
  const now = new Date();
  const plannedEnd = order.plannedEnd ? new Date(order.plannedEnd) : null;
  const daysUntilDeadline = plannedEnd ? differenceInCalendarDays(plannedEnd, now) : null;
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const isUrgent = daysUntilDeadline !== null && !isOverdue && daysUntilDeadline <= 2;

  const getDeadlineLabel = () => {
    if (daysUntilDeadline === null) return null;
    if (daysUntilDeadline < -1) return `${Math.abs(daysUntilDeadline)} dagar försenad`;
    if (daysUntilDeadline === -1) return '1 dag försenad';
    if (daysUntilDeadline === 0) return 'Idag';
    if (daysUntilDeadline === 1) return 'Imorgon';
    return `${daysUntilDeadline} dagar kvar`;
  };

  return (
    <Card className={cn(
      'flex flex-col h-full transition-all border-2',
      colors.border,
      isOverdue && 'ring-2 ring-destructive',
      isUrgent && 'ring-2 ring-amber-500',
      isDragging && 'opacity-50 shadow-lg scale-[1.02]'
    )}>
      <CardContent className="p-4 flex flex-col h-full">
        {/* Header: Drag handle + Unit/Truck number */}
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
            <div className={cn('text-4xl font-bold font-mono leading-none', colors.text)}>
              {getWorkUnitDisplayName(truck.truckNumber, object.name, truck.id)}
            </div>
            
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

        {/* V2: Single object with its steps */}
        {isV2 && unitObject ? (
          <div className="mt-3 flex-1 space-y-2">
            <div className="flex items-center gap-2 mb-1.5">
              <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-foreground text-sm">{unitObject.name}</span>
            </div>
            <div className="space-y-1 ml-1">
              {unitObject.steps.map(step => {
                const stepColors = stepStatusColors[step.status];
                const isCurrent = step.status === 'in_progress';
                
                return (
                  <div 
                    key={step.id}
                    className={cn(
                      'flex items-center gap-2 text-sm py-1.5 px-2 rounded-md transition-colors',
                      isCurrent && 'bg-muted/50'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-full ring-2 flex-shrink-0 flex items-center justify-center text-xs',
                      stepColors.bg,
                      stepColors.ring
                    )}>
                      {step.status === 'completed' && (
                        <span className="text-white text-[10px]">✓</span>
                      )}
                    </div>
                    <span className={cn(
                      'flex-1',
                      step.status === 'completed' && 'text-muted-foreground line-through',
                      isCurrent && 'font-medium'
                    )}>
                      {step.name}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-muted-foreground">←</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* V1: Object name */}
            <div className="mt-4 flex items-center gap-2">
              <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-foreground truncate">{object.name}</span>
            </div>

            {/* V1: Step progress */}
            <div className="mt-3 flex-1">
              <div className="space-y-1.5">
                {objectSteps.map((step) => {
                  const status = getStepStatusForTruck(truck, step.id);
                  const sColors = stepStatusColors[status];
                  const isCurrent = currentStep?.id === step.id;
                  
                  return (
                    <div 
                      key={step.id}
                      className={cn(
                        'flex items-center gap-2 text-sm py-2 px-3 rounded-md transition-colors min-h-[44px]',
                        isCurrent && 'bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full ring-2 flex-shrink-0 flex items-center justify-center text-xs',
                        sColors.bg,
                        sColors.ring
                      )}>
                        {status === 'completed' && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <span className={cn(
                        'flex-1',
                        status === 'completed' && 'text-muted-foreground line-through',
                        isCurrent && 'font-medium'
                      )}>
                        {step.name}
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-muted-foreground">←</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer: Order info */}
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{order.orderNumber}</span>
            <span className="text-xs">•</span>
            <span className="truncate">{order.customer}</span>
          </div>
          {order.plannedEnd && (
            <div className={cn(
              'flex items-center gap-1.5 text-sm',
              isOverdue ? 'text-destructive font-medium' : isUrgent ? 'text-amber-600 font-medium' : 'text-muted-foreground'
            )}>
              {isOverdue || isUrgent ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CalendarClock className="h-3.5 w-3.5" />
              )}
              <span>{getDeadlineLabel()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
