import { motion } from 'motion/react'
import { Activity, ArrowUpRight, Building2, Fingerprint, RadioTower, WalletCards } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, Cell } from 'recharts'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartStage } from '@/components/ui/chart-stage'
import {
  buildDeliveryStatusDistribution,
  buildStoreStatusDistribution,
  buildTransactionTimeline,
  countActiveTokens,
  formatCompactNumber,
  formatCurrencyShort,
} from '@/features/dashboard/insights'
import type { DashboardTab, DashboardTransaction, Store, StoreToken, WebhookDelivery } from '@/features/dashboard/types'
import { cn } from '@/lib/utils'

type WorkspaceHeaderProps = {
  activeTab: DashboardTab
  currentStoreName: string
  deliveries: WebhookDelivery[]
  onSelectTab: (tab: DashboardTab) => void
  stores: Store[]
  tabOptions: Array<{ value: DashboardTab; label: string }>
  tokens: StoreToken[]
  transactions: DashboardTransaction[]
}

function WorkspaceMetricCard({
  copy,
  icon: Icon,
  label,
  value,
}: {
  copy: string
  icon: typeof Activity
  label: string
  value: string
}) {
  return (
    <Card className="h-full rounded-[1.7rem] border-border/70 bg-card/76 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.52)]">
      <CardContent className="grid gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Icon className="size-5" />
          </span>
          <ArrowUpRight className="size-4 text-muted-foreground" />
        </div>
        <div className="grid gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <strong className="text-3xl font-semibold tracking-[-0.07em] text-foreground">{value}</strong>
          <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkspaceHeader({
  activeTab,
  currentStoreName,
  deliveries,
  onSelectTab,
  stores,
  tabOptions,
  tokens,
  transactions,
}: WorkspaceHeaderProps) {
  const timeline = buildTransactionTimeline(transactions, 7)
  const deliveryDistribution = buildDeliveryStatusDistribution(deliveries)
  const storeDistribution = buildStoreStatusDistribution(stores)
  const totalVolume = transactions.reduce((total, transaction) => total + transaction.gross_amount, 0)
  const paidCount = transactions.filter((transaction) => transaction.status === 'paid' || transaction.status === 'settlement').length
  const activeTokenCount = countActiveTokens(tokens)

  return (
    <section className="grid gap-5">
      <Card className="relative overflow-hidden rounded-[2.25rem] border-border/70 bg-[linear-gradient(140deg,color-mix(in_oklab,var(--foreground)_92%,transparent),color-mix(in_oklab,var(--foreground)_76%,transparent))] text-white shadow-[0_50px_120px_-80px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="absolute -right-12 top-4 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-[-4rem] left-[18%] h-48 w-48 rounded-full bg-chart-2/16 blur-3xl" />

        <CardHeader className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end">
          <div className="grid gap-5">
            <Badge className="w-fit rounded-full border border-white/14 bg-white/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
              Workspace control room
            </Badge>
            <div className="grid gap-3">
              <CardTitle className="max-w-3xl text-4xl font-semibold leading-[0.94] tracking-[-0.08em] text-white md:text-5xl" title={currentStoreName}>
                {currentStoreName}
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-8 text-white/68">
                Ruang kerja ini dirancang untuk membaca charge, token, audit, dan webhook dengan cepat. Fokusnya bukan
                dekorasi, melainkan sinyal operasional yang kuat.
              </CardDescription>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {tabOptions.map((item) => (
                <button
                  className={cn(
                    buttonVariants({ variant: activeTab === item.value ? 'secondary' : 'ghost', size: 'sm' }),
                    activeTab === item.value
                      ? 'shrink-0 rounded-full border border-white/16 bg-white text-slate-950 hover:bg-white/92'
                      : 'shrink-0 rounded-full border border-transparent bg-white/0 text-white/72 hover:border-white/10 hover:bg-white/8 hover:text-white',
                  )}
                  key={item.value}
                  onClick={() => onSelectTab(item.value)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.9rem] border border-white/10 bg-white/7 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Charge volume 7 hari</p>
                <strong className="mt-2 block text-2xl font-semibold tracking-[-0.05em] text-white">
                  {formatCurrencyShort(totalVolume)}
                </strong>
              </div>
              <Badge className="rounded-full border-emerald-300/25 bg-emerald-300/10 text-emerald-100">{paidCount} paid</Badge>
            </div>

            <ChartStage className="h-48">
              <AreaChart data={timeline} responsive style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="workspacePaid" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="workspaceVolume" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7dd3fc" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#7dd3fc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 12 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(8,18,31,0.94)',
                      color: '#f8fafc',
                    }}
                    formatter={(value, name) => {
                      if (name === 'volume') {
                        return [formatCurrencyShort(Number(value)), 'volume']
                      }
                      return [value, name]
                    }}
                  />
                  <Area dataKey="volume" fill="url(#workspaceVolume)" stroke="#7dd3fc" strokeWidth={2} type="monotone" />
                  <Area dataKey="paidCount" fill="url(#workspacePaid)" stroke="#34d399" strokeWidth={2.25} type="monotone" />
                  <Area dataKey="failureCount" fill="transparent" stroke="#fb7185" strokeWidth={1.8} type="monotone" />
                </AreaChart>
            </ChartStage>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Store aktif',
              value: formatCompactNumber(stores.filter((store) => store.status === 'active').length),
              copy: 'Jumlah tenant yang siap menerima charge dan webhook.',
              icon: Building2,
            },
            {
              label: 'Token aktif',
              value: formatCompactNumber(activeTokenCount),
              copy: 'Credential backend tenant yang masih valid dipakai.',
              icon: Fingerprint,
            },
            {
              label: 'Charge snapshot',
              value: formatCompactNumber(transactions.length),
              copy: 'Transaksi terbaru untuk store yang sedang aktif di workspace.',
              icon: WalletCards,
            },
            {
              label: 'Webhook lane',
              value: formatCompactNumber(deliveries.length),
              copy: 'Delivery callback yang sedang dipantau atau siap diresend.',
              icon: RadioTower,
            },
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 18 }}
              transition={{ delay: 0.05 * index, duration: 0.35 }}
            >
              <WorkspaceMetricCard copy={metric.copy} icon={metric.icon} label={metric.label} value={metric.value} />
            </motion.div>
          ))}
        </div>

        <Card className="rounded-[1.9rem] border-border/70 bg-card/80 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.55)]">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-2">
                <Badge variant="outline" className="w-fit">
                  Distribution
                </Badge>
                <CardTitle className="text-2xl tracking-[-0.05em]">Store posture & webhook outcome</CardTitle>
              </div>
              <Badge variant="secondary">
                {storeDistribution.length > 0 ? `${stores.length} tenant` : 'Belum ada tenant'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Store status</p>
              <ChartStage className="h-52 rounded-[1.5rem] border border-border/70 bg-muted/25 p-3">
                <BarChart data={storeDistribution} responsive style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <Tooltip />
                    <Bar barSize={40} dataKey="value" radius={[16, 16, 0, 0]}>
                      {storeDistribution.map((entry) => (
                        <Cell fill={entry.fill} key={entry.label} />
                      ))}
                    </Bar>
                  </BarChart>
              </ChartStage>
            </div>

            <div className="grid gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Webhook delivery</p>
              <ChartStage className="h-52 rounded-[1.5rem] border border-border/70 bg-muted/25 p-3">
                <BarChart data={deliveryDistribution} responsive style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <Tooltip />
                    <Bar barSize={34} dataKey="value" radius={[14, 14, 0, 0]}>
                      {deliveryDistribution.map((entry) => (
                        <Cell fill={entry.fill} key={entry.label} />
                      ))}
                    </Bar>
                  </BarChart>
              </ChartStage>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
