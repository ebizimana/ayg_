#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v flyctl >/dev/null 2>&1; then
  echo "flyctl is not installed. Install it first: https://fly.io/docs/hands-on/install-flyctl/"
  exit 1
fi

echo "Deploying backend..."
pushd "${ROOT_DIR}/backend" >/dev/null
if [[ -n "${BACKEND_DATABASE_URL:-}" || -n "${BACKEND_JWT_SECRET:-}" || -n "${BACKEND_CORS_ORIGIN:-}" ]]; then
  flyctl secrets set \
    ${BACKEND_DATABASE_URL:+DATABASE_URL="${BACKEND_DATABASE_URL}"} \
    ${BACKEND_JWT_SECRET:+JWT_SECRET="${BACKEND_JWT_SECRET}"} \
    ${BACKEND_CORS_ORIGIN:+CORS_ORIGIN="${BACKEND_CORS_ORIGIN}"}
fi
flyctl deploy
popd >/dev/null

echo "Deploying frontend..."
pushd "${ROOT_DIR}/frontend" >/dev/null
flyctl deploy
popd >/dev/null

echo "Done."
