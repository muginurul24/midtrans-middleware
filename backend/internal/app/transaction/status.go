package transaction

func MapMidtransStatus(transactionStatus string, fraudStatus string) string {
	switch transactionStatus {
	case "pending":
		return "pending"
	case "capture":
		if fraudStatus == "challenge" {
			return "challenge"
		}
		return "paid"
	case "settlement":
		return "paid"
	case "deny", "failure":
		return "failed"
	case "cancel":
		return "cancelled"
	case "expire":
		return "expired"
	case "refund":
		return "refunded"
	case "partial_refund":
		return "partial_refunded"
	default:
		return "unknown"
	}
}

func ShouldApplyStatusUpdate(current string, next string) bool {
	if next == "" || next == "unknown" {
		return false
	}

	if current == "" || current == "created" || current == "unknown" {
		return true
	}

	if current == next {
		return true
	}

	switch current {
	case "pending":
		return next == "challenge" || next == "paid" || next == "failed" || next == "expired" || next == "cancelled" || next == "refunded" || next == "partial_refunded"
	case "challenge":
		return next == "paid" || next == "failed" || next == "expired" || next == "cancelled" || next == "refunded" || next == "partial_refunded"
	case "paid":
		return next == "refunded" || next == "partial_refunded"
	case "partial_refunded":
		return next == "refunded"
	default:
		return false
	}
}
