import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { subDays, subMonths } from 'date-fns';
import { BarChart3, CheckCircle2, Clock, DollarSign, AlertTriangle, Package, Factory, Timer, AlertCircle, ExternalLink } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrders } from '@/hooks/useOrders';
import { useProductionStats } from '@/hooks/useProductionStats';

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

export default function Statistics() {
  useDocumentTitle('Statistik');
  const { orders } = useOrders();
  const [timePeriod, setTimePeriod] = useState<string>('28d');

  const filteredOrders = useMemo(() => {
    if (timePeriod === 'all') return orders;
    const now = new Date();
    const cutoff = {
      '28d': subDays(now, 28),
      '3m': subMonths(now, 3),
      '6m': subMonths(now, 6),
    }[timePeriod];
    if (!cutoff) return orders;
    return orders.filter(o => new Date(o.createdAt) >= cutoff);
  }, [orders, timePeriod]);

  const dateFilter = useMemo(() => {
    if (timePeriod === 'all') return null;
    const now = new Date();
    return {
      '28d': subDays(now, 28),
      '3m': subMonths(now, 3),
      '6m': subMonths(now, 6),
    }[timePeriod] ?? null;
  }, [timePeriod]);

  const productionStats = useProductionStats(orders, dateFilter);

  const stats = useMemo(() => {
    const activeStatuses = ['created', 'planned', 'started', 'paused', 'arrived'];
    const activeOrders = filteredOrders.filter(o => activeStatuses.includes(o.productionStatus));
    const completedOrders = filteredOrders.filter(o => o.productionStatus === 'completed');
    const billedOrders = filteredOrders.filter(o => o.billingStatus === 'billed');
    const readyForBilling = filteredOrders.filter(o => o.billingStatus === 'ready_for_billing');
    const deviationOrders = filteredOrders.filter(o => o.hasDeviation);

    const billedValue = billedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const readyValue = readyForBilling.reduce((sum, o) => sum + o.totalPrice, 0);

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
      total: filteredOrders.length,
      active: activeOrders.length,
      completed: completedOrders.length,
      billed: billedOrders.length,
      readyForBilling: readyForBilling.length,
      deviations: deviationOrders.length,
      billedValue,
      readyValue,
      avgPlannedLeadTimeDays,
    };
  }, [filteredOrders]);

  const zeroPriceOrders = useMemo(() => {
    return filteredOrders
      .map(o => ({
        ...o,
        zeroPriceCount: (o.articleRows || []).filter(r => r.price === 0).length,
      }))
      .filter(o => o.zeroPriceCount > 0);
  }, [filteredOrders]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Statistik</h1>
            <p className="text-muted-foreground">Översikt av orderhanteringen</p>
          </div>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="28d">Senaste 28 dagarna</SelectItem>
              <SelectItem value="3m">Senaste 3 månaderna</SelectItem>
              <SelectItem value="6m">Senaste 6 månaderna</SelectItem>
              <SelectItem value="all">Sedan start</SelectItem>
            </SelectContent>
          </Select>
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

        <Separator />

        {/* Prisuppföljning */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Prisuppföljning
          </h2>

          <StatCard
            title="Ordrar med 0-pris artiklar"
            value={zeroPriceOrders.length}
            subtitle={`Av ${stats.total} ordrar i vald period`}
            icon={AlertTriangle}
            className={zeroPriceOrders.length > 0 ? 'border-destructive/50' : ''}
          />

          {zeroPriceOrders.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ordernr</TableHead>
                      <TableHead>Kund</TableHead>
                      <TableHead className="text-right">0-pris rader</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zeroPriceOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell className="text-right">{order.zeroPriceCount} st</TableCell>
                        <TableCell>
                          <Link to={`/order/${order.id}`} className="text-primary hover:text-primary/80">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
