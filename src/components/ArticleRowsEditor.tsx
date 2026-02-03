import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { usePriceListLookup, type PriceMatch } from '@/hooks/usePriceListLookup';
import type { ArticleRow } from '@/types/order';

interface ArticleRowsEditorProps {
  rows: ArticleRow[];
  onRowsChange: (rows: ArticleRow[]) => void;
  showTotal?: boolean;
  readOnly?: boolean;
}

export function ArticleRowsEditor({ 
  rows, 
  onRowsChange, 
  showTotal = true,
  readOnly = false,
}: ArticleRowsEditorProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ArticleRow>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState<Partial<ArticleRow>>({
    rowNumber: '',
    partNumber: '',
    text: '',
    quantity: 1,
    unit: 'st.',
    price: 0,
  });

  // Price list lookup
  const { findMatch } = usePriceListLookup();
  const [editPriceHint, setEditPriceHint] = useState<PriceMatch | null>(null);
  const [newRowPriceHint, setNewRowPriceHint] = useState<PriceMatch | null>(null);

  // Update price hint when editing a row
  useEffect(() => {
    if (!editingRowId) {
      setEditPriceHint(null);
      return;
    }

    const match = findMatch(editForm.partNumber || '', editForm.text || '');
    if (match && match.price !== editForm.price) {
      setEditPriceHint(match);
    } else {
      setEditPriceHint(null);
    }
  }, [editForm.partNumber, editForm.text, editForm.price, editingRowId, findMatch]);

  // Update price hint when adding a new row
  useEffect(() => {
    if (!isAdding) {
      setNewRowPriceHint(null);
      return;
    }

    const match = findMatch(newRow.partNumber || '', newRow.text || '');
    if (match && match.price !== (newRow.price || 0)) {
      setNewRowPriceHint(match);
    } else {
      setNewRowPriceHint(null);
    }
  }, [newRow.partNumber, newRow.text, newRow.price, isAdding, findMatch]);

  const handleAddRow = () => {
    if (!newRow.text?.trim()) return;
    
    const row: ArticleRow = {
      id: crypto.randomUUID(),
      rowNumber: newRow.rowNumber || String(rows.length + 1),
      partNumber: newRow.partNumber || '',
      text: newRow.text || '',
      quantity: newRow.quantity || 1,
      unit: newRow.unit || 'st.',
      price: newRow.price || 0,
    };
    
    onRowsChange([...rows, row]);
    setNewRow({
      rowNumber: '',
      partNumber: '',
      text: '',
      quantity: 1,
      unit: 'st.',
      price: 0,
    });
    setIsAdding(false);
    setNewRowPriceHint(null);
  };

  const handleDeleteRow = (rowId: string) => {
    onRowsChange(rows.filter(r => r.id !== rowId));
  };

  const handleStartEdit = (row: ArticleRow) => {
    setEditingRowId(row.id);
    setEditForm({ ...row });
  };

  const handleSaveEdit = () => {
    if (!editingRowId) return;
    onRowsChange(rows.map(r => 
      r.id === editingRowId ? { ...r, ...editForm } as ArticleRow : r
    ));
    setEditingRowId(null);
    setEditForm({});
    setEditPriceHint(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditForm({});
    setEditPriceHint(null);
  };


  const handleUsePriceFromList = (price: number) => {
    setEditForm({ ...editForm, price });
    setEditPriceHint(null);
  };

  const handleUseNewRowPriceFromList = (price: number) => {
    setNewRow({ ...newRow, price });
    setNewRowPriceHint(null);
  };

  const total = rows.reduce((sum, row) => sum + (row.price * row.quantity), 0);

  // Price hint component
  const PriceHint = ({ match, onUsePrice }: { match: PriceMatch; onUsePrice: (price: number) => void }) => (
    <div className="flex items-center gap-2 text-xs text-warning mt-1">
      <span>
        Prislistan: {match.price.toLocaleString('sv-SE')} kr
        {match.matchType === 'similar_desc' && ' (liknande)'}
      </span>
      <Button 
        variant="link" 
        size="sm" 
        className="h-auto p-0 text-xs text-warning hover:text-warning/80"
        onClick={() => onUsePrice(match.price)}
      >
        Använd
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-16">Rad</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-24">Artikelnr</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground">Beskrivning</th>
              <th className="text-right py-2 pr-2 font-medium text-muted-foreground w-16">Antal</th>
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-16">Enhet</th>
              <th className="text-right py-2 pr-2 font-medium text-muted-foreground w-24">Pris</th>
              <th className="text-right py-2 pr-2 font-medium text-muted-foreground w-24">Summa</th>
              {!readOnly && <th className="w-20"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 group">
                {editingRowId === row.id ? (
                  <>
                    <td className="py-2 pr-2">
                      <Input
                        value={editForm.rowNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, rowNumber: e.target.value })}
                        className="h-8 w-full"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={editForm.partNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, partNumber: e.target.value })}
                        className="h-8 w-full"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={editForm.text || ''}
                        onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                        className="h-8 w-full"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        value={editForm.quantity || ''}
                        onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 0 })}
                        className="h-8 w-full text-right"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        value={editForm.unit || ''}
                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                        className="h-8 w-full"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <div>
                        <Input
                          type="number"
                          value={editForm.price || ''}
                          onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                          className="h-8 w-full text-right"
                        />
                        {editPriceHint && (
                          <PriceHint match={editPriceHint} onUsePrice={handleUsePriceFromList} />
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-right font-medium">
                      {((editForm.price || 0) * (editForm.quantity || 0)).toLocaleString('sv-SE')} kr
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-2 font-mono">{row.rowNumber}</td>
                    <td className="py-2 pr-2 font-mono">{row.partNumber}</td>
                    <td className="py-2 pr-2">{row.text}</td>
                    <td className="py-2 pr-2 text-right">{row.quantity}</td>
                    <td className="py-2 pr-2">{row.unit}</td>
                    <td className="py-2 pr-2 text-right">{row.price.toLocaleString('sv-SE')} kr</td>
                    <td className="py-2 pr-2 text-right font-medium">
                      {(row.price * row.quantity).toLocaleString('sv-SE')} kr
                    </td>
                    {!readOnly && (
                      <td className="py-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleStartEdit(row)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRow(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
            
            {/* Add new row form */}
            {isAdding && (
              <tr className="border-b bg-muted/30">
                <td className="py-2 pr-2">
                  <Input
                    value={newRow.rowNumber || ''}
                    onChange={(e) => setNewRow({ ...newRow, rowNumber: e.target.value })}
                    placeholder={String(rows.length + 1)}
                    className="h-8 w-full"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={newRow.partNumber || ''}
                    onChange={(e) => setNewRow({ ...newRow, partNumber: e.target.value })}
                    placeholder="Artikelnr"
                    className="h-8 w-full"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={newRow.text || ''}
                    onChange={(e) => setNewRow({ ...newRow, text: e.target.value })}
                    placeholder="Beskrivning"
                    className="h-8 w-full"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    type="number"
                    value={newRow.quantity || ''}
                    onChange={(e) => setNewRow({ ...newRow, quantity: parseFloat(e.target.value) || 0 })}
                    className="h-8 w-full text-right"
                  />
                </td>
                <td className="py-2 pr-2">
                  <Input
                    value={newRow.unit || ''}
                    onChange={(e) => setNewRow({ ...newRow, unit: e.target.value })}
                    className="h-8 w-full"
                  />
                </td>
                <td className="py-2 pr-2">
                  <div>
                    <Input
                      type="number"
                      value={newRow.price || ''}
                      onChange={(e) => setNewRow({ ...newRow, price: parseFloat(e.target.value) || 0 })}
                      className="h-8 w-full text-right"
                    />
                    {newRowPriceHint && (
                      <PriceHint match={newRowPriceHint} onUsePrice={handleUseNewRowPriceFromList} />
                    )}
                  </div>
                </td>
                <td className="py-2 pr-2 text-right font-medium">
                  {((newRow.price || 0) * (newRow.quantity || 0)).toLocaleString('sv-SE')} kr
                </td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAddRow}>
                      <Check className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsAdding(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!readOnly && !isAdding && (
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Lägg till artikelrad
        </Button>
      )}

      {showTotal && rows.length > 0 && (
        <>
          <Separator />
          <div className="flex justify-end items-center gap-2">
            <span className="font-medium">Totalt:</span>
            <span className="text-lg font-bold">
              {total.toLocaleString('sv-SE')} kr
            </span>
          </div>
        </>
      )}
    </div>
  );
}
