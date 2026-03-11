import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { usePriceListLookup } from '@/hooks/usePriceListLookup';
import { PriceListBadge } from '@/components/PriceListBadge';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ArticleRow>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [showTextError, setShowTextError] = useState(false);
  const [newRow, setNewRow] = useState<Partial<ArticleRow>>({
    rowNumber: '',
    partNumber: '',
    text: '',
    quantity: 1,
    unit: 'st.',
    price: 0,
  });

  // Price list lookup
  const { findAllMatches } = usePriceListLookup();

  const handleAddRow = () => {
    if (!newRow.text?.trim()) {
      setShowTextError(true);
      return;
    }
    
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
    setShowTextError(false);
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
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditForm({});
  };

  const total = rows.reduce((sum, row) => sum + (row.price * row.quantity), 0);

  // Mobile card layout for article rows
  if (isMobile) {
    return (
      <div className="space-y-3 min-w-0 max-w-full">
        {rows.map((row) => {
          const isEditing = editingRowId === row.id;
          
          if (isEditing) {
            // Edit mode - stacked inputs
            return (
              <Card key={row.id} className="border-primary">
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Rad</label>
                      <Input
                        value={editForm.rowNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, rowNumber: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Artikelnr</label>
                      <Input
                        value={editForm.partNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, partNumber: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Beskrivning</label>
                    <Input
                      value={editForm.text || ''}
                      onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Antal</label>
                      <Input
                        type="number"
                        value={editForm.quantity || ''}
                        onChange={(e) => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Enhet</label>
                      <Input
                        value={editForm.unit || ''}
                        onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Pris</label>
                      <Input
                        type="number"
                        value={editForm.price || ''}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" className="flex-1 h-11" onClick={handleSaveEdit}>
                      <Check className="h-4 w-4 mr-2" />
                      Spara
                    </Button>
                    <Button type="button" variant="outline" className="flex-1 h-11" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Avbryt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // View mode - card display
          return (
            <Card key={row.id} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                {/* Header: Row + Article number | Sum */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{row.rowNumber} {row.partNumber && `• ${row.partNumber}`}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-base">
                      {(row.price * row.quantity).toLocaleString('sv-SE')} kr
                    </span>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-sm break-words">{row.text}</p>
                
                {/* Price list badge */}
                <PriceListBadge 
                  matches={findAllMatches(row.partNumber, row.text)}
                  onSelectPrice={!readOnly ? (price) => {
                    onRowsChange(rows.map(r => 
                      r.id === row.id ? { ...r, price } : r
                    ));
                  } : undefined}
                  readOnly={readOnly}
                />
                
                {/* Details grid */}
                <div className="grid grid-cols-4 gap-2 text-xs pt-1 border-t">
                  <div>
                    <span className="text-muted-foreground block">Antal</span>
                    <span className="font-medium">{row.quantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Enhet</span>
                    <span className="font-medium">{row.unit}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Pris</span>
                    <span className="font-medium">{row.price.toLocaleString('sv-SE')} kr</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Summa</span>
                    <span className="font-medium">{(row.price * row.quantity).toLocaleString('sv-SE')} kr</span>
                  </div>
                </div>
                
                {/* Actions */}
                {!readOnly && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 h-10"
                      onClick={() => handleStartEdit(row)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Redigera
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-10 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRow(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Add new row form - mobile */}
        {isAdding && (
          <Card className="border-primary">
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Rad</label>
                  <Input
                    value={newRow.rowNumber || ''}
                    onChange={(e) => setNewRow({ ...newRow, rowNumber: e.target.value })}
                    placeholder={String(rows.length + 1)}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Artikelnr</label>
                  <Input
                    value={newRow.partNumber || ''}
                    onChange={(e) => setNewRow({ ...newRow, partNumber: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Beskrivning</label>
                <Input
                  value={newRow.text || ''}
                  onChange={(e) => setNewRow({ ...newRow, text: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Antal</label>
                  <Input
                    type="number"
                    value={newRow.quantity || ''}
                    onChange={(e) => setNewRow({ ...newRow, quantity: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Enhet</label>
                  <Input
                    value={newRow.unit || ''}
                    onChange={(e) => setNewRow({ ...newRow, unit: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Pris</label>
                  <Input
                    type="number"
                    value={newRow.price || ''}
                    onChange={(e) => setNewRow({ ...newRow, price: parseFloat(e.target.value) || 0 })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1 h-11" onClick={handleAddRow}>
                  <Check className="h-4 w-4 mr-2" />
                  Lägg till
                </Button>
                <Button variant="outline" className="flex-1 h-11" onClick={() => setIsAdding(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Avbryt
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!readOnly && !isAdding && (
          <Button variant="outline" className="w-full h-11" onClick={() => setIsAdding(true)}>
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

  // Desktop/tablet - table layout
  return (
    <div className="space-y-4 min-w-0 max-w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
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
                      <Input
                        type="number"
                        value={editForm.price || ''}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                        className="h-8 w-full text-right"
                      />
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
                    <td className="py-2 pr-2">
                      <div>
                        {row.text}
                        <div className="mt-1">
                          <PriceListBadge 
                            matches={findAllMatches(row.partNumber, row.text)}
                            onSelectPrice={!readOnly ? (price) => {
                              onRowsChange(rows.map(r => 
                                r.id === row.id ? { ...r, price } : r
                              ));
                            } : undefined}
                            readOnly={readOnly}
                          />
                        </div>
                      </div>
                    </td>
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
                  <Input
                    type="number"
                    value={newRow.price || ''}
                    onChange={(e) => setNewRow({ ...newRow, price: parseFloat(e.target.value) || 0 })}
                    className="h-8 w-full text-right"
                  />
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
