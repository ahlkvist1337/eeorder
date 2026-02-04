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
import type { Order, OrderObject, OrderStep, ObjectTruck, TruckStatus } from '@/types/order';
import { getWorkUnitDisplayName } from '@/types/order';
import { supabase } from '@/integrations/supabase/client';

// Flat truck structure for display
interface FlatTruck {
  truck: ObjectTruck;
  object: OrderObject;
  order: Order;
  objectSteps: OrderStep[];
}

// Extract all active trucks (arrived or started) from orders
function getActiveTrucks(orders: Order[]): FlatTruck[] {
  const trucks: FlatTruck[] = [];
  
  for (const order of orders) {
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

// Get all paused trucks
function getPausedTrucks(orders: Order[]): FlatTruck[] {
  const trucks: FlatTruck[] = [];
  
  for (const order of orders) {
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
    // Manual sort order takes priority
    const aSort = a.truck.sortOrder;
    const bSort = b.truck.sortOrder;
    
    if (aSort !== undefined && aSort !== null && bSort !== undefined && bSort !== null) {
      return aSort - bSort;
    }
    if (aSort !== undefined && aSort !== null) return -1;
    if (bSort !== undefined && bSort !== null) return 1;
    
    // Fallback: planned end date
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

  // Get active and paused trucks
  const activeTrucks = useMemo(() => sortTrucks(getActiveTrucks(orders)), [orders]);
  const pausedTrucks = useMemo(() => getPausedTrucks(orders), [orders]);

  // Sync local order with server order when trucks change
  useEffect(() => {
    const ids = activeTrucks.map(t => t.truck.id);
    setLocalTruckOrder(ids);
  }, [activeTrucks]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag end - only for production/admin
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (!isProduction) return;
    
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = localTruckOrder.indexOf(active.id as string);
    const newIndex = localTruckOrder.indexOf(over.id as string);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Update local state immediately for smooth UX
    const newOrder = arrayMove(localTruckOrder, oldIndex, newIndex);
    setLocalTruckOrder(newOrder);
    
    // Save new sort orders to database
    const updates = newOrder.map((truckId, index) => ({
      id: truckId,
      sort_order: index,
    }));
    
    // Update each truck's sort_order
    for (const update of updates) {
      await supabase
        .from('object_trucks')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }
  }, [localTruckOrder, isProduction]);

  // Reset manual sorting - only for production/admin
  const handleResetSorting = useCallback(async () => {
    if (!isProduction) return;
    
    // Clear all sort_order values for active trucks
    for (const flatTruck of activeTrucks) {
      await supabase
        .from('object_trucks')
        .update({ sort_order: null })
        .eq('id', flatTruck.truck.id);
    }
    
    // Refresh to get new order
    await refreshOrders();
  }, [activeTrucks, refreshOrders, isProduction]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const refresh = async () => {
      await refreshOrders();
      setLastUpdated(new Date());
    };

    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refreshOrders]);

  // Check if any truck has manual sort order
  const hasManualSorting = activeTrucks.some(t => t.truck.sortOrder !== undefined && t.truck.sortOrder !== null);

  // Sort trucks for display based on local order
  const sortedActiveTrucks = useMemo(() => {
    if (localTruckOrder.length === 0) return activeTrucks;
    
    const truckMap = new Map(activeTrucks.map(t => [t.truck.id, t]));
    const sorted: FlatTruck[] = [];
    
    for (const id of localTruckOrder) {
      const truck = truckMap.get(id);
      if (truck) {
        sorted.push(truck);
      }
    }
    
    // Add any trucks not in the order (new ones)
    for (const t of activeTrucks) {
      if (!localTruckOrder.includes(t.truck.id)) {
        sorted.push(t);
      }
    }
    
    return sorted;
  }, [activeTrucks, localTruckOrder]);

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <img src={eeLogo} alt="EE Logo" className="h-16 w-auto" />
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Produktion
          </h1>
        </div>
        
        {/* Legend and controls */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
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

        <div className="text-lg text-muted-foreground">
          Uppdaterad:{' '}
          <span className="font-medium text-foreground">
            {format(lastUpdated, 'HH:mm:ss', { locale: sv })}
          </span>
        </div>
      </header>

      {/* Paused work cards section */}
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

      {/* Active work cards grid */}
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
              {sortedActiveTrucks.map(({ truck, object, order, objectSteps }) => (
                <SortableProductionTruckCard
                  key={truck.id}
                  id={truck.id}
                  truck={truck}
                  object={object}
                  order={order}
                  objectSteps={objectSteps}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
