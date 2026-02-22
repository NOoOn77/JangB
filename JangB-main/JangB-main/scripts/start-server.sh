#!/bin/bash
# JangB 장비 대여 서버 시작 스크립트
# 사용: ./scripts/start-server.sh [--install]
#   --install : 시작 전에 npm install 실행

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_DIR/jangb-node.log"
PORT="${PORT:-8080}"

cd "$PROJECT_DIR"

if [[ "$1" == "--install" ]]; then
  echo "Running npm install..."
  npm install
fi

# 기존에 같은 포트에서 도는 프로세스 종료 (있으면)
if command -v lsof >/dev/null 2>&1; then
  OLD_PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [[ -n "$OLD_PID" ]]; then
    echo "Stopping existing process on port $PORT (PID $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
else
  # lsof 없으면 pkill -f "node server.js" (현재 디렉터리 기준)
  pkill -f "node server.js" 2>/dev/null || true
  sleep 1
fi

echo "Starting node server.js (log: $LOG_FILE)..."
nohup node server.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PROJECT_DIR/jangb-node.pid"
sleep 1

# 헬스체크 (서비스 정상 기동 확인)
if command -v curl >/dev/null 2>&1; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/api/health" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    echo "OK: Server is up (HTTP $HTTP_CODE)."
  else
    echo "WARN: Health check returned HTTP $HTTP_CODE. Check $LOG_FILE"
  fi
  # Apache 등이 www-data로 백엔드 요청하는 경우, 한 번 호출해 두면 유용할 수 있음
  if command -v sudo >/dev/null 2>&1 && id www-data &>/dev/null; then
    sudo -u www-data curl -s -o /dev/null "http://127.0.0.1:$PORT/api/health" || true
  fi
else
  echo "curl not found; skipping health check."
fi

echo "Done. PID: $(cat "$PROJECT_DIR/jangb-node.pid")"
