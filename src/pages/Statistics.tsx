import { useMemo } from 'react';
import { BarChart3, CheckCircle2, Clock, DollarSign, AlertTriangle, Package, Factory, Timer, AlertCircle } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useOrders } from '@/hooks/useOrders';
import { useProductionStats } from '@/hooks/useProductionStats';

export default function Statistics() {
  useDocumentTitle('Statistik');
  const { orders } = useOrders();
  const productionStats = useProductionStats();

  const stats = useMemo(() => {
    const activeStatuses = ['created', 'planned', 'started', 'paused', 'arrived'];
    const activeOrders = orders.filter(o => activeStatuses.includes(o.productionStatus));
    const completedOrders = orders.filter(o => o.productionStatus === 'completed');
    const cancelledOrders = orders.filter(o => o.productionStatus === 'cancelled');
    const billedOrders = orders.filter(o => o.billingStatus === 'billed');
    const readyForBilling = orders.filter(o => o.billingStatus === 'ready_for_billing');
    const deviationOrders = orders.filter(o => o.hasDeviation);

    const billedValue = billedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const readyValue = readyForBilling.reduce((sum, o) => sum + o.totalPrice, 0);

    // Calculate planned average lead time (from plannedStart to plannedEnd)
    let avgPlannedLeadTimeDays = 0;
    const ordersWithPlannedDates = completedOrders.filter(o => o.plannedStart && o.plannedEnd);
    if (ordersWithPlannedDates.length > 0) {
      const totalPlannedDays = ordersWithPlannedDates.reduce((sum, o) => {
        const start = new Date(o.plannedStart!);
        const end = new Date(o.plannedEnd!);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);
      avgPlannedLeadTimeDays = Math.round(totalPlannedDays / ordersWithPlannedDates.length);
    }

    return {
      total: orders.length,
      active: activeOrders.length,
      completed: completedOrders.length,
      cancelled: cancelledOrders.length,
      billed: billedOrders.length,
      readyForBilling: readyForBilling.length,
      deviations: deviationOrders.length,
      billedValue,
      readyValue,
      avgPlannedLeadTimeDays,
    };
  }, [orders]);

  const StatCard = ({ 
    title, 
    value, 
    subtitle,
    icon: Icon,
    className = ''
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: React.ElementType;
    className?: string;
  }) => (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Statistik</h1>
          <p className="text-muted-foreground">Översikt av orderhanteringen</p>
        </div>

        {/* Produktion & flöde */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Produktion & flöde
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Pågående arbetskort"
              value={productionStats.inProgress}
              subtitle="Ankommen + Startad"
              icon={Factory}
            />
            <StatCard
              title="Väntande arbetskort"
              value={productionStats.waiting}
              icon={Timer}
            />
            <StatCard
              title="Klara idag"
              value={productionStats.completedToday}
              icon={CheckCircle2}
            />
            <StatCard
              title="Försenade arbetskort"
              value={productionStats.overdue}
              icon={AlertCircle}
              className={productionStats.overdue > 0 ? 'border-destructive/50' : ''}
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Äldsta pågående arbetskort
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {productionStats.oldestActiveInfo 
                    ? productionStats.oldestActiveInfo.days === 0 
                      ? '< 1 dag'
                      : `${productionStats.oldestActiveInfo.days} dagar`
                    : '-'}
                </div>
                {productionStats.oldestActiveInfo && (
                  <p className="text-sm text-muted-foreground mt-1">
                    #{productionStats.oldestActiveInfo.truckNumber}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ledtid per arbetskort (snitt)
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {productionStats.avgLeadTimeDays > 0 
                    ? `${productionStats.avgLeadTimeDays} dagar` 
                    : '- (ej tillräcklig data)'}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Från Ankommen till Klar
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Affär & uppföljning */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Affär & uppföljning
          </h2>

          {/* Order counts */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Aktiva ordrar"
              value={stats.active}
              subtitle={`Av totalt ${stats.total} ordrar`}
              icon={Package}
            />
            <StatCard
              title="Avslutade ordrar"
              value={stats.completed}
              icon={CheckCircle2}
            />
            <StatCard
              title="Fakturerade ordrar"
              value={stats.billed}
              icon={DollarSign}
            />
            <StatCard
              title="Avvikelser"
              value={stats.deviations}
              icon={AlertTriangle}
              className={stats.deviations > 0 ? 'border-destructive/50' : ''}
            />
          </div>

          {/* Financial overview */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fakturerat värde
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.billedValue.toLocaleString('sv-SE')} kr
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Från {stats.billed} fakturerade ordrar
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Klar för fakturering
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.readyValue.toLocaleString('sv-SE')} kr
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.readyForBilling} ordrar väntar på fakturering
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lead time - order level */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Planerad ledtid per order (snitt)
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.avgPlannedLeadTimeDays > 0 
                  ? `${stats.avgPlannedLeadTimeDays} dagar` 
                  : '- (ej tillräcklig data)'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Baserat på planerade datum
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
