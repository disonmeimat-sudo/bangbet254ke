#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================"
echo "        Starting BangBet254"
echo "======================================"

# -----------------------------
# Start FastAPI
# -----------------------------
echo "[1/2] Starting FastAPI..."

cd "$ROOT_DIR/backend"

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "ERROR: No Python virtual environment found."
    exit 1
fi

python -m uvicorn app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    > "$ROOT_DIR/backend.log" 2>&1 &

BACKEND_PID=$!

cleanup() {
    echo
    echo "Stopping BangBet254..."

    if kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi

    echo "Backend stopped."
}

trap cleanup EXIT INT TERM

# -----------------------------
# Wait for FastAPI
# -----------------------------
echo "Waiting for FastAPI..."

READY=0

for i in {1..20}; do
    if curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
        READY=1
        break
    fi

    # Stop waiting if the process already died
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        break
    fi

    sleep 1
done

if [ "$READY" -ne 1 ]; then
    echo
    echo "ERROR: FastAPI failed to start."
    echo
    echo "===== BACKEND LOG ====="

    if [ -f "$ROOT_DIR/backend.log" ]; then
        cat "$ROOT_DIR/backend.log"
    else
        echo "No backend.log was created."
    fi

    exit 1
fi

echo "FastAPI is ready."
echo "      API: http://127.0.0.1:8000"

# -----------------------------
# Start React
# -----------------------------
echo
echo "[2/2] Starting React/Vite..."
echo

cd "$ROOT_DIR/frontend"

npm run dev -- --host 127.0.0.1
