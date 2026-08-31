#!/bin/bash
set -e

echo "=== Building React frontend ==="
cd frontend
npm install
npm run build
cd ..

echo "=== Preparing Python backend ==="
rm -rf api/app
mkdir -p api/app

cp -r backend/app/. api/app/

find api/app -type d -name "__pycache__" -prune -exec rm -rf {} +
find api/app -type f -name "*.pyc" -delete

echo "=== Backend package prepared ==="
find api/app -type f -name "*.py" | sort
