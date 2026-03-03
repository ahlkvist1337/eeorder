import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Box, Pencil, Check, X, Printer, Package, Truck as TruckIcon, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import { useObjectTemplates } from '@/hooks/useObjectTemplates';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderUnit, UnitObject, UnitObjectStep, StepStatus, TruckStatus, TruckBillingStatus, ArticleRow } from '@/types/order';
import { truckStatusLabels, truckBillingStatusLabels } from '@/types/order';
import { printWorkCardV2Object } from '@/lib/workCardPrint';

interface UnitsEditorProps {
  units: OrderUnit[];
  onUnitsChange: (units: OrderUnit[]) => void;
  onUnitStatusChange?: (unitId: string, status: TruckStatus) => void;
  onUnitStepStatusChange?: (unitId: string, stepId: string, status: StepStatus) => void;
  onUnitBillingStatusChange?: (unitId: string, status: TruckBillingStatus) => void;
  orderInfo?: { id: string; orderNumber: string; customer: string };
  articleRows?: ArticleRow[];
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
  packed: 'text-amber-500',
  delivered: 'text-emerald-600',
};

export function UnitsEditor({ units, onUnitsChange, onUnitStatusChange, onUnitStepStatusChange, onUnitBillingStatusChange, orderInfo, articleRows }: UnitsEditorProps) {
  const { steps: treatmentTemplates } = useTreatmentSteps();
  const { templates: objectTemplates } = useObjectTemplates();
  const { isProduction } = useAuth();
  
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitNumber, setEditingUnitNumber] = useState('');
  
  const [selectedObjectTemplate, setSelectedObjectTemplate] = useState<Record<string, string>>({});
  const [customObjectName, setCustomObjectName] = useState<Record<string, string>>({});
  const [selectedStepTemplate, setSelectedStepTemplate] = useState<Record<string, string>>({});

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // --- Unit CRUD ---
  const handleAddUnit = () => {
    const unit: OrderUnit = {
      id: crypto.randomUUID(),
      orderId: '',
      unitNumber: newUnitNumber.trim(),
      status: 'waiting',
      billingStatus: 'not_billable',
      objects: [],
    };
    onUnitsChange([...units, unit]);
    setNewUnitNumber('');
  };

  const handleRemoveUnit = (unitId: string) => {
    onUnitsChange(units.filter(u => u.id !== unitId));
  };

  const handleDuplicateUnit = (unit: OrderUnit) => {
    const newUnit: OrderUnit = {
      id: crypto.randomUUID(),
      orderId: unit.orderId,
      unitNumber: '',
      status: 'waiting',
      billingStatus: 'not_billable',
      objects: unit.objects.map(obj => {
        const newObjId = crypto.randomUUID();
        return {
          id: newObjId,
          unitId: '', 
          name: obj.name,
          description: obj.description,
          steps: obj.steps.map(s => ({
            id: crypto.randomUUID(),
            unitObjectId: newObjId,
            templateId: s.templateId,
            name: s.name,
            sortOrder: s.sortOrder,
            status: 'pending' as StepStatus,
          })),
        };
      }),
    };
    newUnit.objects = newUnit.objects.map(obj => ({ ...obj, unitId: newUnit.id }));
    onUnitsChange([...units, newUnit]);
  };

  const handleStartEdit = (unit: OrderUnit) => {
    setEditingUnitId(unit.id);
    setEditingUnitNumber(unit.unitNumber || '');
  };

  const handleSaveEdit = () => {
    if (!editingUnitId) return;
    onUnitsChange(units.map(u =>
      u.id === editingUnitId ? { ...u, unitNumber: editingUnitNumber.trim() } : u
    ));
    setEditingUnitId(null);
    setEditingUnitNumber('');
  };

  const handleCancelEdit = () => {
    setEditingUnitId(null);
    setEditingUnitNumber('');
  };

  // --- Step status click (auto-status logic like V1) ---
  const handleStepStatusClick = (unitId: string, stepId: string, currentStatus: StepStatus) => {
    const nextStatus: StepStatus =
      currentStatus === 'pending' ? 'in_progress' :
      currentStatus === 'in_progress' ? 'completed' : 'pending';

    const unit = units.find(u => u.id === unitId);
    if (!unit) return;

    if (onUnitStepStatusChange) {
      onUnitStepStatusChange(unitId, stepId, nextStatus);

      // Auto-status: step → in_progress → unit starts
      if (nextStatus === 'in_progress') {
        if (unit.status === 'waiting' || unit.status === 'arrived' || unit.status === 'paused') {
          onUnitStatusChange?.(unitId, 'started');
        }
      }

      // Auto-status: all steps completed → unit completed
      if (nextStatus === 'completed') {
        const allSteps = unit.objects.flatMap(o => o.steps);
        const allCompleted = allSteps.every(s =>
          s.id === stepId ? true : s.status === 'completed'
        );
        if (allCompleted && unit.status !== 'completed') {
          onUnitStatusChange?.(unitId, 'completed');
        }
      }

      // Auto-status: all steps back to pending → unit back to arrived
      if (nextStatus === 'pending') {
        const allSteps = unit.objects.flatMap(o => o.steps);
        const allPending = allSteps.every(s =>
          s.id === stepId ? true : s.status === 'pending'
        );
        if (allPending && (unit.status === 'started' || unit.status === 'paused')) {
          onUnitStatusChange?.(unitId, 'arrived');
        }
      }
    } else {
      // Fallback: local-only update (for create mode)
      onUnitsChange(units.map(u => {
        if (u.id !== unitId) return u;
        const updated = {
          ...u,
          objects: u.objects.map(obj => ({
            ...obj,
            steps: obj.steps.map(s =>
              s.id === stepId ? { ...s, status: nextStatus } : s
            ),
          })),
        };
        if (nextStatus === 'in_progress' && (updated.status === 'waiting' || updated.status === 'arrived' || updated.status === 'paused')) {
          updated.status = 'started';
        }
        const allSteps = updated.objects.flatMap(o => o.steps);
        if (nextStatus === 'completed' && allSteps.every(s => s.status === 'completed')) {
          updated.status = 'completed';
        }
        if (nextStatus === 'pending' && allSteps.every(s => s.status === 'pending') && (updated.status === 'started' || updated.status === 'paused')) {
          updated.status = 'arrived';
        }
        return updated;
      }));
    }
  };

  // --- Object/Step CRUD ---
  const handleAddObject = (unitId: string) => {
    const templateId = selectedObjectTemplate[unitId];
    const custom = customObjectName[unitId]?.trim();
    let name = '';
    if (templateId && templateId !== '__custom__') {
      const tmpl = objectTemplates.find(t => t.id === templateId);
      name = tmpl?.name || '';
    } else if (custom) {
      name = custom;
    }
    if (!name) return;

    const obj: UnitObject = {
      id: crypto.randomUUID(),
      unitId,
      name,
      steps: [],
    };

    onUnitsChange(units.map(u =>
      u.id === unitId ? { ...u, objects: [...u.objects, obj] } : u
    ));
    setSelectedObjectTemplate(prev => ({ ...prev, [unitId]: '' }));
    setCustomObjectName(prev => ({ ...prev, [unitId]: '' }));
  };

  const handleRemoveObject = (unitId: string, objectId: string) => {
    onUnitsChange(units.map(u =>
      u.id === unitId ? { ...u, objects: u.objects.filter(o => o.id !== objectId) } : u
    ));
  };

  const handleAddStep = (unitId: string, objectId: string) => {
    const templateId = selectedStepTemplate[objectId];
    if (!templateId) return;
    const tmpl = treatmentTemplates.find(t => t.id === templateId);
    if (!tmpl) return;

    const step: UnitObjectStep = {
      id: crypto.randomUUID(),
      unitObjectId: objectId,
      templateId: tmpl.id,
      name: tmpl.name,
      sortOrder: 0,
      status: 'pending',
    };

    onUnitsChange(units.map(u =>
      u.id === unitId
        ? {
            ...u,
            objects: u.objects.map(o =>
              o.id === objectId ? { ...o, steps: [...o.steps, step] } : o
            ),
          }
        : u
    ));
    setSelectedStepTemplate(prev => ({ ...prev, [objectId]: '' }));
  };

  const handleRemoveStep = (unitId: string, objectId: string, stepId: string) => {
    onUnitsChange(units.map(u =>
      u.id === unitId
        ? {
            ...u,
            objects: u.objects.map(o =>
              o.id === objectId ? { ...o, steps: o.steps.filter(s => s.id !== stepId) } : o
            ),
          }
        : u
    ));
  };

  const getUnitDisplayName = (unit: OrderUnit, index: number) => {
    return unit.unitNumber ? `#${unit.unitNumber}` : `Enhet ${index + 1}`;
  };

  return (
    <div className="space-y-3">
      {units.length === 0 && (
        <p className="text-muted-foreground text-center py-4 text-sm">
          Inga enheter tillagda. Lägg till en enhet för att komma igång.
        </p>
      )}

      {units.map((unit, unitIndex) => {
        const isExpanded = expandedUnits.has(unit.id);
        const isEditing = editingUnitId === unit.id;

        return (
          <div key={unit.id} className="border rounded-md overflow-hidden">
            {/* Unit header row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 px-3 bg-muted/30">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingUnitNumber}
                    onChange={(e) => setEditingUnitNumber(e.target.value)}
                    className="h-9 w-32 text-sm font-mono"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Unit name + status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-bold text-sm min-w-[60px]">
                      {getUnitDisplayName(unit, unitIndex)}
                    </span>
                    
                    <Select
                      value={unit.status}
                      onValueChange={(value: TruckStatus) => {
                        if (onUnitStatusChange) {
                          onUnitStatusChange(unit.id, value);
                        } else {
                          onUnitsChange(units.map(u =>
                            u.id === unit.id ? { ...u, status: value } : u
                          ));
                        }
                      }}
                    >
                      <SelectTrigger className={cn('h-9 w-28 text-sm', truckStatusColors[unit.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(truckStatusLabels) as TruckStatus[]).map(s => (
                          <SelectItem key={s} value={s} className={cn('text-sm py-2', truckStatusColors[s])}>
                            {truckStatusLabels[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Step badges grouped by object */}
                  {unit.objects.length > 0 && (
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      {unit.objects.map(obj => {
                        if (obj.steps.length === 0) return null;
                        return (
                          <div key={obj.id} className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-muted-foreground font-medium min-w-fit">{obj.name}:</span>
                            {obj.steps.map(step => {
                              const colors = stepStatusColors[step.status];
                              return (
                                <button
                                  key={step.id}
                                  onClick={() => handleStepStatusClick(unit.id, step.id, step.status)}
                                  className={cn(
                                    'px-2 py-1 sm:px-2 sm:py-0.5 rounded-md text-xs font-medium transition-colors hover:opacity-80 min-h-[44px] sm:min-h-0 whitespace-nowrap',
                                    colors.bg,
                                    colors.text
                                  )}
                                  title={`${obj.name} → ${step.name}: Klicka för att ändra status`}
                                >
                                  {step.name} {colors.label}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pack/Deliver buttons + Billing status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {unit.status === 'completed' && onUnitStatusChange && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/20"
                        onClick={() => onUnitStatusChange(unit.id, 'packed')}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Packa
                      </Button>
                    )}
                    
                    {unit.status === 'packed' && onUnitStatusChange && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 bg-emerald-600/10 border-emerald-600 text-emerald-700 hover:bg-emerald-600/20"
                        onClick={() => onUnitStatusChange(unit.id, 'delivered')}
                      >
                        <TruckIcon className="h-4 w-4 mr-1" />
                        Leverera
                      </Button>
                    )}
                    
                    {unit.status === 'delivered' && (
                      <span className={cn(
                        'text-xs px-2 py-1 rounded-md font-medium',
                        unit.billingStatus === 'billed' ? 'bg-emerald-100 text-emerald-700' :
                        unit.billingStatus === 'ready_for_billing' ? 'bg-blue-100 text-blue-700' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {truckBillingStatusLabels[unit.billingStatus]}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isProduction && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleStartEdit(unit)} title="Byt namn">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isProduction && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleDuplicateUnit(unit)} title="Duplicera">
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => toggleUnit(unit.id)}
                      title={isExpanded ? 'Fäll ihop' : 'Visa objekt/steg'}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    {isProduction && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (unit.objects.length > 0) {
                            if (confirm('Ta bort enheten och alla dess objekt och steg?')) handleRemoveUnit(unit.id);
                          } else {
                            handleRemoveUnit(unit.id);
                          }
                        }}
                        title="Ta bort"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Expanded: edit objects/steps structure */}
            {isExpanded && (
              <div className="px-3 py-2 space-y-3 border-t">
                {unit.objects.map(obj => (
                  <div key={obj.id} className="border rounded-md overflow-hidden bg-muted/10">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <Box className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{obj.name}</span>
                      <span className="text-xs text-muted-foreground">{obj.steps.length} steg</span>
                      <div className="ml-auto flex items-center gap-1">
                        {/* Print work card per object */}
                        {orderInfo && obj.steps.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async () => {
                              await printWorkCardV2Object({
                                unitObject: obj,
                                unitNumber: unit.unitNumber,
                                articleRows: articleRows?.filter(r => r.unitId === unit.id),
                                order: orderInfo,
                                baseUrl: window.location.origin,
                              });
                            }}
                            title="Skriv ut arbetskort för detta objekt"
                          >
                            <Printer className="h-3 w-3" />
                          </Button>
                        )}
                        {isProduction && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveObject(unit.id, obj.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="px-3 pb-2 space-y-1.5">
                      {obj.steps.map(step => (
                        <div key={step.id} className="flex items-center gap-2 text-sm pl-2">
                          <span className="flex-1">{step.name}</span>
                          {isProduction && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleRemoveStep(unit.id, obj.id, step.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {isProduction && (
                        <div className="flex gap-1.5 pt-1">
                          <Select
                            value={selectedStepTemplate[obj.id] || ''}
                            onValueChange={v => setSelectedStepTemplate(prev => ({ ...prev, [obj.id]: v }))}
                          >
                            <SelectTrigger className="h-8 text-xs flex-1">
                              <SelectValue placeholder="Välj steg..." />
                            </SelectTrigger>
                            <SelectContent>
                              {treatmentTemplates.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleAddStep(unit.id, obj.id)}
                            disabled={!selectedStepTemplate[obj.id]}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Steg
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add object */}
                {isProduction && (
                  <div className="flex gap-1.5">
                    <Select
                      value={selectedObjectTemplate[unit.id] || ''}
                      onValueChange={v => {
                        setSelectedObjectTemplate(prev => ({ ...prev, [unit.id]: v }));
                        if (v !== '__custom__') setCustomObjectName(prev => ({ ...prev, [unit.id]: '' }));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Välj objekttyp..." />
                      </SelectTrigger>
                      <SelectContent>
                        {objectTemplates.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                        <SelectItem value="__custom__">Eget namn...</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedObjectTemplate[unit.id] === '__custom__' && (
                      <Input
                        value={customObjectName[unit.id] || ''}
                        onChange={e => setCustomObjectName(prev => ({ ...prev, [unit.id]: e.target.value }))}
                        placeholder="Objektnamn"
                        className="h-8 text-xs flex-1"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => handleAddObject(unit.id)}
                      disabled={
                        !selectedObjectTemplate[unit.id] ||
                        (selectedObjectTemplate[unit.id] === '__custom__' && !customObjectName[unit.id]?.trim())
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" /> Objekt
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add unit */}
      {isProduction && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={newUnitNumber}
              onChange={e => setNewUnitNumber(e.target.value)}
              placeholder="Enhetsnummer (valfritt, t.ex. registreringsnummer)"
              className="h-9 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') handleAddUnit(); }}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={handleAddUnit}>
            <Plus className="h-4 w-4 mr-1" /> Lägg till enhet
          </Button>
        </div>
      )}
    </div>
  );
}
