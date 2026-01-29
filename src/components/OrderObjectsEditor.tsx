import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StepStatusBadge } from '@/components/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import { stepStatusLabels } from '@/types/order';
import type { OrderStep, StepStatus, OrderObject } from '@/types/order';

interface OrderObjectsEditorProps {
  objects: OrderObject[];
  steps: OrderStep[];
  onObjectsChange: (objects: OrderObject[]) => void;
  onStepsChange: (steps: OrderStep[]) => void;
}

export function OrderObjectsEditor({ 
  objects, 
  steps, 
  onObjectsChange, 
  onStepsChange 
}: OrderObjectsEditorProps) {
  const { steps: treatmentTemplates } = useTreatmentSteps();
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set(objects.map(o => o.id)));
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [editingObjectName, setEditingObjectName] = useState('');
  const [newObjectName, setNewObjectName] = useState('');
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});

  // Get steps for a specific object
  const getStepsForObject = (objectId: string) => {
    return steps.filter(s => s.objectId === objectId);
  };

  // Get steps without object (legacy/unassigned)
  const getUnassignedSteps = () => {
    return steps.filter(s => !s.objectId);
  };

  const toggleExpanded = (objectId: string) => {
    setExpandedObjects(prev => {
      const next = new Set(prev);
      if (next.has(objectId)) {
        next.delete(objectId);
      } else {
        next.add(objectId);
      }
      return next;
    });
  };

  // Object management
  const handleAddObject = () => {
    if (!newObjectName.trim()) return;
    
    const newObject: OrderObject = {
      id: crypto.randomUUID(),
      name: newObjectName.trim(),
    };
    
    onObjectsChange([...objects, newObject]);
    setExpandedObjects(prev => new Set([...prev, newObject.id]));
    setNewObjectName('');
  };

  const handleRemoveObject = (objectId: string) => {
    // Remove object and all its steps
    onObjectsChange(objects.filter(o => o.id !== objectId));
    onStepsChange(steps.filter(s => s.objectId !== objectId));
  };

  const handleStartEditObject = (obj: OrderObject) => {
    setEditingObjectId(obj.id);
    setEditingObjectName(obj.name);
  };

  const handleSaveEditObject = () => {
    if (!editingObjectId || !editingObjectName.trim()) return;
    
    onObjectsChange(objects.map(o => 
      o.id === editingObjectId ? { ...o, name: editingObjectName.trim() } : o
    ));
    setEditingObjectId(null);
    setEditingObjectName('');
  };

  const handleCancelEditObject = () => {
    setEditingObjectId(null);
    setEditingObjectName('');
  };

  // Step management within objects
  const handleAddStep = (objectId: string) => {
    const templateId = selectedTemplates[objectId];
    if (!templateId) return;
    
    const template = treatmentTemplates.find(t => t.id === templateId);
    if (!template) return;

    const newStep: OrderStep = {
      id: crypto.randomUUID(),
      templateId: template.id,
      name: template.name,
      status: 'pending',
      objectId,
    };

    onStepsChange([...steps, newStep]);
    setSelectedTemplates(prev => ({ ...prev, [objectId]: '' }));
  };

  const handleRemoveStep = (stepId: string) => {
    onStepsChange(steps.filter(s => s.id !== stepId));
  };

  const handleStepStatusChange = (stepId: string, status: StepStatus) => {
    onStepsChange(steps.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const unassignedSteps = getUnassignedSteps();

  return (
    <div className="space-y-4">
      {/* Unassigned steps (legacy mode) */}
      {unassignedSteps.length > 0 && (
        <div className="border rounded-md p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm text-muted-foreground">
              Steg utan objekt (legacy)
            </span>
          </div>
          <div className="space-y-2">
            {unassignedSteps.map(step => (
              <div key={step.id} className="flex items-center gap-2 pl-6">
                <span className="flex-1 text-sm">{step.name}</span>
                <StepStatusBadge status={step.status} />
                <Select 
                  value={step.status} 
                  onValueChange={(v) => handleStepStatusChange(step.id, v as StepStatus)}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {Object.entries(stepStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveStep(step.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objects list */}
      {objects.length === 0 && unassignedSteps.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          Inga objekt tillagda. Lägg till ett objekt för att hantera behandlingssteg.
        </p>
      ) : (
        <div className="space-y-3">
          {objects.map(obj => {
            const objectSteps = getStepsForObject(obj.id);
            const isExpanded = expandedObjects.has(obj.id);
            const isEditing = editingObjectId === obj.id;

            return (
              <Collapsible 
                key={obj.id} 
                open={isExpanded} 
                onOpenChange={() => toggleExpanded(obj.id)}
              >
                <div className="border rounded-md overflow-hidden">
                  {/* Object header */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingObjectName}
                          onChange={(e) => setEditingObjectName(e.target.value)}
                          className="h-8 flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditObject();
                            if (e.key === 'Escape') handleCancelEditObject();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          onClick={handleSaveEditObject}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleCancelEditObject}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{obj.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {objectSteps.length} steg
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditObject(obj);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (objectSteps.length > 0) {
                              if (confirm(`Ta bort "${obj.name}" och dess ${objectSteps.length} steg?`)) {
                                handleRemoveObject(obj.id);
                              }
                            } else {
                              handleRemoveObject(obj.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Object content - steps */}
                  <CollapsibleContent>
                    <div className="p-3 space-y-2 bg-background">
                      {objectSteps.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Inga steg tillagda för detta objekt.
                        </p>
                      ) : (
                        objectSteps.map((step, index) => (
                          <div key={step.id}>
                            {index > 0 && <Separator className="my-2" />}
                            <div className="flex items-center gap-2">
                              <span className="flex-1 text-sm">{step.name}</span>
                              <StepStatusBadge status={step.status} />
                              <Select 
                                value={step.status} 
                                onValueChange={(v) => handleStepStatusChange(step.id, v as StepStatus)}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {Object.entries(stepStatusLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveStep(step.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Add step to object */}
                      <div className="flex gap-2 pt-2 border-t mt-3">
                        <Select 
                          value={selectedTemplates[obj.id] || ''} 
                          onValueChange={(v) => setSelectedTemplates(prev => ({ ...prev, [obj.id]: v }))}
                        >
                          <SelectTrigger className="flex-1 h-9 text-sm bg-background">
                            <SelectValue placeholder="Välj behandlingssteg..." />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            {treatmentTemplates.length === 0 ? (
                              <SelectItem value="_none" disabled>
                                Inga steg tillgängliga
                              </SelectItem>
                            ) : (
                              treatmentTemplates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm"
                          onClick={() => handleAddStep(obj.id)} 
                          disabled={!selectedTemplates[obj.id]}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Lägg till
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Add new object */}
      <div className="flex gap-2 pt-2 border-t">
        <Input
          value={newObjectName}
          onChange={(e) => setNewObjectName(e.target.value)}
          placeholder="Nytt objektnamn (t.ex. 'Ram vänster')..."
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddObject();
          }}
        />
        <Button 
          onClick={handleAddObject} 
          disabled={!newObjectName.trim()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Lägg till objekt
        </Button>
      </div>
    </div>
  );
}
