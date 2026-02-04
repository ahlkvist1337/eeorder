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
  stepName: string | null;
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

  // Returnerar alla matchningar för ett artikelnummer/beskrivning
  const findAllMatches = useCallback((partNumber: string, description: string): PriceMatch[] => {
    if (!partNumber && !description) return [];

    // 1. Exakt artikelnummer-match - returnera ALLA priser för det artikelnumret
    if (partNumber.trim()) {
      const exactMatches = prices.filter(p => 
        p.part_number.trim().toLowerCase() === partNumber.trim().toLowerCase()
      );
      if (exactMatches.length > 0) {
        return exactMatches
          .sort((a, b) => (a.step_name || '').localeCompare(b.step_name || ''))
          .map(p => ({
            price: p.price,
            partNumber: p.part_number,
            description: p.description,
            stepName: p.step_name,
            matchType: 'exact_part' as const,
          }));
      }
    }

    // 2. Beskrivningsmatchning - alla priser för matchande artiklar
    if (description.trim()) {
      const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      
      if (descWords.length >= 2) {
        const matchingPartNumbers = new Set<string>();
        
        prices.forEach(p => {
          const priceWords = p.description.toLowerCase().split(/\s+/);
          const overlap = descWords.filter(w => priceWords.includes(w));
          if (overlap.length >= 2) {
            matchingPartNumbers.add(p.part_number);
          }
        });

        if (matchingPartNumbers.size > 0) {
          // Ta alla priser för matchande artikelnummer
          const matches = prices
            .filter(p => matchingPartNumbers.has(p.part_number))
            .sort((a, b) => {
              // Sortera först på artikelnummer, sedan step_name
              const pnCompare = a.part_number.localeCompare(b.part_number);
              if (pnCompare !== 0) return pnCompare;
              return (a.step_name || '').localeCompare(b.step_name || '');
            })
            .map(p => ({
              price: p.price,
              partNumber: p.part_number,
              description: p.description,
              stepName: p.step_name,
              matchType: 'similar_desc' as const,
            }));
          
          return matches;
        }
      }
    }

    return [];
  }, [prices]);

  // Behåll findMatch för bakåtkompatibilitet
  const findMatch = useCallback((partNumber: string, description: string): PriceMatch | null => {
    const matches = findAllMatches(partNumber, description);
    return matches.length > 0 ? matches[0] : null;
  }, [findAllMatches]);

  return { findMatch, findAllMatches, isReady };
}
