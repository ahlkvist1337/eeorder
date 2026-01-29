import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ObjectTemplate {
  id: string;
  name: string;
  createdAt: string;
}

interface DbObjectTemplate {
  id: string;
  name: string;
  created_at: string;
}

export function useObjectTemplates() {
  const [templates, setTemplates] = useState<ObjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('object_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedTemplates: ObjectTemplate[] = (data || []).map((t: DbObjectTemplate) => ({
        id: t.id,
        name: t.name,
        createdAt: t.created_at,
      }));

      setTemplates(mappedTemplates);
    } catch (error) {
      console.error('Error fetching object templates:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const addTemplate = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from('object_templates')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) throw error;

    const newTemplate: ObjectTemplate = {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
    };

    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  }, []);

  const updateTemplate = useCallback(async (id: string, name: string) => {
    const { error } = await supabase
      .from('object_templates')
      .update({ name: name.trim() })
      .eq('id', id);

    if (error) throw error;

    setTemplates(prev => prev.map(template => 
      template.id === id ? { ...template, name: name.trim() } : template
    ));
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('object_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setTemplates(prev => prev.filter(template => template.id !== id));
  }, []);

  const getTemplateById = useCallback((id: string) => {
    return templates.find(t => t.id === id);
  }, [templates]);

  return {
    templates,
    isLoading,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateById,
    refreshTemplates: fetchTemplates,
  };
}
