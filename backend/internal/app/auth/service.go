package auth

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"net/mail"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"

	"payment-platform/backend/internal/platform/security"
)

var (
	ErrInvalidCredentials     = errors.New("invalid credentials")
	ErrEmailExists            = errors.New("email already exists")
	ErrUnauthorized           = errors.New("unauthorized")
	ErrValidation             = errors.New("validation error")
	ErrCurrentPasswordInvalid = errors.New("current password invalid")
	ErrMFAAlreadyEnabled      = errors.New("mfa already enabled")
	ErrInvalidMFACode         = errors.New("invalid mfa code")
	ErrMFASetupRequired       = errors.New("mfa setup required")
	ErrMFAVerificationPending = errors.New("mfa verification pending")
	ErrPasswordResetInvalid   = errors.New("password reset token invalid")
)

type Service struct {
	db               *pgxpool.Pool
	appEnv           string
	accessSecret     string
	refreshSecret    string
	tokenPepper      string
	mfaEncryptionKey string
	accessTTL        time.Duration
	refreshTTL       time.Duration
	passwordResetTTL time.Duration
	totpIssuer       string
}

type RegisterInput struct {
	Name     string
	Email    string
	Password string
}

type LoginInput struct {
	Email    string
	Password string
}

type TokenPair struct {
	AccessToken      string    `json:"access_token"`
	RefreshToken     string    `json:"refresh_token"`
	TokenType        string    `json:"token_type"`
	AccessExpiresAt  time.Time `json:"access_expires_at"`
	RefreshExpiresAt time.Time `json:"refresh_expires_at"`
}

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type MFAState struct {
	Required                   bool       `json:"required"`
	Enabled                    bool       `json:"enabled"`
	Verified                   bool       `json:"verified"`
	SetupRequired              bool       `json:"setup_required"`
	CanAccessDashboard         bool       `json:"can_access_dashboard"`
	RecoveryCodesRegeneratedAt *time.Time `json:"recovery_codes_regenerated_at,omitempty"`
}

type MFASetup struct {
	Issuer      string `json:"issuer"`
	AccountName string `json:"account_name"`
	Secret      string `json:"secret"`
	OtpauthURL  string `json:"otpauth_url"`
}

type MFAVerifyResult struct {
	MFA           MFAState `json:"mfa"`
	RecoveryCodes []string `json:"recovery_codes,omitempty"`
}

