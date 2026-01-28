import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TreatmentStepTemplate } from '@/types/order';

interface DbTreatmentStepTemplate {
  id: string;
  name: string;
  created_at: string;
}

export function useTreatmentSteps() {
  const [steps, setSteps] = useState<TreatmentStepTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSteps = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('treatment_step_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedSteps: TreatmentStepTemplate[] = (data || []).map((s: DbTreatmentStepTemplate) => ({
        id: s.id,
        name: s.name,
        createdAt: s.created_at,
      }));

      setSteps(mappedSteps);
    } catch (error) {
      console.error('Error fetching treatment steps:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const addStep = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from('treatment_step_templates')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) throw error;

    const newStep: TreatmentStepTemplate = {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
    };

    setSteps(prev => [...prev, newStep]);
    return newStep;
  }, []);

  const updateStep = useCallback(async (id: string, name: string) => {
    const { error } = await supabase
      .from('treatment_step_templates')
      .update({ name: name.trim() })
      .eq('id', id);

    if (error) throw error;

    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, name: name.trim() } : step
    ));
  }, []);

  const deleteStep = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('treatment_step_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setSteps(prev => prev.filter(step => step.id !== id));
  }, []);

  const getStepById = useCallback((id: string) => {
    return steps.find(s => s.id === id);
  }, [steps]);

  return {
    steps,
    isLoading,
    addStep,
    updateStep,
    deleteStep,
    getStepById,
    refreshSteps: fetchSteps,
  };
}
