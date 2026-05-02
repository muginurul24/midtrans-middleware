package platformmigrate

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Result struct {
	Applied []string
	Pending int
}

func RunUp(ctx context.Context, pool *pgxpool.Pool, migrationsDir string) (Result, error) {
	if strings.TrimSpace(migrationsDir) == "" {
		return Result{}, fmt.Errorf("migrations directory is required")
	}

	if err := ensureMigrationsTable(ctx, pool); err != nil {
		return Result{}, err
	}

	migrationFiles, err := loadMigrationFiles(migrationsDir)
	if err != nil {
		return Result{}, err
	}

	appliedVersions, err := loadAppliedVersions(ctx, pool)
	if err != nil {
		return Result{}, err
	}

	result := Result{}
	for _, migrationFile := range migrationFiles {
		if _, ok := appliedVersions[migrationFile.Version]; ok {
			continue
		}

		if err := applyMigration(ctx, pool, migrationFile); err != nil {
			return Result{}, fmt.Errorf("apply migration %s: %w", migrationFile.Name, err)
		}

		result.Applied = append(result.Applied, migrationFile.Name)
	}

	result.Pending = len(result.Applied)
	return result, nil
}

type migrationFile struct {
	Name    string
	Path    string
	Version string
}

func ensureMigrationsTable(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	return err
}

func loadMigrationFiles(migrationsDir string) ([]migrationFile, error) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return nil, fmt.Errorf("read migrations directory: %w", err)
	}

	files := make([]migrationFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}

		files = append(files, migrationFile{
			Name:    name,
			Path:    filepath.Join(migrationsDir, name),
			Version: name,
		})
	}

	slices.SortFunc(files, func(left migrationFile, right migrationFile) int {
		return strings.Compare(left.Name, right.Name)
	})

	return files, nil
}

func loadAppliedVersions(ctx context.Context, pool *pgxpool.Pool) (map[string]struct{}, error) {
	rows, err := pool.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	versions := map[string]struct{}{}
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}

		versions[version] = struct{}{}
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return versions, nil
}

func applyMigration(ctx context.Context, pool *pgxpool.Pool, migration migrationFile) error {
	sqlBytes, err := os.ReadFile(migration.Path)
	if err != nil {
		return fmt.Errorf("read migration file: %w", err)
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, migration.Version); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