type PasswordResetPreview struct {
	ResetToken string    `json:"reset_token"`
	ResetPath  string    `json:"reset_path"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type PasswordResetRequestResult struct {
	Message string                `json:"message"`
	Preview *PasswordResetPreview `json:"preview,omitempty"`
}

type AccessPrincipal struct {
	UserID    string
	SessionID string
	Role      string
	MFA       MFAState
}

type sessionRecord struct {
	User                       User
	SessionUserID              string
	RevokedAt                  *time.Time
	ExpiresAt                  time.Time
	MFATOTPSecretCiphertext    *string
	MFATOTPEnabledAt           *time.Time
	MFAPendingSecretCiphertext *string
	MFAVerifiedAt              *time.Time
}

func NewService(
	db *pgxpool.Pool,
	appEnv string,
	accessSecret string,
	refreshSecret string,
	tokenPepper string,
	mfaEncryptionKey string,
) *Service {
	return &Service{
		db:               db,
		appEnv:           appEnv,
		accessSecret:     accessSecret,
		refreshSecret:    refreshSecret,
		tokenPepper:      tokenPepper,
		mfaEncryptionKey: mfaEncryptionKey,
		accessTTL:        15 * time.Minute,
		refreshTTL:       7 * 24 * time.Hour,
		passwordResetTTL: 30 * time.Minute,
		totpIssuer:       "PayGate",
	}
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (User, TokenPair, MFAState, error) {
	if err := validateRegisterInput(input); err != nil {
		return User{}, TokenPair{}, MFAState{}, err
	}

	passwordHash, err := security.HashPassword(input.Password)
	if err != nil {
		return User{}, TokenPair{}, MFAState{}, err
	}

	userID := uuid.NewString()
	normalizedEmail := normalizeEmail(input.Email)

	var user User
	err = s.db.QueryRow(ctx, `
		INSERT INTO users (id, name, email, password_hash)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text, name, email, role, created_at, updated_at
	`, userID, strings.TrimSpace(input.Name), normalizedEmail, passwordHash).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return User{}, TokenPair{}, MFAState{}, ErrEmailExists
		}

		return User{}, TokenPair{}, MFAState{}, err
	}

	tokens, err := s.issueSession(ctx, user.ID, user.Role)
	if err != nil {
		return User{}, TokenPair{}, MFAState{}, err
	}

	return user, tokens, s.buildMFAState(false, false, nil), nil
}

func (s *Service) Login(ctx context.Context, input LoginInput) (User, TokenPair, MFAState, error) {
	if err := validateLoginInput(input); err != nil {
		return User{}, TokenPair{}, MFAState{}, err
	}

	var passwordHash string
	var user User
	var mfaEnabledAt *time.Time
	var recoveryCodesRegeneratedAt *time.Time
	err := s.db.QueryRow(ctx, `
		SELECT
			u.id::text,
			u.name,
			u.email,
			u.role,
			u.password_hash,
			u.created_at,
			u.updated_at,
			u.mfa_totp_enabled_at,
			(
				SELECT MAX(created_at)
				FROM user_mfa_recovery_codes
				WHERE user_id = u.id
			) AS recovery_codes_regenerated_at
		FROM users u
		WHERE u.email = $1
	`, normalizeEmail(input.Email)).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&passwordHash,
		&user.CreatedAt,
		&user.UpdatedAt,
		&mfaEnabledAt,
		&recoveryCodesRegeneratedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, TokenPair{}, MFAState{}, ErrInvalidCredentials
		}

		return User{}, TokenPair{}, MFAState{}, err
	}

	if err := security.CheckPassword(passwordHash, input.Password); err != nil {
		return User{}, TokenPair{}, MFAState{}, ErrInvalidCredentials
	}

	tokens, err := s.issueSession(ctx, user.ID, user.Role)
	if err != nil {
		return User{}, TokenPair{}, MFAState{}, err
	}

	return user, tokens, s.buildMFAState(mfaEnabledAt != nil, false, recoveryCodesRegeneratedAt), nil
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (TokenPair, MFAState, error) {
	claims, err := security.ParseRefreshToken(s.refreshSecret, refreshToken)
	if err != nil {
		return TokenPair{}, MFAState{}, ErrUnauthorized
	}

	var storedUserID string
	var storedJTI string
	var storedHash string
	var role string
	var revokedAt *time.Time
	var expiresAt time.Time
	var mfaEnabledAt *time.Time
	var mfaVerifiedAt *time.Time
	var pendingSecretCiphertext *string
	var recoveryCodesRegeneratedAt *time.Time

	err = s.db.QueryRow(ctx, `
		SELECT
			us.user_id::text,
			us.jti,
			us.refresh_token_hash,
			us.revoked_at,
			us.expires_at,
			us.mfa_verified_at,
			us.mfa_pending_secret_ciphertext,
			u.role,
			u.mfa_totp_enabled_at,
			(
				SELECT MAX(created_at)
				FROM user_mfa_recovery_codes
				WHERE user_id = us.user_id
			) AS recovery_codes_regenerated_at
		FROM user_sessions us
		INNER JOIN users u ON u.id = us.user_id
		WHERE us.id = $1
	`, claims.SessionID).Scan(
		&storedUserID,
		&storedJTI,
		&storedHash,
		&revokedAt,
		&expiresAt,
		&mfaVerifiedAt,
		&pendingSecretCiphertext,
		&role,
		&mfaEnabledAt,
		&recoveryCodesRegeneratedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TokenPair{}, MFAState{}, ErrUnauthorized
		}

		return TokenPair{}, MFAState{}, err
	}

	if storedUserID != claims.Subject || storedJTI != claims.ID {
		return TokenPair{}, MFAState{}, ErrUnauthorized
	}

	if revokedAt != nil || expiresAt.Before(time.Now().UTC()) {
		return TokenPair{}, MFAState{}, ErrUnauthorized
	}

	if storedHash != security.HashWithPepper(s.tokenPepper, refreshToken) {
		return TokenPair{}, MFAState{}, ErrUnauthorized
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return TokenPair{}, MFAState{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	tokens, err := s.rotateSessionTx(ctx, tx, claims.SessionID, storedUserID, role, mfaVerifiedAt, pendingSecretCiphertext)
	if err != nil {
		return TokenPair{}, MFAState{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return TokenPair{}, MFAState{}, err
	}

	return tokens, s.buildMFAState(mfaEnabledAt != nil, mfaVerifiedAt != nil, recoveryCodesRegeneratedAt), nil
}

func (s *Service) Logout(ctx context.Context, principal AccessPrincipal) error {
	commandTag, err := s.db.Exec(ctx, `
		UPDATE user_sessions
		SET revoked_at = now(), updated_at = now()
		WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
	`, principal.SessionID, principal.UserID)
	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		return ErrUnauthorized
	}

	return nil
}

func (s *Service) ChangePassword(ctx context.Context, principal AccessPrincipal, currentPassword string, newPassword string) error {
	if strings.TrimSpace(currentPassword) == "" || validatePasswordValue(newPassword) != nil {
		return ErrValidation
	}

	var passwordHash string
	err := s.db.QueryRow(ctx, `
		SELECT password_hash
		FROM users
		WHERE id = $1
	`, principal.UserID).Scan(&passwordHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrUnauthorized
		}

		return err
	}

	if err := security.CheckPassword(passwordHash, currentPassword); err != nil {
		return ErrCurrentPasswordInvalid
	}

	nextPasswordHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	_, err = s.db.Exec(ctx, `
		UPDATE users
		SET password_hash = $2, updated_at = now()
		WHERE id = $1
	`, principal.UserID, nextPasswordHash)
	return err
}

func (s *Service) RequestPasswordReset(ctx context.Context, email string) (PasswordResetRequestResult, error) {
	if strings.TrimSpace(email) == "" {
		return PasswordResetRequestResult{}, ErrValidation
	}

	if _, err := mail.ParseAddress(strings.TrimSpace(email)); err != nil {
		return PasswordResetRequestResult{}, ErrValidation
	}

	result := PasswordResetRequestResult{
		Message: "Jika email terdaftar, instruksi reset password sudah disiapkan. Periksa inbox atau gunakan preview lokal saat development aktif.",
	}

	var userID string
	err := s.db.QueryRow(ctx, `
		SELECT id::text
		FROM users
		WHERE email = $1
	`, normalizeEmail(email)).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return result, nil
		}

		return PasswordResetRequestResult{}, err
	}

	resetToken, expiresAt, err := s.issuePasswordResetToken(ctx, userID)
	if err != nil {
		return PasswordResetRequestResult{}, err
	}

	if s.shouldExposePasswordResetPreview() {
		result.Preview = &PasswordResetPreview{
			ResetToken: resetToken,
			ResetPath:  "/reset-password?token=" + url.QueryEscape(resetToken),
			ExpiresAt:  expiresAt,
		}
	}

	return result, nil
}

func (s *Service) ResetPassword(ctx context.Context, rawToken string, newPassword string) error {
	if strings.TrimSpace(rawToken) == "" || validatePasswordValue(newPassword) != nil {
		return ErrValidation
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	var userID string
	var expiresAt time.Time
	var usedAt *time.Time
	err = tx.QueryRow(ctx, `
		SELECT user_id::text, expires_at, used_at
		FROM password_reset_tokens
		WHERE token_hash = $1
	`, s.hashPasswordResetToken(rawToken)).Scan(&userID, &expiresAt, &usedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrPasswordResetInvalid
		}

		return err
	}

	if usedAt != nil || expiresAt.Before(time.Now().UTC()) {
		return ErrPasswordResetInvalid
	}

	nextPasswordHash, err := security.HashPassword(newPassword)
	if err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE users
		SET password_hash = $2, updated_at = now()
		WHERE id = $1
	`, userID, nextPasswordHash); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE password_reset_tokens
		SET used_at = now(), updated_at = now()
		WHERE user_id = $1 AND used_at IS NULL
	`, userID); err != nil {
		return err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE user_sessions
		SET revoked_at = now(), updated_at = now(), mfa_verified_at = NULL
		WHERE user_id = $1 AND revoked_at IS NULL
	`, userID); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

