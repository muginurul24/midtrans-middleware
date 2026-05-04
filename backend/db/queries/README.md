# SQLC Queries

Folder ini adalah lokasi resmi untuk artefak query SQL jika refactor `sqlc` dijalankan.

Status implementasi saat ini:

- runtime aktif masih memakai query SQL yang ditulis langsung di package aplikasi backend
- folder ini belum dipakai oleh binary production
- setiap refactor query besar berikutnya sebaiknya mengekstrak SQL yang sudah stabil ke sini agar review schema, testing, dan regenerasi code lebih terkontrol

Jika Anda melanjutkan migrasi ke `sqlc`, jadikan folder ini sebagai source `.sql` dan pastikan kontrak API store-facing maupun dashboard tidak berubah tanpa keputusan produk yang jelas.
