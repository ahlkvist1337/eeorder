import { useState, useCallback, useEffect } from 'react';
import { Upload, X, FileIcon, Download, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

interface OrderAttachmentsProps {
  orderId: string;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
}

const MAX_VISIBLE_ATTACHMENTS = 3;

export function OrderAttachments({ orderId, attachments, onAttachmentsChange }: OrderAttachmentsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const sanitizeFileName = (name: string) => {
    // Replace Swedish and special characters, keep only safe chars
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[åäÅÄ]/g, 'a')
      .replace(/[öÖ]/g, 'o')
      .replace(/[^a-zA-Z0-9.-]/g, '_'); // Replace other special chars with underscore
  };

  const uploadFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    const fileArray = Array.from(files);
    
    try {
      for (const file of fileArray) {
        const safeFileName = sanitizeFileName(file.name);
        const filePath = `${orderId}/${Date.now()}-${safeFileName}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('order-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('order_attachments')
          .insert({
            order_id: orderId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
          });

        if (dbError) throw dbError;
      }

      toast({
        title: 'Filer uppladdade',
        description: `${fileArray.length} fil(er) har laddats upp.`,
      });
      
      onAttachmentsChange();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Uppladdningsfel',
        description: 'Kunde inte ladda upp fil(er).',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [orderId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('order-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('order_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      toast({
        title: 'Fil borttagen',
        description: `${attachment.file_name} har tagits bort.`,
      });
      
      onAttachmentsChange();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Fel',
        description: 'Kunde inte ta bort filen.',
        variant: 'destructive',
      });
    }
  };

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Generate signed URLs for all attachments
  const getSignedUrl = async (filePath: string): Promise<string> => {
    if (signedUrls[filePath]) {
      return signedUrls[filePath];
    }
    
    const { data, error } = await supabase.storage
      .from('order-attachments')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL:', error);
      return '';
    }
    
    setSignedUrls(prev => ({ ...prev, [filePath]: data.signedUrl }));
    return data.signedUrl;
  };

  // Load signed URLs for all attachments
  useEffect(() => {
    const loadSignedUrls = async () => {
      for (const attachment of attachments) {
        await getSignedUrl(attachment.file_path);
      }
    };
    if (attachments.length > 0) {
      loadSignedUrls();
    }
  }, [attachments]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isPdf = (mimeType: string) => mimeType === 'application/pdf';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bifogade filer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
            ${isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }
          `}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Laddar upp...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Dra och släpp filer här, eller klicka för att välja
              </p>
            </div>
          )}
        </div>

        {/* Attached files list */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            {(isExpanded ? attachments : attachments.slice(0, MAX_VISIBLE_ATTACHMENTS)).map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
              >
                {/* Preview or icon */}
                {isImage(attachment.mime_type) && signedUrls[attachment.file_path] ? (
                  <img
                    src={signedUrls[attachment.file_path]}
                    alt={attachment.file_name}
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : isPdf(attachment.mime_type) && signedUrls[attachment.file_path] ? (
                  <a
                    href={signedUrls[attachment.file_path]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 w-12 flex flex-col items-center justify-center bg-destructive/10 rounded hover:bg-destructive/20 transition-colors"
                  >
                    <FileText className="h-6 w-6 text-destructive" />
                    <span className="text-[9px] text-destructive font-medium">PDF</span>
                  </a>
                ) : (
                  <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                  >
                    <a
                      href={signedUrls[attachment.file_path] || '#'}
                      download={attachment.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(attachment)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {/* Expand/collapse button */}
            {attachments.length > MAX_VISIBLE_ATTACHMENTS && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Visa färre
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Visa alla ({attachments.length - MAX_VISIBLE_ATTACHMENTS} till)
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