func (s *Service) Me(ctx context.Context, principal AccessPrincipal) (User, MFAState, error) {
	var user User
	recoveryCodesRegeneratedAt, err := s.loadRecoveryCodesRegeneratedAt(ctx, principal.UserID)
	if err != nil {
		return User{}, MFAState{}, err
	}

	err = s.db.QueryRow(ctx, `
		SELECT id::text, name, email, role, created_at, updated_at
		FROM users
		WHERE id = $1
	`, principal.UserID).Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.Role,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return User{}, MFAState{}, ErrUnauthorized
		}

		return User{}, MFAState{}, err
	}

	return user, s.buildMFAState(principal.MFA.Enabled, principal.MFA.Verified, recoveryCodesRegeneratedAt), nil
}

func (s *Service) AuthenticateAccessToken(ctx context.Context, rawToken string) (AccessPrincipal, error) {
	claims, err := security.ParseAccessToken(s.accessSecret, rawToken)
	if err != nil {
		return AccessPrincipal{}, ErrUnauthorized
	}

	record, err := s.loadSessionRecord(ctx, claims.SessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AccessPrincipal{}, ErrUnauthorized
		}

		return AccessPrincipal{}, err
	}

	if record.SessionUserID != claims.Subject || record.RevokedAt != nil || record.ExpiresAt.Before(time.Now().UTC()) {
		return AccessPrincipal{}, ErrUnauthorized
	}

	return AccessPrincipal{
		UserID:    claims.Subject,
		SessionID: claims.SessionID,
		Role:      claims.Role,
		MFA:       s.buildMFAState(record.mfaEnabled(), record.MFAVerifiedAt != nil, nil),
	}, nil
}

