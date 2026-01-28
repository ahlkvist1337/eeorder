import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowLeft, AlertTriangle, Clock, Package, Wrench } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductionStatusBadge, BillingStatusBadge } from '@/components/StatusBadge';
import { ArticleRowsEditor } from '@/components/ArticleRowsEditor';
import { OrderStepsEditor } from '@/components/OrderStepsEditor';
import { useOrders } from '@/hooks/useOrders';
import { productionStatusLabels, billingStatusLabels } from '@/types/order';
import type { ProductionStatus, BillingStatus, OrderStep } from '@/types/order';

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

  const handleProductionStatusChange = async (status: string) => {
    try {
      await updateProductionStatus(order.id, status as ProductionStatus);
    } catch (error) {
      console.error('Error updating production status:', error);
    }
  };

  const handleBillingStatusChange = async (status: string) => {
    try {
      await updateBillingStatus(order.id, status as BillingStatus);
    } catch (error) {
      console.error('Error updating billing status:', error);
    }
  };

  const handleStepsChange = async (newSteps: OrderStep[]) => {
    try {
      await updateOrder(order.id, { steps: newSteps });
    } catch (error) {
      console.error('Error updating steps:', error);
    }
  };

  const handleDeviationChange = async (hasDeviation: boolean) => {
    try {
      await updateOrder(order.id, { hasDeviation });
    } catch (error) {
      console.error('Error updating deviation:', error);
    }
  };

  const handleDeviationCommentChange = async (comment: string) => {
    try {
      await updateOrder(order.id, { deviationComment: comment });
    } catch (error) {
      console.error('Error updating deviation comment:', error);
    }
  };

  const handleArticleRowsChange = async (rows: import('@/types/order').ArticleRow[]) => {
    const newTotal = rows.reduce((sum, row) => sum + row.price * row.quantity, 0);
    try {
      await updateOrder(order.id, { 
        articleRows: rows,
        totalPrice: newTotal
      });
    } catch (error) {
      console.error('Error updating article rows:', error);
    }
  };

  const handleDelete = async () => {
    if (confirm('Är du säker på att du vill ta bort denna order?')) {
      try {
        await deleteOrder(order.id);
        navigate('/');
      } catch (error) {
        console.error('Error deleting order:', error);
      }
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
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Behandlingssteg
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderStepsEditor
                  steps={order.steps}
                  onStepsChange={handleStepsChange}
                />
              </CardContent>
            </Card>

            {/* Article rows */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Artikelrader
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ArticleRowsEditor
                  rows={order.articleRows || []}
                  onRowsChange={handleArticleRowsChange}
                  showTotal={true}
                />
              </CardContent>
            </Card>

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

                <div className="border-t my-4" />

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
