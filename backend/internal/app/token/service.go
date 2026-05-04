package token

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"payment-platform/backend/internal/platform/authz"
	"payment-platform/backend/internal/platform/security"
)

var (
	ErrStoreNotFound = errors.New("store not found")
	ErrTokenNotFound = errors.New("token not found")
	ErrUnauthorized  = errors.New("unauthorized")
	ErrTokenRevoked  = errors.New("token revoked")
	ErrStoreInactive = errors.New("store inactive")
	ErrValidation    = errors.New("validation error")
	ErrConflict      = errors.New("token conflict")
)

type Service struct {
	db          *pgxpool.Pool
	redisClient redis.UniversalClient
	appEnv      string
	tokenPepper string
}

type APIToken struct {
	ID          string     `json:"id"`
	StoreID     string     `json:"store_id"`
	Name        string     `json:"name"`
	TokenPrefix string     `json:"token_prefix"`
	Scopes      []string   `json:"scopes"`
	LastUsedAt  *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	RevokedAt   *time.Time `json:"revoked_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type CreatedToken struct {
	APIToken
	Token string `json:"token"`
}

type CreateInput struct {
	Name      string
	Scopes    []string
	ExpiresAt *time.Time
}

type StorePrincipal struct {
	TokenID string
	StoreID string
	UserID  string
	Scopes  []string
}

type cachedStorePrincipal struct {
	TokenID   string     `json:"token_id"`
	StoreID   string     `json:"store_id"`
	UserID    string     `json:"user_id"`
	Scopes    []string   `json:"scopes"`
	TokenHash string     `json:"token_hash"`
	Status    string     `json:"status"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

const tokenLookupCacheTTL = 10 * time.Minute

func NewService(db *pgxpool.Pool, redisClient redis.UniversalClient, appEnv string, tokenPepper string) *Service {
	return &Service{
		db:          db,
		redisClient: redisClient,
		appEnv:      appEnv,
		tokenPepper: tokenPepper,
	}
}

func (s *Service) CreateForStore(ctx context.Context, userID string, role string, storeID string, input CreateInput) (CreatedToken, error) {
	if input.Name == "" {
		return CreatedToken{}, ErrValidation
	}

	exists, err := s.userOwnsStore(ctx, userID, role, storeID)
	if err != nil {
		return CreatedToken{}, err
	}
	if !exists {
		return CreatedToken{}, ErrStoreNotFound
	}

	scopes := input.Scopes
	if len(scopes) == 0 {
		scopes = []string{"transaction:create", "transaction:read"}
	}

	rawToken, tokenPrefix, err := security.GenerateStoreAPIToken(s.appEnv)
	if err != nil {
		return CreatedToken{}, err
	}

	tokenID := uuid.NewString()
	var created APIToken
	err = s.db.QueryRow(ctx, `
		INSERT INTO store_api_tokens (id, store_id, name, token_prefix, token_hash, scopes, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, store_id::text, name, token_prefix, scopes, last_used_at, expires_at, revoked_at, created_at
	`, tokenID, storeID, input.Name, tokenPrefix, security.HashWithPepper(s.tokenPepper, rawToken), scopes, input.ExpiresAt).Scan(
		&created.ID,
		&created.StoreID,
		&created.Name,
		&created.TokenPrefix,
		&created.Scopes,
		&created.LastUsedAt,
		&created.ExpiresAt,
		&created.RevokedAt,
		&created.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return CreatedToken{}, ErrConflict
		}

		return CreatedToken{}, err
	}

	s.cacheStoreToken(ctx, rawToken, created, storeStatusActive)

	return CreatedToken{
		APIToken: created,
		Token:    rawToken,
	}, nil
}

func (s *Service) ListForStore(ctx context.Context, userID string, role string, storeID string) ([]APIToken, error) {
	exists, err := s.userOwnsStore(ctx, userID, role, storeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrStoreNotFound
	}

	rows, err := s.db.Query(ctx, `
		SELECT id::text, store_id::text, name, token_prefix, scopes, last_used_at, expires_at, revoked_at, created_at
		FROM store_api_tokens
		WHERE store_id = $1
		ORDER BY created_at DESC
	`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []APIToken
	for rows.Next() {
		var item APIToken
		if err := rows.Scan(
			&item.ID,
			&item.StoreID,
			&item.Name,
			&item.TokenPrefix,
			&item.Scopes,
			&item.LastUsedAt,
			&item.ExpiresAt,
			&item.RevokedAt,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}

		tokens = append(tokens, item)
	}

	return tokens, rows.Err()
}

func (s *Service) RevokeForStore(ctx context.Context, userID string, role string, storeID string, tokenID string) error {
	exists, err := s.userOwnsStore(ctx, userID, role, storeID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrStoreNotFound
	}

	var tokenPrefix string
	err = s.db.QueryRow(ctx, `
		UPDATE store_api_tokens
		SET revoked_at = now()
		WHERE id = $1 AND store_id = $2 AND revoked_at IS NULL
		RETURNING token_prefix
	`, tokenID, storeID).Scan(&tokenPrefix)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrTokenNotFound
		}

		return err
	}

	s.invalidateStoreTokenCache(ctx, tokenPrefix)

	return nil
}