func (s *Service) SetupTOTP(ctx context.Context, principal AccessPrincipal) (MFASetup, error) {
	return s.beginTOTPSetup(ctx, principal, false)
}

func (s *Service) RotateTOTP(ctx context.Context, principal AccessPrincipal) (MFASetup, error) {
	return s.beginTOTPSetup(ctx, principal, true)
}

func (s *Service) beginTOTPSetup(ctx context.Context, principal AccessPrincipal, allowEnabled bool) (MFASetup, error) {
	record, err := s.loadSessionRecord(ctx, principal.SessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MFASetup{}, ErrUnauthorized
		}

		return MFASetup{}, err
	}

	if record.User.ID != principal.UserID || record.RevokedAt != nil || record.ExpiresAt.Before(time.Now().UTC()) {
		return MFASetup{}, ErrUnauthorized
	}

	if record.mfaEnabled() && !allowEnabled {
		return MFASetup{}, ErrMFAAlreadyEnabled
	}

	if record.mfaEnabled() && record.MFAVerifiedAt == nil {
		return MFASetup{}, ErrMFAVerificationPending
	}

	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      s.totpIssuer,
		AccountName: record.User.Email,
		Algorithm:   otp.AlgorithmSHA1,
		Digits:      otp.DigitsSix,
		Period:      30,
	})
	if err != nil {
		return MFASetup{}, err
	}

	ciphertext, err := security.EncryptString(s.mfaEncryptionKey, key.Secret())
	if err != nil {
		return MFASetup{}, err
	}

	if _, err := s.db.Exec(ctx, `
		UPDATE user_sessions
		SET mfa_pending_secret_ciphertext = $2, updated_at = now()
		WHERE id = $1
	`, principal.SessionID, ciphertext); err != nil {
		return MFASetup{}, err
	}

	return MFASetup{
		Issuer:      s.totpIssuer,
		AccountName: record.User.Email,
		Secret:      key.Secret(),
		OtpauthURL:  key.URL(),
	}, nil
}

