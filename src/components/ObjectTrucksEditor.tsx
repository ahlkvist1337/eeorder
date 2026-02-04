import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { ObjectTruck, OrderStep, StepStatus, TruckStatus, ArticleRow } from '@/types/order';
import { truckStatusLabels, getWorkUnitDisplayName } from '@/types/order';
import { printWorkCard } from '@/lib/workCardPrint';

interface ObjectTrucksEditorProps {
  trucks: ObjectTruck[];
  objectId: string;
  objectName: string;
  objectSteps: OrderStep[];
  articleRows?: ArticleRow[];
  onTrucksChange: (trucks: ObjectTruck[]) => void;
  onTruckStepStatusChange?: (truckId: string, stepId: string, status: StepStatus) => void;
  onTruckStatusChange?: (truckId: string, status: TruckStatus) => void;
  orderInfo?: {
    id: string;
    orderNumber: string;
    customer: string;
  };
}

const stepStatusColors: Record<StepStatus, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-[hsl(var(--status-completed))]', text: 'text-white', label: '✓' },
  in_progress: { bg: 'bg-[hsl(var(--status-started))]', text: 'text-black', label: '●' },
  pending: { bg: 'bg-muted', text: 'text-muted-foreground', label: '○' },
};

const truckStatusColors: Record<TruckStatus, string> = {
  waiting: 'text-muted-foreground',
  arrived: 'text-[hsl(var(--status-arrived))]',
  started: 'text-[hsl(var(--status-started))]',
  paused: 'text-[hsl(var(--status-paused))]',
  completed: 'text-[hsl(var(--status-completed))]',
};

