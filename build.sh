#!/bin/bash
set -e

echo "=== Building React frontend ==="

cd frontend
npm install
npm run build
cd ..

echo "=== Checking Vercel Python package ==="

PYTHONPATH="$PWD/api" python -c "
from app.main import app
from app.api.public.matches import router
from app.api.public.wallet import router as wallet_router
from app.api.public.transactions import router as transactions_router

print('FastAPI import OK')
print('Public routers import OK')
print('Routes:', len(app.routes))
"

echo "=== Backend ready ==="
