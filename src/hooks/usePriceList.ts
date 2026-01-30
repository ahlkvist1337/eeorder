import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PriceListItem {
  id: string;
  part_number: string;
  description: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export function usePriceList() {
  const [prices, setPrices] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('price_list')
      .select('*')
      .order('part_number', { ascending: true });

    if (error) {
      toast({
        title: 'Fel vid hämtning',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setPrices(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const addPrice = async (partNumber: string, description: string, price: number) => {
    const { error } = await supabase
      .from('price_list')
      .insert({ part_number: partNumber, description, price });

    if (error) {
      toast({
        title: 'Fel vid tillägg',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
    
    toast({ title: 'Prisrad tillagd' });
    await fetchPrices();
    return true;
  };

  const updatePrice = async (id: string, updates: Partial<Pick<PriceListItem, 'part_number' | 'description' | 'price'>>) => {
    const { error } = await supabase
      .from('price_list')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({
        title: 'Fel vid uppdatering',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
    
    toast({ title: 'Prisrad uppdaterad' });
    await fetchPrices();
    return true;
  };

  const deletePrice = async (id: string) => {
    const { error } = await supabase
      .from('price_list')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Fel vid borttagning',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
    
    toast({ title: 'Prisrad borttagen' });
    await fetchPrices();
    return true;
  };

  return {
    prices,
    loading,
    fetchPrices,
    addPrice,
    updatePrice,
    deletePrice,
  };
}
