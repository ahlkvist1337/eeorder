import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import { useObjectTemplates } from '@/hooks/useObjectTemplates';

export default function TreatmentSteps() {
  const { steps, addStep, updateStep, deleteStep } = useTreatmentSteps();
  const { templates: objectTemplates, addTemplate, updateTemplate, deleteTemplate } = useObjectTemplates();
  
  // Treatment steps state
  const [newStepName, setNewStepName] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepName, setEditingStepName] = useState('');

  // Object templates state
  const [newObjectName, setNewObjectName] = useState('');
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [editingObjectName, setEditingObjectName] = useState('');

  // Treatment step handlers
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

  const handleStepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddStep();
    }
  };

  const startEditingStep = (id: string, name: string) => {
    setEditingStepId(id);
    setEditingStepName(name);
  };

  const cancelEditingStep = () => {
    setEditingStepId(null);
    setEditingStepName('');
  };

  const saveEditingStep = async () => {
    if (editingStepId && editingStepName.trim()) {
      try {
        await updateStep(editingStepId, editingStepName.trim());
      } catch (error) {
        console.error('Error updating step:', error);
      }
    }
    cancelEditingStep();
  };

  const handleEditStepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditingStep();
    } else if (e.key === 'Escape') {
      cancelEditingStep();
    }
  };

  const handleDeleteStep = async (id: string, name: string) => {
    if (confirm(`Vill du ta bort behandlingssteget "${name}"?`)) {
      try {
        await deleteStep(id);
      } catch (error) {
        console.error('Error deleting step:', error);
      }
    }
  };

  // Object template handlers
  const handleAddObject = async () => {
    if (newObjectName.trim()) {
      try {
        await addTemplate(newObjectName.trim());
        setNewObjectName('');
      } catch (error) {
        console.error('Error adding object template:', error);
      }
    }
  };

  const handleObjectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddObject();
    }
  };

  const startEditingObject = (id: string, name: string) => {
    setEditingObjectId(id);
    setEditingObjectName(name);
  };

  const cancelEditingObject = () => {
    setEditingObjectId(null);
    setEditingObjectName('');
  };

  const saveEditingObject = async () => {
    if (editingObjectId && editingObjectName.trim()) {
      try {
        await updateTemplate(editingObjectId, editingObjectName.trim());
      } catch (error) {
        console.error('Error updating object template:', error);
      }
    }
    cancelEditingObject();
  };

  const handleEditObjectKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditingObject();
    } else if (e.key === 'Escape') {
      cancelEditingObject();
    }
  };

  const handleDeleteObject = async (id: string, name: string) => {
    if (confirm(`Vill du ta bort objektmallen "${name}"?`)) {
      try {
        await deleteTemplate(id);
      } catch (error) {
        console.error('Error deleting object template:', error);
      }
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Inställningar</h1>

        <Card>
          <CardHeader>
            <CardTitle>Mallar</CardTitle>
            <CardDescription>
              Hantera fördefinierade behandlingssteg och objektmallar som kan användas i ordrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="steps" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="steps">Behandlingssteg</TabsTrigger>
                <TabsTrigger value="objects">Objektmallar</TabsTrigger>
              </TabsList>

              {/* Treatment Steps Tab */}
              <TabsContent value="steps" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  T.ex. Blästring, Sprutzink, Målning.
                </p>
                
                {/* Add new step */}
                <div className="flex gap-2">
                  <Input
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    onKeyDown={handleStepKeyDown}
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
                        {editingStepId === step.id ? (
                          <>
                            <Input
                              value={editingStepName}
                              onChange={(e) => setEditingStepName(e.target.value)}
                              onKeyDown={handleEditStepKeyDown}
                              className="flex-1 h-8"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditingStep}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditingStep}>
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
                              onClick={() => startEditingStep(step.id, step.name)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteStep(step.id, step.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Object Templates Tab */}
              <TabsContent value="objects" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  T.ex. Ram vänster, Ram höger, Motorblock.
                </p>
                
                {/* Add new object template */}
                <div className="flex gap-2">
                  <Input
                    value={newObjectName}
                    onChange={(e) => setNewObjectName(e.target.value)}
                    onKeyDown={handleObjectKeyDown}
                    placeholder="Nytt objektnamn..."
                    className="flex-1"
                  />
                  <Button onClick={handleAddObject} disabled={!newObjectName.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Lägg till
                  </Button>
                </div>

                {/* Object templates list */}
                <div className="space-y-2">
                  {objectTemplates.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Inga objektmallar finns ännu.
                    </p>
                  ) : (
                    objectTemplates.map((template) => (
                      <div 
                        key={template.id}
                        className="flex items-center gap-2 p-3 bg-muted/50 rounded-sm"
                      >
                        {editingObjectId === template.id ? (
                          <>
                            <Input
                              value={editingObjectName}
                              onChange={(e) => setEditingObjectName(e.target.value)}
                              onKeyDown={handleEditObjectKeyDown}
                              className="flex-1 h-8"
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditingObject}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditingObject}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 font-medium">{template.name}</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => startEditingObject(template.id, template.name)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteObject(template.id, template.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
