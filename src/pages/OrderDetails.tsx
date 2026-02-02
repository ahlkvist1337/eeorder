import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ArrowLeft, AlertTriangle, Clock, Package, Wrench, Save, CalendarIcon } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductionStatusBadge, BillingStatusBadge } from '@/components/StatusBadge';
import { ArticleRowsEditor } from '@/components/ArticleRowsEditor';
import { OrderObjectsEditor } from '@/components/OrderObjectsEditor';
import { OrderAttachments } from '@/components/OrderAttachments';
import { useOrders } from '@/hooks/useOrders';
import { useOrderAttachments } from '@/hooks/useOrderAttachments';
import { useAuth } from '@/contexts/AuthContext';
import { productionStatusLabels, billingStatusLabels, stepStatusLabels } from '@/types/order';
import type { ProductionStatus, BillingStatus, OrderStep, OrderObject, TruckStatus, StepStatus } from '@/types/order';
import { StepStatusBadge } from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getOrderById, 
    updateOrder, 
    updateProductionStatus, 
    updateBillingStatus,
    updateOrderStep,
    updateTruckStatus,
    updateTruckStepStatus,
    deleteOrder,
    isLoading 
  } = useOrders();

  const order = getOrderById(id || '');
  const { attachments, refetch: refetchAttachments } = useOrderAttachments(id || '');
  const { canEdit } = useAuth();
  
  // Set dynamic page title
  useDocumentTitle(order ? `Order ${order.orderNumber}` : 'Order');
  
  // Local state for deviation comment to avoid saving on every keystroke
  const [localDeviationComment, setLocalDeviationComment] = useState(order?.deviationComment || '');
  const [hasUnsavedDeviationComment, setHasUnsavedDeviationComment] = useState(false);
  
  // Local state for order comment
  const [localComment, setLocalComment] = useState(order?.comment || '');
  const [hasUnsavedComment, setHasUnsavedComment] = useState(false);

  // Sync local state when order changes
  useEffect(() => {
    if (order) {
      setLocalDeviationComment(order.deviationComment || '');
      setHasUnsavedDeviationComment(false);
      setLocalComment(order.comment || '');
      setHasUnsavedComment(false);
    }
  }, [order?.deviationComment, order?.comment]);

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

  const handleObjectsAndStepsChange = async (newObjects: OrderObject[], newSteps: OrderStep[]) => {
    try {
      // Pass the current order.steps as previousSteps for comparison
      // IMPORTANT: Always send both objects AND steps together to ensure consistent save
      await updateOrder(order.id, { objects: newObjects, steps: newSteps }, order.steps);
    } catch (error) {
      console.error('Error updating objects and steps:', error);
      toast.error('Kunde inte spara ändringarna. Försök igen.');
    }
  };

  const handleTruckStatusChange = async (truckId: string, status: TruckStatus) => {
    await updateTruckStatus(order.id, truckId, status);
  };

  const handleTruckStepStatusChange = async (
    truckId: string, 
    stepId: string, 
    status: StepStatus
  ) => {
    const truck = (order.objects || [])
      .flatMap(o => o.trucks || [])
      .find(t => t.id === truckId);
    const step = order.steps.find(s => s.id === stepId);
    
    if (truck && step) {
      await updateTruckStepStatus(
        order.id, 
        truckId, 
        stepId, 
        status, 
        truck.truckNumber, 
        step.name
      );
    }
  };

  const handleDeviationChange = async (hasDeviation: boolean) => {
    try {
      await updateOrder(order.id, { hasDeviation });
    } catch (error) {
      console.error('Error updating deviation:', error);
    }
  };

  const handleSaveDeviationComment = async () => {
    try {
      await updateOrder(order.id, { deviationComment: localDeviationComment });
      setHasUnsavedDeviationComment(false);
    } catch (error) {
      console.error('Error updating deviation comment:', error);
    }
  };

  const handleSaveComment = async () => {
    try {
      await updateOrder(order.id, { comment: localComment });
      setHasUnsavedComment(false);
    } catch (error) {
      console.error('Error updating comment:', error);
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
      <div className="space-y-4 sm:space-y-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="shrink-0 -ml-2 sm:ml-0" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight font-mono truncate">
                  {order.orderNumber}
                </h1>
                {order.hasDeviation && (
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />
                )}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground truncate">{order.customer || 'Ingen kund angiven'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProductionStatusBadge status={order.productionStatus} />
            <BillingStatusBadge status={order.billingStatus} />
          </div>
          
          {/* Truck summary */}
          {(() => {
            const allTrucks = (order.objects || []).flatMap(obj => obj.trucks || []);
            if (allTrucks.length === 0) return null;
            
            const planned = allTrucks.length;
            const arrived = allTrucks.filter(t => t.status === 'arrived' || t.status === 'started' || t.status === 'paused' || t.status === 'completed').length;
            const completed = allTrucks.filter(t => t.status === 'completed').length;
            
            return (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Truckar:</span>
                <span>{planned} planerade</span>
                <span>•</span>
                <span>{arrived} ankomna</span>
                <span>•</span>
                <span>{completed} klara</span>
              </div>
            );
          })()}
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Main content - 2 columns */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            {/* Basic info */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Grunduppgifter</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Kund</Label>
                    <p className="font-medium text-sm sm:text-base break-words">{order.customer || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm text-muted-foreground">Kundreferens</Label>
                    <p className="font-medium text-sm sm:text-base break-words">{order.customerReference || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm text-muted-foreground">Planerat start</Label>
                    {canEdit ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal text-sm h-9",
                              !order.plannedStart && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {order.plannedStart
                              ? format(new Date(order.plannedStart), 'd MMM yyyy', { locale: sv })
                              : 'Välj datum'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={order.plannedStart ? new Date(order.plannedStart) : undefined}
                            onSelect={async (date) => {
                              try {
                                await updateOrder(order.id, { 
                                  plannedStart: date ? date.toISOString() : undefined 
                                });
                                toast.success('Planerat startdatum uppdaterat');
                              } catch (error) {
                                console.error('Error updating planned start:', error);
                                toast.error('Kunde inte uppdatera datum');
                              }
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="font-medium text-sm sm:text-base">
                        {order.plannedStart 
                          ? format(new Date(order.plannedStart), 'd MMM yyyy', { locale: sv })
                          : '-'}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs sm:text-sm text-muted-foreground">Planerat slut</Label>
                    {canEdit ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal text-sm h-9",
                              !order.plannedEnd && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {order.plannedEnd
                              ? format(new Date(order.plannedEnd), 'd MMM yyyy', { locale: sv })
                              : 'Välj datum'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={order.plannedEnd ? new Date(order.plannedEnd) : undefined}
                            onSelect={async (date) => {
                              try {
                                await updateOrder(order.id, { 
                                  plannedEnd: date ? date.toISOString() : undefined 
                                });
                                toast.success('Planerat slutdatum uppdaterat');
                              } catch (error) {
                                console.error('Error updating planned end:', error);
                                toast.error('Kunde inte uppdatera datum');
                              }
                            }}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="font-medium text-sm sm:text-base">
                        {order.plannedEnd 
                          ? format(new Date(order.plannedEnd), 'd MMM yyyy', { locale: sv })
                          : '-'}
                      </p>
                    )}
                  </div>
                  {order.deliveryAddress && (
                    <div className="sm:col-span-2">
                      <Label className="text-xs sm:text-sm text-muted-foreground">Leveransadress</Label>
                      <p className="font-medium text-sm sm:text-base break-words">{order.deliveryAddress}</p>
                    </div>
                  )}
                  <div className="sm:col-span-2 space-y-2">
                    <Label className="text-xs sm:text-sm text-muted-foreground">Kommentar</Label>
                    <Textarea
                      value={localComment}
                      onChange={(e) => {
                        setLocalComment(e.target.value);
                        setHasUnsavedComment(e.target.value !== (order.comment || ''));
                      }}
                      placeholder="Skriv en kommentar..."
                      rows={3}
                      className="text-sm"
                    />
                    {hasUnsavedComment && (
                      <Button 
                        size="sm" 
                        onClick={handleSaveComment}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Spara
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Objects and Treatment steps */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
                  Objekt & Behandlingssteg
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <OrderObjectsEditor
                  objects={order.objects || []}
                  steps={order.steps}
                  onObjectsChange={(newObjects) => handleObjectsAndStepsChange(newObjects, order.steps)}
                  onStepsChange={(newSteps) => handleObjectsAndStepsChange(order.objects || [], newSteps)}
                  onTruckStatusChange={handleTruckStatusChange}
                  onTruckStepStatusChange={handleTruckStepStatusChange}
                />
              </CardContent>
            </Card>

            {/* Article rows */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                  Artikelrader
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <ArticleRowsEditor
                  rows={order.articleRows || []}
                  onRowsChange={handleArticleRowsChange}
                  showTotal={true}
                />
              </CardContent>
            </Card>

            {/* Truck Timeline History */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                  Truckhistorik
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                {(() => {
                  // Get all trucks from all objects
                  const allTrucks = (order.objects || []).flatMap(obj => 
                    (obj.trucks || []).map(truck => ({
                      ...truck,
                      objectName: obj.name,
                    }))
                  );
                  
                  if (allTrucks.length === 0) {
                    return <p className="text-muted-foreground text-sm">Inga truckar finns på denna order.</p>;
                  }
                  
                  return (
                    <div className="space-y-6">
                      {allTrucks.map(truck => {
                        // Collect events for this truck from truckStatusHistory
                        const truckEvents = (order.truckStatusHistory || [])
                          .filter(h => h.truckId === truck.id)
                          .map(h => ({
                            id: h.id,
                            timestamp: h.timestamp,
                            type: h.toStatus === 'in_progress' ? 'step_started' : h.toStatus === 'completed' ? 'step_completed' : h.toStatus,
                            stepName: h.stepName,
                            label: h.toStatus === 'in_progress' 
                              ? `${h.stepName}: Pågående`
                              : h.toStatus === 'completed'
                                ? `${h.stepName}: Klar`
                                : h.stepName,
                          }));
                        
                        // Sort by timestamp
                        const sortedEvents = truckEvents.sort((a, b) => 
                          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                        );
                        
                        return (
                          <div key={truck.id} className="border-b pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-lg font-bold font-mono">#{truck.truckNumber}</span>
                              <span className="text-sm text-muted-foreground">• {truck.objectName}</span>
                            </div>
                            
                            {sortedEvents.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Ingen historik ännu</p>
                            ) : (
                              <div className="relative pl-4 border-l-2 border-muted space-y-2">
                                {sortedEvents.map(event => (
                                  <div key={event.id} className="relative">
                                    <div className="absolute -left-[9px] top-1.5 w-2 h-2 rounded-full bg-primary" />
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-muted-foreground min-w-[80px]">
                                        {format(new Date(event.timestamp), 'd MMM HH:mm', { locale: sv })}
                                      </span>
                                      <span>{event.label}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick actions */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Åtgärder</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 pt-0 sm:pt-0">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Produktionsstatus</Label>
                  <Select 
                    value={order.productionStatus} 
                    onValueChange={handleProductionStatusChange}
                  >
                    <SelectTrigger className="bg-background text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {Object.entries(productionStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Faktureringsstatus</Label>
                  <Select 
                    value={order.billingStatus} 
                    onValueChange={handleBillingStatusChange}
                  >
                    <SelectTrigger className="bg-background text-sm">
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
                    <Label htmlFor="deviation" className="font-medium cursor-pointer flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Avvikelse
                    </Label>
                  </div>
                  {order.hasDeviation && (
                    <div className="space-y-2">
                      <Textarea
                        value={localDeviationComment}
                        onChange={(e) => {
                          setLocalDeviationComment(e.target.value);
                          setHasUnsavedDeviationComment(e.target.value !== (order.deviationComment || ''));
                        }}
                        placeholder="Beskriv avvikelsen..."
                        rows={3}
                        className="text-sm"
                      />
                      {hasUnsavedDeviationComment && (
                        <Button 
                          size="sm" 
                          onClick={handleSaveDeviationComment}
                          className="w-full"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Spara
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* File attachments */}
            <OrderAttachments
              orderId={order.id}
              attachments={attachments}
              onAttachmentsChange={refetchAttachments}
            />

            {/* Metadata */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Information</CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-1.5 sm:space-y-2 pt-0 sm:pt-0">
                <div>
                  <span className="text-muted-foreground">Skapad:</span>{' '}
                  {format(new Date(order.createdAt), 'd MMM yyyy HH:mm', { locale: sv })}
                </div>
                <div>
                  <span className="text-muted-foreground">Uppdaterad:</span>{' '}
                  {format(new Date(order.updatedAt), 'd MMM yyyy HH:mm', { locale: sv })}
                </div>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="border-destructive/50">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-destructive text-base sm:text-lg">Farozon</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 sm:pt-0">
                <Button 
                  variant="destructive" 
                  className="w-full text-sm"
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
