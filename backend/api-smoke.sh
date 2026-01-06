#!/usr/bin/env bash
set -euo pipefail

# Simple end-to-end smoke script for local API. Requires the server running on API (default localhost:3000)
# and a Postgres DB reachable at DATABASE_URL. jq must be installed.

API="${API:-http://localhost:3000}"

# Use a unique email each run to avoid conflicts; override by exporting EMAIL first.
EMAIL="${EMAIL:-test+$(date +%s)@ayg.com}"
PASS="${PASS:-Password123!}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install it first." >&2
  exit 1
fi

echo "API=$API"
echo "EMAIL=$EMAIL"

json_post() {
  local url="$1" data="$2" token="${3:-}"
  if [[ -n "$token" ]]; then
    curl -sS -X POST "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d "$data"
  else
    curl -sS -X POST "$url" \
      -H "Content-Type: application/json" \
      -d "$data"
  fi
}

json_put() {
  local url="$1" data="$2" token="$3"
  curl -sS -X PUT "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$data"
}

json_get() {
  local url="$1" token="$2"
  curl -sS -X GET "$url" -H "Authorization: Bearer $token"
}

echo "1) Register (ignored if already exists)"
json_post "$API/auth/register" "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq .

echo "2) Login"
TOKEN="$(json_post "$API/auth/login" "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | jq -r '.accessToken')"
echo "TOKEN=$TOKEN"

echo "3) Create semester"
SEMESTER_ID="$(json_post "$API/semesters" '{
  "name": "Spring 2026",
  "startDate": "2026-01-12T00:00:00.000Z",
  "endDate": "2026-05-15T00:00:00.000Z"
}' "$TOKEN" | jq -r '.id')"
echo "SEMESTER_ID=$SEMESTER_ID"

echo "4) Create course"
COURSE_ID="$(json_post "$API/semesters/$SEMESTER_ID/courses" '{
  "name": "Calculus I",
  "credits": 3,
  "desiredLetterGrade": "A"
}' "$TOKEN" | jq -r '.id')"
echo "COURSE_ID=$COURSE_ID"

echo "5) Create category"
CATEGORY_ID="$(json_post "$API/courses/$COURSE_ID/categories" '{
  "name": "Homework",
  "weightPercent": 40,
  "dropLowest": 1
}' "$TOKEN" | jq -r '.id')"
echo "CATEGORY_ID=$CATEGORY_ID"

echo "6) Create assignment"
ASSIGNMENT_ID="$(json_post "$API/categories/$CATEGORY_ID/assignments" '{
  "name": "Homework 1",
  "maxPoints": 100,
  "dueDate": "2026-02-01T00:00:00.000Z",
  "isExtraCredit": false
}' "$TOKEN" | jq -r '.id')"
echo "ASSIGNMENT_ID=$ASSIGNMENT_ID"

echo "7) Upsert grade"
json_put "$API/assignments/$ASSIGNMENT_ID/grade" '{
  "expectedPoints": 90,
  "earnedPoints": 88,
  "gradedAt": "2026-02-02T12:00:00.000Z",
  "notes": "Solid work"
}' "$TOKEN" | jq .

echo "8) Fetch grade"
json_get "$API/assignments/$ASSIGNMENT_ID/grade" "$TOKEN" | jq .

echo "Done."
