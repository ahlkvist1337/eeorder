import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, Check, X, Settings } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ObjectTrucksEditor } from '@/components/ObjectTrucksEditor';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import { useObjectTemplates } from '@/hooks/useObjectTemplates';
import { useAuth } from '@/contexts/AuthContext';
import { calculateObjectQuantities } from '@/types/order';
import type { OrderStep, StepStatus, OrderObject, ObjectTruck, TruckStatus, ArticleRow } from '@/types/order';
import { SortableStep } from '@/components/SortableStep';

interface OrderObjectsEditorProps {
  objects: OrderObject[];
  steps: OrderStep[];
  articleRows?: ArticleRow[];
  onObjectsChange: (objects: OrderObject[]) => void;
  onStepsChange: (steps: OrderStep[]) => void;
  onTruckStatusChange?: (truckId: string, status: TruckStatus) => void;
  onTruckStepStatusChange?: (truckId: string, stepId: string, status: StepStatus) => void;
  onTruckBillingStatusChange?: (truckId: string, status: import('@/types/order').TruckBillingStatus) => void;
  orderInfo?: {
    id: string;
    orderNumber: string;
    customer: string;
  };
}

export function OrderObjectsEditor({ 
  objects, 
  steps, 
  articleRows,
  onObjectsChange, 
  onStepsChange,
  onTruckStatusChange,
  onTruckStepStatusChange,
  onTruckBillingStatusChange,
  orderInfo,
}: OrderObjectsEditorProps) {
  const { isProduction } = useAuth();
  const { steps: treatmentTemplates, isLoading: treatmentLoading } = useTreatmentSteps();
  const { templates: objectTemplates, isLoading: objectLoading } = useObjectTemplates();
  
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set(objects.map(o => o.id)));
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [editingObjectName, setEditingObjectName] = useState('');
  const [expandedStepEditors, setExpandedStepEditors] = useState<Set<string>>(new Set());
  
  // Object add state
  const [selectedObjectTemplateId, setSelectedObjectTemplateId] = useState('');
  const [customObjectName, setCustomObjectName] = useState('');
  const [useCustomObjectName, setUseCustomObjectName] = useState(false);
  
  // Step add state per object
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const toggleStepEditor = (objectId: string) => {
    setExpandedStepEditors(prev => {
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
    let name = '';
    
    if (useCustomObjectName) {
      name = customObjectName.trim();
    } else if (selectedObjectTemplateId) {
      const template = objectTemplates.find(t => t.id === selectedObjectTemplateId);
      name = template?.name || '';
    }
    
    if (!name) return;
    
    const newObject: OrderObject = {
      id: crypto.randomUUID(),
      name,
      plannedQuantity: 1,
      receivedQuantity: 0,
      completedQuantity: 0,
    };
    
    onObjectsChange([...objects, newObject]);
    setExpandedObjects(prev => new Set([...prev, newObject.id]));
    setSelectedObjectTemplateId('');
    setCustomObjectName('');
    setUseCustomObjectName(false);
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
    setSelectedTemplates(prev => {
      const next = { ...prev };
      delete next[objectId];
      return next;
    });
  };

  const handleRemoveStep = (stepId: string) => {
    onStepsChange(steps.filter(s => s.id !== stepId));
  };

  // Drag end handler for reordering steps within an object
  const handleDragEnd = (objectId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const objectSteps = steps.filter(s => s.objectId === objectId);
      const otherSteps = steps.filter(s => s.objectId !== objectId);
      
      const oldIndex = objectSteps.findIndex(s => s.id === active.id);
      const newIndex = objectSteps.findIndex(s => s.id === over.id);
      
      const reorderedObjectSteps = arrayMove(objectSteps, oldIndex, newIndex);
      onStepsChange([...otherSteps, ...reorderedObjectSteps]);
    }
  };

  const unassignedSteps = getUnassignedSteps();
  const isLoading = treatmentLoading || objectLoading;

  return (
    <div className="space-y-3">
      {/* Unassigned steps (legacy mode) */}
      {unassignedSteps.length > 0 && (
        <div className="border rounded-md p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-medium text-sm text-muted-foreground">
              Steg utan objekt (legacy)
            </span>
          </div>
          <div className="space-y-1">
            {unassignedSteps.map(step => (
              <div key={step.id} className="flex items-center gap-2 pl-4 py-0.5">
                <span className="flex-1 text-sm">{step.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveStep(step.id)}
                >
                  <Trash2 className="h-3 w-3" />
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
        <div className="space-y-2">
          {objects.map(obj => {
            const objectSteps = getStepsForObject(obj.id);
            const isExpanded = expandedObjects.has(obj.id);
            const isEditing = editingObjectId === obj.id;
            const isStepEditorExpanded = expandedStepEditors.has(obj.id);
            const quantities = calculateObjectQuantities(obj.trucks);
            const completedTrucks = (obj.trucks || []).filter(truck => {
              if (objectSteps.length === 0) return false;
              return objectSteps.every(step => {
                const status = truck.stepStatuses.find(s => s.stepId === step.id);
                return status?.status === 'completed';
              });
            }).length;

              return (
              <div key={obj.id} className="border rounded-md overflow-hidden">
                {/* Compact object header - responsive layout */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-3 py-2 bg-muted/40">
                  {/* Row 1: Expand + Name + Summary + Actions */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 shrink-0"
                      onClick={() => toggleExpanded(obj.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          value={editingObjectName}
                          onChange={(e) => setEditingObjectName(e.target.value)}
                          className="h-8 flex-1 text-sm"
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
                        <span className="font-semibold text-sm uppercase tracking-wide truncate">{obj.name}</span>
                        
                        {/* Work card summary */}
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto sm:ml-0">
                          {quantities.planned > 0 
                            ? `${quantities.planned} kort • ${completedTrucks} klar${completedTrucks !== 1 ? 'a' : ''}`
                            : 'Inga kort'
                          }
                        </span>
                        
                        {isProduction && (
                          <>
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
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Row 2 on mobile: Treatment steps as wrapping badges */}
                  {!isEditing && objectSteps.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pl-10 sm:pl-0 sm:flex-1 min-w-0 max-w-full">
                      {objectSteps.map(step => (
                        <Badge 
                          key={step.id} 
                          variant="outline" 
                          className="text-xs py-0.5 px-2 h-auto font-normal whitespace-normal break-words max-w-full"
                        >
                          {step.name}
                        </Badge>
                      ))}
                      
                      {isProduction && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive ml-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (objectSteps.length > 0 || (obj.trucks?.length || 0) > 0) {
                              if (confirm(`Ta bort "${obj.name}" och alla dess steg och arbetskort?`)) {
                                handleRemoveObject(obj.id);
                              }
                            } else {
                              handleRemoveObject(obj.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Delete button when no steps */}
                  {!isEditing && objectSteps.length === 0 && isProduction && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive ml-auto sm:ml-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveObject(obj.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Content: Work cards (primary) + hidden step editor */}
                {isExpanded && (
                  <div className="px-2 pb-2 bg-background">
                    {/* Work cards - always visible, primary focus */}
                    <ObjectTrucksEditor
                      trucks={obj.trucks || []}
                      objectId={obj.id}
                      objectName={obj.name}
                      objectSteps={objectSteps}
                      articleRows={articleRows?.filter(r => r.objectId === obj.id || !r.objectId)}
                      onTrucksChange={(newTrucks) => {
                        onObjectsChange(objects.map(o =>
                          o.id === obj.id ? { ...o, trucks: newTrucks } : o
                        ));
                      }}
                      onTruckStatusChange={onTruckStatusChange}
                      onTruckStepStatusChange={onTruckStepStatusChange}
                      onTruckBillingStatusChange={onTruckBillingStatusChange}
                      orderInfo={orderInfo}
                    />
                    
                    {/* Hidden step editor - only for production users */}
                    {isProduction && (
                      <Collapsible 
                        open={isStepEditorExpanded} 
                        onOpenChange={() => toggleStepEditor(obj.id)}
                        className="mt-2"
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-muted-foreground">
                            <Settings className="h-3 w-3 mr-1" />
                            {isStepEditorExpanded ? 'Dölj stegredigering' : 'Redigera steg...'}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <div className="border rounded-md p-2 bg-muted/20 space-y-2">
                            {objectSteps.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-1">
                                Inga steg tillagda.
                              </p>
                            ) : (
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd(obj.id)}
                              >
                                <SortableContext
                                  items={objectSteps.map(s => s.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="space-y-0.5">
                                    {objectSteps.map((step) => (
                                      <SortableStep
                                        key={step.id}
                                        step={step}
                                        onRemove={handleRemoveStep}
                                      />
                                    ))}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            )}

                            {/* Add step */}
                            <div className="flex gap-1 pt-1 border-t">
                              <Select 
                                value={selectedTemplates[obj.id] || ''} 
                                onValueChange={(v) => {
                                  if (v && v !== '_none') {
                                    setSelectedTemplates(prev => ({ ...prev, [obj.id]: v }));
                                  }
                                }}
                              >
                                <SelectTrigger className="flex-1 h-7 text-xs bg-background">
                                  <SelectValue placeholder="Välj steg..." />
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
                                type="button"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAddStep(obj.id)} 
                                disabled={!selectedTemplates[obj.id]}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Lägg till
                              </Button>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new object - production only */}
      {isProduction && (
        <div className="space-y-2 pt-2 border-t">
          <div className="text-sm font-medium">Lägg till objekt</div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {!useCustomObjectName ? (
              <>
                <Select 
                  value={selectedObjectTemplateId} 
                  onValueChange={setSelectedObjectTemplateId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="flex-1 h-9 bg-background">
                    <SelectValue placeholder="Välj objektmall..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {objectTemplates.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Inga mallar tillgängliga
                      </SelectItem>
                    ) : (
                      objectTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setUseCustomObjectName(true)}
                >
                  Eget namn
                </Button>
              </>
            ) : (
              <>
                <Input
                  value={customObjectName}
                  onChange={(e) => setCustomObjectName(e.target.value)}
                  placeholder="Skriv objektnamn..."
                  className="flex-1 h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddObject();
                  }}
                />
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseCustomObjectName(false);
                    setCustomObjectName('');
                  }}
                >
                  Välj mall
                </Button>
              </>
            )}
            <Button 
              size="sm"
              onClick={handleAddObject} 
              disabled={useCustomObjectName ? !customObjectName.trim() : !selectedObjectTemplateId}
            >
              <Plus className="h-4 w-4 mr-1" />
              Lägg till
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
