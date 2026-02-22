#!/bin/bash
# JangB 서버 중지
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PORT="${PORT:-8080}"

cd "$PROJECT_DIR"

if [[ -f jangb-node.pid ]]; then
  PID=$(cat jangb-node.pid)
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Stopped process $PID"
  fi
  rm -f jangb-node.pid
fi

# 포트로 남아 있는 프로세스 정리
if command -v lsof >/dev/null 2>&1; then
  OLD_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [[ -n "$OLD_PID" ]]; then
    kill "$OLD_PID" 2>/dev/null || true
    echo "Stopped process on port $PORT"
  fi
fi

echo "Server stopped."
