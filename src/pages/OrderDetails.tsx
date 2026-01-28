import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowLeft, AlertTriangle, Clock, DollarSign, Package } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ProductionStatusBadge, BillingStatusBadge, StepStatusBadge } from '@/components/StatusBadge';
import { useOrders } from '@/hooks/useOrders';
import { productionStatusLabels, billingStatusLabels, stepStatusLabels } from '@/types/order';
import type { ProductionStatus, BillingStatus, StepStatus } from '@/types/order';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getOrderById, 
    updateOrder, 
    updateProductionStatus, 
    updateBillingStatus,
    updateOrderStep,
    deleteOrder,
    isLoading 
  } = useOrders();

  const order = getOrderById(id || '');

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Laddar order...</p>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Order hittades inte.</p>
          <Button onClick={() => navigate('/')}>Tillbaka till ordrar</Button>
        </div>
      </Layout>
    );
  }

  const handleProductionStatusChange = (status: string) => {
    updateProductionStatus(order.id, status as ProductionStatus);
  };

  const handleBillingStatusChange = (status: string) => {
    updateBillingStatus(order.id, status as BillingStatus);
  };

  const handleStepStatusChange = (stepId: string, status: string) => {
    updateOrderStep(order.id, stepId, { status: status as StepStatus });
  };

  const handleStepPriceChange = (stepId: string, price: string) => {
    const numericPrice = parseFloat(price) || 0;
    updateOrderStep(order.id, stepId, { price: numericPrice });
  };

  const handleDeviationChange = (hasDeviation: boolean) => {
    updateOrder(order.id, { hasDeviation });
  };

  const handleDeviationCommentChange = (comment: string) => {
    updateOrder(order.id, { deviationComment: comment });
  };

  const handleDelete = () => {
    if (confirm('Är du säker på att du vill ta bort denna order?')) {
      deleteOrder(order.id);
      navigate('/');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                {order.orderNumber}
              </h1>
              {order.hasDeviation && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
            <p className="text-muted-foreground">{order.customer || 'Ingen kund angiven'}</p>
          </div>
          <div className="flex gap-2">
            <ProductionStatusBadge status={order.productionStatus} />
            <BillingStatusBadge status={order.billingStatus} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card>
              <CardHeader>
                <CardTitle>Grunduppgifter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">Kund</Label>
                    <p className="font-medium">{order.customer || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Kundreferens</Label>
                    <p className="font-medium">{order.customerReference || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Planerat start</Label>
                    <p className="font-medium">
                      {order.plannedStart 
                        ? format(new Date(order.plannedStart), 'd MMMM yyyy', { locale: sv })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Planerat slut</Label>
                    <p className="font-medium">
                      {order.plannedEnd 
                        ? format(new Date(order.plannedEnd), 'd MMMM yyyy', { locale: sv })
                        : '-'}
                    </p>
                  </div>
                  {order.deliveryAddress && (
                    <div className="sm:col-span-2">
                      <Label className="text-muted-foreground">Leveransadress</Label>
                      <p className="font-medium">{order.deliveryAddress}</p>
                    </div>
                  )}
                  {order.comment && (
                    <div className="sm:col-span-2">
                      <Label className="text-muted-foreground">Kommentar</Label>
                      <p className="font-medium">{order.comment}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Treatment steps */}
            <Card>
              <CardHeader>
                <CardTitle>Behandlingssteg</CardTitle>
              </CardHeader>
              <CardContent>
                {order.steps.length === 0 ? (
                  <p className="text-muted-foreground">Inga behandlingssteg tillagda.</p>
                ) : (
                  <div className="space-y-4">
                    {order.steps.map((step, index) => (
                      <div key={step.id}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{step.name}</span>
                              <StepStatusBadge status={step.status} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Select 
                              value={step.status} 
                              onValueChange={(v) => handleStepStatusChange(step.id, v)}
                            >
                              <SelectTrigger className="w-[140px] h-9 bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                {Object.entries(stepStatusLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                value={step.price || ''}
                                onChange={(e) => handleStepPriceChange(step.id, e.target.value)}
                                placeholder="0"
                                className="w-24 h-9"
                              />
                              <span className="text-sm text-muted-foreground">kr</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Separator className="my-4" />
                    <div className="flex justify-end items-center gap-2">
                      <span className="font-medium">Totalt:</span>
                      <span className="text-lg font-bold">
                        {order.totalPrice.toLocaleString('sv-SE')} kr
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* XML Article rows */}
            {order.xmlData?.rows && order.xmlData.rows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Artikelrader (från XML)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Rad</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Artikelnr</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Beskrivning</th>
                          <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Antal</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Enhet</th>
                          <th className="text-right py-2 font-medium text-muted-foreground">Pris</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.xmlData.rows.map((row, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-mono">{row.rowNumber}</td>
                            <td className="py-2 pr-4 font-mono">{row.partNumber}</td>
                            <td className="py-2 pr-4">{row.text}</td>
                            <td className="py-2 pr-4 text-right">{row.quantity}</td>
                            <td className="py-2 pr-4">{row.unit}</td>
                            <td className="py-2 text-right">{row.price.toLocaleString('sv-SE')} kr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status history */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Statushistorik
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.statusHistory.length === 0 ? (
                  <p className="text-muted-foreground">Ingen statushistorik ännu.</p>
                ) : (
                  <div className="space-y-3">
                    {[...order.statusHistory].reverse().map(change => (
                      <div key={change.id} className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground min-w-[140px]">
                          {format(new Date(change.timestamp), 'd MMM yyyy HH:mm', { locale: sv })}
                        </span>
                        <ProductionStatusBadge status={change.fromStatus} className="text-xs" />
                        <span className="text-muted-foreground">→</span>
                        <ProductionStatusBadge status={change.toStatus} className="text-xs" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Quick actions */}
            <Card>
              <CardHeader>
                <CardTitle>Åtgärder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Produktionsstatus</Label>
                  <Select 
                    value={order.productionStatus} 
                    onValueChange={handleProductionStatusChange}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {Object.entries(productionStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Faktureringsstatus</Label>
                  <Select 
                    value={order.billingStatus} 
                    onValueChange={handleBillingStatusChange}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {Object.entries(billingStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="deviation"
                      checked={order.hasDeviation}
                      onCheckedChange={(checked) => handleDeviationChange(!!checked)}
                    />
                    <Label htmlFor="deviation" className="font-medium cursor-pointer flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Avvikelse
                    </Label>
                  </div>
                  {order.hasDeviation && (
                    <Textarea
                      value={order.deviationComment || ''}
                      onChange={(e) => handleDeviationCommentChange(e.target.value)}
                      placeholder="Beskriv avvikelsen..."
                      rows={3}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Skapad:</span>{' '}
                  {format(new Date(order.createdAt), 'd MMMM yyyy HH:mm', { locale: sv })}
                </div>
                <div>
                  <span className="text-muted-foreground">Senast uppdaterad:</span>{' '}
                  {format(new Date(order.updatedAt), 'd MMMM yyyy HH:mm', { locale: sv })}
                </div>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Farozon</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleDelete}
                >
                  Ta bort order
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
