import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import type { OrderStep } from '@/types/order';

interface OrderStepsEditorProps {
  steps: OrderStep[];
  onStepsChange: (steps: OrderStep[]) => void;
}

export function OrderStepsEditor({ steps, onStepsChange }: OrderStepsEditorProps) {
  const { steps: treatmentTemplates } = useTreatmentSteps();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const handleAddStep = () => {
    if (!selectedTemplateId) return;
    
    const template = treatmentTemplates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    const newStep: OrderStep = {
      id: crypto.randomUUID(),
      templateId: template.id,
      name: template.name,
      status: 'pending',
    };

    onStepsChange([...steps, newStep]);
    setSelectedTemplateId('');
  };

  const handleRemoveStep = (stepId: string) => {
    onStepsChange(steps.filter(s => s.id !== stepId));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    onStepsChange(newSteps);
  };

  // Filter out templates that are already added
  const availableTemplates = treatmentTemplates.filter(
    t => !steps.some(s => s.templateId === t.id)
  );

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">
          Inga behandlingssteg tillagda.
        </p>
      ) : (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.id}>
              {index > 0 && <Separator className="my-2" />}
              <div className="flex items-center gap-2">
                {/* Move buttons */}
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveStep(index, 'up')}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => moveStep(index, 'down')}
                    disabled={index === steps.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Step name */}
                <div className="flex-1 flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{step.name}</span>
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveStep(step.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add step */}
      <div className="flex gap-2 pt-2 border-t">
        <Select 
          value={selectedTemplateId} 
          onValueChange={setSelectedTemplateId}
        >
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder="Välj behandlingssteg att lägga till..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {availableTemplates.length === 0 ? (
              <SelectItem value="_none" disabled>
                Alla steg är redan tillagda
              </SelectItem>
            ) : (
              availableTemplates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleAddStep} 
          disabled={!selectedTemplateId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Lägg till
        </Button>
      </div>
    </div>
  );
}
