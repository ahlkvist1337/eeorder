import { useEffect, useState, useMemo, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useOrders } from '@/contexts/OrdersContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { SortableProductionTruckCard } from '@/components/SortableProductionTruckCard';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Pause, Package, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import eeLogo from '@/assets/ee_logga.png';
import type { Order, OrderObject, OrderStep, ObjectTruck, OrderUnit, UnitObject } from '@/types/order';
import { getWorkUnitDisplayName } from '@/types/order';
import { supabase } from '@/integrations/supabase/client';

// Flat truck structure for display (supports both v1 trucks and v2 units)
interface FlatTruck {
  truck: ObjectTruck;
  object: OrderObject;
  order: Order;
  objectSteps: OrderStep[];
  // V2 support
  unit?: OrderUnit;
  unitObject?: UnitObject;
  isV2?: boolean;
}

// Extract all active trucks/units (arrived or started) from orders
function getActiveTrucks(orders: Order[]): FlatTruck[] {
  const trucks: FlatTruck[] = [];
  
  for (const order of orders) {
    if (order.productionStatus === 'cancelled') continue;

// V2: one card per unit_object with active status
    if (order.dataModelVersion === 2 && order.units) {
      for (const unit of order.units) {
        for (const obj of unit.objects) {
          if (obj.status === 'arrived' || obj.status === 'started') {
            trucks.push({
              truck: {
                id: obj.id, // use object id as card id
                objectId: '',
                truckNumber: unit.unitNumber,
                status: obj.status,
                billingStatus: obj.billingStatus,
                stepStatuses: [],
                sortOrder: obj.sortOrder ?? unit.sortOrder,
              },
              object: {
                id: obj.id,
                name: obj.name,
                plannedQuantity: 1,
                receivedQuantity: 0,
                completedQuantity: 0,
              },
              order,
              objectSteps: [],
              unit,
              unitObject: obj,
              isV2: true,
            });
          }
        }
      }
      continue;
    }

    // V1: existing logic
    const stepsWithObject = order.steps.filter(s => s.objectId);
    const stepsByObject = new Map<string, OrderStep[]>();
    stepsWithObject.forEach(step => {
      const list = stepsByObject.get(step.objectId!) || [];
      list.push(step);
      stepsByObject.set(step.objectId!, list);
    });
    
    for (const obj of order.objects || []) {
      const objectSteps = stepsByObject.get(obj.id) || [];
      
      for (const truck of obj.trucks || []) {
        if (truck.status === 'arrived' || truck.status === 'started') {
          trucks.push({ truck, object: obj, order, objectSteps });
        }
      }
    }
  }
  
  return trucks;
}

// Get all paused trucks/units
function getPausedTrucks(orders: Order[]): FlatTruck[] {
  const trucks: FlatTruck[] = [];
  
  for (const order of orders) {
    if (order.productionStatus === 'cancelled') continue;

// V2: paused unit objects
    if (order.dataModelVersion === 2 && order.units) {
      for (const unit of order.units) {
        for (const obj of unit.objects) {
          if (obj.status === 'paused') {
            trucks.push({
              truck: {
                id: obj.id,
                objectId: '',
                truckNumber: unit.unitNumber,
                status: obj.status,
                billingStatus: obj.billingStatus,
                stepStatuses: [],
                sortOrder: obj.sortOrder ?? unit.sortOrder,
              },
              object: {
                id: obj.id,
                name: obj.name,
                plannedQuantity: 1,
                receivedQuantity: 0,
                completedQuantity: 0,
              },
              order,
              objectSteps: [],
              unit,
              unitObject: obj,
              isV2: true,
            });
          }
        }
      }
      continue;
    }

    // V1
    const stepsWithObject = order.steps.filter(s => s.objectId);
    const stepsByObject = new Map<string, OrderStep[]>();
    stepsWithObject.forEach(step => {
      const list = stepsByObject.get(step.objectId!) || [];
      list.push(step);
      stepsByObject.set(step.objectId!, list);
    });
    
    for (const obj of order.objects || []) {
      const objectSteps = stepsByObject.get(obj.id) || [];
      
      for (const truck of obj.trucks || []) {
        if (truck.status === 'paused') {
          trucks.push({ truck, object: obj, order, objectSteps });
        }
      }
    }
  }
  
  return trucks;
}

// Sort trucks: manual order first, then by planned end date
function sortTrucks(trucks: FlatTruck[]): FlatTruck[] {
  return [...trucks].sort((a, b) => {
    const aSort = a.truck.sortOrder;
    const bSort = b.truck.sortOrder;
    
    if (aSort !== undefined && aSort !== null && bSort !== undefined && bSort !== null) {
      return aSort - bSort;
    }
    if (aSort !== undefined && aSort !== null) return -1;
    if (bSort !== undefined && bSort !== null) return 1;
    
    const aDate = a.order.plannedEnd || '9999-12-31';
    const bDate = b.order.plannedEnd || '9999-12-31';
    return aDate.localeCompare(bDate);
  });
}

