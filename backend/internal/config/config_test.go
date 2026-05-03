package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnvFileSetsMissingValues(t *testing.T) {
	t.Setenv("EXISTING_KEY", "keep-me")

	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	content := "EXISTING_KEY=should-not-win\nNEW_KEY=new-value\nQUOTED_KEY=\"quoted-value\"\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	if err := loadDotEnvFile(path); err != nil {
		t.Fatalf("loadDotEnvFile: %v", err)
	}

	if got := os.Getenv("EXISTING_KEY"); got != "keep-me" {
		t.Fatalf("EXISTING_KEY = %q, want keep-me", got)
	}
	if got := os.Getenv("NEW_KEY"); got != "new-value" {
		t.Fatalf("NEW_KEY = %q, want new-value", got)
	}
	if got := os.Getenv("QUOTED_KEY"); got != "quoted-value" {
		t.Fatalf("QUOTED_KEY = %q, want quoted-value", got)
	}
}

func TestLoadDotEnvFileRejectsInvalidLine(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, ".env")
	if err := os.WriteFile(path, []byte("BROKEN_LINE\n"), 0o644); err != nil {
		t.Fatalf("write env file: %v", err)
	}

	if err := loadDotEnvFile(path); err == nil {
		t.Fatal("expected invalid env line error")
	}
}
