import { Link } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { DashboardSnippetBlock } from '@/features/dashboard/components/dashboard-snippet-block'
import {
  developerChargeErrorSnippet,
  developerChargeSnippet,
  developerChargeSuccessSnippet,
  developerReliabilityRules,
  developerSignatureSnippet,
  statusLegend,
  developerTokenSnippet,
  developerWebhookHeadersSnippet,
  developerWebhookPayloadSnippet,
} from '@/features/dashboard/developer-docs-content'

export function DeveloperDocsPanel() {
  return (
    <section className="dashboard-section-grid">
      <DashboardPanelCard
        description="Urutan minimum agar backend store bisa menghasilkan token, melakukan charge, dan menyiapkan request yang konsisten sejak awal."
        eyebrow="Quickstart Integrasi"
        title="Dapatkan token lalu kirim charge"
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">1. Buat store</Badge>
          <Badge variant="secondary">2. Buat token</Badge>
          <Badge variant="secondary">3. Kirim charge</Badge>
          <Badge variant="secondary">4. Simpan idempotency key</Badge>
        </div>

        <DashboardCallout
          description={
            <ol className="dashboard-steps">
              <li>Buat store dari panel kiri lalu buat secret token pada tab Token API.</li>
              <li>Simpan token hanya sekali saat respons create token keluar.</li>
              <li>Kirim charge ke `POST /v1/transactions/charge` dengan `Authorization: Bearer &lt;store_api_token&gt;`.</li>
              <li>Tambahkan `Idempotency-Key` unik untuk setiap order.</li>
            </ol>
          }
          title="Alur singkat"
        />

        <DashboardSnippetBlock code={developerTokenSnippet} eyebrow="Langkah 1" title="Buat token store API" />
        <DashboardSnippetBlock code={developerChargeSnippet} eyebrow="Langkah 2" title="Kirim request charge" />
      </DashboardPanelCard>

      <DashboardPanelCard
        description="Gunakan dua contoh ini untuk membedakan respons normal yang perlu diproses aplikasi dan error yang harus dicatat atau dipantau."
        eyebrow="Contoh Respons"
        title="Contoh sukses dan error utama"
      >
        <div className="grid gap-4">
          <DashboardSnippetBlock code={developerChargeSuccessSnippet} eyebrow="Respons Sukses" title="Charge sukses" />
          <DashboardSnippetBlock code={developerChargeErrorSnippet} eyebrow="Respons Error" title="Charge error" />
        </div>
      </DashboardPanelCard>

      <DashboardPanelCard
        description="Webhook sebaiknya diperlakukan sebagai jalur operasional yang sensitif: verifikasi signature dulu, lalu proses payload secara async di backend store."
        eyebrow="Panduan Webhook"
        title="Terima callback dari worker platform"
      >
        <DashboardCallout
          description={
            <ol className="dashboard-steps">
              <li>Sediakan endpoint POST publik di sisi store.</li>
              <li>Ambil webhook secret store dari dashboard lalu simpan aman di backend store.</li>
              <li>Verifikasi `X-Webhook-Signature` sebelum memproses payload.</li>
              <li>Balas `2xx` secepat mungkin agar worker tidak retry.</li>
            </ol>
          }
          title="Checklist penerimaan webhook"
          tone="warning"
        />

        <DashboardSnippetBlock code={developerWebhookHeadersSnippet} eyebrow="Header Penting" title="Header callback yang dikirim worker" />
        <DashboardSnippetBlock code={developerSignatureSnippet} eyebrow="Verifikasi Signature" title="Rumus signature" />
        <DashboardSnippetBlock code={developerWebhookPayloadSnippet} eyebrow="Payload Utama" title="Contoh body webhook" />
      </DashboardPanelCard>

      <DashboardPanelCard
        description="Gunakan bagian ini sebagai ringkasan operasional saat menutup bug transaksi dobel, replay request, atau webhook yang terlambat."
        eyebrow="Aturan Reliabilitas"
        title="Status, idempotency, dan rate limit"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <DashboardCallout
            description={
              <ul className="dashboard-legend">
                {statusLegend.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
            title="Peta status"
          />

          <DashboardCallout
            description={
              <ul className="dashboard-legend">
                {developerReliabilityRules.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            }
            title="Aturan reliabilitas"
            tone="success"
          />
        </div>

        <DashboardCallout
          description={
            <>
              Landing page publik tetap tersedia di <Link to="/">/</Link>. Store owner login di <Link to="/login">/login</Link>{' '}
              dan register di <Link to="/register">/register</Link>.
            </>
          }
          title="Area publik"
        />
      </DashboardPanelCard>
    </section>
  )
}
