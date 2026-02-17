# 캐시 문제 해결 가이드

SSH에서 파일을 삭제했는데도 이전 사이트가 보이는 경우, 다음 단계를 순서대로 확인하세요.

## 1. 브라우저 캐시 삭제

### Chrome/Edge (Windows)
- `Ctrl + Shift + Delete` → 캐시된 이미지 및 파일 선택 → 삭제
- 또는 `Ctrl + F5` (강제 새로고침)
- 또는 개발자 도구 (`F12`) → Network 탭 → "Disable cache" 체크

### Firefox
- `Ctrl + Shift + Delete` → 캐시 선택 → 삭제
- 또는 `Ctrl + F5`

## 2. 서버 측 확인 및 조치

### SSH로 서버에 접속하여 확인

```bash
# 1. Node.js 프로세스 확인
ps aux | grep node
# 또는
pm2 list  # PM2를 사용하는 경우

# 2. 실행 중인 Node.js 프로세스 종료
pkill -f node
# 또는 PM2를 사용하는 경우
pm2 stop all
pm2 delete all

# 3. Apache 서비스 재시작 (캐시 클리어)
sudo systemctl restart apache2
# 또는
sudo service apache2 restart

# 4. Apache 캐시 디렉토리 확인 및 삭제 (있는 경우)
sudo rm -rf /var/cache/apache2/*
sudo systemctl restart apache2

# 5. 파일이 정말 삭제되었는지 확인
ls -la /경로/프로젝트/디렉토리
# 또는
find /경로/프로젝트/디렉토리 -type f

# 6. Apache 설정 확인 (DocumentRoot가 올바른지)
sudo cat /etc/apache2/sites-available/000-default.conf
# 또는
sudo cat /etc/apache2/sites-enabled/*.conf
```

## 3. Apache 프록시 설정 확인

Apache가 `/api/login`을 Node.js 서버로 프록시하는 설정이 있는지 확인:

```bash
# Apache 설정 파일 확인
sudo cat /etc/apache2/sites-available/000-default.conf | grep -A 10 ProxyPass
# 또는
sudo cat /etc/apache2/conf-available/proxy.conf
```

Apache 프록시 모듈이 활성화되어 있는지 확인:
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo systemctl restart apache2
```

## 4. Node.js 서버 재시작

새 파일을 업로드한 후:

```bash
# 프로젝트 디렉토리로 이동
cd /경로/프로젝트/디렉토리

# 의존성 설치 (필요한 경우)
npm install

# Node.js 서버 시작
node server.js
# 또는 PM2를 사용하는 경우
pm2 start server.js
pm2 save
```

## 5. 포트 확인

Node.js 서버가 8080 포트에서 실행 중인지 확인:

```bash
netstat -tulpn | grep 8080
# 또는
sudo lsof -i :8080
```

## 6. 방화벽 확인

8080 포트가 열려있는지 확인:

```bash
sudo ufw status
# 또는
sudo iptables -L -n | grep 8080
```

## 빠른 해결 체크리스트

- [ ] 브라우저에서 `Ctrl + Shift + Delete`로 캐시 삭제
- [ ] 브라우저에서 `Ctrl + F5`로 강제 새로고침
- [ ] SSH에서 `ps aux | grep node`로 Node.js 프로세스 확인
- [ ] SSH에서 `pkill -f node`로 모든 Node.js 프로세스 종료
- [ ] SSH에서 `sudo systemctl restart apache2`로 Apache 재시작
- [ ] SSH에서 파일이 정말 삭제되었는지 `ls -la`로 확인
- [ ] 새 파일 업로드 후 Node.js 서버 재시작

## 추가 팁

- **시크릿 모드로 테스트**: 브라우저의 시크릿/프라이빗 모드로 접속하여 캐시 없이 확인
- **다른 브라우저로 테스트**: 다른 브라우저에서도 같은 현상이 발생하는지 확인
- **curl로 직접 테스트**: SSH에서 `curl http://localhost:8080` 또는 `curl http://서버IP`로 확인
