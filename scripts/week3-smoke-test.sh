#!/usr/bin/env bash
# Exercises Week 3's full flow: prescribe + order labs during a consult,
# pharmacist dispenses, lab tech processes results, accountant bills and
# collects payment. Requires: curl, jq. Assumes npm run seed has been
# re-run after pulling Week 3 (adds pharmacist/lab-tech/accountant users
# and a Paracetamol/CBC catalog).
set -euo pipefail
API="${API_URL:-http://localhost:3001/api/v1}"

login() {
  local token
  token=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"Password123!\"}" | jq -r '.accessToken')
  if [ -z "$token" ] || [ "$token" = "null" ]; then
    echo "   FAILED to log in as $1 — got no valid token (check the API is running and rate limits aren't tripped)" >&2
    exit 1
  fi
  echo "$token"
}

echo "1) Login as everyone involved"
DOCTOR_TOKEN=$(login "doctor@citygeneral.dev")
PATIENT_TOKEN=$(login "patient@example.dev")
RECEPTION_TOKEN=$(login "reception@citygeneral.dev")
PHARMACIST_TOKEN=$(login "pharmacist@citygeneral.dev")
LABTECH_TOKEN=$(login "labtech@citygeneral.dev")
ACCOUNTANT_TOKEN=$(login "accountant@citygeneral.dev")

echo "2) Get doctor id and seeded catalog ids"
DOCTOR_ID=$(curl -s -X GET "$API/doctors/me" -H "Authorization: Bearer $DOCTOR_TOKEN" | jq -r '.id')
MEDICINE_ID="seed-medicine-paracetamol"
LABTEST_ID="seed-labtest-cbc"
echo "   doctorId: $DOCTOR_ID"

echo "3) Book + confirm + start an appointment (same as Week 2)"
NEXT_TUE=$(date -d 'next tuesday' +%Y-%m-%d 2>/dev/null || date -v+tuesday +%Y-%m-%d)
FIRST_SLOT=$(curl -s -X GET "$API/doctors/$DOCTOR_ID/slots?date=$NEXT_TUE" | jq -r '.[0].start')
APPOINTMENT_ID=$(curl -s -X POST "$API/appointments" -H "Authorization: Bearer $PATIENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"doctorId\":\"$DOCTOR_ID\",\"scheduledAt\":\"$FIRST_SLOT\",\"reason\":\"Fever\"}" | jq -r '.id')
curl -s -X PATCH "$API/appointments/$APPOINTMENT_ID/status" -H "Authorization: Bearer $RECEPTION_TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"CONFIRMED"}' > /dev/null
curl -s -X PATCH "$API/appointments/$APPOINTMENT_ID/status" -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"IN_PROGRESS"}' > /dev/null
echo "   appointmentId: $APPOINTMENT_ID"

echo "4) Doctor writes the medical record with a prescription + a lab order"
RECORD=$(curl -s -X POST "$API/medical-records" -H "Authorization: Bearer $DOCTOR_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{
    \"appointmentId\":\"$APPOINTMENT_ID\",
    \"diagnosis\":\"Viral fever\",
    \"prescriptionItems\":[{\"medicineId\":\"$MEDICINE_ID\",\"dosage\":\"500mg\",\"frequency\":\"1-0-1\",\"durationDays\":5}],
    \"labTestIds\":[\"$LABTEST_ID\"]
  }")
echo "$RECORD" | jq '.diagnosis'

echo "5) Pharmacist finds the pending item and dispenses it (stock decrements)"
ITEM_ID=$(curl -s -X GET "$API/prescriptions/pending" -H "Authorization: Bearer $PHARMACIST_TOKEN" \
  | jq -r --arg mid "$MEDICINE_ID" '[.[] | select(.medicineId == $mid)][0].id')
curl -s -X PATCH "$API/prescriptions/items/$ITEM_ID/dispense" -H "Authorization: Bearer $PHARMACIST_TOKEN" \
  | jq '.dispensedAt'

echo "6) Lab tech processes the order: collect -> upload result -> approve"
ORDER_ID=$(curl -s -X GET "$API/lab-orders?status=ORDERED" -H "Authorization: Bearer $LABTECH_TOKEN" \
  | jq -r --arg lid "$LABTEST_ID" '[.[] | select(.labTestId == $lid)][0].id')
curl -s -X PATCH "$API/lab-orders/$ORDER_ID/collect" -H "Authorization: Bearer $LABTECH_TOKEN" | jq '.status'
curl -s -X PATCH "$API/lab-orders/$ORDER_ID/result" -H "Authorization: Bearer $LABTECH_TOKEN" \
  -H 'Content-Type: application/json' -d '{"resultData":{"Hemoglobin":"13.5 g/dL","WBC":"6800/uL"}}' | jq '.status'
curl -s -X PATCH "$API/lab-orders/$ORDER_ID/approve" -H "Authorization: Bearer $LABTECH_TOKEN" | jq '.status'

echo "7) Accountant generates the invoice (consultation + pharmacy + lab)"
INVOICE=$(curl -s -X POST "$API/invoices/generate" -H "Authorization: Bearer $ACCOUNTANT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"appointmentId\":\"$APPOINTMENT_ID\",\"consultationFee\":500}")
echo "$INVOICE" | jq '{total, itemCount: (.items | length)}'
INVOICE_ID=$(echo "$INVOICE" | jq -r '.id')

echo "8) Accountant marks the invoice paid"
curl -s -X PATCH "$API/invoices/$INVOICE_ID/pay" -H "Authorization: Bearer $ACCOUNTANT_TOKEN" \
  -H 'Content-Type: application/json' -d '{"paymentGatewayRef":"test-ref-123"}' | jq '.status'

echo "9) Confirm the patient can see their own paid invoice"
curl -s -X GET "$API/invoices/mine" -H "Authorization: Bearer $PATIENT_TOKEN" \
  | jq --arg id "$INVOICE_ID" '.[] | select(.id == $id) | .status'

echo "10) Confirm generating a second invoice for the same appointment is rejected"
curl -s -o /dev/null -w "   expected 400, got: %{http_code}\n" -X POST "$API/invoices/generate" \
  -H "Authorization: Bearer $ACCOUNTANT_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"appointmentId\":\"$APPOINTMENT_ID\",\"consultationFee\":500}"

echo "Week 3 smoke test complete."
