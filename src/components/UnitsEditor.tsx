import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import { useObjectTemplates } from '@/hooks/useObjectTemplates';
import type { OrderUnit, UnitObject, UnitObjectStep } from '@/types/order';

interface UnitsEditorProps {
  units: OrderUnit[];
  onUnitsChange: (units: OrderUnit[]) => void;
}

export function UnitsEditor({ units, onUnitsChange }: UnitsEditorProps) {
  const { steps: treatmentTemplates } = useTreatmentSteps();
  const { templates: objectTemplates } = useObjectTemplates();
  
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set(units.map(u => u.id)));
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  
  // Add unit state
  const [newUnitNumber, setNewUnitNumber] = useState('');
  
  // Add object state per unit
  const [selectedObjectTemplate, setSelectedObjectTemplate] = useState<Record<string, string>>({});
  const [customObjectName, setCustomObjectName] = useState<Record<string, string>>({});
  
  // Add step state per object
  const [selectedStepTemplate, setSelectedStepTemplate] = useState<Record<string, string>>({});

  const toggleUnit = (id: string) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleObject = (id: string) => {
    setExpandedObjects(prev => {
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
    setExpandedUnits(prev => new Set([...prev, unit.id]));
    setNewUnitNumber('');
  };

  const handleRemoveUnit = (unitId: string) => {
    onUnitsChange(units.filter(u => u.id !== unitId));
  };

  // --- Object CRUD within a unit ---
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
    setExpandedObjects(prev => new Set([...prev, obj.id]));
    setSelectedObjectTemplate(prev => ({ ...prev, [unitId]: '' }));
    setCustomObjectName(prev => ({ ...prev, [unitId]: '' }));
  };

  const handleRemoveObject = (unitId: string, objectId: string) => {
    onUnitsChange(units.map(u =>
      u.id === unitId ? { ...u, objects: u.objects.filter(o => o.id !== objectId) } : u
    ));
  };

  // --- Step CRUD within an object ---
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

  return (
    <div className="space-y-3">
      {units.length === 0 && (
        <p className="text-muted-foreground text-center py-4 text-sm">
          Inga enheter tillagda. Lägg till en enhet för att komma igång.
        </p>
      )}

      {units.map(unit => {
        const isExpanded = expandedUnits.has(unit.id);
        const objectCount = unit.objects.length;
        const stepCount = unit.objects.reduce((sum, o) => sum + o.steps.length, 0);

        return (
          <div key={unit.id} className="border rounded-md overflow-hidden">
            {/* Unit header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleUnit(unit.id)}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <span className="font-semibold text-sm">
                {unit.unitNumber ? `#${unit.unitNumber}` : `Enhet ${units.indexOf(unit) + 1}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {objectCount} objekt • {stepCount} steg
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive ml-auto"
                onClick={() => {
                  if (objectCount > 0) {
                    if (confirm(`Ta bort enheten och alla dess objekt och steg?`)) handleRemoveUnit(unit.id);
                  } else {
                    handleRemoveUnit(unit.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Unit content */}
            {isExpanded && (
              <div className="px-3 py-2 space-y-3">
                {/* Objects within this unit */}
                {unit.objects.map(obj => {
                  const isObjExpanded = expandedObjects.has(obj.id);
                  return (
                    <div key={obj.id} className="border rounded-md overflow-hidden bg-muted/10">
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => toggleObject(obj.id)}>
                          {isObjExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </Button>
                        <Box className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{obj.name}</span>
                        {obj.steps.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {obj.steps.map(s => (
                              <Badge key={s.id} variant="outline" className="text-xs py-0 px-1.5">{s.name}</Badge>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive ml-auto"
                          onClick={() => handleRemoveObject(unit.id, obj.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {isObjExpanded && (
                        <div className="px-3 pb-2 space-y-1.5">
                          {obj.steps.length === 0 && (
                            <p className="text-xs text-muted-foreground py-1">Inga steg tillagda.</p>
                          )}
                          {obj.steps.map(step => (
                            <div key={step.id} className="flex items-center gap-2 text-sm pl-2">
                              <span className="flex-1">{step.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => handleRemoveStep(unit.id, obj.id, step.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {/* Add step */}
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
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add object to unit */}
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
              </div>
            )}
          </div>
        );
      })}

      {/* Add unit */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={newUnitNumber}
            onChange={e => setNewUnitNumber(e.target.value)}
            placeholder="Enhetsnummer (valfritt, t.ex. registreringsnummer)"
            className="h-9 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" className="h-9" onClick={handleAddUnit}>
          <Plus className="h-4 w-4 mr-1" /> Lägg till enhet
        </Button>
      </div>
    </div>
  );
}
