import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  CalendarPlus, 
  LogIn, 
  Play, 
  Pause, 
  CheckCircle2, 
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TruckLifecycleEvent, TruckLifecycleEventType } from '@/types/order';
import { truckLifecycleEventLabels } from '@/types/order';

interface TruckTimelineProps {
  events: TruckLifecycleEvent[];
  truckNumber: string;
  compact?: boolean;
}

const eventIcons: Record<TruckLifecycleEventType, React.ElementType> = {
  planned: CalendarPlus,
  arrived: LogIn,
  started: Play,
  paused: Pause,
  completed: CheckCircle2,
  step_started: ArrowRight,
  step_completed: CheckCircle2,
};

const eventColors: Record<TruckLifecycleEventType, string> = {
  planned: 'text-muted-foreground',
  arrived: 'text-[hsl(var(--status-arrived))]',
  started: 'text-[hsl(var(--status-started))]',
  paused: 'text-[hsl(var(--status-paused))]',
  completed: 'text-[hsl(var(--status-completed))]',
  step_started: 'text-[hsl(var(--status-started))]',
  step_completed: 'text-[hsl(var(--status-completed))]',
};

function getEventLabel(event: TruckLifecycleEvent): string {
  if (event.eventType === 'step_started' && event.stepName) {
    return `${event.stepName}: Pågående`;
  }
  if (event.eventType === 'step_completed' && event.stepName) {
    return `${event.stepName}: Klar`;
  }
  return truckLifecycleEventLabels[event.eventType];
}

export function TruckTimeline({ events, truckNumber, compact = false }: TruckTimelineProps) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Ingen historik ännu</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {sortedEvents.slice(-5).map(event => {
          const Icon = eventIcons[event.eventType];
          return (
            <span 
              key={event.id}
              className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted',
                eventColors[event.eventType]
              )}
              title={`${format(new Date(event.timestamp), 'd MMM HH:mm', { locale: sv })} - ${getEventLabel(event)}`}
            >
              <Icon className="h-3 w-3" />
              {event.stepName || truckLifecycleEventLabels[event.eventType]}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <h4 className="text-sm font-medium text-muted-foreground mb-3">
        Tidslinje för arbetsenhet {truckNumber ? `#${truckNumber}` : ''}
      </h4>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
        
        <div className="space-y-2">
          {sortedEvents.map((event, index) => {
            const Icon = eventIcons[event.eventType];
            const isLast = index === sortedEvents.length - 1;
            
            return (
              <div key={event.id} className="flex items-start gap-3 relative">
                {/* Icon */}
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center bg-background border-2 z-10',
                  eventColors[event.eventType],
                  isLast ? 'border-current' : 'border-muted'
                )}>
                  <Icon className="h-3 w-3" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[80px]">
                      {format(new Date(event.timestamp), 'd MMM HH:mm', { locale: sv })}
                    </span>
                    <span className={cn('font-medium', eventColors[event.eventType])}>
                      {getEventLabel(event)}
                    </span>
                  </div>
                  {event.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {event.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
