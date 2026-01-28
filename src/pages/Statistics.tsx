import { useMemo } from 'react';
import { BarChart3, CheckCircle2, Clock, DollarSign, AlertTriangle, Package } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrders } from '@/hooks/useOrders';

export default function Statistics() {
  const { orders } = useOrders();

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

    // Calculate average lead time from actual status history (Arrived → Completed)
    let avgLeadTimeDays = 0;
    const ordersWithLeadTime: number[] = [];

    completedOrders.forEach(order => {
      const arrivedEntry = order.statusHistory.find(h => h.toStatus === 'arrived');
      const completedEntry = order.statusHistory.find(h => h.toStatus === 'completed');
      
      if (arrivedEntry && completedEntry) {
        const arrivedDate = new Date(arrivedEntry.timestamp);
        const completedDate = new Date(completedEntry.timestamp);
        const days = Math.ceil((completedDate.getTime() - arrivedDate.getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          ordersWithLeadTime.push(days);
        }
      }
    });

    if (ordersWithLeadTime.length > 0) {
      avgLeadTimeDays = Math.round(
        ordersWithLeadTime.reduce((sum, d) => sum + d, 0) / ordersWithLeadTime.length
      );
    }

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
      avgLeadTimeDays,
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

        {/* Lead time comparison */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Verklig ledtid (snitt)
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.avgLeadTimeDays > 0 ? `${stats.avgLeadTimeDays} dagar` : '-'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Från Ankommen till Avslutad
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Planerad ledtid (snitt)
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.avgPlannedLeadTimeDays > 0 ? `${stats.avgPlannedLeadTimeDays} dagar` : '-'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Baserat på planerade datum
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Sammanfattning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Totalt antal ordrar</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Aktiva</p>
                <p className="text-2xl font-semibold text-primary">{stats.active}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Avslutade</p>
                <p className="text-2xl font-semibold text-[hsl(var(--status-completed))]">{stats.completed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Avbrutna</p>
                <p className="text-2xl font-semibold text-[hsl(var(--status-cancelled))]">{stats.cancelled}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
