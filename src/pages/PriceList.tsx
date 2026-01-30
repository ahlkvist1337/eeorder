import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Download, Plus, Pencil, Trash2, ArrowUpDown, Upload, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';

interface GroupedArticle {
  partNumber: string;
  description: string;
  prices: PriceListItem[];
  minPrice: number;
  maxPrice: number;
}

type SortField = 'part_number' | 'description' | 'step_count' | 'price';
type SortDirection = 'asc' | 'desc';

export default function PriceList() {
  useDocumentTitle('Prislista');
  const { prices, loading, addPrice, updatePrice, deletePrice, importFromOrders } = usePriceList();
  const { canEdit, isAdmin } = useAuth();

  // Search & sort state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('part_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Expanded state
  const [expandedPartNumber, setExpandedPartNumber] = useState<string | null>(null);

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

  // Filter prices by search
  const filteredPrices = useMemo(() => {
    const searchLower = search.toLowerCase();
    return prices.filter(
      (p) =>
        p.part_number.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        (p.step_name && p.step_name.toLowerCase().includes(searchLower))
    );
  }, [prices, search]);

  // Group by part_number
  const groupedPrices = useMemo(() => {
    const groups = new Map<string, GroupedArticle>();

    for (const item of filteredPrices) {
      const existing = groups.get(item.part_number);
      if (existing) {
        existing.prices.push(item);
        existing.minPrice = Math.min(existing.minPrice, item.price);
        existing.maxPrice = Math.max(existing.maxPrice, item.price);
      } else {
        groups.set(item.part_number, {
          partNumber: item.part_number,
          description: item.description,
          prices: [item],
          minPrice: item.price,
          maxPrice: item.price,
        });
      }
    }

    // Sort each group's prices by step_name
    for (const group of groups.values()) {
      group.prices.sort((a, b) => {
        const aStep = a.step_name || '';
        const bStep = b.step_name || '';
        return aStep.localeCompare(bStep, 'sv');
      });
    }

    let result = Array.from(groups.values());

    // Sort grouped results
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'price') {
        cmp = a.minPrice - b.minPrice;
      } else if (sortField === 'step_count') {
        cmp = a.prices.length - b.prices.length;
      } else if (sortField === 'description') {
        cmp = a.description.localeCompare(b.description, 'sv');
      } else {
        cmp = a.partNumber.localeCompare(b.partNumber, 'sv');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [filteredPrices, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(groupedPrices.length / pageSize);
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedPrices.slice(start, start + pageSize);
  }, [groupedPrices, currentPage, pageSize]);

  // Stats
  const totalArticles = groupedPrices.length;
  const totalPriceRows = filteredPrices.length;

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
    setExpandedPartNumber(null);
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

  const openAddDialog = (prefillPartNumber?: string, prefillDescription?: string) => {
    setIsNewItem(true);
    setFormPartNumber(prefillPartNumber || '');
    setFormDescription(prefillDescription || '');
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
    await importFromOrders();
    setIsImporting(false);
    setImportDialogOpen(false);
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

  const formatPriceRange = (min: number, max: number) => {
    if (min === max) {
      return formatPrice(min);
    }
    return `${formatPrice(min)} – ${formatPrice(max)}`;
  };

  const toggleExpanded = (partNumber: string) => {
    setExpandedPartNumber((prev) => (prev === partNumber ? null : partNumber));
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prislista</h1>
            <p className="text-muted-foreground">
              {totalArticles} artiklar ({totalPriceRows} prisrader)
            </p>
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
                <TableHead className="w-10"></TableHead>
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
                  onClick={() => handleSort('step_count')}
                >
                  <div className="flex items-center gap-2">
                    Antal steg
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Priser
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                {canEdit && <TableHead className="w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    Laddar...
                  </TableCell>
                </TableRow>
              ) : groupedPrices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    {search ? 'Inga träffar' : 'Inga prisrader ännu'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group) => {
                  const isExpanded = expandedPartNumber === group.partNumber;
                  return (
                    <Collapsible key={group.partNumber} open={isExpanded} onOpenChange={() => toggleExpanded(group.partNumber)} asChild>
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpanded(group.partNumber)}>
                          <TableCell className="w-10">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-medium">{group.partNumber}</TableCell>
                          <TableCell>{group.description}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.prices.length} steg
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPriceRange(group.minPrice, group.maxPrice)}
                          </TableCell>
                          {canEdit && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openAddDialog(group.partNumber, group.description)}
                                  title="Lägg till stegpris"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={canEdit ? 6 : 5} className="p-0">
                              <div className="px-6 py-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-1/2">Steg</TableHead>
                                      <TableHead className="text-right">Pris</TableHead>
                                      {canEdit && <TableHead className="w-24"></TableHead>}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.prices.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="text-muted-foreground">
                                          {item.step_name || '(grundpris)'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {formatPrice(item.price)}
                                        </TableCell>
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
                                    ))}
                                  </TableBody>
                                </Table>
                                {canEdit && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => openAddDialog(group.partNumber, group.description)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Lägg till stegpris
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Visar {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, groupedPrices.length)} av {groupedPrices.length} artiklar
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
          <Button onClick={() => openAddDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Lägg till ny artikel
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
