#!/bin/bash
set -euo pipefail

# Build script for packaging the Flask backend into a Lambda deployment ZIP
# Output: build/backend.zip

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
BUILD_DIR="$PROJECT_ROOT/build"
PACKAGE_DIR="$(mktemp -d)"

echo "==> Installing Python dependencies..."
pip install --quiet --target "$PACKAGE_DIR" -r "$BACKEND_DIR/requirements.txt"

echo "==> Copying backend source files..."
cp "$BACKEND_DIR/app.py" "$PACKAGE_DIR/"
cp "$BACKEND_DIR/config.py" "$PACKAGE_DIR/"
cp "$BACKEND_DIR/extensions.py" "$PACKAGE_DIR/"
cp "$BACKEND_DIR/wsgi.py" "$PACKAGE_DIR/"

cp -r "$BACKEND_DIR/models" "$PACKAGE_DIR/models"
cp -r "$BACKEND_DIR/routes" "$PACKAGE_DIR/routes"

# Remove any __pycache__ directories that may have been copied
find "$PACKAGE_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

echo "==> Packaging into build/backend.zip..."
mkdir -p "$BUILD_DIR"
rm -f "$BUILD_DIR/backend.zip"

(cd "$PACKAGE_DIR" && zip -r -q "$BUILD_DIR/backend.zip" .)

echo "==> Cleaning up temporary directory..."
rm -rf "$PACKAGE_DIR"

echo "==> Done! Artifact: build/backend.zip"
