package authz

import "strings"

const AdminRole = "admin"

func IsAdmin(role string) bool {
	return strings.EqualFold(strings.TrimSpace(role), AdminRole)
}
