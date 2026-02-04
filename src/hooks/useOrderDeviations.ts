import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrderDeviation {
  id: string;
  orderId: string;
  message: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface DbDeviation {
  id: string;
  order_id: string;
  message: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

function mapDbToDeviation(db: DbDeviation): OrderDeviation {
  return {
    id: db.id,
    orderId: db.order_id,
    message: db.message,
    createdBy: db.created_by,
    createdByName: db.created_by_name,
    createdAt: db.created_at,
  };
}

export function useOrderDeviations(orderId: string) {
  const queryClient = useQueryClient();
  const { user, profile, isProduction } = useAuth();

  const { data: deviations = [], isLoading, refetch } = useQuery({
    queryKey: ['order-deviations', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      
      const { data, error } = await supabase
        .from('order_deviations')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching deviations:', error);
        throw error;
      }

      return (data || []).map(mapDbToDeviation);
    },
    enabled: !!orderId,
  });

  const addDeviationMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user || !orderId) throw new Error('Missing user or order');

      const createdByName = profile?.full_name || profile?.email || 'Okänd';

      const { error } = await supabase
        .from('order_deviations')
        .insert({
          order_id: orderId,
          message,
          created_by: user.id,
          created_by_name: createdByName,
        });

      if (error) throw error;

      // Update has_deviation flag on order
      await supabase
        .from('orders')
        .update({ has_deviation: true })
        .eq('id', orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-deviations', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Avvikelse rapporterad');
    },
    onError: (error) => {
      console.error('Error adding deviation:', error);
      toast.error('Kunde inte spara avvikelsen');
    },
  });

  const deleteDeviationMutation = useMutation({
    mutationFn: async (deviationId: string) => {
      const { error } = await supabase
        .from('order_deviations')
        .delete()
        .eq('id', deviationId);

      if (error) throw error;

      // Check if there are any remaining deviations
      const { data: remaining } = await supabase
        .from('order_deviations')
        .select('id')
        .eq('order_id', orderId)
        .limit(1);

      // Update has_deviation flag if no more deviations
      if (!remaining || remaining.length === 0) {
        await supabase
          .from('orders')
          .update({ has_deviation: false })
          .eq('id', orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-deviations', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Avvikelse borttagen');
    },
    onError: (error) => {
      console.error('Error deleting deviation:', error);
      toast.error('Kunde inte ta bort avvikelsen');
    },
  });

  return {
    deviations,
    isLoading,
    refetch,
    addDeviation: addDeviationMutation.mutate,
    deleteDeviation: deleteDeviationMutation.mutate,
    isAdding: addDeviationMutation.isPending,
    isDeleting: deleteDeviationMutation.isPending,
    canDelete: isProduction,
  };
}
