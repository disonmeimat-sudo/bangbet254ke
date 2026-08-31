#!/bin/bash
set -e

echo "=== Building React frontend ==="

cd frontend
npm install
npm run build
cd ..

echo "=== Checking Python backend ==="

PYTHONPATH="$PWD/backend" python -c "
from app.main import app
print('FastAPI import OK')
print('Routes:', len(app.routes))
"

echo "=== Backend ready ==="
