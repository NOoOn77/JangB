#!/bin/bash
# 서버 재시작 스크립트

echo "=== 8080 포트를 사용하는 프로세스 찾기 ==="
PID=$(sudo lsof -t -i :8080)
if [ -z "$PID" ]; then
    echo "8080 포트를 사용하는 프로세스가 없습니다."
else
    echo "프로세스 ID: $PID"
    echo "프로세스 정보:"
    ps -p $PID -o pid,ppid,cmd
    
    echo ""
    echo "프로세스를 종료합니다..."
    sudo kill -9 $PID
    sleep 2
    
    # 확인
    if sudo lsof -t -i :8080 > /dev/null 2>&1; then
        echo "경고: 프로세스가 아직 실행 중입니다. 강제 종료를 시도합니다..."
        sudo killall -9 node 2>/dev/null
    else
        echo "프로세스가 성공적으로 종료되었습니다."
    fi
fi

echo ""
echo "=== 모든 Node.js 프로세스 확인 ==="
ps aux | grep node | grep -v grep

echo ""
echo "=== Node.js 프로세스 모두 종료 (선택사항) ==="
read -p "모든 Node.js 프로세스를 종료하시겠습니까? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pkill -f node
    sleep 2
    echo "모든 Node.js 프로세스가 종료되었습니다."
fi

echo ""
echo "=== 포트 확인 ==="
if sudo lsof -t -i :8080 > /dev/null 2>&1; then
    echo "경고: 8080 포트가 여전히 사용 중입니다!"
    sudo lsof -i :8080
else
    echo "8080 포트가 사용 가능합니다."
fi

echo ""
echo "=== 프로젝트 디렉토리로 이동 ==="
cd ~/JangB-main || exit 1
pwd

echo ""
echo "=== 서버 시작 ==="
echo "서버를 시작합니다. 중지하려면 Ctrl+C를 누르세요."
node server.js
