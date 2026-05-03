package authz

import "testing"

func TestIsAdmin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		role string
		want bool
	}{
		{name: "exact admin", role: "admin", want: true},
		{name: "mixed case admin", role: "Admin", want: true},
		{name: "admin with spaces", role: "  admin  ", want: true},
		{name: "non admin", role: "merchant", want: false},
		{name: "empty role", role: "", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			if got := IsAdmin(tt.role); got != tt.want {
				t.Fatalf("IsAdmin(%q) = %v, want %v", tt.role, got, tt.want)
			}
		})
	}
}
