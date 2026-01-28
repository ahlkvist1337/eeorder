import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';

export default function TreatmentSteps() {
  const { steps, addStep, updateStep, deleteStep } = useTreatmentSteps();
  const [newStepName, setNewStepName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddStep = async () => {
    if (newStepName.trim()) {
      try {
        await addStep(newStepName.trim());
        setNewStepName('');
      } catch (error) {
        console.error('Error adding step:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddStep();
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEditing = async () => {
    if (editingId && editingName.trim()) {
      try {
        await updateStep(editingId, editingName.trim());
      } catch (error) {
        console.error('Error updating step:', error);
      }
    }
    cancelEditing();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Vill du ta bort behandlingssteget "${name}"?`)) {
      try {
        await deleteStep(id);
      } catch (error) {
        console.error('Error deleting step:', error);
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Behandlingssteg</h1>

        <Card>
          <CardHeader>
            <CardTitle>Hantera steg</CardTitle>
            <CardDescription>
              Skapa och hantera behandlingssteg som kan användas i ordrar. 
              Till exempel: Blästring, Sprutzink, Målning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new step */}
            <div className="flex gap-2">
              <Input
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nytt stegnamn..."
                className="flex-1"
              />
              <Button onClick={handleAddStep} disabled={!newStepName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Lägg till
              </Button>
            </div>

            {/* Steps list */}
            <div className="space-y-2">
              {steps.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Inga behandlingssteg finns ännu.
                </p>
              ) : (
                steps.map((step) => (
                  <div 
                    key={step.id}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-sm"
                  >
                    {editingId === step.id ? (
                      <>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="flex-1 h-8"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditing}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 font-medium">{step.name}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => startEditing(step.id, step.name)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(step.id, step.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
