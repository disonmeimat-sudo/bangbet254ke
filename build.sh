#!/bin/bash
set -e

echo "=== Building React frontend ==="

cd frontend
npm install
npm run build
cd ..

echo "=== Frontend build complete ==="
echo "=== Vercel Python function will use api/index.py ==="
