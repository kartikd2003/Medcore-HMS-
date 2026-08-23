#!/usr/bin/env bash
# Exercises Week 2's full flow: availability -> booking -> status lifecycle
# -> medical record. Requires: curl, jq. Assumes Week 1's seed has run
# (npm run seed), which now also creates a doctor with Mon-Fri 9-1 availability.
set -euo pipefail
API="${API_URL:-http://localhost:3001/api/v1}"

login() {
  curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"Password123!\"}" | jq -r '.accessToken'
}

echo "1) Login as doctor, patient, receptionist"
DOCTOR_TOKEN=$(login "doctor@citygeneral.dev")
PATIENT_TOKEN=$(login "patient@example.dev")
RECEPTION_TOKEN=$(login "reception@citygeneral.dev")

echo "2) Find the doctor's id"
DOCTOR_ID=$(curl -s -X GET "$API/doctors/me" -H "Authorization: Bearer $DOCTOR_TOKEN" | jq -r '.id')
echo "   doctorId: $DOCTOR_ID"

echo "3) Find next Monday's date and fetch available slots"
NEXT_MON=$(date -d 'next monday' +%Y-%m-%d 2>/dev/null || date -v+monday +%Y-%m-%d)
SLOTS=$(curl -s -X GET "$API/doctors/$DOCTOR_ID/slots?date=$NEXT_MON")
FIRST_SLOT=$(echo "$SLOTS" | jq -r '.[0].start')
echo "   first available slot: $FIRST_SLOT"

echo "4) Patient books that slot"
APPOINTMENT=$(curl -s -X POST "$API/appointments" -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"doctorId\":\"$DOCTOR_ID\",\"scheduledAt\":\"$FIRST_SLOT\",\"reason\":\"Annual checkup\"}")
echo "$APPOINTMENT" | jq '.status'
APPOINTMENT_ID=$(echo "$APPOINTMENT" | jq -r '.id')

echo "5) Receptionist confirms it (PENDING -> CONFIRMED)"
curl -s -X PATCH "$API/appointments/$APPOINTMENT_ID/status" -H "Authorization: Bearer $RECEPTION_TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"CONFIRMED"}' | jq '.status'

echo "6) Doctor starts the appointment (CONFIRMED -> IN_PROGRESS)"
curl -s -X PATCH "$API/appointments/$APPOINTMENT_ID/status" -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}' | jq '.status'

echo "7) Doctor writes the medical record (auto-completes the appointment)"
curl -s -X POST "$API/medical-records" -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"appointmentId\":\"$APPOINTMENT_ID\",\"diagnosis\":\"Healthy\",\"notes\":\"Routine checkup, no concerns\"}" \
  | jq '.diagnosis'

echo "8) Confirm the appointment is now COMPLETED"
curl -s -X GET "$API/appointments/mine" -H "Authorization: Bearer $PATIENT_TOKEN" \
  | jq --arg id "$APPOINTMENT_ID" '.[] | select(.id == $id) | .status'

echo "9) Confirm patient CANNOT book the same slot again (should 409)"
curl -s -o /dev/null -w "   expected 409, got: %{http_code}\n" -X POST "$API/appointments" \
  -H "Authorization: Bearer $PATIENT_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"doctorId\":\"$DOCTOR_ID\",\"scheduledAt\":\"$FIRST_SLOT\"}"

echo "Week 2 smoke test complete."
EOF
