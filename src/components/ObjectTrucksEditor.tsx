import { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight, Package, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { ObjectTruck, OrderStep, StepStatus, TruckStatus } from '@/types/order';
import { truckStatusLabels, getWorkUnitDisplayName } from '@/types/order';
import { printWorkCard } from '@/lib/workCardPrint';

interface ObjectTrucksEditorProps {
  trucks: ObjectTruck[];
  objectId: string;
  objectName: string;
  objectSteps: OrderStep[];
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

function getTruckOverallStatus(truck: ObjectTruck, objectSteps: OrderStep[]): { label: string; color: string } {
  if (objectSteps.length === 0 || truck.stepStatuses.length === 0) {
    return { label: 'Väntande', color: 'text-muted-foreground' };
  }
  
  const allCompleted = objectSteps.every(step => {
    const status = truck.stepStatuses.find(s => s.stepId === step.id);
    return status?.status === 'completed';
  });
  
  const anyInProgress = truck.stepStatuses.some(s => s.status === 'in_progress');
  const anyCompleted = truck.stepStatuses.some(s => s.status === 'completed');
  
  if (allCompleted) return { label: '✅ Klar', color: 'text-[hsl(var(--status-completed))]' };
  if (anyInProgress) return { label: '🔄 Pågående', color: 'text-[hsl(var(--status-started))]' };
  if (anyCompleted) return { label: '🔄 Pågående', color: 'text-[hsl(var(--status-started))]' };
  return { label: '⏳ Väntande', color: 'text-muted-foreground' };
}

export function ObjectTrucksEditor({
  trucks,
  objectId,
  objectName,
  objectSteps,
  onTrucksChange,
  onTruckStepStatusChange,
  onTruckStatusChange,
  orderInfo,
}: ObjectTrucksEditorProps) {
  const { isProduction } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newTruckNumber, setNewTruckNumber] = useState('');
  const [editingTruckId, setEditingTruckId] = useState<string | null>(null);
  const [editingTruckNumber, setEditingTruckNumber] = useState('');

  const completedTrucks = trucks.filter(truck => {
    if (objectSteps.length === 0) return false;
    return objectSteps.every(step => {
      const status = truck.stepStatuses.find(s => s.stepId === step.id);
      return status?.status === 'completed';
    });
  });

  // Add work unit (truck number is now optional)
  const handleAddWorkUnit = () => {
    const truckId = crypto.randomUUID();
    const newTruck: ObjectTruck = {
      id: truckId,
      objectId,
      truckNumber: newTruckNumber.trim(), // Can be empty string
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
    // Cycle through statuses: pending -> in_progress -> completed -> pending
    const nextStatus: StepStatus = 
      currentStatus === 'pending' ? 'in_progress' :
      currentStatus === 'in_progress' ? 'completed' : 'pending';
    
    // Find the truck to check if all steps will be completed
    const truck = trucks.find(t => t.id === truckId);
    
    if (onTruckStepStatusChange) {
      onTruckStepStatusChange(truckId, stepId, nextStatus);
      
      // Check if all steps are now completed (after this change)
      if (truck && nextStatus === 'completed') {
        const allStepsCompleted = objectSteps.every(step => {
          if (step.id === stepId) return true; // This step will be completed
          const status = truck.stepStatuses.find(s => s.stepId === step.id);
          return status?.status === 'completed';
        });
        
        // Auto-mark truck as completed if all steps are done
        if (allStepsCompleted && truck.status !== 'completed' && onTruckStatusChange) {
          onTruckStatusChange(truckId, 'completed');
        }
      }
    } else {
      // Update locally
      const updatedTrucks = trucks.map(t => {
        if (t.id !== truckId) return t;
        const updatedTruck = {
          ...t,
          stepStatuses: t.stepStatuses.map(s => 
            s.stepId === stepId ? { ...s, status: nextStatus } : s
          ),
        };
        
        // Check if all steps are now completed
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

  if (trucks.length === 0 && !isExpanded) {
    return (
      <div className="mt-3 pt-3 border-t">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Inga arbetskort</span>
          <div className="flex-1" />
          {isProduction && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="ID (valfritt)..."
                value={newTruckNumber}
                onChange={(e) => setNewTruckNumber(e.target.value)}
                className="h-8 w-28 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddWorkUnit();
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={handleAddWorkUnit}
              >
                <Plus className="h-4 w-4 mr-1" />
                Lägg till
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 -ml-2">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Package className="h-4 w-4 ml-1" />
            </Button>
          </CollapsibleTrigger>
          <span className="text-sm font-medium">Arbetskort:</span>
          <Badge variant="secondary" className="text-xs">
            {trucks.length} st • {completedTrucks.length} klar{completedTrucks.length !== 1 ? 'a' : ''}
          </Badge>
        </div>

        <CollapsibleContent className="mt-2">
          <div className="space-y-2 pl-4">
            {/* Truck list */}
            {trucks.map(truck => {
              const isEditing = editingTruckId === truck.id;
              const overallStatus = getTruckOverallStatus(truck, objectSteps);

              return (
                <div key={truck.id} className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/30">
                  {isEditing ? (
                    <>
                      <Input
                        value={editingTruckNumber}
                        onChange={(e) => setEditingTruckNumber(e.target.value)}
                        className="h-7 w-24 text-sm font-mono"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveEdit}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono font-bold text-sm w-24 truncate" title={getWorkUnitDisplayName(truck.truckNumber, objectName, truck.id)}>
                        {getWorkUnitDisplayName(truck.truckNumber, objectName, truck.id)}
                      </span>
                      
                      {/* Work unit status dropdown */}
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
                        <SelectTrigger className={cn('h-7 w-28 text-xs', truckStatusColors[truck.status])}>
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
                      <div className="flex items-center gap-1 flex-1 flex-wrap">
                        {objectSteps.map(step => {
                          const status = getStepStatusForTruck(truck, step.id);
                          const colors = stepStatusColors[status];
                          return (
                            <button
                              key={step.id}
                              onClick={() => handleStepStatusClick(truck.id, step.id, status)}
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium transition-colors hover:opacity-80 whitespace-nowrap',
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
                          className="h-6 w-6"
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
                          className="h-6 w-6"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await printWorkCard({
                              truck,
                              objectName,
                              steps: objectSteps,
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
                          className="h-6 w-6 text-destructive hover:text-destructive"
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

            {/* Add new work card - production only */}
            {isProduction && (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="ID (valfritt)..."
                  value={newTruckNumber}
                  onChange={(e) => setNewTruckNumber(e.target.value)}
                  className="h-8 w-28 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddWorkUnit();
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={handleAddWorkUnit}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Lägg till
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
