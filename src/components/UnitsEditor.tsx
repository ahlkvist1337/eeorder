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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import { useObjectTemplates } from '@/hooks/useObjectTemplates';
import { useAuth } from '@/contexts/AuthContext';
import type { OrderUnit, UnitObject, UnitObjectStep, StepStatus, TruckStatus, TruckBillingStatus, ArticleRow } from '@/types/order';
import { truckStatusLabels } from '@/types/order';
import { printWorkCardV2Object } from '@/lib/workCardPrint';

interface UnitsEditorProps {
  units: OrderUnit[];
  onUnitsChange: (units: OrderUnit[]) => void;
  onUnitStatusChange?: (unitId: string, status: TruckStatus) => void;
  onUnitStepStatusChange?: (unitId: string, stepId: string, status: StepStatus) => void;
  onUnitBillingStatusChange?: (unitId: string, status: TruckBillingStatus) => void;
  onUnitObjectStatusChange?: (unitId: string, objectId: string, status: TruckStatus) => void;
  onUnitObjectBillingStatusChange?: (unitId: string, objectId: string, status: TruckBillingStatus) => void;
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

export function UnitsEditor({ units, onUnitsChange, onUnitStatusChange, onUnitStepStatusChange, onUnitBillingStatusChange, onUnitObjectStatusChange, onUnitObjectBillingStatusChange, orderInfo, articleRows }: UnitsEditorProps) {
  const { steps: treatmentTemplates } = useTreatmentSteps();
  const { templates: objectTemplates } = useObjectTemplates();
  const { isProduction, isAdmin } = useAuth();
  
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editingUnitNumber, setEditingUnitNumber] = useState('');
  
