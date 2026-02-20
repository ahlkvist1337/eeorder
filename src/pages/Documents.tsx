import { useState, useRef } from 'react';
import { FileText, Upload, Trash2, Download, BookOpen, ClipboardList, HelpCircle, Loader2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useDocuments, type DocumentCategory, type Document } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const categoryConfig: Record<DocumentCategory, { label: string; icon: typeof FileText; description: string }> = {
  lathundar: { 
    label: 'Lathundar', 
    icon: BookOpen,
    description: 'Snabbguider och instruktioner'
  },
  rutiner: { 
    label: 'Rutiner', 
    icon: ClipboardList,
    description: 'Arbetsrutiner och processer'
  },
  tolkningar: { 
    label: 'Tolkningar / Förklaringar', 
    icon: HelpCircle,
    description: 'Förklarande dokument'
  },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  useDocumentTitle('Dokument');
  const { isAdmin } = useAuth();
  const { 
    isLoading, 
    isUploading, 
    uploadDocument, 
    deleteDocument, 
    getDownloadUrl,
    getByCategory 
  } = useDocuments();
  
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('lathundar');
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadDocument(file, selectedCategory);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    await deleteDocument(documentToDelete);
    setDocumentToDelete(null);
  };

  const handleDownload = async (doc: Document) => {
    const url = await getDownloadUrl(doc.file_path);
    if (url) window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dokumentbibliotek</h1>
            <p className="text-muted-foreground">Lathundar, rutiner och tolkningar</p>
          </div>
        </div>

        {/* Admin upload section */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ladda upp dokument</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select 
                  value={selectedCategory} 
                  onValueChange={(v) => setSelectedCategory(v as DocumentCategory)}
                >
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Välj kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full sm:w-auto"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? 'Laddar upp...' : 'Välj fil'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tillåtna format: PDF, Word, Excel
              </p>
            </CardContent>
          </Card>
        )}

        {/* Document categories */}
        <Card>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {(Object.keys(categoryConfig) as DocumentCategory[]).map((category) => {
                const config = categoryConfig[category];
                const Icon = config.icon;
                const docs = getByCategory(category);

                return (
                  <AccordionItem key={category} value={category} className="border-b last:border-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <span className="font-medium">{config.label}</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            ({docs.length})
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-0">
                      {docs.length === 0 ? (
                        <div className="px-4 py-6 text-center text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Inga dokument i denna kategori</p>
                        </div>
                      ) : (
                        <ul className="divide-y">
                          {docs.map((doc) => (
                            <li 
                              key={doc.id} 
                              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/30"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{doc.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(doc.created_at), 'd MMM yyyy', { locale: sv })}
                                    {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDownload(doc)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDocumentToDelete(doc)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort dokument?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort "{documentToDelete?.name}"? 
              Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
