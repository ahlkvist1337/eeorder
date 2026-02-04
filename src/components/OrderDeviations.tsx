import { useState } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { AlertTriangle, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrderDeviations } from '@/hooks/useOrderDeviations';

interface OrderDeviationsProps {
  orderId: string;
}

export function OrderDeviations({ orderId }: OrderDeviationsProps) {
  const { 
    deviations, 
    isLoading, 
    addDeviation, 
    deleteDeviation, 
    isAdding, 
    canDelete 
  } = useOrderDeviations(orderId);
  
  const [newMessage, setNewMessage] = useState('');

  const handleSubmit = () => {
    if (!newMessage.trim()) return;
    addDeviation(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-destructive">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
          Avvikelser
          {deviations.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({deviations.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Deviation list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laddar...</p>
        ) : deviations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga avvikelser rapporterade.</p>
        ) : (
          <div className="space-y-3">
            {deviations.map((deviation) => (
              <div 
                key={deviation.id} 
                className="bg-destructive/5 border border-destructive/20 rounded-md p-3 space-y-2"
              >
                <p className="text-sm whitespace-pre-wrap">{deviation.message}</p>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {deviation.createdByName} • {format(new Date(deviation.createdAt), 'd MMM yyyy \'kl\' HH:mm', { locale: sv })}
                  </p>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => deleteDeviation(deviation.id)}
                      title="Ta bort avvikelse"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new deviation */}
        <div className="pt-2 border-t space-y-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Beskriv avvikelsen..."
            rows={2}
            className="text-sm resize-none"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Ctrl+Enter för att skicka</p>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!newMessage.trim() || isAdding}
            >
              <Send className="h-4 w-4 mr-2" />
              Rapportera
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