func (s *Service) RotateForStore(ctx context.Context, userID string, role string, storeID string, tokenID string) (CreatedToken, error) {
	exists, err := s.userOwnsStore(ctx, userID, role, storeID)
	if err != nil {
		return CreatedToken{}, err
	}
	if !exists {
		return CreatedToken{}, ErrStoreNotFound
	}

	var current APIToken
	err = s.db.QueryRow(ctx, `
		SELECT id::text, store_id::text, name, token_prefix, scopes, last_used_at, expires_at, revoked_at, created_at
		FROM store_api_tokens
		WHERE id = $1 AND store_id = $2
	`, tokenID, storeID).Scan(
		&current.ID,
		&current.StoreID,
		&current.Name,
		&current.TokenPrefix,
		&current.Scopes,
		&current.LastUsedAt,
		&current.ExpiresAt,
		&current.RevokedAt,
		&current.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return CreatedToken{}, ErrTokenNotFound
		}

		return CreatedToken{}, err
	}

	if current.RevokedAt != nil {
		return CreatedToken{}, ErrTokenRevoked
	}

	rawToken, tokenPrefix, err := security.GenerateStoreAPIToken(s.appEnv)
	if err != nil {
		return CreatedToken{}, err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return CreatedToken{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	createdID := uuid.NewString()
	var created APIToken
	err = tx.QueryRow(ctx, `
		INSERT INTO store_api_tokens (id, store_id, name, token_prefix, token_hash, scopes, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, store_id::text, name, token_prefix, scopes, last_used_at, expires_at, revoked_at, created_at
	`, createdID, storeID, current.Name, tokenPrefix, security.HashWithPepper(s.tokenPepper, rawToken), current.Scopes, current.ExpiresAt).Scan(
		&created.ID,
		&created.StoreID,
		&created.Name,
		&created.TokenPrefix,
		&created.Scopes,
		&created.LastUsedAt,
		&created.ExpiresAt,
		&created.RevokedAt,
		&created.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return CreatedToken{}, ErrConflict
		}

		return CreatedToken{}, err
	}

	commandTag, err := tx.Exec(ctx, `
		UPDATE store_api_tokens
		SET revoked_at = now()
		WHERE id = $1 AND store_id = $2 AND revoked_at IS NULL
	`, tokenID, storeID)
	if err != nil {
		return CreatedToken{}, err
	}
	if commandTag.RowsAffected() == 0 {
		return CreatedToken{}, ErrTokenNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return CreatedToken{}, err
	}

	s.invalidateStoreTokenCache(ctx, current.TokenPrefix)
	s.cacheStoreToken(ctx, rawToken, created, storeStatusActive)

	return CreatedToken{
		APIToken: created,
		Token:    rawToken,
	}, nil
}

func (s *Service) Authenticate(ctx context.Context, rawToken string) (StorePrincipal, error) {
	tokenPrefix := security.StoreTokenPrefix(rawToken)
	tokenHash := security.HashWithPepper(s.tokenPepper, rawToken)

	if principal, ok, err := s.loadCachedPrincipal(ctx, tokenPrefix, tokenHash); err != nil {
		return StorePrincipal{}, err
	} else if ok {
		if active, err := s.storeIsActive(ctx, principal.StoreID); err != nil {
			return StorePrincipal{}, err
		} else if !active {
			s.invalidateStoreTokenCache(ctx, tokenPrefix)
			return StorePrincipal{}, ErrStoreInactive
		}
		s.touchLastUsedAt(ctx, principal.TokenID)
		return principal, nil
	}

	if s.db == nil {
		return StorePrincipal{}, ErrUnauthorized
	}

	var principal StorePrincipal
	var storedHash string
	var storeStatus string
	var revokedAt *time.Time
	var expiresAt *time.Time

	err := s.db.QueryRow(ctx, `
		SELECT
			t.id::text,
			t.store_id::text,
			s.user_id::text,
			t.scopes,
			t.token_hash,
			s.status,
			t.revoked_at,
			t.expires_at
		FROM store_api_tokens t
		INNER JOIN stores s ON s.id = t.store_id
		WHERE t.token_prefix = $1
	`, tokenPrefix).Scan(
		&principal.TokenID,
		&principal.StoreID,
		&principal.UserID,
		&principal.Scopes,
		&storedHash,
		&storeStatus,
		&revokedAt,
		&expiresAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return StorePrincipal{}, ErrUnauthorized
		}

		return StorePrincipal{}, err
	}

	if storedHash != tokenHash {
		return StorePrincipal{}, ErrUnauthorized
	}

	if revokedAt != nil {
		return StorePrincipal{}, ErrTokenRevoked
	}

	if expiresAt != nil && expiresAt.Before(time.Now().UTC()) {
		return StorePrincipal{}, ErrUnauthorized
	}

	if storeStatus != "active" {
		return StorePrincipal{}, ErrStoreInactive
	}

	s.touchLastUsedAt(ctx, principal.TokenID)
	s.cacheAuthenticatedPrincipal(ctx, tokenPrefix, tokenHash, principal, storeStatus, revokedAt, expiresAt)

	return principal, nil
}

