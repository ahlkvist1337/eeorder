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

  const importFromOrders = async (): Promise<{ total: number; imported: number; updated: number }> => {
    // Hämta artikelrader + orderns created_at så vi kan ta "senaste" pris per artikelnummer
    const { data: articleRows, error: fetchError } = await supabase
      .from('article_rows')
      .select('part_number, text, price, orders(created_at)');

    if (fetchError) {
      toast({
        title: 'Fel vid hämtning',
        description: fetchError.message,
        variant: 'destructive',
      });
      return { total: 0, imported: 0, updated: 0 };
    }

    // Hämta befintliga prisrader MED id och price
    const { data: existingPrices } = await supabase
      .from('price_list')
      .select('id, part_number, step_name, price');

    // Bygg map: part_number -> grundpris-rad (step_name = null)
    const existingBasePrice = new Map<string, { id: string; price: number }>();
    for (const p of existingPrices || []) {
      if (!p.step_name) {
        existingBasePrice.set(p.part_number, { id: p.id, price: p.price });
      }
    }

    // Sortera senaste order först
    const sorted = [...(articleRows || [])].sort((a: any, b: any) => {
      const aT = a?.orders?.created_at ? new Date(a.orders.created_at).getTime() : 0;
      const bT = b?.orders?.created_at ? new Date(b.orders.created_at).getTime() : 0;
      return bT - aT;
    });

    const latestPerPartNumber = new Map<string, { part_number: string; description: string; price: number }>();
    for (const row of sorted as any[]) {
      const pn = (row.part_number || '').trim();
      if (!pn) continue;
      if (latestPerPartNumber.has(pn)) continue;

      latestPerPartNumber.set(pn, {
        part_number: pn,
        description: row.text || '',
        price: row.price || 0,
      });
    }

    const total = latestPerPartNumber.size;

    const toInsert: { part_number: string; description: string; price: number }[] = [];
    const toUpdate: { id: string; price: number; description: string }[] = [];

    for (const [pn, row] of latestPerPartNumber) {
      const existing = existingBasePrice.get(pn);
      if (!existing) {
        toInsert.push(row);
      } else if (row.price > existing.price) {
        toUpdate.push({ id: existing.id, price: row.price, description: row.description });
      }
    }

    // INSERT nya rader
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('price_list')
        .insert(
          toInsert.map(r => ({
            part_number: r.part_number,
            description: r.description,
            price: r.price,
            step_name: null,
          }))
        );

      if (insertError) {
        toast({
          title: 'Fel vid import',
          description: insertError.message,
          variant: 'destructive',
        });
        return { total, imported: 0, updated: 0 };
      }
    }

    // UPDATE befintliga rader med högre pris
    for (const upd of toUpdate) {
      await supabase.from('price_list').update({ price: upd.price, description: upd.description }).eq('id', upd.id);
    }

    const parts = [];
    if (toInsert.length > 0) parts.push(`${toInsert.length} nya`);
    if (toUpdate.length > 0) parts.push(`${toUpdate.length} uppdaterade`);
    if (parts.length === 0) {
      toast({ title: `Alla ${total} rader finns redan i prislistan` });
    } else {
      toast({ title: `${parts.join(', ')} prisrader (av ${total} totalt)` });
    }

    await fetchPrices();
    return { total, imported: toInsert.length, updated: toUpdate.length };
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