func (s *Service) VerifyTOTP(ctx context.Context, principal AccessPrincipal, code string) (MFAVerifyResult, error) {
	rawCode := strings.TrimSpace(code)
	normalizedTOTP := normalizeMFACode(code)
	normalizedRecovery := normalizeRecoveryCode(code)
	if normalizedTOTP == "" && normalizedRecovery == "" {
		return MFAVerifyResult{}, ErrValidation
	}

	record, err := s.loadSessionRecord(ctx, principal.SessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MFAVerifyResult{}, ErrUnauthorized
		}

		return MFAVerifyResult{}, err
	}

	if record.User.ID != principal.UserID || record.RevokedAt != nil || record.ExpiresAt.Before(time.Now().UTC()) {
		return MFAVerifyResult{}, ErrUnauthorized
	}

	switch {
	case record.MFAPendingSecretCiphertext != nil && strings.TrimSpace(*record.MFAPendingSecretCiphertext) != "":
		return s.enablePendingTOTP(ctx, principal.SessionID, record, normalizedTOTP)
	case record.mfaEnabled():
		return s.verifyExistingTOTP(ctx, principal.SessionID, record, rawCode)
	default:
		return MFAVerifyResult{}, ErrMFASetupRequired
	}
}

func (s *Service) DisableTOTP(ctx context.Context, principal AccessPrincipal, code string) (MFAState, error) {
	record, err := s.loadSessionRecord(ctx, principal.SessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return MFAState{}, ErrUnauthorized
		}

		return MFAState{}, err
	}

	if record.User.ID != principal.UserID || record.RevokedAt != nil || record.ExpiresAt.Before(time.Now().UTC()) {
		return MFAState{}, ErrUnauthorized
	}

	if !record.mfaEnabled() {
		return s.buildMFAState(false, false, nil), nil
	}

	if _, err := s.validateLiveTOTPOrRecoveryCode(ctx, record.User.ID, *record.MFATOTPSecretCiphertext, code); err != nil {
		return MFAState{}, err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return MFAState{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, `
		UPDATE users
		SET
			mfa_totp_secret_ciphertext = NULL,
			mfa_totp_enabled_at = NULL,
			updated_at = now()
		WHERE id = $1
	`, record.User.ID); err != nil {
		return MFAState{}, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE user_sessions
		SET
			mfa_pending_secret_ciphertext = NULL,
			mfa_verified_at = NULL,
			updated_at = now()
		WHERE user_id = $1
	`, record.User.ID); err != nil {
		return MFAState{}, err
	}

	if err := s.deleteRecoveryCodesTx(ctx, tx, record.User.ID); err != nil {
		return MFAState{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return MFAState{}, err
	}

	return s.buildMFAState(false, false, nil), nil
}

func (s *Service) RegenerateRecoveryCodes(ctx context.Context, principal AccessPrincipal, code string) ([]string, error) {
	record, err := s.loadSessionRecord(ctx, principal.SessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUnauthorized
		}

		return nil, err
	}

	if record.User.ID != principal.UserID || record.RevokedAt != nil || record.ExpiresAt.Before(time.Now().UTC()) {
		return nil, ErrUnauthorized
	}

	if !record.mfaEnabled() {
		return nil, ErrMFASetupRequired
	}

	if _, err := s.validateLiveTOTPOrRecoveryCode(ctx, record.User.ID, *record.MFATOTPSecretCiphertext, code); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	recoveryCodes, err := s.replaceRecoveryCodesTx(ctx, tx, record.User.ID)
	if err != nil {
		return nil, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE user_sessions
		SET mfa_verified_at = now(), updated_at = now()
		WHERE id = $1
	`, principal.SessionID); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return recoveryCodes, nil
}

