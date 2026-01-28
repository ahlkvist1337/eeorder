import { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrders } from '@/hooks/useOrders';
import { useTreatmentSteps } from '@/hooks/useTreatmentSteps';
import { parseMonitorXML } from '@/lib/xmlParser';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ArticleRowsEditor } from '@/components/ArticleRowsEditor';
import type { Order, OrderStep, ParsedXMLOrder, ArticleRow } from '@/types/order';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('mode') === 'xml' ? 'xml' : 'manual';
  
  const { addOrder, orderNumberExists } = useOrders();
  const { steps: treatmentSteps } = useTreatmentSteps();

  // Manual form state
  const [orderNumber, setOrderNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerReference, setCustomerReference] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [comment, setComment] = useState('');
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);
  const [manualArticleRows, setManualArticleRows] = useState<ArticleRow[]>([]);
  const [manualError, setManualError] = useState<string | null>(null);

  // XML import state
  const [xmlError, setXmlError] = useState<string | null>(null);
  const [parsedXml, setParsedXml] = useState<ParsedXMLOrder | null>(null);
  const [xmlSelectedSteps, setXmlSelectedSteps] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    if (!orderNumber.trim()) {
      setManualError('Ordernummer är obligatoriskt.');
      return;
    }

    if (orderNumberExists(orderNumber.trim())) {
      setManualError(`Order med nummer "${orderNumber}" finns redan.`);
      return;
    }

    const steps: OrderStep[] = selectedSteps.map(templateId => {
      const template = treatmentSteps.find(t => t.id === templateId);
      return {
        id: crypto.randomUUID(),
        templateId,
        name: template?.name || 'Okänt steg',
        status: 'pending',
      };
    });

    const totalPrice = manualArticleRows.reduce((sum, row) => sum + row.price * row.quantity, 0);

    const newOrder: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'> = {
      orderNumber: orderNumber.trim(),
      customer: customer.trim(),
      customerReference: customerReference.trim(),
      productionStatus: 'created',
      billingStatus: 'not_ready',
      plannedStart: plannedStart || undefined,
      plannedEnd: plannedEnd || undefined,
      comment: comment.trim() || undefined,
      steps,
      hasDeviation: false,
      totalPrice,
      articleRows: manualArticleRows.length > 0 ? manualArticleRows : undefined,
      stepStatusHistory: [],
    };

    try {
      const created = await addOrder(newOrder);
      navigate(`/order/${created.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      setManualError('Kunde inte skapa ordern. Försök igen.');
    }
  };

  const handleFileUpload = useCallback((file: File) => {
    setXmlError(null);
    setParsedXml(null);

    if (!file.name.toLowerCase().endsWith('.xml')) {
      setXmlError('Filen måste vara en XML-fil.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const xmlString = e.target?.result as string;
        const parsed = parseMonitorXML(xmlString);

        if (orderNumberExists(parsed.orderNumber)) {
          setXmlError(`Order med nummer "${parsed.orderNumber}" finns redan i systemet.`);
          return;
        }

        setParsedXml(parsed);
      } catch (err) {
        setXmlError(err instanceof Error ? err.message : 'Kunde inte läsa XML-filen.');
      }
    };
    reader.onerror = () => {
      setXmlError('Kunde inte läsa filen.');
    };
    reader.readAsText(file);
  }, [orderNumberExists]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleXmlSubmit = async () => {
    if (!parsedXml) return;

    const steps: OrderStep[] = xmlSelectedSteps.map(templateId => {
      const template = treatmentSteps.find(t => t.id === templateId);
      return {
        id: crypto.randomUUID(),
        templateId,
        name: template?.name || 'Okänt steg',
        status: 'pending',
      };
    });

    const newOrder: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory'> = {
      orderNumber: parsedXml.orderNumber,
      customer: parsedXml.customer,
      customerReference: parsedXml.customerReference,
      deliveryAddress: parsedXml.deliveryAddress,
      productionStatus: 'created',
      billingStatus: 'not_ready',
      plannedStart: parsedXml.orderDate || undefined,
      plannedEnd: parsedXml.deliveryDate || undefined,
      steps,
      hasDeviation: false,
      totalPrice: parsedXml.rows.reduce((sum, row) => sum + row.price * row.quantity, 0),
      xmlData: {
        supplier: parsedXml.supplier,
        orderDate: parsedXml.orderDate,
        deliveryDate: parsedXml.deliveryDate,
      },
      articleRows: parsedXml.rows,
      stepStatusHistory: [],
    };

    try {
      const created = await addOrder(newOrder);
      navigate(`/order/${created.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      setXmlError('Kunde inte skapa ordern. Försök igen.');
    }
  };

  const toggleStep = (stepId: string, isXml: boolean) => {
    if (isXml) {
      setXmlSelectedSteps(prev => 
        prev.includes(stepId) 
          ? prev.filter(id => id !== stepId)
          : [...prev, stepId]
      );
    } else {
      setSelectedSteps(prev => 
        prev.includes(stepId) 
          ? prev.filter(id => id !== stepId)
          : [...prev, stepId]
      );
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Skapa ny order</h1>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual">Manuellt</TabsTrigger>
            <TabsTrigger value="xml">Importera XML</TabsTrigger>
          </TabsList>

          {/* Manual creation tab */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Ny order</CardTitle>
                <CardDescription>Fyll i orderuppgifterna manuellt</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  {manualError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{manualError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="orderNumber">Ordernummer *</Label>
                      <Input
                        id="orderNumber"
                        value={orderNumber}
                        onChange={e => setOrderNumber(e.target.value)}
                        placeholder="T.ex. 12345"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer">Kund</Label>
                      <Input
                        id="customer"
                        value={customer}
                        onChange={e => setCustomer(e.target.value)}
                        placeholder="Kundnamn"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerReference">Kundreferens</Label>
                    <Input
                      id="customerReference"
                      value={customerReference}
                      onChange={e => setCustomerReference(e.target.value)}
                      placeholder="Kontaktperson eller referens"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plannedStart">Planerat startdatum</Label>
                      <Input
                        id="plannedStart"
                        type="date"
                        value={plannedStart}
                        onChange={e => setPlannedStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plannedEnd">Planerat slutdatum</Label>
                      <Input
                        id="plannedEnd"
                        type="date"
                        value={plannedEnd}
                        onChange={e => setPlannedEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Behandlingssteg</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {treatmentSteps.map(step => (
                        <div key={step.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`step-${step.id}`}
                            checked={selectedSteps.includes(step.id)}
                            onCheckedChange={() => toggleStep(step.id, false)}
                          />
                          <Label htmlFor={`step-${step.id}`} className="font-normal cursor-pointer">
                            {step.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {treatmentSteps.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Inga behandlingssteg finns. Skapa steg under "Behandlingssteg".
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Artikelrader</Label>
                    <div className="border rounded-md p-4">
                      <ArticleRowsEditor
                        rows={manualArticleRows}
                        onRowsChange={setManualArticleRows}
                        showTotal={true}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comment">Kommentar</Label>
                    <Textarea
                      id="comment"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Eventuell kommentar..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/')}>
                      Avbryt
                    </Button>
                    <Button type="submit">Skapa order</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* XML import tab */}
          <TabsContent value="xml">
            <Card>
              <CardHeader>
                <CardTitle>Importera från XML</CardTitle>
                <CardDescription>Ladda upp en XML-fil från Monitor ERP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {xmlError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{xmlError}</AlertDescription>
                  </Alert>
                )}

                {!parsedXml ? (
                  <div
                    className={`border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
                      isDragging ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  >
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">
                      Dra och släpp XML-fil här
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      eller klicka för att välja fil
                    </p>
                    <input
                      type="file"
                      accept=".xml"
                      onChange={handleFileInput}
                      className="hidden"
                      id="xml-upload"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="xml-upload" className="cursor-pointer">
                        Välj fil
                      </label>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert className="border-primary/50 bg-primary/5">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <AlertDescription>
                        XML-fil inläst! Kontrollera uppgifterna nedan.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-muted/50 rounded-sm p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold">{parsedXml.orderNumber}</span>
                      </div>
                      
                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Kund:</span>{' '}
                          {parsedXml.customer || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Referens:</span>{' '}
                          {parsedXml.customerReference || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Leveransadress:</span>{' '}
                          {parsedXml.deliveryAddress || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Leverantör:</span>{' '}
                          {parsedXml.supplier || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Orderdatum:</span>{' '}
                          {parsedXml.orderDate || '-'}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Leveransdatum:</span>{' '}
                          {parsedXml.deliveryDate || '-'}
                        </div>
                      </div>

                      {parsedXml.rows.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium mb-2">Artikelrader:</p>
                          <ul className="text-sm space-y-1">
                            {parsedXml.rows.map((row, i) => (
                              <li key={i} className="text-muted-foreground">
                                {row.text || row.partNumber || `Rad ${row.rowNumber}`}
                                {row.quantity > 0 && ` (${row.quantity} ${row.unit})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Lägg till behandlingssteg</Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {treatmentSteps.map(step => (
                          <div key={step.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`xml-step-${step.id}`}
                              checked={xmlSelectedSteps.includes(step.id)}
                              onCheckedChange={() => toggleStep(step.id, true)}
                            />
                            <Label htmlFor={`xml-step-${step.id}`} className="font-normal cursor-pointer">
                              {step.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setParsedXml(null);
                          setXmlSelectedSteps([]);
                        }}
                      >
                        Välj annan fil
                      </Button>
                      <Button onClick={handleXmlSubmit}>
                        Skapa order
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
