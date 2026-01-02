#!/bin/bash
set -e

echo "Starting AIBase Scraper development environment..."

# Start PostgreSQL if not running
if ! docker compose ps | grep -q "postgres.*running"; then
    echo "Starting PostgreSQL..."
    docker compose up -d
    sleep 3
fi

# Start backend in background
echo "Starting backend..."
cd backend
cargo run &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend..."
cd ../frontend
bun install
bun dev &
FRONTEND_PID=$!

# Handle cleanup
cleanup() {
    echo "Shutting down..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "Development servers running:"
echo "  Backend:  http://localhost:3001"
echo "  Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"

wait
