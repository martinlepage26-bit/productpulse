#!/usr/bin/env bash
# ProductPulse AI — one-shot dev launcher: MongoDB (Docker) + backend :8001 + frontend :3000
set -euo pipefail
cd "$(dirname "$0")"

DOCKER="docker"
docker ps >/dev/null 2>&1 || DOCKER="sudo docker"

echo "==> MongoDB"
if ! $DOCKER ps --format '{{.Names}}' | grep -q '^pulse-mongo$'; then
  $DOCKER rm -f pulse-mongo >/dev/null 2>&1 || true
  $DOCKER run -d --name pulse-mongo --restart unless-stopped \
    -p 27017:27017 -v pulse-mongo-data:/data/db mongo:7
fi

echo "==> Backend"
if [ ! -d backend/.venv ]; then
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements.txt
fi
[ -f backend/.env ] || { cp backend/.env.example backend/.env; echo "   created backend/.env from example — set JWT_SECRET"; }
(cd backend && .venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --reload) &
BACKEND_PID=$!

echo "==> Frontend"
[ -f frontend/.env ] || cp frontend/.env.example frontend/.env
[ -d frontend/node_modules ] || (cd frontend && npx -y yarn@1.22.22 install)
(cd frontend && npx -y yarn@1.22.22 start) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT
echo ""
echo "ProductPulse AI running:"
echo "  API:      http://localhost:8001/api/"
echo "  App:      http://localhost:3000/"
echo "  Demo:     demo@productpulse.ai / demo123"
wait
