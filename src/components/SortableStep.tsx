import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StepStatusBadge } from '@/components/StatusBadge';
import { stepStatusLabels } from '@/types/order';
import type { OrderStep, StepStatus } from '@/types/order';

interface SortableStepProps {
  step: OrderStep;
  onStatusChange: (stepId: string, status: StepStatus) => void;
  onRemove: (stepId: string) => void;
}

export function SortableStep({ step, onStatusChange, onRemove }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-background rounded-md"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{step.name}</span>
      <StepStatusBadge status={step.status} />
      <Select 
        value={step.status} 
        onValueChange={(v) => onStatusChange(step.id, v as StepStatus)}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover">
          {Object.entries(stepStatusLabels).map(([value, label]) => (
            <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onRemove(step.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