func (s *Service) enablePendingTOTP(ctx context.Context, sessionID string, record sessionRecord, code string) (MFAVerifyResult, error) {
	secret, err := security.DecryptString(s.mfaEncryptionKey, *record.MFAPendingSecretCiphertext)
	if err != nil {
		return MFAVerifyResult{}, err
	}

	if !validateTOTPCode(secret, code) {
		return MFAVerifyResult{}, ErrInvalidMFACode
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return MFAVerifyResult{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, `
		UPDATE users
		SET mfa_totp_secret_ciphertext = $2, mfa_totp_enabled_at = now(), updated_at = now()
		WHERE id = $1
	`, record.User.ID, *record.MFAPendingSecretCiphertext); err != nil {
		return MFAVerifyResult{}, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE user_sessions
		SET mfa_pending_secret_ciphertext = NULL, mfa_verified_at = now(), updated_at = now()
		WHERE id = $1
	`, sessionID); err != nil {
		return MFAVerifyResult{}, err
	}

	recoveryCodes, err := s.replaceRecoveryCodesTx(ctx, tx, record.User.ID)
	if err != nil {
		return MFAVerifyResult{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return MFAVerifyResult{}, err
	}

	return MFAVerifyResult{
		MFA:           s.buildMFAState(true, true, nil),
		RecoveryCodes: recoveryCodes,
	}, nil
}

func (s *Service) verifyExistingTOTP(ctx context.Context, sessionID string, record sessionRecord, code string) (MFAVerifyResult, error) {
	if _, err := s.validateLiveTOTPOrRecoveryCode(ctx, record.User.ID, *record.MFATOTPSecretCiphertext, code); err != nil {
		return MFAVerifyResult{}, err
	}

	if _, err := s.db.Exec(ctx, `
		UPDATE user_sessions
		SET mfa_verified_at = now(), updated_at = now()
		WHERE id = $1
	`, sessionID); err != nil {
		return MFAVerifyResult{}, err
	}

	return MFAVerifyResult{
		MFA: s.buildMFAState(true, true, nil),
	}, nil
}

func (s *Service) validateLiveTOTPOrRecoveryCode(ctx context.Context, userID string, encryptedSecret string, code string) (bool, error) {
	if normalized := normalizeMFACode(code); normalized != "" {
		secret, err := security.DecryptString(s.mfaEncryptionKey, encryptedSecret)
		if err != nil {
			return false, err
		}

		if validateTOTPCode(secret, normalized) {
			return false, nil
		}
	}

	usedRecovery, err := s.consumeRecoveryCode(ctx, userID, code)
	if err != nil {
		return false, err
	}
	if usedRecovery {
		return true, nil
	}

	return false, ErrInvalidMFACode
}

func (s *Service) consumeRecoveryCode(ctx context.Context, userID string, code string) (bool, error) {
	normalized := normalizeRecoveryCode(code)
	if normalized == "" {
		return false, nil
	}

	commandTag, err := s.db.Exec(ctx, `
		UPDATE user_mfa_recovery_codes
		SET used_at = now()
		WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
	`, userID, s.hashRecoveryCode(normalized))
	if err != nil {
		return false, err
	}

	return commandTag.RowsAffected() == 1, nil
}

func (s *Service) replaceRecoveryCodesTx(ctx context.Context, tx pgx.Tx, userID string) ([]string, error) {
	if err := s.deleteRecoveryCodesTx(ctx, tx, userID); err != nil {
		return nil, err
	}

	codes, err := generateRecoveryCodes(8)
	if err != nil {
		return nil, err
	}

	for _, code := range codes {
		if _, err := tx.Exec(ctx, `
			INSERT INTO user_mfa_recovery_codes (id, user_id, code_hash)
			VALUES ($1, $2, $3)
		`, uuid.NewString(), userID, s.hashRecoveryCode(code)); err != nil {
			return nil, err
		}
	}

	return codes, nil
}

func (s *Service) deleteRecoveryCodesTx(ctx context.Context, tx pgx.Tx, userID string) error {
	_, err := tx.Exec(ctx, `DELETE FROM user_mfa_recovery_codes WHERE user_id = $1`, userID)
	return err
}

func (s *Service) hashRecoveryCode(code string) string {
	return security.HashWithPepper(s.tokenPepper, "mfa-recovery:"+normalizeRecoveryCode(code))
}

func (s *Service) hashPasswordResetToken(token string) string {
	return security.HashWithPepper(s.tokenPepper, "password-reset:"+strings.TrimSpace(token))
}

func (s *Service) loadSessionRecord(ctx context.Context, sessionID string) (sessionRecord, error) {
	var record sessionRecord
	err := s.db.QueryRow(ctx, `
		SELECT
			u.id::text,
			u.name,
			u.email,
			u.role,
			u.created_at,
			u.updated_at,
			us.user_id::text,
			us.revoked_at,
			us.expires_at,
			u.mfa_totp_secret_ciphertext,
			u.mfa_totp_enabled_at,
			us.mfa_pending_secret_ciphertext,
			us.mfa_verified_at
		FROM user_sessions us
		INNER JOIN users u ON u.id = us.user_id
		WHERE us.id = $1
	`, sessionID).Scan(
		&record.User.ID,
		&record.User.Name,
		&record.User.Email,
		&record.User.Role,
		&record.User.CreatedAt,
		&record.User.UpdatedAt,
		&record.SessionUserID,
		&record.RevokedAt,
		&record.ExpiresAt,
		&record.MFATOTPSecretCiphertext,
		&record.MFATOTPEnabledAt,
		&record.MFAPendingSecretCiphertext,
		&record.MFAVerifiedAt,
	)
	return record, err
}

func (r sessionRecord) mfaEnabled() bool {
	return r.MFATOTPEnabledAt != nil && r.MFATOTPSecretCiphertext != nil && strings.TrimSpace(*r.MFATOTPSecretCiphertext) != ""
}

func (s *Service) buildMFAState(enabled bool, verified bool, recoveryCodesRegeneratedAt *time.Time) MFAState {
	required := s.isProduction()
	setupRequired := required && !enabled
	canAccessDashboard := !required || (enabled && verified)
	return MFAState{
		Required:                   required,
		Enabled:                    enabled,
		Verified:                   verified,
		SetupRequired:              setupRequired,
		CanAccessDashboard:         canAccessDashboard,
		RecoveryCodesRegeneratedAt: recoveryCodesRegeneratedAt,
	}
}

func (s *Service) loadRecoveryCodesRegeneratedAt(ctx context.Context, userID string) (*time.Time, error) {
	var regeneratedAt *time.Time
	if err := s.db.QueryRow(ctx, `
		SELECT MAX(created_at)
		FROM user_mfa_recovery_codes
		WHERE user_id = $1
	`, userID).Scan(&regeneratedAt); err != nil {
		return nil, err
	}

	return regeneratedAt, nil
}

func (s *Service) issueSession(ctx context.Context, userID string, role string) (TokenPair, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return TokenPair{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	tokens, err := s.issueSessionTx(ctx, tx, userID, role)
	if err != nil {
		return TokenPair{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return TokenPair{}, err
	}

	return tokens, nil
}

func (s *Service) issuePasswordResetToken(ctx context.Context, userID string) (string, time.Time, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return "", time.Time{}, err
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, `
		UPDATE password_reset_tokens
		SET used_at = now(), updated_at = now()
		WHERE user_id = $1 AND used_at IS NULL
	`, userID); err != nil {
		return "", time.Time{}, err
	}

	resetToken, err := generatePasswordResetToken()
	if err != nil {
		return "", time.Time{}, err
	}

	expiresAt := time.Now().UTC().Add(s.passwordResetTTL)
	if _, err := tx.Exec(ctx, `
		INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)
	`, uuid.NewString(), userID, s.hashPasswordResetToken(resetToken), expiresAt); err != nil {
		return "", time.Time{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return "", time.Time{}, err
	}

	return resetToken, expiresAt, nil
}

func (s *Service) issueSessionTx(ctx context.Context, tx pgx.Tx, userID string, role string) (TokenPair, error) {
	now := time.Now().UTC()
	sessionID := uuid.NewString()
	refreshJTI := uuid.NewString()

	refreshToken, refreshExpiresAt, err := security.IssueRefreshToken(
		s.refreshSecret,
		userID,
		sessionID,
		refreshJTI,
		now,
		s.refreshTTL,
	)
	if err != nil {
		return TokenPair{}, err
	}

	accessToken, accessExpiresAt, err := security.IssueAccessToken(
		s.accessSecret,
		userID,
		sessionID,
		role,
		now,
		s.accessTTL,
	)
	if err != nil {
		return TokenPair{}, err
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO user_sessions (id, user_id, jti, refresh_token_hash, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, sessionID, userID, refreshJTI, security.HashWithPepper(s.tokenPepper, refreshToken), refreshExpiresAt); err != nil {
		return TokenPair{}, err
	}

	return TokenPair{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		TokenType:        "Bearer",
		AccessExpiresAt:  accessExpiresAt,
		RefreshExpiresAt: refreshExpiresAt,
	}, nil
}

func (s *Service) rotateSessionTx(
	ctx context.Context,
	tx pgx.Tx,
	sessionID string,
	userID string,
	role string,
	mfaVerifiedAt *time.Time,
	pendingSecretCiphertext *string,
) (TokenPair, error) {
	now := time.Now().UTC()
	refreshJTI := uuid.NewString()

	refreshToken, refreshExpiresAt, err := security.IssueRefreshToken(
		s.refreshSecret,
		userID,
		sessionID,
		refreshJTI,
		now,
		s.refreshTTL,
	)
	if err != nil {
		return TokenPair{}, err
	}

	accessToken, accessExpiresAt, err := security.IssueAccessToken(
		s.accessSecret,
		userID,
		sessionID,
		role,
		now,
		s.accessTTL,
	)
	if err != nil {
		return TokenPair{}, err
	}

	if _, err := tx.Exec(ctx, `
		UPDATE user_sessions
		SET
			jti = $2,
			refresh_token_hash = $3,
			expires_at = $4,
			last_used_at = now(),
			updated_at = now(),
			mfa_verified_at = $5,
			mfa_pending_secret_ciphertext = $6
		WHERE id = $1
	`, sessionID, refreshJTI, security.HashWithPepper(s.tokenPepper, refreshToken), refreshExpiresAt, mfaVerifiedAt, pendingSecretCiphertext); err != nil {
		return TokenPair{}, err
	}

	return TokenPair{
		AccessToken:      accessToken,
		RefreshToken:     refreshToken,
		TokenType:        "Bearer",
		AccessExpiresAt:  accessExpiresAt,
		RefreshExpiresAt: refreshExpiresAt,
	}, nil
}

func (s *Service) isProduction() bool {
	return strings.EqualFold(s.appEnv, "production")
}

func (s *Service) shouldExposePasswordResetPreview() bool {
	return !s.isProduction()
}

func validateTOTPCode(secret string, code string) bool {
	valid, err := totp.ValidateCustom(code, secret, time.Now().UTC(), totp.ValidateOpts{
		Period:    30,
		Skew:      1,
		Digits:    otp.DigitsSix,
		Algorithm: otp.AlgorithmSHA1,
	})
	return err == nil && valid
}

func validateRegisterInput(input RegisterInput) error {
	if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.Email) == "" || input.Password == "" {
		return ErrValidation
	}

	if err := validatePasswordValue(input.Password); err != nil {
		return err
	}

	if _, err := mail.ParseAddress(strings.TrimSpace(input.Email)); err != nil {
		return ErrValidation
	}

	return nil
}

func validatePasswordValue(password string) error {
	if len(strings.TrimSpace(password)) < 8 {
		return ErrValidation
	}

	return nil
}

func validateLoginInput(input LoginInput) error {
	if strings.TrimSpace(input.Email) == "" || input.Password == "" {
		return ErrValidation
	}

	return nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeMFACode(code string) string {
	return strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, code)
}

func normalizeRecoveryCode(code string) string {
	upper := strings.ToUpper(strings.TrimSpace(code))
	upper = strings.ReplaceAll(upper, "-", "")
	upper = strings.ReplaceAll(upper, " ", "")
	return upper
}

func generateRecoveryCodes(count int) ([]string, error) {
	encoding := base32.StdEncoding.WithPadding(base32.NoPadding)
	codes := make([]string, 0, count)
	for i := 0; i < count; i++ {
		raw := make([]byte, 5)
		if _, err := rand.Read(raw); err != nil {
			return nil, err
		}

		encoded := encoding.EncodeToString(raw)
		normalized := strings.ToUpper(encoded[:8])
		codes = append(codes, normalized[:4]+"-"+normalized[4:])
	}

	return codes, nil
}

func generatePasswordResetToken() (string, error) {
	encoding := base32.StdEncoding.WithPadding(base32.NoPadding)
	raw := make([]byte, 20)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}

	return strings.ToUpper(encoding.EncodeToString(raw)), nil
}

func isUniqueViolation(err error) bool {
	var pgError *pgconn.PgError
	if errors.As(err, &pgError) {
		return pgError.Code == "23505"
	}

	return false
}
