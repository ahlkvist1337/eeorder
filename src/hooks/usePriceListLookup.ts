import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PriceListItem {
  id: string;
  part_number: string;
  description: string;
  price: number;
  step_name: string | null;
  updated_at: string;
}

export interface PriceMatch {
  price: number;
  partNumber: string;
  description: string;
  matchType: 'exact_part' | 'similar_desc';
}

export function usePriceListLookup() {
  const [prices, setPrices] = useState<PriceListItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Hämta prislistan en gång vid mount
  useEffect(() => {
    supabase
      .from('price_list')
      .select('*')
      .then(({ data, error }) => {
        if (!error && data) {
          setPrices(data);
        }
        setIsReady(true);
      });
  }, []);

  const findMatch = useCallback((partNumber: string, description: string): PriceMatch | null => {
    if (!partNumber && !description) return null;

    // 1. Exakt artikelnummer-match (stark)
    if (partNumber.trim()) {
      const exactMatch = prices.find(p => 
        p.part_number.trim().toLowerCase() === partNumber.trim().toLowerCase()
      );
      if (exactMatch) {
        return { 
          price: exactMatch.price, 
          partNumber: exactMatch.part_number,
          description: exactMatch.description,
          matchType: 'exact_part' 
        };
      }
    }

    // 2. Enkel ordmatchning på beskrivning (svag)
    // Matcha om minst 2 ord överlappar
    if (description.trim()) {
      const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      if (descWords.length >= 2) {
        const matches = prices.filter(p => {
          const priceWords = p.description.toLowerCase().split(/\s+/);
          const overlap = descWords.filter(w => priceWords.includes(w));
          return overlap.length >= 2;
        });

        if (matches.length > 0) {
          // Ta den senast uppdaterade
          const best = matches.sort((a, b) => 
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )[0];
          return { 
            price: best.price, 
            partNumber: best.part_number,
            description: best.description,
            matchType: 'similar_desc' 
          };
        }
      }
    }

    return null;
  }, [prices]);

  return { findMatch, isReady };
}