export function ObjectTrucksEditor({
  trucks,
  objectId,
  objectName,
  objectSteps,
  articleRows,
  onTrucksChange,
  onTruckStepStatusChange,
  onTruckStatusChange,
  orderInfo,
}: ObjectTrucksEditorProps) {
  const { isProduction } = useAuth();
  const [newTruckNumber, setNewTruckNumber] = useState('');
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [editingTruckNumber, setEditingTruckNumber] = useState('');

  // Add work unit (truck number is now optional)
  const handleAddWorkUnit = () => {
    const truckId = crypto.randomUUID();
    const newTruck: ObjectTruck = {
      id: truckId,
      objectId,
      truckNumber: newTruckNumber.trim(),
      status: 'waiting',
      stepStatuses: objectSteps.map(step => ({
        id: crypto.randomUUID(),
        truckId: truckId,
        stepId: step.id,
        status: 'pending' as StepStatus,
      })),
    };
    
    onTrucksChange([...trucks, newTruck]);
    setNewTruckNumber('');
  };

  const handleRemoveTruck = (truckId: string) => {
    onTrucksChange(trucks.filter(t => t.id !== truckId));
  };

  const handleStartEdit = (truck: ObjectTruck) => {
    setEditingTruckId(truck.id);
    setEditingTruckNumber(truck.truckNumber);
  };

  const handleSaveEdit = () => {
    if (!editingTruckId || !editingTruckNumber.trim()) return;
    
    onTrucksChange(trucks.map(t =>
      t.id === editingTruckId ? { ...t, truckNumber: editingTruckNumber.trim() } : t
    ));
    setEditingTruckId(null);
    setEditingTruckNumber('');
  };

  const handleCancelEdit = () => {
    setEditingTruckId(null);
    setEditingTruckNumber('');
  };

  const handleStepStatusClick = (truckId: string, stepId: string, currentStatus: StepStatus) => {
    const nextStatus: StepStatus = 
      currentStatus === 'pending' ? 'in_progress' :
      currentStatus === 'in_progress' ? 'completed' : 'pending';
    
    const truck = trucks.find(t => t.id === truckId);
    
    if (onTruckStepStatusChange) {
      onTruckStepStatusChange(truckId, stepId, nextStatus);
      
      if (truck && nextStatus === 'completed') {
        const allStepsCompleted = objectSteps.every(step => {
          if (step.id === stepId) return true;
          const status = truck.stepStatuses.find(s => s.stepId === step.id);
          return status?.status === 'completed';
        });
        
        if (allStepsCompleted && truck.status !== 'completed' && onTruckStatusChange) {
          onTruckStatusChange(truckId, 'completed');
        }
      }
    } else {
      const updatedTrucks = trucks.map(t => {
        if (t.id !== truckId) return t;
        const updatedTruck = {
          ...t,
          stepStatuses: t.stepStatuses.map(s => 
            s.stepId === stepId ? { ...s, status: nextStatus } : s
          ),
        };
        
        if (nextStatus === 'completed') {
          const allStepsCompleted = objectSteps.every(step => {
            if (step.id === stepId) return true;
            const status = updatedTruck.stepStatuses.find(s => s.stepId === step.id);
            return status?.status === 'completed';
          });
          
          if (allStepsCompleted) {
            updatedTruck.status = 'completed';
          }
        }
        
        return updatedTruck;
      });
      
      onTrucksChange(updatedTrucks);
    }
  };

  const getStepStatusForTruck = (truck: ObjectTruck, stepId: string): StepStatus => {
    const status = truck.stepStatuses.find(s => s.stepId === stepId);
    return status?.status || 'pending';
  };

  // No trucks - show compact add form
  if (trucks.length === 0) {
    return (
      <div className="py-2">
        {isProduction ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="ID (valfritt)..."
              value={newTruckNumber}
              onChange={(e) => setNewTruckNumber(e.target.value)}
              className="h-7 w-24 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddWorkUnit();
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleAddWorkUnit}
            >
              <Plus className="h-3 w-3 mr-1" />
              Lägg till arbetskort
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Inga arbetskort</p>
        )}
      </div>
    );
  }

  return (
    <div className="py-1 space-y-1">
      {/* Truck list - compact rows */}
      {trucks.map(truck => {
        const isEditing = editingTruckId === truck.id;

        return (
          <div key={truck.id} className="flex items-center gap-1.5 py-1 px-2 rounded bg-muted/30">
            {isEditing ? (
              <>
                <Input
                  value={editingTruckNumber}
                  onChange={(e) => setEditingTruckNumber(e.target.value)}
                  className="h-6 w-20 text-xs font-mono"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSaveEdit}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleCancelEdit}>
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <>
                <span className="font-mono font-bold text-xs w-20 truncate" title={getWorkUnitDisplayName(truck.truckNumber, objectName, truck.id)}>
                  {getWorkUnitDisplayName(truck.truckNumber, objectName, truck.id)}
                </span>
                
                {/* Status dropdown */}
                <Select
                  value={truck.status}
                  onValueChange={(value: TruckStatus) => {
                    if (onTruckStatusChange) {
                      onTruckStatusChange(truck.id, value);
                    } else {
                      onTrucksChange(trucks.map(t =>
                        t.id === truck.id ? { ...t, status: value } : t
                      ));
                    }
                  }}
                >
                  <SelectTrigger className={cn('h-6 w-24 text-xs', truckStatusColors[truck.status])}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(truckStatusLabels) as TruckStatus[]).map(s => (
                      <SelectItem key={s} value={s} className={cn('text-xs', truckStatusColors[s])}>
                        {truckStatusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Step status badges */}
                <div className="flex items-center gap-0.5 flex-1 flex-wrap">
                  {objectSteps.map(step => {
                    const status = getStepStatusForTruck(truck, step.id);
                    const colors = stepStatusColors[status];
                    return (
                      <button
                        key={step.id}
                        onClick={() => handleStepStatusClick(truck.id, step.id, status)}
                        className={cn(
                          'px-1.5 py-0 rounded text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap',
                          colors.bg,
                          colors.text
                        )}
                        title={`${step.name}: Klicka för att ändra status`}
                      >
                        {step.name} {colors.label}
                      </button>
                    );
                  })}
                </div>

                {isProduction && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleStartEdit(truck)}
                    title="Redigera"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {orderInfo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await printWorkCard({
                        truck,
                        objectName,
                        steps: objectSteps,
                        articleRows,
                        order: orderInfo,
                        baseUrl: window.location.origin,
                      });
                    }}
                    title="Skriv ut arbetskort"
                  >
                    <Printer className="h-3 w-3" />
                  </Button>
                )}
                {isProduction && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveTruck(truck.id)}
                    title="Ta bort"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Add new work card */}
      {isProduction && (
        <div className="flex items-center gap-1.5 pt-1">
          <Input
            placeholder="ID (valfritt)..."
            value={newTruckNumber}
            onChange={(e) => setNewTruckNumber(e.target.value)}
            className="h-6 w-24 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddWorkUnit();
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs"
            onClick={handleAddWorkUnit}
          >
            <Plus className="h-3 w-3 mr-1" />
            Lägg till
          </Button>
        </div>
      )}
    </div>
  );
}
