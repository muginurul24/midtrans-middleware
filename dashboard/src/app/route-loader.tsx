import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type RouteLoaderProps = {
  eyebrow?: string
  message?: string
  title?: string
}

export function RouteLoader({
  eyebrow = 'Memuat',
  message = 'Komponen route sedang dimuat secara terpisah agar bundle awal tetap ringan.',
  title = 'Menyiapkan tampilan…',
}: RouteLoaderProps) {
  return (
    <main className="screen-loader">
      <Card className="screen-loader__panel">
        <CardContent className="grid gap-3 p-0">
          <Badge variant="secondary" className="w-fit">
            {eyebrow}
          </Badge>
          <strong className="text-lg font-semibold text-foreground">{title}</strong>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </main>
  )
}
