import { useState } from 'react';
import { Trash2, Pencil, Check, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Instruction } from '@/types/order';

interface InstructionsEditorProps {
  instructions: Instruction[];
  onInstructionsChange: (instructions: Instruction[]) => void;
  readOnly?: boolean;
}

export function InstructionsEditor({ 
  instructions, 
  onInstructionsChange,
  readOnly = false,
}: InstructionsEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleStartEdit = (instruction: Instruction) => {
    if (readOnly) return;
    setEditingId(instruction.id);
    setEditingText(instruction.text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingText.trim()) return;
    
    onInstructionsChange(
      instructions.map(inst =>
        inst.id === editingId ? { ...inst, text: editingText.trim() } : inst
      )
    );
    setEditingId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleRemove = (id: string) => {
    onInstructionsChange(instructions.filter(inst => inst.id !== id));
  };

  if (instructions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Inga instruktioner.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {instructions.map((instruction) => {
        const isEditing = editingId === instruction.id;

        return (
          <div
            key={instruction.id}
            className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            
            {isEditing ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="h-8 flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-primary"
                  onClick={handleSaveEdit}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <span className="flex-1 text-sm">{instruction.text}</span>
                
                {!readOnly && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(instruction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(instruction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
