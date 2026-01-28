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
import { productionStatusLabels, billingStatusLabels } from '@/types/order';
import type { ProductionStatus, BillingStatus } from '@/types/order';

export type BulkEditType = 'productionStatus' | 'billingStatus' | 'deviation';

interface BulkEditConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editType: BulkEditType | null;
  newValue: ProductionStatus | BillingStatus | boolean | null;
  orderCount: number;
  onConfirm: () => void;
}

export function BulkEditConfirmDialog({
  open,
  onOpenChange,
  editType,
  newValue,
  orderCount,
  onConfirm,
}: BulkEditConfirmDialogProps) {
  const getTitle = () => {
    switch (editType) {
      case 'productionStatus':
        return 'Ändra produktionsstatus';
      case 'billingStatus':
        return 'Ändra faktureringsstatus';
      case 'deviation':
        return 'Ändra avvikelse';
      default:
        return 'Bekräfta ändring';
    }
  };

  const getDescription = () => {
    const orderText = orderCount === 1 ? '1 order' : `${orderCount} ordrar`;
    
    switch (editType) {
      case 'productionStatus':
        return `Du är på väg att ändra produktionsstatus till "${productionStatusLabels[newValue as ProductionStatus]}" för ${orderText}.`;
      case 'billingStatus':
        return `Du är på väg att ändra faktureringsstatus till "${billingStatusLabels[newValue as BillingStatus]}" för ${orderText}.`;
      case 'deviation':
        return `Du är på väg att ${newValue ? 'markera' : 'avmarkera'} avvikelse för ${orderText}.`;
      default:
        return '';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-background">
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription>{getDescription()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Genomför ändring
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
