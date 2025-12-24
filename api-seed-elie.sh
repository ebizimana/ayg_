#!/usr/bin/env bash
set -euo pipefail

# Seeds a full semester with courses, categories, assignments, and grades for elie@ayg.com
# Requires API server + Postgres running; jq must be installed.

API="${API:-http://localhost:3000}"
EMAIL="${EMAIL:-elie@ayg.com}"
PASS="${PASS:-Password123!}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required. Install it first." >&2
  exit 1
fi

echo "API=$API"
echo "EMAIL=$EMAIL"

post_body() {
  local url="$1" token="${2:-}"
  if [[ -n "$token" ]]; then
    curl -sS -X POST "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d @-
  else
    curl -sS -X POST "$url" \
      -H "Content-Type: application/json" \
      -d @-
  fi
}

put_body() {
  local url="$1" token="$2"
  curl -sS -X PUT "$url" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d @-
}

get_json() {
  local url="$1" token="$2"
  curl -sS -X GET "$url" -H "Authorization: Bearer $token"
}

require_id() {
  local id="$1" label="$2"
  if [[ -z "$id" || "$id" == "null" ]]; then
    echo "Failed to create $label (got empty id)" >&2
    exit 1
  fi
}

echo "1) Register (ignored if already exists)"
post_body "$API/auth/register" <<JSON | jq .
{"email":"$EMAIL","password":"$PASS"}
JSON

echo "2) Login"
TOKEN="$(
  post_body "$API/auth/login" <<JSON | jq -r '.accessToken'
{"email":"$EMAIL","password":"$PASS"}
JSON
)"
echo "TOKEN acquired"

echo "3) Create semester"
SEMESTER_ID="$(
  post_body "$API/semesters" "$TOKEN" <<'JSON' | jq -r '.id'
{
  "name": "Fall 2026",
  "startDate": "2026-08-20T00:00:00.000Z",
  "endDate": "2026-12-15T00:00:00.000Z"
}
JSON
)"
require_id "$SEMESTER_ID" "semester"
echo "SEMESTER_ID=$SEMESTER_ID"

echo "4) Courses and structure"

create_course() {
  local name="$1" credits="$2" desired="$3"
  post_body "$API/semesters/$SEMESTER_ID/courses" "$TOKEN" <<JSON | jq -r '.id'
{
  "name": "$name",
  "credits": $credits,
  "desiredLetterGrade": "$desired"
}
JSON
}

create_category() {
  local course_id="$1" name="$2" weight="$3" drop_lowest="$4"
  post_body "$API/courses/$course_id/categories" "$TOKEN" <<JSON | jq -r '.id'
{
  "name": "$name",
  "weightPercent": $weight,
  "dropLowest": $drop_lowest
}
JSON
}

create_assignment() {
  local category_id="$1" name="$2" max_points="$3" due="$4" extra="$5"
  local resp
  resp="$(post_body "$API/categories/$category_id/assignments" "$TOKEN" <<JSON
{
  "name": "$name",
  "maxPoints": $max_points,
  "dueDate": "$due",
  "isExtraCredit": $extra
}
JSON
)"
  local id
  id="$(echo "$resp" | jq -er '.id' 2>/dev/null || true)"
  if [[ -z "$id" ]]; then
    echo "Failed to create assignment \"$name\" under category $category_id. Response:" >&2
    echo "$resp" >&2
    return 1
  fi
  echo "$id"
}

upsert_grade() {
  local assignment_id="$1" expected="$2" earned="$3" graded_at="$4" notes="$5"
  put_body "$API/assignments/$assignment_id/grade" "$TOKEN" <<JSON | jq .
{
  "expectedPoints": $expected,
  "earnedPoints": $earned,
  "gradedAt": "$graded_at",
  "notes": "$notes"
}
JSON
}

# Course A: Calculus I
COURSE_CALC="$(create_course "Calculus I" 4 "A")"; require_id "$COURSE_CALC" "course Calculus I"
echo "Course Calculus I: $COURSE_CALC"
CAT_CALC_HW="$(create_category "$COURSE_CALC" "Homework" 40 1)"; require_id "$CAT_CALC_HW" "calc hw"
CAT_CALC_QZ="$(create_category "$COURSE_CALC" "Quizzes" 20 0)"; require_id "$CAT_CALC_QZ" "calc quizzes"
CAT_CALC_MT="$(create_category "$COURSE_CALC" "Midterm" 20 0)"; require_id "$CAT_CALC_MT" "calc midterm"
CAT_CALC_FIN="$(create_category "$COURSE_CALC" "Final" 20 0)"; require_id "$CAT_CALC_FIN" "calc final"

