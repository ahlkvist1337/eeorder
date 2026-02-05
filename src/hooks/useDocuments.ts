import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type DocumentCategory = 'lathundar' | 'rutiner' | 'tolkningar';

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  file_path: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as Document[]) || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte hämta dokument',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (
    file: File,
    category: DocumentCategory
  ): Promise<boolean> => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ej inloggad');

      // Sanitize filename
      const sanitizedName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      
      const filePath = `${category}/${Date.now()}_${sanitizedName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          name: file.name,
          category,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Uppladdning klar',
        description: `${file.name} har laddats upp`,
      });

      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Fel vid uppladdning',
        description: 'Kunde inte ladda upp dokumentet',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (document: Document): Promise<boolean> => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast({
        title: 'Borttaget',
        description: `${document.name} har tagits bort`,
      });

      await fetchDocuments();
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte ta bort dokumentet',
        variant: 'destructive',
      });
      return false;
    }
  };

  const getDownloadUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getByCategory = (category: DocumentCategory): Document[] => {
    return documents.filter(d => d.category === category);
  };

  return {
    documents,
    isLoading,
    isUploading,
    uploadDocument,
    deleteDocument,
    getDownloadUrl,
    getByCategory,
    refetch: fetchDocuments,
  };
}
