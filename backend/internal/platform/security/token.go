package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"strings"
)

const storeTokenPrefixLength = 20

func HashWithPepper(pepper string, raw string) string {
	sum := sha256.Sum256([]byte(pepper + ":" + raw))
	return hex.EncodeToString(sum[:])
}

func GenerateStoreAPIToken(appEnv string) (string, string, error) {
	randomPart, err := randomURLSafeString(32)
	if err != nil {
		return "", "", err
	}

	tokenPrefix := "sk_test_"
	if appEnv == "production" {
		tokenPrefix = "sk_live_"
	}

	token := tokenPrefix + randomPart

	return token, StoreTokenPrefix(token), nil
}

func GenerateWebhookSecret() (string, error) {
	randomPart, err := randomURLSafeString(24)
	if err != nil {
		return "", err
	}

	return "whsec_" + randomPart, nil
}

func StoreTokenPrefix(token string) string {
	if len(token) <= storeTokenPrefixLength {
		return token
	}

	return token[:storeTokenPrefixLength]
}

func EncryptString(secret string, plaintext string) (string, error) {
	key := sha256.Sum256([]byte(secret))

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.RawURLEncoding.EncodeToString(ciphertext), nil
}

func DecryptString(secret string, encoded string) (string, error) {
	key := sha256.Sum256([]byte(secret))

	block, err := aes.NewCipher(key[:])
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	ciphertext, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, payload := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, payload, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func randomURLSafeString(byteLength int) (string, error) {
	raw := make([]byte, byteLength)
	if _, err := io.ReadFull(rand.Reader, raw); err != nil {
		return "", err
	}

	encoded := base64.RawURLEncoding.EncodeToString(raw)
	return strings.TrimRight(encoded, "="), nil
}
