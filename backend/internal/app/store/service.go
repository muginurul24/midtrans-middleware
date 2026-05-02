package store

import (
	"context"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"payment-platform/backend/internal/platform/security"
)

var (
	ErrNotFound   = errors.New("store not found")
	ErrConflict   = errors.New("store conflict")
	ErrValidation = errors.New("validation error")
	ErrForbidden  = errors.New("forbidden")
)

var nonSlugPattern = regexp.MustCompile(`[^a-z0-9]+`)

type Service struct {
	db            *pgxpool.Pool
	appEnv        string
	webhookPepper string
}

type Store struct {
	ID                 string    `json:"id"`
	UserID             string    `json:"user_id"`
	Name               string    `json:"name"`
	Slug               string    `json:"slug"`
	Domain             *string   `json:"domain,omitempty"`
	DefaultCallbackURL *string   `json:"default_callback_url,omitempty"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type StoreWithSecret struct {
	Store
	WebhookSecret string `json:"webhook_secret"`
}

type WebhookSecret struct {
	StoreID string `json:"store_id"`
	Secret  string `json:"secret"`
}

type CreateInput struct {
	Name               string
	Slug               string
	Domain             string
	DefaultCallbackURL string
}

type UpdateInput struct {
	Name               *string
	Domain             *string
	DefaultCallbackURL *string
	Status             *string
}

func NewService(db *pgxpool.Pool, appEnv string, webhookPepper string) *Service {
	return &Service{
		db:            db,
		appEnv:        appEnv,
		webhookPepper: webhookPepper,
	}
}

func (s *Service) ListByUser(ctx context.Context, userID string) ([]Store, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id::text, user_id::text, name, slug, domain, default_callback_url, status, created_at, updated_at
		FROM stores
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stores []Store
	for rows.Next() {
		var item Store
		if err := rows.Scan(
			&item.ID,
			&item.UserID,
			&item.Name,
			&item.Slug,
			&item.Domain,
			&item.DefaultCallbackURL,
			&item.Status,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, err
		}

		stores = append(stores, item)
	}

	return stores, rows.Err()
}

func (s *Service) Create(ctx context.Context, userID string, input CreateInput) (StoreWithSecret, error) {
	normalized, err := s.normalizeCreateInput(input)
	if err != nil {
		return StoreWithSecret{}, err
	}

	webhookSecret, err := security.GenerateWebhookSecret()
	if err != nil {
		return StoreWithSecret{}, err
	}

	encryptedSecret, err := security.EncryptString(s.webhookPepper, webhookSecret)
	if err != nil {
		return StoreWithSecret{}, err
	}

	var domain *string
	if normalized.Domain != "" {
		domain = &normalized.Domain
	}

	var callbackURL *string
	if normalized.DefaultCallbackURL != "" {
		callbackURL = &normalized.DefaultCallbackURL
	}

	storeID := uuid.NewString()
	var created Store
	err = s.db.QueryRow(ctx, `
		INSERT INTO stores (id, user_id, name, slug, domain, default_callback_url, webhook_secret_hash, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
		RETURNING id::text, user_id::text, name, slug, domain, default_callback_url, status, created_at, updated_at
	`, storeID, userID, normalized.Name, normalized.Slug, domain, callbackURL, encryptedSecret).Scan(
		&created.ID,
		&created.UserID,
		&created.Name,
		&created.Slug,
		&created.Domain,
		&created.DefaultCallbackURL,
		&created.Status,
		&created.CreatedAt,
		&created.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return StoreWithSecret{}, ErrConflict
		}

		return StoreWithSecret{}, err
	}

	return StoreWithSecret{
		Store:         created,
		WebhookSecret: webhookSecret,
	}, nil
}

func (s *Service) GetByUser(ctx context.Context, userID string, storeID string) (Store, error) {
	var item Store
	err := s.db.QueryRow(ctx, `
		SELECT id::text, user_id::text, name, slug, domain, default_callback_url, status, created_at, updated_at
		FROM stores
		WHERE id = $1 AND user_id = $2
	`, storeID, userID).Scan(
		&item.ID,
		&item.UserID,
		&item.Name,
		&item.Slug,
		&item.Domain,
		&item.DefaultCallbackURL,
		&item.Status,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Store{}, ErrNotFound
		}

		return Store{}, err
	}

	return item, nil
}

func (s *Service) UpdateByUser(ctx context.Context, userID string, storeID string, input UpdateInput) (Store, error) {
	current, err := s.GetByUser(ctx, userID, storeID)
	if err != nil {
		return Store{}, err
	}

	name := current.Name
	if input.Name != nil {
		name = strings.TrimSpace(*input.Name)
	}

	status := current.Status
	if input.Status != nil {
		status = strings.TrimSpace(strings.ToLower(*input.Status))
	}

	if name == "" || (status != "" && status != "active" && status != "inactive") {
		return Store{}, ErrValidation
	}

	domain := current.Domain
	if input.Domain != nil {
		if strings.TrimSpace(*input.Domain) == "" {
			domain = nil
		} else {
			value := strings.TrimSpace(*input.Domain)
			domain = &value
		}
	}

	callbackURL := current.DefaultCallbackURL
	if input.DefaultCallbackURL != nil {
		if strings.TrimSpace(*input.DefaultCallbackURL) == "" {
			callbackURL = nil
		} else {
			value := strings.TrimSpace(*input.DefaultCallbackURL)
			callbackURL = &value
		}
	}

	if err := s.validateCallbackURL(callbackURL); err != nil {
		return Store{}, err
	}

	var updated Store
	err = s.db.QueryRow(ctx, `
		UPDATE stores
		SET name = $1,
			domain = $2,
			default_callback_url = $3,
			status = $4,
			updated_at = now()
		WHERE id = $5 AND user_id = $6
		RETURNING id::text, user_id::text, name, slug, domain, default_callback_url, status, created_at, updated_at
	`, name, domain, callbackURL, status, storeID, userID).Scan(
		&updated.ID,
		&updated.UserID,
		&updated.Name,
		&updated.Slug,
		&updated.Domain,
		&updated.DefaultCallbackURL,
		&updated.Status,
		&updated.CreatedAt,
		&updated.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return Store{}, ErrNotFound
		}

		return Store{}, err
	}

	return updated, nil
}

func (s *Service) ViewWebhookSecretByUser(ctx context.Context, userID string, storeID string) (WebhookSecret, error) {
	var encryptedSecret string
	err := s.db.QueryRow(ctx, `
		SELECT webhook_secret_hash
		FROM stores
		WHERE id = $1 AND user_id = $2
	`, storeID, userID).Scan(&encryptedSecret)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return WebhookSecret{}, ErrNotFound
		}

		return WebhookSecret{}, err
	}

	secret, err := security.DecryptString(s.webhookPepper, encryptedSecret)
	if err != nil {
		return WebhookSecret{}, err
	}

	return WebhookSecret{
		StoreID: storeID,
		Secret:  secret,
	}, nil
}

func (s *Service) RotateWebhookSecretByUser(ctx context.Context, userID string, storeID string) (WebhookSecret, error) {
	nextSecret, err := security.GenerateWebhookSecret()
	if err != nil {
		return WebhookSecret{}, err
	}

	encryptedSecret, err := security.EncryptString(s.webhookPepper, nextSecret)
	if err != nil {
		return WebhookSecret{}, err
	}

	commandTag, err := s.db.Exec(ctx, `
		UPDATE stores
		SET webhook_secret_hash = $3, updated_at = now()
		WHERE id = $1 AND user_id = $2
	`, storeID, userID, encryptedSecret)
	if err != nil {
		return WebhookSecret{}, err
	}

	if commandTag.RowsAffected() == 0 {
		return WebhookSecret{}, ErrNotFound
	}

	return WebhookSecret{
		StoreID: storeID,
		Secret:  nextSecret,
	}, nil
}

func (s *Service) DeactivateByUser(ctx context.Context, userID string, storeID string) error {
	commandTag, err := s.db.Exec(ctx, `
		UPDATE stores
		SET status = 'inactive', updated_at = now()
		WHERE id = $1 AND user_id = $2
	`, storeID, userID)
	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (s *Service) normalizeCreateInput(input CreateInput) (CreateInput, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return CreateInput{}, ErrValidation
	}

	slug := strings.TrimSpace(input.Slug)
	if slug == "" {
		slug = slugify(name)
	} else {
		slug = slugify(slug)
	}

	if slug == "" {
		return CreateInput{}, ErrValidation
	}

	var normalizedDomain string
	if strings.TrimSpace(input.Domain) != "" {
		normalizedDomain = strings.TrimSpace(input.Domain)
	}

	var normalizedCallbackURL string
	if strings.TrimSpace(input.DefaultCallbackURL) != "" {
		normalizedCallbackURL = strings.TrimSpace(input.DefaultCallbackURL)
	}

	normalized := CreateInput{
		Name:               name,
		Slug:               slug,
		Domain:             normalizedDomain,
		DefaultCallbackURL: normalizedCallbackURL,
	}

	var callbackPointer *string
	if normalized.DefaultCallbackURL != "" {
		callbackPointer = &normalized.DefaultCallbackURL
	}

	if err := s.validateCallbackURL(callbackPointer); err != nil {
		return CreateInput{}, err
	}

	return normalized, nil
}

func (s *Service) validateCallbackURL(callbackURL *string) error {
	if callbackURL == nil {
		return nil
	}

	parsedURL, err := url.ParseRequestURI(*callbackURL)
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return ErrValidation
	}

	if s.appEnv == "production" && parsedURL.Scheme != "https" {
		return ErrValidation
	}

	return nil
}

func slugify(value string) string {
	lower := strings.ToLower(strings.TrimSpace(value))
	slug := nonSlugPattern.ReplaceAllString(lower, "-")
	return strings.Trim(slug, "-")
}

func isUniqueViolation(err error) bool {
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) {
		return pgError.Code == "23505"
	}

	return false
}
