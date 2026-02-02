import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProductionTruckCard } from './ProductionTruckCard';
import type { Order, OrderObject, OrderStep, ObjectTruck } from '@/types/order';

interface SortableProductionTruckCardProps {
  id: string;
  truck: ObjectTruck;
  object: OrderObject;
  order: Order;
  objectSteps: OrderStep[];
}

export function SortableProductionTruckCard({
  id,
  truck,
  object,
  order,
  objectSteps,
}: SortableProductionTruckCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ProductionTruckCard
        truck={truck}
        object={object}
        order={order}
        objectSteps={objectSteps}
        isDragging={isDragging}
        dragHandleProps={listeners}
      />
    </div>
  );
}
