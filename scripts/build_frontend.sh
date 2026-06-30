#!/bin/bash
set -euo pipefail

# Build script for TaskFlow frontend
# Installs dependencies and produces a production Vite build in frontend/dist/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Require VITE_API_URL to be set
if [ -z "${VITE_API_URL:-}" ]; then
  echo "ERROR: VITE_API_URL environment variable must be set" >&2
  exit 1
fi

echo "Building frontend with VITE_API_URL=$VITE_API_URL"

# Install dependencies
echo "Installing Node.js dependencies..."
cd "$FRONTEND_DIR"
npm ci

# Run production build
echo "Running Vite production build..."
npm run build

echo "Frontend build complete. Output: frontend/dist/"
