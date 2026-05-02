import { env } from '@/lib/env'

const foundationItems = [
  'Go REST API skeleton with Chi router and structured logging',
  'Redis-backed Asynq worker placeholder for webhook delivery',
  'PostgreSQL migration set aligned with the MVP schema',
  'Docker Compose stack for api, worker, postgres, redis, and dashboard',
]

const nextSteps = [
  'Milestone 2: dashboard auth, store CRUD, and API token lifecycle',
  'Milestone 3: Midtrans charge mapping, idempotency, and transaction persistence',
  'Milestone 4-5: inbound webhook verification and outbound relay worker retries',
]

const serviceCards = [
  {
    name: 'API',
    detail: 'Go + Chi + pgx + zerolog',
    tone: 'ready',
  },
  {
    name: 'Worker',
    detail: 'Asynq queue consumer for webhook delivery jobs',
    tone: 'ready',
  },
  {
    name: 'PostgreSQL',
    detail: 'Primary source of truth with schema migration baseline',
    tone: 'planned',
  },
  {
    name: 'Redis',
    detail: 'Queue, rate limit, cache, and idempotency backbone',
    tone: 'planned',
  },
]

const topology = [
  'Store backend -> Payment Platform API',
  'Payment Platform API -> Midtrans Core API',
  'Midtrans webhook -> Payment Platform API',
  'Redis queue -> Worker -> Store callback URL',
]

export function OverviewPage() {
  const healthURL = new URL('/healthz', env.apiBaseURL).toString()

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-panel hero-copy">
          <span className="eyebrow">Payment Middleware Foundation</span>
          <h1>Multi-tenant Midtrans control plane, prepared for Milestone 2.</h1>
          <p className="lede">
            Repo ini sudah punya fondasi backend dan dashboard yang relevan untuk
            payment flow multi-store. Fokus saat ini adalah operability, clear
            boundaries, dan jalur implementasi yang rapi untuk auth, token, dan
            transaksi.
          </p>

          <div className="cta-row">
            <a className="primary-link" href={healthURL} target="_blank" rel="noreferrer">
              Open healthcheck
            </a>
            <span className="inline-code">{healthURL}</span>
          </div>

          <ul className="check-list">
            {foundationItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="hero-panel hero-metrics">
          <div className="metric-card">
            <span className="metric-label">Current scope</span>
            <strong>Milestone 1</strong>
            <p>Foundation, runtime wiring, and repo layout.</p>
          </div>
          <div className="metric-card">
            <span className="metric-label">Primary endpoint</span>
            <strong>/healthz</strong>
            <p>Checks API reachability plus PostgreSQL and Redis connectivity.</p>
          </div>
          <div className="metric-card">
            <span className="metric-label">Queue contract</span>
            <strong>webhook.deliver</strong>
            <p>Worker task payload is already defined for webhook relay jobs.</p>
          </div>
        </div>
      </section>

      <section className="grid-section">
        <article className="panel">
          <div className="panel-heading">
            <span className="eyebrow">Service Topology</span>
            <h2>Operational slices</h2>
          </div>

          <div className="service-grid">
            {serviceCards.map((service) => (
              <div className="service-card" data-tone={service.tone} key={service.name}>
                <div className="service-pill">{service.name}</div>
                <p>{service.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <span className="eyebrow">Request Path</span>
            <h2>Planned runtime flow</h2>
          </div>

          <ol className="timeline">
            {topology.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="grid-section">
        <article className="panel">
          <div className="panel-heading">
            <span className="eyebrow">Immediate Next</span>
            <h2>Implementation runway</h2>
          </div>

          <ul className="next-list">
            {nextSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="panel panel-code">
          <div className="panel-heading">
            <span className="eyebrow">Local Commands</span>
            <h2>Useful starting points</h2>
          </div>

          <pre>
            <code>{`cd backend && go run ./cmd/api
cd backend && go run ./cmd/worker
cd dashboard && pnpm dev
curl ${healthURL}`}</code>
          </pre>
        </article>
      </section>
    </main>
  )
}

