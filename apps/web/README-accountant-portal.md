# Accountant portal — what's new

Extract directly over `apps\web`, replacing everything — same flat structure as prior rounds.

## Files
- `src/lib/accountant-api.ts` — typed API methods for hospital-wide invoices
- `src/app/(app)/billing/page.tsx` — invoice list with Unpaid/All filter, mark-paid and void actions
- `src/lib/role-routing.ts` — accountants now land on `/billing` after login (one-line addition)

`nav-config.ts` already had the `/billing` entry from the shell build.

## What's confirmed vs. assumed
Confirmed from earlier sessions: `GET /invoices/mine` is real, and `PATCH /invoices/:id/pay`
exists and is restricted to receptionist/accountant/admin (this is why the patient-invoices page
is view-only — a patient can't hit this route).

Assumed, not checked against real backend code this round (no backend source was available):
- That `/invoices/mine` called by an ACCOUNTANT returns every invoice hospital-wide, on the same
  per-role branching pattern already confirmed for `/appointments/mine`.
- That the response includes a `patient` field — the existing `Invoice` type in `types.ts`
  doesn't declare one, so `AccountantInvoice` extends it optimistically.
- `PATCH /invoices/:id/status` for voiding — no confirmed real path for this.
- The pay endpoint's body — assumed to need nothing beyond hitting the route.

The page surfaces this with an in-app notice, same pattern as the pharmacy/lab portals. If
invoices come back empty or without patient names, or void 404s, that's a backend question to
settle first.

Not build-verified (no npm registry access this session) — static review only: every import in
the new files resolves to an export that already exists in the codebase.

## Status of all 9 roles
Patient, doctor, receptionist, pharmacist, lab technician, and now accountant have dedicated
portals. Hospital admin and super admin still fall through to the generic `/dashboard`
placeholder. Nurse still has no nav items defined — scope was never decided for that role.