  const [selectedObjectTemplate, setSelectedObjectTemplate] = useState<Record<string, string>>({});
  const [customObjectName, setCustomObjectName] = useState<Record<string, string>>({});
  const [selectedStepTemplate, setSelectedStepTemplate] = useState<Record<string, string>>({});
  const [addingStepForObject, setAddingStepForObject] = useState<string | null>(null);

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
          status: 'waiting' as TruckStatus,
          billingStatus: 'not_billable' as TruckBillingStatus,
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
  const handleStepStatusClick = (unitId: string, objectId: string, stepId: string, currentStatus: StepStatus) => {
    // Check unit lock
    const parentUnit = units.find(u => u.id === unitId);
    if (parentUnit) {
      const unitLocked = parentUnit.billingStatus === 'billed' || parentUnit.billingStatus === 'ready_for_billing';
      if (unitLocked && !isAdmin) return;
      if (unitLocked && isAdmin) {
        if (!confirm('Är du säker? Detta kan påverka fakturering')) return;
      }
    }

    const nextStatus: StepStatus =
      currentStatus === 'pending' ? 'in_progress' :
      currentStatus === 'in_progress' ? 'completed' : 'pending';

    const unit = units.find(u => u.id === unitId);
    if (!unit) return;
    const obj = unit.objects.find(o => o.id === objectId);
    if (!obj) return;

    if (onUnitStepStatusChange) {
      onUnitStepStatusChange(unitId, stepId, nextStatus);
      // Auto-status logic is handled centrally in OrdersContext.updateV2StepStatus
    } else {
      // Fallback: local-only update (for create mode)
      onUnitsChange(units.map(u => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          objects: u.objects.map(o => {
            if (o.id !== objectId) return o;
            const updated = {
              ...o,
              steps: o.steps.map(s =>
                s.id === stepId ? { ...s, status: nextStatus } : s
              ),
            };
            if (nextStatus === 'in_progress' && (updated.status === 'waiting' || updated.status === 'arrived' || updated.status === 'paused')) {
              updated.status = 'started';
            }
            if (nextStatus === 'completed' && updated.steps.every(s => s.status === 'completed')) {
              updated.status = 'completed';
            }
            if (nextStatus === 'pending' && updated.steps.every(s => s.status === 'pending') && (updated.status === 'started' || updated.status === 'paused')) {
              updated.status = 'arrived';
            }
            return updated;
          }),
        };
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
      status: 'waiting',
      billingStatus: 'not_billable',
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
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit(); }
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={handleSaveEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Unit name + aggregate status */}
                   <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-bold text-sm min-w-[60px]">
                      {getUnitDisplayName(unit, unitIndex)}
                    </span>
                    
                    {/* Billing status badge */}
                    {unit.billingStatus === 'billed' && (
                      <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 rounded-sm">Fakturerad</Badge>
                    )}
                    {unit.billingStatus === 'ready_for_billing' && (
                      <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0 rounded-sm">Klar för fakturering</Badge>
                    )}

                    {/* Aggregate status summary */}
                    {unit.objects.length > 0 && (() => {
                      const total = unit.objects.length;
                      const delivered = unit.objects.filter(o => o.status === 'delivered').length;
                      const packed = unit.objects.filter(o => o.status === 'packed' || o.status === 'delivered').length;
                      const completed = unit.objects.filter(o => o.status === 'completed' || o.status === 'packed' || o.status === 'delivered').length;
                      return (
                        <span className="text-xs text-muted-foreground">
                          {delivered === total ? 'Allt levererat' :
                           packed === total ? 'Allt packat' :
                           completed === total ? 'Allt klart' :
                           `${completed}/${total} klara`}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0" />

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isProduction && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleStartEdit(unit)} title="Byt namn">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {isProduction && (
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleDuplicateUnit(unit)} title="Duplicera">
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
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
                        type="button"
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

            {/* Objects with step badges — always visible */}
            {unit.objects.length > 0 && (
              <div className="px-3 py-2 space-y-2 border-t">
                {unit.objects.map(obj => {
                  const unitLocked = unit.billingStatus === 'billed' || unit.billingStatus === 'ready_for_billing';
                  const isLocked = unitLocked && !isAdmin;
                  return (
                  <div key={obj.id} data-object-id={obj.id}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Box className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{obj.name}</span>
                      
                       {/* Object status dropdown */}
                      <Select
                        value={obj.status}
                        disabled={isLocked}
                        onValueChange={(value: TruckStatus) => {
                          if (unitLocked && isAdmin) {
                            if (!confirm('Är du säker? Detta kan påverka fakturering')) return;
                          }
                          if (onUnitObjectStatusChange) {
                            onUnitObjectStatusChange(unit.id, obj.id, value);
                          } else {
                            onUnitsChange(units.map(u =>
                              u.id === unit.id ? { ...u, objects: u.objects.map(o => o.id === obj.id ? { ...o, status: value } : o) } : u
                            ));
                          }
                        }}
                      >
                        <SelectTrigger className={cn('h-7 w-24 text-xs', truckStatusColors[obj.status])}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(truckStatusLabels) as TruckStatus[]).map(s => (
                            <SelectItem key={s} value={s} className={cn('text-xs py-1.5', truckStatusColors[s])}>
                              {truckStatusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Pack button */}
                      {obj.status === 'completed' && onUnitObjectStatusChange && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-amber-500/10 border-amber-500 text-amber-700 hover:bg-amber-500/20"
                          onClick={() => onUnitObjectStatusChange(unit.id, obj.id, 'packed')}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          Packa
                        </Button>
                      )}
                      
                      {/* Deliver button */}
                      {obj.status === 'packed' && onUnitObjectStatusChange && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs bg-emerald-600/10 border-emerald-600 text-emerald-700 hover:bg-emerald-600/20"
                          onClick={() => onUnitObjectStatusChange(unit.id, obj.id, 'delivered')}
                        >
                          <TruckIcon className="h-3 w-3 mr-1" />
                          Leverera
                        </Button>
                      )}

                      {/* Spacer to push action buttons right */}
                      <div className="flex-1" />

                      {/* Action buttons inline on same row */}
                      {orderInfo && obj.steps.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-6 sm:w-6"
                          onClick={async () => {
                            await printWorkCardV2Object({
                              unitObject: obj,
                              unitNumber: unit.unitNumber,
                              articleRows: articleRows?.filter(r => r.unitId === unit.id || !r.unitId),
                              order: orderInfo,
                              baseUrl: window.location.origin,
                            });
                          }}
                          title="Skriv ut arbetskort"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isProduction && !isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-6 sm:w-6"
                          onClick={() => setAddingStepForObject(prev => prev === obj.id ? null : obj.id)}
                          title="Lägg till steg"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {isProduction && !isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-6 sm:w-6 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveObject(unit.id, obj.id)}
                          title="Ta bort objekt"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    
                    {/* Step badges row */}
                    {obj.steps.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-5 mt-1 flex-wrap">
                        {obj.steps.map(step => {
                          const colors = stepStatusColors[step.status];
                          return (
                      <button
                              type="button"
                              key={step.id}
                              onClick={() => handleStepStatusClick(unit.id, obj.id, step.id, step.status)}
                              className={cn(
                                'px-2 py-1 sm:px-2 sm:py-0.5 rounded-md text-xs font-medium transition-colors hover:opacity-80 min-h-[44px] sm:min-h-0 whitespace-nowrap',
                                colors.bg,
                                colors.text,
                                isLocked && 'pointer-events-none opacity-60'
                              )}
                              title={`${obj.name} → ${step.name}: Klicka för att ändra status`}
                            >
                              {step.name} {colors.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline step-adder */}
                    {addingStepForObject === obj.id && isProduction && (
                      <div className="flex gap-1.5 ml-5 mt-1">
                        <Select value={selectedStepTemplate[obj.id] || ''} onValueChange={v => setSelectedStepTemplate(prev => ({ ...prev, [obj.id]: v }))}>
                          <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Välj steg..." /></SelectTrigger>
                          <SelectContent>{treatmentTemplates.map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}</SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => { handleAddStep(unit.id, obj.id); }} disabled={!selectedStepTemplate[obj.id]}>
                          <Plus className="h-3 w-3 mr-1" /> Steg
                        </Button>
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            )}

            {/* Expanded: add objects only */}
            {isExpanded && isProduction && (
              <div className="px-3 py-2 border-t bg-muted/5">
                <div className="flex gap-1.5">
                  <Select value={selectedObjectTemplate[unit.id] || ''} onValueChange={v => { setSelectedObjectTemplate(prev => ({ ...prev, [unit.id]: v })); if (v !== '__custom__') setCustomObjectName(prev => ({ ...prev, [unit.id]: '' })); }}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Välj objekttyp..." /></SelectTrigger>
                    <SelectContent>{objectTemplates.map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}<SelectItem value="__custom__">Eget namn...</SelectItem></SelectContent>
                  </Select>
                  {selectedObjectTemplate[unit.id] === '__custom__' && (
                    <Input value={customObjectName[unit.id] || ''} onChange={e => setCustomObjectName(prev => ({ ...prev, [unit.id]: e.target.value }))} placeholder="Objektnamn" className="h-8 text-xs flex-1" />
                  )}
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleAddObject(unit.id)} disabled={!selectedObjectTemplate[unit.id] || (selectedObjectTemplate[unit.id] === '__custom__' && !customObjectName[unit.id]?.trim())}>
                    <Plus className="h-3 w-3 mr-1" /> Objekt
                  </Button>
                </div>
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
              placeholder="Enhetsnamn (valfritt)"
              className="h-9 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddUnit(); } }}
            />
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleAddUnit}>
            <Plus className="h-4 w-4 mr-1" /> Lägg till enhet
          </Button>
        </div>
      )}
    </div>
  );
}
