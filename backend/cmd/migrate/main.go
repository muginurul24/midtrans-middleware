package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"payment-platform/backend/internal/config"
	platformmigrate "payment-platform/backend/internal/platform/migrate"
	platformpostgres "payment-platform/backend/internal/platform/postgres"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "migration failed: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	if command != "up" {
		return fmt.Errorf("unsupported command %q (supported: up)", command)
	}

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = filepath.Join("db", "migrations")
	}

	ctx := context.Background()
	pool, err := platformpostgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("create postgres pool: %w", err)
	}
	defer pool.Close()

	result, err := platformmigrate.RunUp(ctx, pool, migrationsDir)
	if err != nil {
		return err
	}

	if len(result.Applied) == 0 {
		fmt.Println("no new migrations")
		return nil
	}

	for _, name := range result.Applied {
		fmt.Printf("applied %s\n", name)
	}

	return nil
}
