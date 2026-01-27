import { useState, useEffect, useCallback } from 'react';
import type { TreatmentStepTemplate } from '@/types/order';

const STEPS_STORAGE_KEY = 'order-management-treatment-steps';

const DEFAULT_STEPS: TreatmentStepTemplate[] = [
  { id: 'default-1', name: 'Blästring', createdAt: new Date().toISOString() },
  { id: 'default-2', name: 'Sprutzink', createdAt: new Date().toISOString() },
  { id: 'default-3', name: 'Målning', createdAt: new Date().toISOString() },
];

export function useTreatmentSteps() {
  const [steps, setSteps] = useState<TreatmentStepTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load steps from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STEPS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSteps(parsed.length > 0 ? parsed : DEFAULT_STEPS);
      } catch (e) {
        console.error('Failed to parse treatment steps from localStorage', e);
        setSteps(DEFAULT_STEPS);
      }
    } else {
      setSteps(DEFAULT_STEPS);
    }
    setIsLoading(false);
  }, []);

  // Save steps to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(steps));
    }
  }, [steps, isLoading]);

  const addStep = useCallback((name: string) => {
    const newStep: TreatmentStepTemplate = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setSteps(prev => [...prev, newStep]);
    return newStep;
  }, []);

  const updateStep = useCallback((id: string, name: string) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, name: name.trim() } : step
    ));
  }, []);

  const deleteStep = useCallback((id: string) => {
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
  };
}
