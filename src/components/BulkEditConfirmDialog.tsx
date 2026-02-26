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
import { orderAdminStatusLabels } from '@/types/order';
import type { OrderAdminStatus } from '@/types/order';

export type BulkEditType = 'productionStatus' | 'deviation';

interface BulkEditConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editType: BulkEditType | null;
  newValue: OrderAdminStatus | boolean | null;
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
        return `Du är på väg att ändra orderstatus till "${orderAdminStatusLabels[newValue as OrderAdminStatus]}" för ${orderText}.`;
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
