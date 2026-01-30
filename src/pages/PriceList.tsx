import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { usePriceList, PriceListItem } from '@/hooks/usePriceList';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCsv } from '@/lib/exportExcel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Download, Plus, Pencil, Trash2, ArrowUpDown, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

type SortField = 'part_number' | 'description' | 'step_name' | 'price';
type SortDirection = 'asc' | 'desc';

export default function PriceList() {
  const { prices, loading, addPrice, updatePrice, deletePrice, importFromOrders } = usePriceList();
  const { canEdit, isAdmin } = useAuth();

  // Search & sort state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('part_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PriceListItem | null>(null);

  // Form state
  const [formPartNumber, setFormPartNumber] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStepName, setFormStepName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [isNewItem, setIsNewItem] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Filter and sort
  const filteredPrices = useMemo(() => {
    const searchLower = search.toLowerCase();
    let filtered = prices.filter(
      (p) =>
        p.part_number.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        (p.step_name && p.step_name.toLowerCase().includes(searchLower))
    );

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'price') {
        cmp = a.price - b.price;
      } else if (sortField === 'step_name') {
        const aVal = a.step_name || '';
        const bVal = b.step_name || '';
        cmp = aVal.localeCompare(bVal, 'sv');
      } else {
        cmp = a[sortField].localeCompare(b[sortField], 'sv');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [prices, search, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPrices.length / pageSize);
  const paginatedPrices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPrices.slice(start, start + pageSize);
  }, [filteredPrices, currentPage, pageSize]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleExport = () => {
    exportToCsv(filteredPrices, `prislista-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const openAddDialog = () => {
    setIsNewItem(true);
    setFormPartNumber('');
    setFormDescription('');
    setFormStepName('');
    setFormPrice('');
    setSelectedItem(null);
    setEditDialogOpen(true);
  };

  const openEditDialog = (item: PriceListItem) => {
    setIsNewItem(false);
    setFormPartNumber(item.part_number);
    setFormDescription(item.description);
    setFormStepName(item.step_name || '');
    setFormPrice(item.price.toString());
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (item: PriceListItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    const price = parseFloat(formPrice) || 0;
    const stepName = formStepName.trim() || undefined;
    if (isNewItem) {
      const success = await addPrice(formPartNumber, formDescription, price, stepName);
      if (success) setEditDialogOpen(false);
    } else if (selectedItem) {
      const success = await updatePrice(selectedItem.id, {
        part_number: formPartNumber,
        description: formDescription,
        step_name: stepName || null,
        price,
      });
      if (success) setEditDialogOpen(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    const result = await importFromOrders();
    setIsImporting(false);
    setImportDialogOpen(false);
    
    if (result.total > 0) {
      // Toast handled by hook, but we can show summary
    }
  };

  const handleDelete = async () => {
    if (selectedItem) {
      await deletePrice(selectedItem.id);
      setDeleteDialogOpen(false);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kr';
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prislista</h1>
            <p className="text-muted-foreground">{filteredPrices.length} prisrader</p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importera från ordrar
              </Button>
            )}
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportera Excel
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök artikelnummer, benämning eller steg..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('part_number')}
                >
                  <div className="flex items-center gap-2">
                    Artikelnummer
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-2">
                    Benämning
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('step_name')}
                >
                  <div className="flex items-center gap-2">
                    Steg
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Pris
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {canEdit && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    Laddar...
                  </TableCell>
                </TableRow>
              ) : filteredPrices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-8 text-muted-foreground">
                    {search ? 'Inga träffar' : 'Inga prisrader ännu'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPrices.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.part_number}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-muted-foreground">{item.step_name || '—'}</TableCell>
                    <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Visar {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredPrices.length)} av {filteredPrices.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Föregående
              </Button>
              <span className="text-sm text-muted-foreground">
                Sida {currentPage} av {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Nästa
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Add button */}
        {canEdit && (
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Lägg till ny prisrad
          </Button>
        )}

        {/* Edit/Add Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isNewItem ? 'Lägg till prisrad' : 'Redigera prisrad'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="partNumber">Artikelnummer</Label>
                <Input
                  id="partNumber"
                  value={formPartNumber}
                  onChange={(e) => setFormPartNumber(e.target.value)}
                  placeholder="T.ex. 3903041"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Benämning</Label>
                <Input
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="T.ex. Lagerlock"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stepName">Steg (valfritt)</Label>
                <Input
                  id="stepName"
                  value={formStepName}
                  onChange={(e) => setFormStepName(e.target.value)}
                  placeholder="T.ex. Blästring, Sprutzink, Målning"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Pris (kr)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleSave} disabled={!formPartNumber.trim()}>
                {isNewItem ? 'Lägg till' : 'Spara'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ta bort prisrad?</AlertDialogTitle>
              <AlertDialogDescription>
                Är du säker på att du vill ta bort "{selectedItem?.part_number}{selectedItem?.step_name ? ` (${selectedItem.step_name})` : ''}"? Detta kan inte ångras.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Ta bort
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import confirmation */}
        <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Importera från ordrar</AlertDialogTitle>
              <AlertDialogDescription>
                Detta kommer att hämta alla unika kombinationer av artikelnummer, benämning och pris från befintliga ordrar och lägga till dem i prislistan. Dubbletter hoppas över.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isImporting}>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'Importerar...' : 'Importera'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
