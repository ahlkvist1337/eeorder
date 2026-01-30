import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PriceListItem {
  id: string;
  part_number: string;
  description: string;
  step_name: string | null;
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

  const addPrice = async (partNumber: string, description: string, price: number, stepName?: string) => {
    const { error } = await supabase
      .from('price_list')
      .insert({ 
        part_number: partNumber, 
        description, 
        price,
        step_name: stepName || null
      });

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

  const updatePrice = async (id: string, updates: Partial<Pick<PriceListItem, 'part_number' | 'description' | 'price' | 'step_name'>>) => {
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

  const importFromOrders = async (): Promise<{ total: number; imported: number }> => {
    // Hämta alla unika kombinationer från article_rows
    const { data: articleRows, error: fetchError } = await supabase
      .from('article_rows')
      .select('part_number, text, price');

    if (fetchError) {
      toast({
        title: 'Fel vid hämtning',
        description: fetchError.message,
        variant: 'destructive',
      });
      return { total: 0, imported: 0 };
    }

    // Skapa unika kombinationer
    const uniqueRows = new Map<string, { part_number: string; description: string; price: number }>();
    for (const row of articleRows || []) {
      if (row.part_number && row.part_number.trim()) {
        const key = `${row.part_number}|${row.text}|${row.price}`;
        if (!uniqueRows.has(key)) {
          uniqueRows.set(key, {
            part_number: row.part_number,
            description: row.text,
            price: row.price,
          });
        }
      }
    }

    const rowsToInsert = Array.from(uniqueRows.values());
    const total = rowsToInsert.length;

    if (total === 0) {
      return { total: 0, imported: 0 };
    }

    // Infoga med ON CONFLICT DO NOTHING (via upsert med ignoreDuplicates)
    const { error: insertError, count } = await supabase
      .from('price_list')
      .upsert(
        rowsToInsert.map(r => ({
          part_number: r.part_number,
          description: r.description,
          price: r.price,
          step_name: null,
        })),
        { onConflict: 'part_number,step_name', ignoreDuplicates: true, count: 'exact' }
      );

    if (insertError) {
      toast({
        title: 'Fel vid import',
        description: insertError.message,
        variant: 'destructive',
      });
      return { total, imported: 0 };
    }

    await fetchPrices();
    return { total, imported: count || 0 };
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
    importFromOrders,
  };
}
