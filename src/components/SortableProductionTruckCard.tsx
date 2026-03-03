import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProductionTruckCard } from './ProductionTruckCard';
import type { Order, OrderObject, OrderStep, ObjectTruck, OrderUnit } from '@/types/order';

interface SortableProductionTruckCardProps {
  id: string;
  truck: ObjectTruck;
  object: OrderObject;
  order: Order;
  objectSteps: OrderStep[];
  unit?: OrderUnit;
  isV2?: boolean;
}

export function SortableProductionTruckCard({
  id,
  truck,
  object,
  order,
  objectSteps,
  unit,
  isV2,
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
        unit={unit}
        isV2={isV2}
      />
    </div>
  );
}