func (s *Service) cacheStoreToken(ctx context.Context, rawToken string, token APIToken, storeStatus string) {
	s.cacheAuthenticatedPrincipal(
		ctx,
		token.TokenPrefix,
		security.HashWithPepper(s.tokenPepper, rawToken),
		StorePrincipal{
			TokenID: token.ID,
			StoreID: token.StoreID,
			Scopes:  token.Scopes,
		},
		storeStatus,
		token.RevokedAt,
		token.ExpiresAt,
	)
}

func (s *Service) cacheAuthenticatedPrincipal(ctx context.Context, tokenPrefix string, tokenHash string, principal StorePrincipal, storeStatus string, revokedAt *time.Time, expiresAt *time.Time) {
	if s.redisClient == nil || tokenPrefix == "" {
		return
	}

	payload, err := json.Marshal(cachedStorePrincipal{
		TokenID:   principal.TokenID,
		StoreID:   principal.StoreID,
		UserID:    principal.UserID,
		Scopes:    principal.Scopes,
		TokenHash: tokenHash,
		Status:    storeStatus,
		RevokedAt: revokedAt,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return
	}

	_ = s.redisClient.Set(ctx, storeTokenCacheKey(tokenPrefix), payload, tokenLookupCacheTTL).Err()
}

func (s *Service) loadCachedPrincipal(ctx context.Context, tokenPrefix string, tokenHash string) (StorePrincipal, bool, error) {
	if s.redisClient == nil || tokenPrefix == "" {
		return StorePrincipal{}, false, nil
	}

	raw, err := s.redisClient.Get(ctx, storeTokenCacheKey(tokenPrefix)).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return StorePrincipal{}, false, nil
		}

		return StorePrincipal{}, false, err
	}

	var cached cachedStorePrincipal
	if err := json.Unmarshal([]byte(raw), &cached); err != nil {
		s.invalidateStoreTokenCache(ctx, tokenPrefix)
		return StorePrincipal{}, false, nil
	}

	if cached.TokenHash != tokenHash {
		return StorePrincipal{}, false, ErrUnauthorized
	}
	if cached.RevokedAt != nil {
		return StorePrincipal{}, false, ErrTokenRevoked
	}
	if cached.ExpiresAt != nil && cached.ExpiresAt.Before(time.Now().UTC()) {
		return StorePrincipal{}, false, ErrUnauthorized
	}
	if cached.Status != storeStatusActive {
		return StorePrincipal{}, false, ErrStoreInactive
	}

	return StorePrincipal{
		TokenID: cached.TokenID,
		StoreID: cached.StoreID,
		UserID:  cached.UserID,
		Scopes:  cached.Scopes,
	}, true, nil
}

func (s *Service) invalidateStoreTokenCache(ctx context.Context, tokenPrefix string) {
	if s.redisClient == nil || tokenPrefix == "" {
		return
	}

	_ = s.redisClient.Del(ctx, storeTokenCacheKey(tokenPrefix)).Err()
}

func (s *Service) touchLastUsedAt(ctx context.Context, tokenID string) {
	if s.db == nil || tokenID == "" {
		return
	}

	_, _ = s.db.Exec(ctx, `
		UPDATE store_api_tokens
		SET last_used_at = now()
		WHERE id = $1
	`, tokenID)
}

func (s *Service) storeIsActive(ctx context.Context, storeID string) (bool, error) {
	if s.db == nil || storeID == "" {
		return true, nil
	}

	var active bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM stores
			WHERE id = $1 AND status = 'active'
		)
	`, storeID).Scan(&active)
	if err != nil {
		return false, err
	}

	return active, nil
}

func storeTokenCacheKey(tokenPrefix string) string {
	return fmt.Sprintf("api_token:%s", tokenPrefix)
}

const storeStatusActive = "active"

func (s *Service) userOwnsStore(ctx context.Context, userID string, role string, storeID string) (bool, error) {
	if authz.IsAdmin(role) {
		return s.storeExists(ctx, storeID)
	}

	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM stores
			WHERE id = $1 AND user_id = $2
		)
	`, storeID, userID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

func (s *Service) storeExists(ctx context.Context, storeID string) (bool, error) {
	var exists bool
	err := s.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM stores
			WHERE id = $1
		)
	`, storeID).Scan(&exists)
	if err != nil {
		return false, err
	}

	return exists, nil
}

func isUniqueViolation(err error) bool {
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) {
		return pgError.Code == "23505"
	}

	return false
}
