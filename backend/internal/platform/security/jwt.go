package security

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const issuer = "payment-platform"

type AccessClaims struct {
	TokenUse  string `json:"token_use"`
	SessionID string `json:"sid"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

type RefreshClaims struct {
	TokenUse  string `json:"token_use"`
	SessionID string `json:"sid"`
	jwt.RegisteredClaims
}

func IssueAccessToken(secret string, userID string, sessionID string, role string, now time.Time, ttl time.Duration) (string, time.Time, error) {
	expiresAt := now.Add(ttl)
	claims := AccessClaims{
		TokenUse:  "access",
		SessionID: sessionID,
		Role:      role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, err
	}

	return signed, expiresAt, nil
}

func IssueRefreshToken(secret string, userID string, sessionID string, jti string, now time.Time, ttl time.Duration) (string, time.Time, error) {
	expiresAt := now.Add(ttl)
	claims := RefreshClaims{
		TokenUse:  "refresh",
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			Subject:   userID,
			Issuer:    issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, err
	}

	return signed, expiresAt, nil
}

func ParseAccessToken(secret string, rawToken string) (*AccessClaims, error) {
	claims := &AccessClaims{}
	parsed, err := jwt.ParseWithClaims(rawToken, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("unexpected signing method")
		}

		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	if !parsed.Valid || claims.TokenUse != "access" {
		return nil, errors.New("invalid access token")
	}

	return claims, nil
}

func ParseRefreshToken(secret string, rawToken string) (*RefreshClaims, error) {
	claims := &RefreshClaims{}
	parsed, err := jwt.ParseWithClaims(rawToken, claims, func(token *jwt.Token) (any, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("unexpected signing method")
		}

		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	if !parsed.Valid || claims.TokenUse != "refresh" {
		return nil, errors.New("invalid refresh token")
	}

	return claims, nil
}
