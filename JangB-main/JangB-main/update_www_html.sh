#!/bin/bash
# /var/www/html/ 디렉토리를 현재 프로젝트 파일로 업데이트하는 스크립트

echo "=== 현재 프로젝트 디렉토리 확인 ==="
cd ~/JangB-main || exit 1
pwd
echo ""

echo "=== 프로젝트 파일 확인 ==="
ls -la src/
echo ""

echo "=== /var/www/html/ 현재 상태 확인 ==="
ls -la /var/www/html/
echo ""

echo "=== 백업 생성 ==="
if [ -d "/var/www/html.backup" ]; then
    echo "기존 백업이 있습니다. 덮어쓰시겠습니까? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        sudo rm -rf /var/www/html.backup
    else
        echo "백업을 건너뜁니다."
    fi
fi

if [ ! -d "/var/www/html.backup" ]; then
    echo "백업 생성 중..."
    sudo cp -r /var/www/html /var/www/html.backup
    echo "백업 완료: /var/www/html.backup"
fi
echo ""

echo "=== 파일 복사 ==="
echo "~/JangB-main/src/* -> /var/www/html/"
sudo cp -r ~/JangB-main/src/* /var/www/html/
echo "복사 완료"
echo ""

echo "=== 권한 설정 ==="
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 644 /var/www/html/*.html /var/www/html/*.js /var/www/html/*.css 2>/dev/null
echo "권한 설정 완료"
echo ""

echo "=== 복사된 파일 확인 ==="
ls -la /var/www/html/
echo ""

echo "=== script.js 파일 비교 (처음 5줄) ==="
echo "--- /var/www/html/script.js ---"
head -5 /var/www/html/script.js
echo ""
echo "--- ~/JangB-main/src/script.js ---"
head -5 ~/JangB-main/src/script.js
echo ""

echo "=== Apache 캐시 클리어 및 재시작 ==="
sudo systemctl restart apache2
echo "Apache 재시작 완료"
echo ""

echo "=== 완료 ==="
echo "이제 브라우저에서 Ctrl + Shift + Delete로 캐시를 삭제하고 사이트를 확인하세요."
