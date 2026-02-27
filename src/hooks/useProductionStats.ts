import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, differenceInDays } from 'date-fns';
import type { Order } from '@/types/order';

interface OldestActiveInfo {
  days: number;
  truckNumber: string;
}

interface ProductionStats {
  inProgress: number;
  waiting: number;
  completedToday: number;
  overdue: number;
  oldestActiveInfo: OldestActiveInfo | null;
  avgLeadTimeDays: number;
  isLoading: boolean;
}

export function useProductionStats(orders: Order[], dateFilter: Date | null = null): ProductionStats {
  const [trucks, setTrucks] = useState<Array<{ id: string; status: string; object_id: string; truck_number: string | null }>>([]);
  const [lifecycleEvents, setLifecycleEvents] = useState<Array<{ 
    truck_id: string; 
    event_type: string; 
    timestamp: string;
    truck_number: string | null;
    order_id: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const [trucksResult, eventsResult] = await Promise.all([
        supabase.from('object_trucks').select('id, status, object_id, truck_number'),
        supabase.from('truck_lifecycle_events').select('truck_id, event_type, timestamp, truck_number, order_id'),
      ]);

      if (trucksResult.data) setTrucks(trucksResult.data);
      if (eventsResult.data) setLifecycleEvents(eventsResult.data);
      
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);

    // Filter lifecycle events by date if dateFilter is set
    const filteredEvents = dateFilter
      ? lifecycleEvents.filter(e => new Date(e.timestamp) >= dateFilter)
      : lifecycleEvents;

    // Count by status (always current state, not filtered)
    const inProgress = trucks.filter(t => t.status === 'arrived' || t.status === 'started').length;
    const waiting = trucks.filter(t => t.status === 'waiting').length;

    // Completed today (or within period)
    const completedToday = filteredEvents.filter(e => 
      e.event_type === 'completed' && 
      new Date(e.timestamp) >= todayStart
    ).length;

    // Get active truck IDs
    const activeTruckIds = new Set(
      trucks
        .filter(t => t.status === 'arrived' || t.status === 'started')
        .map(t => t.id)
    );

    // Find oldest active truck
    let oldestActiveInfo: OldestActiveInfo | null = null;
    const arrivedEventsForActive = lifecycleEvents
      .filter(e => e.event_type === 'arrived' && activeTruckIds.has(e.truck_id))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (arrivedEventsForActive.length > 0) {
      const oldest = arrivedEventsForActive[0];
      const days = differenceInDays(now, new Date(oldest.timestamp));
      const truck = trucks.find(t => t.id === oldest.truck_id);
      oldestActiveInfo = {
        days,
        truckNumber: truck?.truck_number || 'Okänt'
      };
    }

    // Count overdue
    const orderEndDates = new Map(orders.map(o => [o.id, o.plannedEnd ?? null]));
    const truckOrderMap = new Map<string, string>();
    lifecycleEvents.forEach(e => {
      if (!truckOrderMap.has(e.truck_id)) {
        truckOrderMap.set(e.truck_id, e.order_id);
      }
    });

    let overdue = 0;
    activeTruckIds.forEach(truckId => {
      const orderId = truckOrderMap.get(truckId);
      if (orderId) {
        const plannedEnd = orderEndDates.get(orderId);
        if (plannedEnd && new Date(plannedEnd) < now) {
          overdue++;
        }
      }
    });

    // Average lead time from filtered completed events
    const completedTruckIds = new Set(
      filteredEvents
        .filter(e => e.event_type === 'completed')
        .map(e => e.truck_id)
    );

    const leadTimes: number[] = [];
    completedTruckIds.forEach(truckId => {
      const arrivedEvent = lifecycleEvents.find(e => e.truck_id === truckId && e.event_type === 'arrived');
      const completedEvent = lifecycleEvents.find(e => e.truck_id === truckId && e.event_type === 'completed');
      
      if (arrivedEvent && completedEvent) {
        const days = differenceInDays(new Date(completedEvent.timestamp), new Date(arrivedEvent.timestamp));
        if (days >= 0) leadTimes.push(days);
      }
    });

    const avgLeadTimeDays = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((sum, d) => sum + d, 0) / leadTimes.length)
      : 0;

    return {
      inProgress,
      waiting,
      completedToday,
      overdue,
      oldestActiveInfo,
      avgLeadTimeDays,
      isLoading
    };
  }, [trucks, lifecycleEvents, orders, isLoading, dateFilter]);

  return stats;
}
