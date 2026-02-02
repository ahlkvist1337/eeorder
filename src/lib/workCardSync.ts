import type { ArticleRow, OrderObject, ObjectTruck, TruckStepStatus, OrderStep } from '@/types/order';

/**
 * Get all article rows linked to a specific object
 */
export function getLinkedArticleRows(objectId: string, articleRows: ArticleRow[]): ArticleRow[] {
  return articleRows.filter(row => row.objectId === objectId);
}

/**
 * Calculate total quantity of work cards needed from linked article rows
 */
export function calculateRequiredWorkCards(articleRows: ArticleRow[]): number {
  return articleRows.reduce((sum, row) => sum + Math.floor(row.quantity), 0);
}

/**
 * Generate missing work cards to match the required count from article rows.
 * Creates truck step statuses for each step of the object.
 */
export function generateMissingWorkCards(
  object: OrderObject, 
  objectSteps: OrderStep[],
  requiredCount: number
): ObjectTruck[] {
  const currentCount = object.trucks?.length || 0;
  if (currentCount >= requiredCount) return [];
  
  const newTrucks: ObjectTruck[] = [];
  
  for (let i = currentCount; i < requiredCount; i++) {
    const truckId = crypto.randomUUID();
    
    // Create step statuses for each step
    const stepStatuses: TruckStepStatus[] = objectSteps.map(step => ({
      id: crypto.randomUUID(),
      truckId,
      stepId: step.id,
      status: 'pending' as const,
    }));
    
    newTrucks.push({
      id: truckId,
      objectId: object.id,
      truckNumber: '', // No number by default, can be added later
      status: 'waiting' as const,
      stepStatuses,
    });
  }
  
  return newTrucks;
}

/**
 * Sync work cards for an object based on linked article rows.
 * Returns the updated trucks array (existing + new).
 */
export function syncWorkCardsForObject(
  object: OrderObject,
  objectSteps: OrderStep[],
  linkedArticleRows: ArticleRow[]
): ObjectTruck[] {
  const requiredCount = calculateRequiredWorkCards(linkedArticleRows);
  const existingTrucks = object.trucks || [];
  
  // Only add missing work cards, never remove existing ones
  const missingTrucks = generateMissingWorkCards(object, objectSteps, requiredCount);
  
  return [...existingTrucks, ...missingTrucks];
}

/**
 * Get summary of linked article rows for display
 */
export function getLinkedArticlesSummary(
  objectId: string, 
  articleRows: ArticleRow[]
): { rowCount: number; totalQuantity: number } {
  const linked = getLinkedArticleRows(objectId, articleRows);
  return {
    rowCount: linked.length,
    totalQuantity: calculateRequiredWorkCards(linked),
  };
}
