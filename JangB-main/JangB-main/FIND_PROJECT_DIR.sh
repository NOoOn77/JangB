#!/bin/bash
# 프로젝트 디렉토리 찾기 스크립트

echo "=== server.js 파일 찾기 ==="
find ~ -name "server.js" -type f 2>/dev/null

echo ""
echo "=== package.json 파일 찾기 ==="
find ~ -name "package.json" -type f 2>/dev/null

echo ""
echo "=== 일반적인 웹 디렉토리 확인 ==="
echo "Checking ~/public_html/"
ls -la ~/public_html/ 2>/dev/null || echo "  (없음)"

echo ""
echo "Checking ~/www/"
ls -la ~/www/ 2>/dev/null || echo "  (없음)"

echo ""
echo "Checking ~/html/"
ls -la ~/html/ 2>/dev/null || echo "  (없음)"

echo ""
echo "Checking /var/www/html/"
ls -la /var/www/html/ 2>/dev/null || echo "  (없음)"

echo ""
echo "=== 현재 디렉토리 확인 ==="
pwd
ls -la
