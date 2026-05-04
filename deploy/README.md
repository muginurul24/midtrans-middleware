# Deploy to VPS

Dokumen ini menjelaskan bentuk release artifact dan langkah deploy minimal ke VPS berbasis `systemd`.

## Isi release bundle

Script [scripts/build_release_bundle.sh](/home/mugiew/project/payment-platform/scripts/build_release_bundle.sh:1) menghasilkan archive `.tar.gz` yang berisi:

- `bin/api`
- `bin/worker`
- `bin/migrate`
- `db/migrations`
- `dashboard/dist`
- `.env.production.example`
- template `systemd`
- `RELEASE_MANIFEST.txt`

## Build artifact

Jalankan dari root repo:

```bash
./scripts/build_release_bundle.sh
```

Hasil archive akan tersimpan di `artifacts/releases/`.

## Siapkan env production

1. Salin [backend/.env.production.example](/home/mugiew/project/payment-platform/backend/.env.production.example:1).
2. Simpan sebagai file terpisah di VPS, misalnya `/etc/payment-platform/paygate.env`.
3. Validasi sebelum restart service:

```bash
./scripts/verify_production_env.sh /path/to/paygate.env
```

## Struktur direktori VPS yang disarankan

```text
/opt/payment-platform/
  current -> /opt/payment-platform/releases/<release-name>
  releases/
    <release-name>/
      bin/
      db/
      dashboard/
      deploy/
      RELEASE_MANIFEST.txt
```

## Langkah deploy minimal

1. Upload archive release ke VPS.
2. Extract ke `/opt/payment-platform/releases/<release-name>`.
3. Update symlink `current` ke release baru.
4. Pastikan `/etc/payment-platform/paygate.env` sudah benar.
5. Jalankan migration:

```bash
sudo systemctl start paygate-migrate.service
```

6. Restart service utama:

```bash
sudo systemctl restart paygate-api.service paygate-worker.service
```

7. Cek status:

```bash
sudo systemctl status paygate-api.service --no-pager
sudo systemctl status paygate-worker.service --no-pager
```

## Catatan

- Template `systemd` contoh ada di `deploy/systemd/`.
- Metrics worker sebaiknya tetap internal.
- Jika API harus melayani frontend production dari origin yang sama, biarkan `dashboard/dist` ikut dalam release dan set `DASHBOARD_DIST_DIR` ke path release aktif.
