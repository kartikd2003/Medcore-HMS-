#!/usr/bin/env bash
# Exercises Week 1's full flow against a running API (see README to start it).
# Requires: curl, jq
set -euo pipefail
API="${API_URL:-http://localhost:3001/api/v1}"

echo "1) Login as seeded Super Admin"
SUPER_TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@medcore.dev","password":"Password123!"}' | jq -r '.accessToken')
echo "   token acquired: ${SUPER_TOKEN:0:20}..."

echo "2) Onboard a second hospital as Super Admin"
HOSPITAL=$(curl -s -X POST "$API/hospitals" \
  -H "Authorization: Bearer $SUPER_TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "name": "Lakeside Clinic",
    "slug": "lakeside-clinic",
    "adminEmail": "admin@lakeside.dev",
    "adminTemporaryPassword": "Password123!",
    "adminFirstName": "Priya",
    "adminLastName": "Nair"
  }')
echo "$HOSPITAL" | jq '.hospital.id, .hospital.status'
HOSPITAL_ID=$(echo "$HOSPITAL" | jq -r '.hospital.id')

echo "3) Activate the new hospital"
curl -s -X PATCH "$API/hospitals/$HOSPITAL_ID/activate" -H "Authorization: Bearer $SUPER_TOKEN" | jq '.status'

echo "4) Login as the new hospital's admin"
ADMIN_TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@lakeside.dev","password":"Password123!"}' | jq -r '.accessToken')

echo "5) Admin creates a staff account (scoped to their own hospital)"
curl -s -X POST "$API/users/staff" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{
    "email": "nurse@lakeside.dev",
    "temporaryPassword": "Password123!",
    "firstName": "Rina",
    "lastName": "Sen",
    "role": "NURSE"
  }' | jq '.role, .hospitalId'

echo "6) Confirm the pre-seeded Hospital Admin CANNOT touch this hospital's users (tenant isolation)"
CITY_ADMIN_TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@citygeneral.dev","password":"Password123!"}' | jq -r '.accessToken')
curl -s -o /dev/null -w "   expected 403, got: %{http_code}\n" \
  -X GET "$API/users/hospital/$HOSPITAL_ID" -H "Authorization: Bearer $CITY_ADMIN_TOKEN"

echo "Smoke test complete."
