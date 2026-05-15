# LinkSnap PayGate Production Channel Integration

Date: 2026-05-15

## Goal

Integrate LinkSnap production checkout with PayGate production Core API channels that have been verified active:

- BSI VA
- CIMB Niaga VA
- Permata VA
- QRIS dynamic GoPay
- GoPay

The integration must keep QRIS dynamic GoPay and GoPay as separate channel IDs, because they create different Midtrans Core API charge types and require different checkout instructions.

## Scope

- Extend PayGate merchant-facing charge API to accept:
  - `payment_type=bank_transfer` with `bank=bsi`
  - `payment_type=ewallet` with `ewallet=gopay`
  - `payment_type=qris` with `acquirer=gopay`
- Return provider actions and QR metadata from Midtrans charge responses so LinkSnap can render wallet/QR instructions.
- Add a stable `payment_method` response field for merchant apps.
- Update LinkSnap channel registry to remove inactive production defaults and use `qris_gopay` as the QRIS dynamic GoPay channel.
- Keep existing server-side amount calculation, idempotency, webhook HMAC, and no-cache checkout status behavior.

## Out of Scope

- Enabling BCA VA. Production Midtrans returned `status_code=402` for BCA on 2026-05-15.
- Adding unsupported wallets or convenience-store channels to production checkout.
- Changing PayGate secrets or LinkSnap Vercel environment values.

## Acceptance Checks

- PayGate unit tests cover BSI, CIMB Niaga, Permata, QRIS GoPay, and GoPay payload mapping.
- LinkSnap unit/integration tests cover `qris_gopay` and `gopay` as distinct methods.
- LinkSnap default payment method no longer points to BCA.
- Production smoke can create and expire the verified channels after deployment.
