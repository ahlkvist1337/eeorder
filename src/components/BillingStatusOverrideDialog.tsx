import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { TruckBillingStatus } from '@/types/order';

interface BillingStatusOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newStatus: TruckBillingStatus, comment: string) => Promise<void>;
}

const statusOptions: { value: TruckBillingStatus; label: string }[] = [
  { value: 'not_billable', label: 'Ej klar' },
  { value: 'ready_for_billing', label: 'Klar för fakturering' },
  { value: 'billed', label: 'Fakturerad' },
];

export function BillingStatusOverrideDialog({
  open,
  onOpenChange,
  onConfirm,
}: BillingStatusOverrideDialogProps) {
  const [status, setStatus] = useState<TruckBillingStatus>('ready_for_billing');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(status, comment);
      setComment('');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ändra faktureringsstatus</DialogTitle>
          <DialogDescription>
            Manuell ändring av faktureringsstatus för alla objekt i ordern.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ny status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TruckBillingStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kommentar (valfritt)</Label>
            <Textarea
              placeholder="Varför ändras statusen?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Avbryt
          </Button>
          <Button onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Sparar...' : 'Bekräfta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