export default function ProductionScreen() {
  useDocumentTitle('Produktion');
  const { orders, refreshOrders, isLoading } = useOrders();
  const { isProduction } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [localTruckOrder, setLocalTruckOrder] = useState<string[]>([]);

  const activeTrucks = useMemo(() => sortTrucks(getActiveTrucks(orders)), [orders]);
  const pausedTrucks = useMemo(() => getPausedTrucks(orders), [orders]);

  // Track which IDs are v2 unit objects for correct table updates
  const v2UnitObjectIds = useMemo(() => new Set(
    [...activeTrucks, ...pausedTrucks].filter(t => t.isV2).map(t => t.truck.id)
  ), [activeTrucks, pausedTrucks]);

  useEffect(() => {
    const ids = activeTrucks.map(t => t.truck.id);
    setLocalTruckOrder(ids);
  }, [activeTrucks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (!isProduction) return;
    
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = localTruckOrder.indexOf(active.id as string);
    const newIndex = localTruckOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    
    const newOrder = arrayMove(localTruckOrder, oldIndex, newIndex);
    setLocalTruckOrder(newOrder);
    
    const updates = newOrder.map((id, index) => ({ id, sort_order: index }));
    
    console.log('Drag end - old order:', localTruckOrder, 'new order:', newOrder);
    for (const update of updates) {
      const isV2 = v2UnitObjectIds.has(update.id);
      const table = isV2 ? 'unit_objects' : 'object_trucks';
      console.log('Drag end - updating table:', table, 'for item', update.id, 'to position', update.sort_order);
      await supabase
        .from(table)
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }
  }, [localTruckOrder, isProduction, v2UnitObjectIds]);

  const handleResetSorting = useCallback(async () => {
    if (!isProduction) return;
    
    for (const flatTruck of activeTrucks) {
      const table = flatTruck.isV2 ? 'unit_objects' : 'object_trucks';
      await supabase
        .from(table)
        .update({ sort_order: null })
        .eq('id', flatTruck.truck.id);
    }
    
    await refreshOrders();
  }, [activeTrucks, refreshOrders, isProduction]);

  useEffect(() => {
    if (!isLoading) {
      setLastUpdated(new Date());
    }
  }, [orders, isLoading]);

  const hasManualSorting = activeTrucks.some(t => t.truck.sortOrder !== undefined && t.truck.sortOrder !== null);

  const sortedActiveTrucks = useMemo(() => {
    if (localTruckOrder.length === 0) return activeTrucks;
    
    const truckMap = new Map(activeTrucks.map(t => [t.truck.id, t]));
    const sorted: FlatTruck[] = [];
    
    for (const id of localTruckOrder) {
      const truck = truckMap.get(id);
      if (truck) sorted.push(truck);
    }
    
    for (const t of activeTrucks) {
      if (!localTruckOrder.includes(t.truck.id)) sorted.push(t);
    }
    
    return sorted;
  }, [activeTrucks, localTruckOrder]);

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <header className="flex flex-col gap-3 mb-4 lg:mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-4">
            <img src={eeLogo} alt="EE Logo" className="h-10 lg:h-16 w-auto" />
            <h1 className="text-xl lg:text-4xl font-bold text-foreground">
              Produktion
            </h1>
          </div>
          <div className="text-sm lg:text-lg text-muted-foreground">
            <span className="font-medium text-foreground">
              {format(lastUpdated, 'HH:mm', { locale: sv })}
            </span>
          </div>
        </div>
        
        <div className="hidden lg:flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">Status:</span>
          <span className="inline-block px-2 py-0.5 rounded-sm bg-[hsl(var(--status-arrived))] text-white text-xs font-medium">
            Ankommen
          </span>
          <span className="inline-block px-2 py-0.5 rounded-sm bg-[hsl(var(--status-started))] text-black text-xs font-medium">
            Startad
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-[hsl(var(--status-paused))] text-white text-xs font-medium">
            <Pause className="h-3 w-3" />
            Pausad
          </span>
          
          {hasManualSorting && isProduction && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleResetSorting}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Återställ ordning
            </Button>
          )}
        </div>
      </header>

      {pausedTrucks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Pause className="h-4 w-4" />
            Pausade arbetskort
          </h2>
          <div className="flex flex-wrap gap-3">
            {pausedTrucks.map(({ truck, object, order }) => (
              <div
                key={truck.id}
                className="flex items-center gap-3 px-4 py-2 rounded-md bg-[hsl(var(--status-paused))] text-white"
              >
                <Pause className="h-4 w-4" />
                <span className="font-mono font-bold">{getWorkUnitDisplayName(truck.truckNumber, object.name, truck.id)}</span>
                <span className="text-sm opacity-90">{order.orderNumber}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {isLoading && sortedActiveTrucks.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-2xl text-muted-foreground">Laddar...</p>
        </div>
      ) : sortedActiveTrucks.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-2xl text-muted-foreground">
              Inga aktiva arbetskort
            </p>
            <p className="text-muted-foreground mt-2">
              Arbetskort med status "Ankommen" eller "Startad" visas här
            </p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localTruckOrder}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {sortedActiveTrucks.map(({ truck, object, order, objectSteps, unit, unitObject, isV2 }) => (
                <SortableProductionTruckCard
                  key={truck.id}
                  id={truck.id}
                  truck={truck}
                  object={object}
                  order={order}
                  objectSteps={objectSteps}
                  unit={unit}
                  unitObject={unitObject}
                  isV2={isV2}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
