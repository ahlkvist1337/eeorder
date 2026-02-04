import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderStep } from '@/types/order';

interface SortableStepProps {
  step: OrderStep;
  onRemove: (stepId: string) => void;
}

export function SortableStep({ step, onRemove }: SortableStepProps) {
  const { isProduction } = useAuth();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: step.id,
    disabled: !isProduction, // Disable drag for non-production users
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-background rounded-md py-1"
    >
      {isProduction && (
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <span className="flex-1 text-sm">{step.name}</span>
      {isProduction && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(step.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
