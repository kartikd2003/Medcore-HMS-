# Nurse portal — what's new

Extract directly over `apps\web`, replacing everything — same flat structure as prior rounds.

## Files
- `src/lib/nurse-api.ts` — typed API methods for the intake queue and vitals recording
- `src/app/(app)/nurse/page.tsx` — today's confirmed arrivals, with a per-patient vitals form
- `src/lib/role-routing.ts` — nurses now land on `/nurse` after login
- `src/lib/nav-config.ts` — NURSE's nav array was empty; now has one item, "Patient intake"

## Scope decision made without sign-off — please confirm this is the right one
Nurse had no defined scope anywhere in the project before this. Rather than leave it unbuilt, I
picked the most defensible default given what's already in this codebase: **pre-consult vitals
intake**. The doctor's consult page already has a dedicated vitals section (height, weight, blood
pressure, pulse, temperature) that's currently only filled in at the very end, during the
doctor's own consult — a nurse capturing those ahead of time is a standard real-world workflow
and reuses field names already confirmed in `CreateMedicalRecordInput`.

This is a proposal, not a confirmed direction — if nurses are meant to do something else
entirely (medication administration tracking, ward assignment, whatever this hospital's actual
workflow needs), this page should be replaced rather than extended.

## More speculative than most, and incomplete even on its own terms
- `listQueue()` assumes `/appointments/mine` branches for NURSE the same hospital-wide way
  already confirmed for RECEPTIONIST — not checked.
- `recordVitals()` assumes a `PATCH /appointments/:id/vitals` endpoint that doesn't exist
  anywhere else in this codebase's confirmed surface.
- **The doctor's consult page does NOT read vitals saved here.** Wiring that up — so a nurse's
  intake actually pre-fills the doctor's consult form — is a real follow-on task, not done in
  this round. Right now this page and the doctor's vitals fields are two disconnected islands.

The in-app notice says all of this plainly.

Not build-verified (no npm registry access this session) — static review only: every import in
the new files resolves to an export that already exists in the codebase.

## Status of all 9 roles
Every role now has a dedicated landing page. Given the number of assumed/unconfirmed endpoints
stacked up across pharmacy, lab, accountant, hospital admin, super admin, and now nurse, the
natural next step is a pass against the real backend controllers to confirm or correct all of
them — rather than adding more frontend surface on unverified ground.
