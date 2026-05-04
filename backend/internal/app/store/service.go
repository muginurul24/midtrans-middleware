package store

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"payment-platform/backend/internal/platform/authz"
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

func (s *Service) ListByUser(ctx context.Context, userID string, role string) ([]Store, error) {
	query := `
		SELECT id::text, user_id::text, name, slug, domain, default_callback_url, status, created_at, updated_at
		FROM stores
	`
	args := []any{}

	if authz.IsAdmin(role) {
		query += ` ORDER BY created_at DESC`
	} else {
		query += `
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
		args = append(args, userID)
	}

	rows, err := s.db.Query(ctx, query, args...)
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

	normalized.Slug, err = s.ensureUniqueSlug(ctx, normalized.Slug)
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

func (s *Service) GetByUser(ctx context.Context, userID string, role string, storeID string) (Store, error) {
	var item Store
	query := `
		SELECT id::text, user_id::text, name, slug, domain, default_callback_url, status, created_at, updated_at
		FROM stores
		WHERE id = $1
	`
	args := []any{storeID}

	if !authz.IsAdmin(role) {
		query += ` AND user_id = $2`
		args = append(args, userID)
	}

	err := s.db.QueryRow(ctx, query, args...).Scan(
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

func (s *Service) UpdateByUser(ctx context.Context, userID string, role string, storeID string, input UpdateInput) (Store, error) {
	current, err := s.GetByUser(ctx, userID, role, storeID)
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
	query := `
		UPDATE stores
		SET name = $1,
			domain = $2,
			default_callback_url = $3,
			status = $4,
			updated_at = now()
		WHERE id = $5
	`
	args := []any{name, domain, callbackURL, status, storeID}
	if !authz.IsAdmin(role) {
		query += ` AND user_id = $6`
		args = append(args, userID)
	}
	query += `
		RETURNING id::text, user_id::text, name, slug, domain, default_callback_url, status, created_at, updated_at
	`

	err = s.db.QueryRow(ctx, query, args...).Scan(
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

func (s *Service) ViewWebhookSecretByUser(ctx context.Context, userID string, role string, storeID string) (WebhookSecret, error) {
	var encryptedSecret string
	query := `
		SELECT webhook_secret_hash
		FROM stores
		WHERE id = $1
	`
	args := []any{storeID}
	if !authz.IsAdmin(role) {
		query += ` AND user_id = $2`
		args = append(args, userID)
	}

	err := s.db.QueryRow(ctx, query, args...).Scan(&encryptedSecret)
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

func (s *Service) RotateWebhookSecretByUser(ctx context.Context, userID string, role string, storeID string) (WebhookSecret, error) {
	nextSecret, err := security.GenerateWebhookSecret()
	if err != nil {
		return WebhookSecret{}, err
	}

	encryptedSecret, err := security.EncryptString(s.webhookPepper, nextSecret)
	if err != nil {
		return WebhookSecret{}, err
	}

	query := `
		UPDATE stores
		SET webhook_secret_hash = $2, updated_at = now()
		WHERE id = $1
	`
	args := []any{storeID, encryptedSecret}
	if !authz.IsAdmin(role) {
		query += ` AND user_id = $3`
		args = append(args, userID)
	}

	commandTag, err := s.db.Exec(ctx, query, args...)
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

func (s *Service) DeactivateByUser(ctx context.Context, userID string, role string, storeID string) error {
	query := `
		UPDATE stores
		SET status = 'inactive', updated_at = now()
		WHERE id = $1
	`
	args := []any{storeID}
	if !authz.IsAdmin(role) {
		query += ` AND user_id = $2`
		args = append(args, userID)
	}

	commandTag, err := s.db.Exec(ctx, query, args...)
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

	slug := slugify(name)
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

func (s *Service) ensureUniqueSlug(ctx context.Context, baseSlug string) (string, error) {
	candidate := baseSlug

	for suffix := 2; suffix < 200; suffix++ {
		var exists bool
		err := s.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM stores WHERE slug = $1)`, candidate).Scan(&exists)
		if err != nil {
			return "", err
		}

		if !exists {
			return candidate, nil
		}

		candidate = fmt.Sprintf("%s-%d", baseSlug, suffix)
	}

	return "", ErrConflict
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