ASSN_CALC_HW1="$(create_assignment "$CAT_CALC_HW" "HW 1" 100 "2026-09-05T00:00:00.000Z" false)"
ASSN_CALC_HW2="$(create_assignment "$CAT_CALC_HW" "HW 2" 100 "2026-09-19T00:00:00.000Z" false)"
ASSN_CALC_QZ1="$(create_assignment "$CAT_CALC_QZ" "Quiz 1" 20 "2026-09-12T00:00:00.000Z" false)"
ASSN_CALC_MT="$(create_assignment "$CAT_CALC_MT" "Midterm" 100 "2026-10-15T00:00:00.000Z" false)"
ASSN_CALC_FIN="$(create_assignment "$CAT_CALC_FIN" "Final" 100 "2026-12-10T00:00:00.000Z" false)"
require_id "$ASSN_CALC_HW1" "calc hw1"
require_id "$ASSN_CALC_HW2" "calc hw2"
require_id "$ASSN_CALC_QZ1" "calc quiz1"
require_id "$ASSN_CALC_MT" "calc midterm"
require_id "$ASSN_CALC_FIN" "calc final"

upsert_grade "$ASSN_CALC_HW1" 95 93 "2026-09-06T12:00:00.000Z" "Strong start"
upsert_grade "$ASSN_CALC_QZ1" 18 17 "2026-09-13T12:00:00.000Z" "Careless mistake"
# Midterm, HW2, and Final intentionally left ungraded (isGraded stays false)

# Course B: Modern History
COURSE_HIST="$(create_course "Modern History" 3 "B+")"; require_id "$COURSE_HIST" "course Modern History"
echo "Course Modern History: $COURSE_HIST"
CAT_HIST_ESSAY="$(create_category "$COURSE_HIST" "Essays" 50 0)"
CAT_HIST_PART="$(create_category "$COURSE_HIST" "Participation" 10 0)"
CAT_HIST_EXAMS="$(create_category "$COURSE_HIST" "Exams" 40 0)"

ASSN_HIST_ESSAY1="$(create_assignment "$CAT_HIST_ESSAY" "Essay 1" 100 "2026-09-25T00:00:00.000Z" false)"
ASSN_HIST_ESSAY2="$(create_assignment "$CAT_HIST_ESSAY" "Essay 2" 100 "2026-11-10T00:00:00.000Z" false)"
ASSN_HIST_PART="$(create_assignment "$CAT_HIST_PART" "Participation (Oct)" 20 "2026-10-31T00:00:00.000Z" false)"
ASSN_HIST_MID="$(create_assignment "$CAT_HIST_EXAMS" "Midterm" 100 "2026-10-20T00:00:00.000Z" false)"
ASSN_HIST_FIN="$(create_assignment "$CAT_HIST_EXAMS" "Final" 100 "2026-12-12T00:00:00.000Z" false)"
require_id "$ASSN_HIST_ESSAY1" "hist essay1"
require_id "$ASSN_HIST_ESSAY2" "hist essay2"
require_id "$ASSN_HIST_PART" "hist participation"
require_id "$ASSN_HIST_MID" "hist midterm"
require_id "$ASSN_HIST_FIN" "hist final"

upsert_grade "$ASSN_HIST_ESSAY1" 90 88 "2026-09-27T12:00:00.000Z" "Good sources"
upsert_grade "$ASSN_HIST_PART" 18 18 "2026-11-01T12:00:00.000Z" "Active in discussions"
upsert_grade "$ASSN_HIST_MID" 85 82 "2026-10-21T12:00:00.000Z" "Missed a short answer"
# Essay 2 and Final pending (isGraded stays false)

# Course C: Intro to CS
COURSE_CS="$(create_course "Intro to CS" 3 "A-")"; require_id "$COURSE_CS" "course Intro to CS"
echo "Course Intro to CS: $COURSE_CS"
CAT_CS_PROJECT="$(create_category "$COURSE_CS" "Projects" 60 0)"
CAT_CS_LABS="$(create_category "$COURSE_CS" "Labs" 20 1)"
CAT_CS_EXAMS="$(create_category "$COURSE_CS" "Exams" 20 0)"

ASSN_CS_PROJ1="$(create_assignment "$CAT_CS_PROJECT" "Project 1" 150 "2026-09-30T00:00:00.000Z" false)"
ASSN_CS_PROJ2="$(create_assignment "$CAT_CS_PROJECT" "Project 2" 200 "2026-11-20T00:00:00.000Z" false)"
ASSN_CS_LAB1="$(create_assignment "$CAT_CS_LABS" "Lab 1" 20 "2026-09-03T00:00:00.000Z" false)"
ASSN_CS_LAB2="$(create_assignment "$CAT_CS_LABS" "Lab 2" 20 "2026-09-10T00:00:00.000Z" false)"
ASSN_CS_EXAM="$(create_assignment "$CAT_CS_EXAMS" "Final Exam" 100 "2026-12-05T00:00:00.000Z" false)"
require_id "$ASSN_CS_PROJ1" "cs project1"
require_id "$ASSN_CS_PROJ2" "cs project2"
require_id "$ASSN_CS_LAB1" "cs lab1"
require_id "$ASSN_CS_LAB2" "cs lab2"
require_id "$ASSN_CS_EXAM" "cs final exam"

upsert_grade "$ASSN_CS_PROJ1" 140 136 "2026-10-02T12:00:00.000Z" "Passed all tests"
upsert_grade "$ASSN_CS_LAB1" 18 18 "2026-09-04T12:00:00.000Z" "Clean submission"
# Lab 2, Project 2, Final pending (isGraded stays false)

echo "Seed complete."
