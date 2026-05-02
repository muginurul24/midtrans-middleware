package platformpostgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}

	config.MaxConns = 10
	config.MinConns = 1

	return pgxpool.NewWithConfig(ctx, config)
}
