import { useMemo, useState } from 'react';
import { List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { usePriceListLookup, type PriceMatch } from '@/hooks/usePriceListLookup';

interface PriceListBadgeProps {
  partNumber: string;
  text: string;
  onSelectPrice?: (price: number) => void;
  readOnly?: boolean;
}

export function PriceListBadge({ 
  partNumber, 
  text, 
  onSelectPrice, 
  readOnly = false 
}: PriceListBadgeProps) {
  const { findAllMatches, isReady } = usePriceListLookup();
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    if (!isReady) return [];
    return findAllMatches(partNumber, text);
  }, [partNumber, text, findAllMatches, isReady]);

  if (matches.length === 0) return null;

  // Använd första matchens info för rubrik
  const primaryMatch = matches[0];

  const handleSelectPrice = (price: number) => {
    onSelectPrice?.(price);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <List className="h-3 w-3" />
          <span>Prislista finns</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <List className="h-4 w-4" />
            <span>Priser i prislistan</span>
          </div>
          
          <div className="mt-2 text-sm text-muted-foreground">
            {primaryMatch.partNumber} - {primaryMatch.description}
          </div>
        </div>
        
        <Separator />
        
        <div className="p-2 max-h-60 overflow-y-auto">
          {matches.map((match, idx) => (
            <div 
              key={`${match.partNumber}-${match.stepName}-${idx}`}
              className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-sm"
            >
              <span className="text-sm">
                {match.stepName || '(grundpris)'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {match.price.toLocaleString('sv-SE')} kr
                </span>
                {!readOnly && onSelectPrice && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => handleSelectPrice(match.price)}
                  >
                    Välj
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
